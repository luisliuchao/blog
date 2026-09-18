import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gateEnabled,
  isAllowed,
  isPublicPath,
  issueCookie,
  normalizeEmail,
  parseAllowedEmails,
  parseForm,
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

test('keeps style.css and the gate public', () => {
  assert.equal(isPublicPath('/style.css'), true);
  assert.equal(isPublicPath('/access'), true);
  assert.equal(isPublicPath('/'), false);
  assert.equal(isPublicPath('/posts/family-europe-2026/'), false);
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
