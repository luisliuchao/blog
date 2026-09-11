import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexPosts, renderMarkdown, rewriteObsidian } from './obsidian.mjs';

const posts = [
  {
    slug: 'public-note',
    title: 'Public note',
    path: '/posts/public-note/',
    content: 'Hello from the public note.\n\n## Details\nMore.'
  },
  {
    slug: 'with-embed',
    title: 'With embed',
    path: '/posts/with-embed/',
    content: 'See ![[Public note]] and [[Public note|the note]].'
  }
];
const findPost = indexPosts(posts);
const attachments = new Map([['pic.png', '/attachments/pic.png']]);

test('rewrites wikilinks to published notes only', () => {
  const out = rewriteObsidian('Read [[Public note]] and [[Private secret]].', {
    findPost,
    attachments,
    stack: new Set(),
    depth: 0
  });
  assert.match(out, /\[Public note\]\(\/posts\/public-note\/\)/);
  assert.doesNotMatch(out, /Private secret\]\(/);
  assert.match(out, /and Private secret\./);
});

test('embeds published notes and never inlines unpublished ones', () => {
  const html = renderMarkdown('Intro\n\n![[Public note]]\n\n![[Private secret]]\n\n![[pic.png]]', {
    findPost,
    attachments
  });
  assert.match(html, /Hello from the public note/);
  assert.match(html, /class="embed"/);
  assert.match(html, /Private secret/);
  assert.doesNotMatch(html, /super secret body/);
  assert.match(html, /src="\/attachments\/pic\.png"/);
});

test('leaves wiki syntax alone inside code', () => {
  const out = rewriteObsidian('Use `[[Public note]]` in a vault.', {
    findPost,
    attachments,
    stack: new Set(),
    depth: 0
  });
  assert.match(out, /`\[\[Public note\]\]`/);
  assert.doesNotMatch(out, /\]\(\/posts\/public-note\/\)/);
});
