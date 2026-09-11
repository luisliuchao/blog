import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { publishFromObsidian } from './from-obsidian.mjs';

const temps = [];

afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'blog-obsidian-'));
  temps.push(dir);
  const vaultDir = join(dir, 'vault');
  const postsDir = join(dir, 'posts');
  const statePath = join(dir, '.obsidian-sync.json');
  await mkdir(join(vaultDir, 'notes'), { recursive: true });
  await mkdir(postsDir, { recursive: true });
  await writeFile(
    join(postsDir, 'hello.md'),
    '---\ntitle: Hello\ndate: "2026-09-10"\n---\n\nKept.\n'
  );
  return { vaultDir, postsDir, statePath };
}

test('copies only notes with publish: true', async () => {
  const { vaultDir, postsDir, statePath } = await setup();
  await writeFile(
    join(vaultDir, 'notes', 'Public note.md'),
    '---\ntitle: Public\ndate: "2026-09-11"\npublish: true\n---\n\nHi.\n'
  );
  await writeFile(
    join(vaultDir, 'notes', 'Private.md'),
    '---\ntitle: Private\ndate: "2026-09-11"\n---\n\nSecret.\n'
  );

  const slugs = await publishFromObsidian({ vaultDir, postsDir, statePath });
  assert.deepEqual(slugs, ['public-note']);
  assert.match(await readFile(join(postsDir, 'public-note.md'), 'utf8'), /Hi/);
  await assert.rejects(readFile(join(postsDir, 'private.md')));
  assert.match(await readFile(join(postsDir, 'hello.md'), 'utf8'), /Kept/);
});

test('unpublishes a note when publish is removed', async () => {
  const { vaultDir, postsDir, statePath } = await setup();
  await writeFile(
    join(vaultDir, 'Later.md'),
    '---\ntitle: Later\ndate: "2026-09-11"\npublish: true\n---\n\nOut.\n'
  );
  await publishFromObsidian({ vaultDir, postsDir, statePath });
  await writeFile(
    join(vaultDir, 'Later.md'),
    '---\ntitle: Later\ndate: "2026-09-11"\n---\n\nOut.\n'
  );
  await publishFromObsidian({ vaultDir, postsDir, statePath });
  await assert.rejects(readFile(join(postsDir, 'later.md')));
  assert.match(await readFile(join(postsDir, 'hello.md'), 'utf8'), /Kept/);
});
