import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from './site.mjs';

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)));

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

const server = createServer((req, res) => {
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
