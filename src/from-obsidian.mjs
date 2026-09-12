import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { collectWikiTargets, isAttachmentRef } from './obsidian.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultVaultDir = '/home/Documents/remote-coding/notes';
const defaultPostsDir = join(root, 'posts');
const defaultAttachmentsDir = join(root, 'public', 'attachments');
const defaultStatePath = join(root, '.obsidian-sync.json');
const skipDirNames = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

function isoDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function isTruthy(value) {
  return value === true || value === 'true' || value === 'yes';
}

export function isPublishedMarkdown(raw) {
  const parsed = matter(raw);
  return isTruthy(parsed.data.publish) && parsed.data.draft !== true;
}

function toSlug(name, explicit) {
  if (explicit) {
    const slug = String(explicit).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`slug must be kebab-case: ${explicit}`);
    }
    return slug;
  }
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  if (!slug) {
    throw new Error(`${name}: add a kebab-case slug in front matter`);
  }
  return slug;
}

async function walkFiles(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) {
        continue;
      }
      files.push(...(await walkFiles(path, predicate)));
      continue;
    }
    if (entry.isFile() && predicate(entry.name, path)) {
      files.push(path);
    }
  }
  return files;
}

async function indexAttachments(vaultDir) {
  const files = await walkFiles(vaultDir, (name) => isAttachmentRef(name));
  const byName = new Map();
  for (const path of files) {
    byName.set(basename(path).toLowerCase(), path);
  }
  return byName;
}

export async function publishFromObsidian({
  vaultDir,
  postsDir = defaultPostsDir,
  attachmentsDir = defaultAttachmentsDir,
  statePath = defaultStatePath
}) {
  const vaultStat = await stat(vaultDir).catch(() => null);
  if (!vaultStat?.isDirectory()) {
    throw new Error(`Obsidian vault not found: ${vaultDir}`);
  }

  await mkdir(postsDir, { recursive: true });
  await mkdir(attachmentsDir, { recursive: true });
  const previous = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{"slugs":[]}'));
  const previousSlugs = new Set(previous.slugs ?? []);
  const previousAttachments = new Set(previous.attachments ?? []);
  const nextSlugs = [];
  const nextAttachments = [];
  const seen = new Set();
  const vaultAttachments = await indexAttachments(vaultDir);

  for (const path of await walkFiles(vaultDir, (name) => name.endsWith('.md'))) {
    const raw = await readFile(path, 'utf8');
    const parsed = matter(raw);
    if (!isPublishedMarkdown(raw)) {
      continue;
    }
    const rel = relative(vaultDir, path);
    const stem = basename(path, extname(path));
    const slug = toSlug(stem, parsed.data.slug);
    const title = String(parsed.data.title ?? stem);
    const date = isoDate(parsed.data.date) || isoDate(parsed.data.created);
    if (!date) {
      throw new Error(`${rel}: date or created must be YYYY-MM-DD`);
    }
    if (seen.has(slug)) {
      throw new Error(`duplicate published slug: ${slug}`);
    }
    seen.add(slug);
    nextSlugs.push(slug);
    const { publish: _publish, ...rest } = parsed.data;
    const body = matter.stringify(parsed.content, { ...rest, title, date });
    await writeFile(join(postsDir, `${slug}.md`), body);
    for (const target of collectWikiTargets(parsed.content)) {
      if (!isAttachmentRef(target)) {
        continue;
      }
      const source = vaultAttachments.get(basename(target).toLowerCase());
      if (!source) {
        continue;
      }
      const destName = basename(source);
      await cp(source, join(attachmentsDir, destName));
      if (!nextAttachments.includes(destName)) {
        nextAttachments.push(destName);
      }
    }
    console.log(`publish ${rel} -> posts/${slug}.md`);
  }

  for (const slug of previousSlugs) {
    if (!seen.has(slug)) {
      await rm(join(postsDir, `${slug}.md`), { force: true });
      console.log(`unpublish posts/${slug}.md`);
    }
  }
  for (const name of previousAttachments) {
    if (!nextAttachments.includes(name)) {
      await rm(join(attachmentsDir, name), { force: true });
    }
  }

  nextSlugs.sort();
  nextAttachments.sort();
  await writeFile(
    statePath,
    `${JSON.stringify({ slugs: nextSlugs, attachments: nextAttachments }, null, 2)}\n`
  );
  return nextSlugs;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const vaultDir = process.argv[2] ?? process.env.BLOG_OBSIDIAN_VAULT ?? defaultVaultDir;
  const slugs = await publishFromObsidian({ vaultDir });
  console.log(`synced ${slugs.length} published note(s)`);
}
