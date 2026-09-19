import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { escapeHtml } from './obsidian.mjs';
import { site } from './site.mjs';

export const COOKIE = 'blog_access';
const cookieDays = 30;

export function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function parseAllowedEmails(text) {
  const emails = new Set();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const email = normalizeEmail(trimmed.split('#')[0]);
    if (email.includes('@')) {
      emails.add(email);
    }
  }
  return emails;
}

export function ensureAllowlistFile({
  env = process.env,
  email = 'jsczjxy@gmail.com',
  writeFile = writeFileSync
} = {}) {
  const file = env.BLOG_ALLOWED_EMAILS_FILE ?? `${env.HOME ?? '/home'}/.blog/allowed-emails`;
  if (existsSync(file)) {
    return file;
  }
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFile(
    file,
    `# One invited email per line. Restart is not needed; the blog rereads this file.\n${email}\n`,
    { mode: 0o600 }
  );
  return file;
}

export function loadAllowedEmails({ env = process.env, readFile = readFileSync } = {}) {
  const emails = parseAllowedEmails(env.BLOG_ALLOWED_EMAILS?.replaceAll(',', '\n') ?? '');
  const file = env.BLOG_ALLOWED_EMAILS_FILE ?? `${env.HOME ?? '/home'}/.blog/allowed-emails`;
  if (existsSync(file)) {
    for (const email of parseAllowedEmails(readFile(file, 'utf8'))) {
      emails.add(email);
    }
  }
  return emails;
}

export function gateEnabled(emails) {
  return emails.size > 0;
}

export function isGateFlag(value) {
  return value === true || value === 'true' || value === 'yes';
}

export function isPublicPath(urlPath) {
  const path = (urlPath ?? '/').split('?')[0];
  return path === '/style.css' || path === '/access';
}

export function normalizeGatePath(urlPath) {
  let path = (urlPath ?? '/').split('?')[0];
  if (path.endsWith('/index.html')) {
    path = path.slice(0, -'/index.html'.length);
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path || '/';
}

export function parseGatedPaths(raw) {
  const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const paths = new Set();
  if (!Array.isArray(list)) {
    return paths;
  }
  for (const item of list) {
    if (typeof item === 'string' && item.startsWith('/')) {
      paths.add(normalizeGatePath(item));
    }
  }
  return paths;
}

export function loadGatedPaths({ dist, readFile = readFileSync } = {}) {
  const file = `${dist}/gated.json`;
  if (!existsSync(file)) {
    return new Set();
  }
  try {
    return parseGatedPaths(readFile(file, 'utf8'));
  } catch {
    return new Set();
  }
}

export function isGatedPath(urlPath, gatedPaths) {
  return gatedPaths.has(normalizeGatePath(urlPath));
}

export function loadGateSecret({ env = process.env, readFile = readFileSync, writeFile = writeFileSync } = {}) {
  if (env.BLOG_GATE_SECRET) {
    return env.BLOG_GATE_SECRET;
  }
  const file = env.BLOG_GATE_SECRET_FILE ?? `${env.HOME ?? '/home'}/.blog/gate-secret`;
  if (existsSync(file)) {
    return readFile(file, 'utf8').trim();
  }
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const secret = randomBytes(32).toString('base64url');
  writeFile(file, `${secret}\n`, { mode: 0o600 });
  return secret;
}

function sign(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function issueCookie(email, secret, now = Date.now()) {
  const exp = now + cookieDays * 24 * 60 * 60 * 1000;
  const payload = `${exp}|${normalizeEmail(email)}`;
  return `${payload}|${sign(secret, payload)}`;
}

export function readCookie(header, name = COOKIE) {
  if (!header) {
    return '';
  }
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return '';
}

export function verifyCookie(value, secret, allowed, now = Date.now()) {
  const parts = String(value ?? '').split('|');
  if (parts.length !== 3) {
    return '';
  }
  const [expRaw, email, mac] = parts;
  const payload = `${expRaw}|${email}`;
  const expected = sign(secret, payload);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return '';
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) {
    return '';
  }
  const normalized = normalizeEmail(email);
  return allowed.has(normalized) ? normalized : '';
}

export function isAllowed(email, allowed) {
  return allowed.has(normalizeEmail(email));
}

export function cookieHeader(value) {
  const maxAge = cookieDays * 24 * 60 * 60;
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function parseForm(body) {
  const params = new URLSearchParams(String(body ?? ''));
  return {
    email: params.get('email') ?? '',
    next: safeNext(params.get('next') ?? '/')
  };
}

export function gatePage({ next = '/', error = '' } = {}) {
  const message = error
    ? `<p class="lede">${escapeHtml(error)}</p>`
    : `<p class="lede">Enter an invited email to continue.</p>`;
  return `<!doctype html>
<html lang="${site.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Enter email · ${escapeHtml(site.title)}</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="/style.css">
</head>
<body class="page">
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="wordmark" href="/">${escapeHtml(site.title)}</a>
  </header>
  <main id="main">
    <article>
      <header>
        <h1>This post is private</h1>
      </header>
      <div class="prose">
        ${message}
        <form class="gate-form" method="post" action="/access">
          <input type="hidden" name="next" value="${escapeHtml(next)}">
          <label>
            Email
            <input type="email" name="email" autocomplete="username" required autofocus>
          </label>
          <button type="submit">Continue</button>
        </form>
      </div>
    </article>
  </main>
</body>
</html>
`;
}
