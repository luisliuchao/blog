import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cookieHeader,
  ensureAllowlistFile,
  gateEnabled,
  gatePage,
  isAllowed,
  isPublicPath,
  issueCookie,
  loadAllowedEmails,
  loadGateSecret,
  parseForm,
  readCookie,
  safeNext,
  verifyCookie
} from './gate.mjs';
import { site } from './site.mjs';

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
ensureAllowlistFile();
const secret = loadGateSecret();

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replaceAll('\0', '');
  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const candidate = normalize(join(dist, relative));
  if (!candidate.startsWith(dist + sep) && candidate !== dist) {
    return null;
  }
  return candidate;
}

function resolveFile(urlPath) {
  const candidate = safePath(urlPath);
  if (!candidate) {
    return null;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }
  const asIndex = join(candidate, 'index.html');
  if (existsSync(asIndex) && statSync(asIndex).isFile()) {
    return asIndex;
  }
  return null;
}

function requestPath(url) {
  return (url ?? '/').split('?')[0];
}

function requestQuery(url) {
  const raw = (url ?? '/').split('?')[1] ?? '';
  return new URLSearchParams(raw);
}

function sendGate(res, { next, error } = {}) {
  const html = gatePage({ next, error });
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin'
  });
  res.end(html);
}

function signedIn(req, allowed) {
  return Boolean(verifyCookie(readCookie(req.headers.cookie), secret, allowed));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolveBody(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

const server = createServer((req, res) => {
  const allowed = loadAllowedEmails();
  const gated = gateEnabled(allowed);
  const path = requestPath(req.url);
  const next = safeNext(requestQuery(req.url).get('next') ?? path);

  if (gated && req.method === 'POST' && path === '/access') {
    readBody(req)
      .then((body) => {
        const form = parseForm(body);
        if (!isAllowed(form.email, allowed)) {
          sendGate(res, { next: form.next, error: 'That email is not on the list.' });
          return;
        }
        res.writeHead(302, {
          location: form.next,
          'set-cookie': cookieHeader(issueCookie(form.email, secret)),
          'cache-control': 'no-store'
        });
        res.end();
      })
      .catch(() => {
        sendGate(res, { next, error: 'Try again with the invited email.' });
      });
    return;
  }

  if (gated && path === '/access') {
    sendGate(res, { next: safeNext(requestQuery(req.url).get('next') ?? '/') });
    return;
  }

  if (gated && !isPublicPath(path) && !signedIn(req, allowed)) {
    sendGate(res, { next });
    return;
  }

  const file = resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  const type = types[extname(file)] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=60' });
  createReadStream(file).pipe(res);
});

server.listen(site.port, site.bind, () => {
  console.log(`blog listening on http://${site.bind}:${site.port}`);
});
