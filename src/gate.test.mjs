import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gateEnabled,
  gatePage,
  gatedTitle,
  isAllowed,
  isGateFlag,
  isGatedPath,
  isPublicPath,
  issueCookie,
  normalizeEmail,
  normalizeGatePath,
  parseAllowedEmails,
  parseForm,
  parseGatedPaths,
  safeNext,
  verifyCookie
} from './gate.mjs';

test('parses invited emails and ignores comments', () => {
  const emails = parseAllowedEmails(`
# family
luis.liu.1018@gmail.com
  Parent@Example.com  # extra
not-an-email
`);
  assert.deepEqual([...emails].sort(), ['luis.liu.1018@gmail.com', 'parent@example.com']);
});

test('gate is off until at least one email is listed', () => {
  assert.equal(gateEnabled(new Set()), false);
  assert.equal(gateEnabled(new Set(['a@b.com'])), true);
});

test('allows only exact invited emails', () => {
  const allowed = new Set(['luis.liu.1018@gmail.com']);
  assert.equal(isAllowed('Luis.Liu.1018@gmail.com', allowed), true);
  assert.equal(isAllowed('other@example.com', allowed), false);
});

test('signs and verifies an access cookie', () => {
  const allowed = new Set(['luis.liu.1018@gmail.com']);
  const secret = 'test-secret';
  const now = 1_000_000;
  const cookie = issueCookie('Luis.Liu.1018@gmail.com', secret, now);
  assert.equal(verifyCookie(cookie, secret, allowed, now + 1000), 'luis.liu.1018@gmail.com');
  assert.match(cookie, /\|luis\.liu\.1018@gmail\.com\|/);
  assert.equal(verifyCookie(cookie, 'other-secret', allowed, now + 1000), '');
  assert.equal(verifyCookie(cookie, secret, new Set(['nope@x.com']), now + 1000), '');
  assert.equal(verifyCookie(cookie, secret, allowed, now + 40 * 24 * 60 * 60 * 1000), '');
});

test('keeps style.css and the gate form public', () => {
  assert.equal(isPublicPath('/style.css'), true);
  assert.equal(isPublicPath('/access'), true);
  assert.equal(isPublicPath('/'), false);
  assert.equal(isPublicPath('/posts/family-europe-2026/'), false);
});

test('treats true-like front matter as a post gate', () => {
  assert.equal(isGateFlag(true), true);
  assert.equal(isGateFlag('yes'), true);
  assert.equal(isGateFlag('true'), true);
  assert.equal(isGateFlag(false), false);
  assert.equal(isGateFlag(undefined), false);
});

test('gates only listed post paths', () => {
  const gated = parseGatedPaths([
    { path: '/posts/family-europe-2026/', title: 'Family Europe trip' }
  ]);
  assert.equal(normalizeGatePath('/posts/family-europe-2026/index.html'), '/posts/family-europe-2026');
  assert.equal(isGatedPath('/posts/family-europe-2026/', gated), true);
  assert.equal(isGatedPath('/posts/family-europe-2026', gated), true);
  assert.equal(isGatedPath('/posts/family-europe-2026/index.html', gated), true);
  assert.equal(isGatedPath('/', gated), false);
  assert.equal(isGatedPath('/about/', gated), false);
  assert.equal(isGatedPath('/posts/hello/', gated), false);
  assert.equal(isGatedPath('/posts/family-europe-2026-extra/', gated), false);
  assert.equal(gatedTitle('/posts/family-europe-2026/', gated), 'Family Europe trip');
});

test('shows the post title on the gate page', () => {
  const html = gatePage({ next: '/posts/family-europe-2026/', title: 'Family Europe trip' });
  assert.match(html, /<h1>Family Europe trip<\/h1>/);
  assert.match(html, /<title>Family Europe trip · /);
  assert.doesNotMatch(html, /This post is private/);
});

test('rejects off-site redirects', () => {
  assert.equal(safeNext('/posts/hello/'), '/posts/hello/');
  assert.equal(safeNext('https://evil.example/'), '/');
  assert.equal(safeNext('//evil.example'), '/');
  assert.equal(parseForm('email=a@b.com&next=/about/').next, '/about/');
});

test('normalizes typed emails', () => {
  assert.equal(normalizeEmail('  Foo.Bar@Example.COM '), 'foo.bar@example.com');
});
