import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublishedMarkdown } from './from-obsidian.mjs';
import { isWatchedNote, shouldRebuild } from './watch.mjs';

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
  const vault = '/home/Documents/notes';
  assert.equal(isWatchedNote(vault, `${vault}/10 Projects/Plan.md`), true);
  assert.equal(isWatchedNote(vault, `${vault}/.obsidian/workspace.json`), false);
  assert.equal(isWatchedNote(vault, `${vault}/_attachments/pic.png`), false);
});
