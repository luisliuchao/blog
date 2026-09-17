import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPublishedMarkdown } from './from-obsidian.mjs';
import {
  collectNoteStates,
  isWatchedNote,
  noteFingerprint,
  pollChangedNotes,
  pollShouldRebuild,
  shouldRebuild,
  watchEventAction
} from './watch.mjs';

test('rebuilds when publish flips on or off', () => {
  assert.equal(shouldRebuild({ wasPublished: false, isPublished: true }), true);
  assert.equal(shouldRebuild({ wasPublished: true, isPublished: false }), true);
  assert.equal(shouldRebuild({ wasPublished: true, isPublished: true }), true);
  assert.equal(shouldRebuild({ wasPublished: false, isPublished: false }), false);
});

test('treats draft published notes as unpublished', () => {
  assert.equal(
    isPublishedMarkdown('---\npublish: true\ndraft: true\n---\n\nHi.\n'),
    false
  );
  assert.equal(isPublishedMarkdown('---\npublish: true\n---\n\nHi.\n'), true);
  assert.equal(isPublishedMarkdown('---\ntags: [meta]\n---\n\nHi.\n'), false);
});

test('ignores Obsidian internals and non-markdown', () => {
  const vault = '/home/Documents/remote-coding/notes';
  assert.equal(isWatchedNote(vault, `${vault}/10 Projects/Plan.md`), true);
  assert.equal(isWatchedNote(vault, `${vault}/.obsidian/workspace.json`), false);
  assert.equal(isWatchedNote(vault, `${vault}/_attachments/pic.png`), false);
});

test('nameless watch events scan instead of being ignored', () => {
  const vault = '/vault';
  assert.equal(watchEventAction(vault, null), 'scan');
  assert.equal(watchEventAction(vault, ''), 'scan');
  assert.equal(watchEventAction(vault, 'note.md.tmp'), 'ignore');
  assert.equal(watchEventAction(vault, '10 Projects/Plan.md'), 'note');
});

test('fingerprints published notes by mtime and size', () => {
  assert.equal(noteFingerprint({ mtimeMs: 1.5, size: 10 }), '1.5:10');
});

test('poll rebuilds when a published fingerprint changes', () => {
  const previous = new Map([['/n/a.md', { published: true, fingerprint: '1:10' }]]);
  const current = new Map([['/n/a.md', { published: true, fingerprint: '2:11' }]]);
  assert.equal(pollShouldRebuild({ previous, current }), true);
  assert.deepEqual(pollChangedNotes({ previous, current }), ['/n/a.md']);
});

test('poll rebuilds when publish flips on or off', () => {
  const privateNote = new Map([['/n/a.md', { published: false, fingerprint: '1:10' }]]);
  const publicNote = new Map([['/n/a.md', { published: true, fingerprint: '1:10' }]]);
  assert.equal(pollShouldRebuild({ previous: privateNote, current: publicNote }), true);
  assert.equal(pollShouldRebuild({ previous: publicNote, current: privateNote }), true);
});

test('poll rebuilds when a published note disappears', () => {
  const previous = new Map([['/n/a.md', { published: true, fingerprint: '1:10' }]]);
  assert.equal(pollShouldRebuild({ previous, current: new Map() }), true);
});

test('poll ignores unpublished mtime changes', () => {
  const previous = new Map([['/n/a.md', { published: false, fingerprint: '1:10' }]]);
  const current = new Map([['/n/a.md', { published: false, fingerprint: '2:11' }]]);
  assert.equal(pollShouldRebuild({ previous, current }), false);
});

test('poll is quiet when nothing changed', () => {
  const states = new Map([['/n/a.md', { published: true, fingerprint: '1:10' }]]);
  assert.equal(pollShouldRebuild({ previous: states, current: states }), false);
});

test('collects published fingerprints from the vault', async () => {
  const vault = await mkdtemp(join(tmpdir(), 'blog-watch-'));
  await mkdir(join(vault, '.obsidian'));
  await writeFile(join(vault, '.obsidian', 'app.md'), '---\npublish: true\n---\nsecret\n');
  await writeFile(join(vault, 'private.md'), '---\ntags: [x]\n---\nhi\n');
  await writeFile(join(vault, 'public.md'), '---\npublish: true\n---\nhello\n');
  const states = await collectNoteStates(vault);
  assert.equal(states.has(join(vault, '.obsidian', 'app.md')), false);
  assert.equal(states.get(join(vault, 'private.md'))?.published, false);
  assert.equal(states.get(join(vault, 'public.md'))?.published, true);
  assert.match(states.get(join(vault, 'public.md')).fingerprint, /^\d+(?:\.\d+)?:\d+$/);
});
