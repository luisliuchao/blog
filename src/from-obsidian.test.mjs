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
  const attachmentsDir = join(dir, 'attachments');
  await mkdir(join(vaultDir, 'notes'), { recursive: true });
  await mkdir(postsDir, { recursive: true });
  await mkdir(attachmentsDir, { recursive: true });
  await writeFile(
    join(postsDir, 'hello.md'),
    '---\ntitle: Hello\ndate: "2026-09-10"\n---\n\nKept.\n'
  );
  return { vaultDir, postsDir, attachmentsDir, statePath };
}

test('copies only notes with publish: true', async () => {
  const { vaultDir, postsDir, attachmentsDir, statePath } = await setup();
  await writeFile(
    join(vaultDir, 'notes', 'Public note.md'),
    '---\ntitle: Public\ndate: "2026-09-11"\npublish: true\n---\n\nHi.\n'
  );
  await writeFile(
    join(vaultDir, 'notes', 'Private.md'),
    '---\ntitle: Private\ndate: "2026-09-11"\n---\n\nSecret.\n'
  );

  const slugs = await publishFromObsidian({ vaultDir, postsDir, attachmentsDir, statePath });
  assert.deepEqual(slugs, ['public-note']);
  assert.match(await readFile(join(postsDir, 'public-note.md'), 'utf8'), /Hi/);
  await assert.rejects(readFile(join(postsDir, 'private.md')));
  assert.match(await readFile(join(postsDir, 'hello.md'), 'utf8'), /Kept/);
});

test('uses created and the filename when date and title are missing', async () => {
  const { vaultDir, postsDir, attachmentsDir, statePath } = await setup();
  await writeFile(
    join(vaultDir, 'Kitchen renovation.md'),
    '---\ncreated: 2026-09-11\ntags: [home]\npublish: true\n---\n\nPlan.\n'
  );

  await publishFromObsidian({ vaultDir, postsDir, attachmentsDir, statePath });
  const copied = await readFile(join(postsDir, 'kitchen-renovation.md'), 'utf8');
  assert.match(copied, /title: Kitchen renovation/);
  assert.match(copied, /date: '2026-09-11'|date: "2026-09-11"|date: 2026-09-11/);
  assert.doesNotMatch(copied, /publish:/);
});

test('unpublishes a note when publish is removed', async () => {
  const { vaultDir, postsDir, attachmentsDir, statePath } = await setup();
  await writeFile(
    join(vaultDir, 'Later.md'),
    '---\ntitle: Later\ndate: "2026-09-11"\npublish: true\n---\n\nOut.\n'
  );
  await publishFromObsidian({ vaultDir, postsDir, attachmentsDir, statePath });
  await writeFile(
    join(vaultDir, 'Later.md'),
    '---\ntitle: Later\ndate: "2026-09-11"\n---\n\nOut.\n'
  );
  await publishFromObsidian({ vaultDir, postsDir, attachmentsDir, statePath });
  await assert.rejects(readFile(join(postsDir, 'later.md')));
  assert.match(await readFile(join(postsDir, 'hello.md'), 'utf8'), /Kept/);
});

test('copies embedded attachments from the vault', async () => {
  const { vaultDir, postsDir, attachmentsDir, statePath } = await setup();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );
  await mkdir(join(vaultDir, '_attachments'), { recursive: true });
  await writeFile(join(vaultDir, '_attachments', 'pic.png'), png);
  await writeFile(
    join(vaultDir, 'Photo.md'),
    '---\ncreated: 2026-09-11\npublish: true\n---\n\n![[pic.png]]\n'
  );
  await publishFromObsidian({ vaultDir, postsDir, attachmentsDir, statePath });
  const copied = await readFile(join(attachmentsDir, 'pic.png'));
  assert.equal(copied.length, png.length);
});
