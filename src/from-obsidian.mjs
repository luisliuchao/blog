import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultPostsDir = join(root, 'posts');
const defaultStatePath = join(root, '.obsidian-sync.json');
const skipDirNames = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

function isTruthy(value) {
  return value === true || value === 'true' || value === 'yes';
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

async function walkMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) {
        continue;
      }
      files.push(...(await walkMarkdown(path)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

export async function publishFromObsidian({
  vaultDir,
  postsDir = defaultPostsDir,
  statePath = defaultStatePath
}) {
  const vaultStat = await stat(vaultDir).catch(() => null);
  if (!vaultStat?.isDirectory()) {
    throw new Error(`Obsidian vault not found: ${vaultDir}`);
  }

  await mkdir(postsDir, { recursive: true });
  const previous = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{"slugs":[]}'));
  const previousSlugs = new Set(previous.slugs ?? []);
  const nextSlugs = [];
  const seen = new Set();

  for (const path of await walkMarkdown(vaultDir)) {
    const raw = await readFile(path, 'utf8');
    const parsed = matter(raw);
    if (!isTruthy(parsed.data.publish) || parsed.data.draft === true) {
      continue;
    }
    const rel = relative(vaultDir, path);
    const slug = toSlug(basename(path, extname(path)), parsed.data.slug);
    if (seen.has(slug)) {
      throw new Error(`duplicate published slug: ${slug}`);
    }
    seen.add(slug);
    nextSlugs.push(slug);
    await writeFile(join(postsDir, `${slug}.md`), raw);
    console.log(`publish ${rel} -> posts/${slug}.md`);
  }

  for (const slug of previousSlugs) {
    if (!seen.has(slug)) {
      await rm(join(postsDir, `${slug}.md`), { force: true });
      console.log(`unpublish posts/${slug}.md`);
    }
  }

  nextSlugs.sort();
  await writeFile(statePath, `${JSON.stringify({ slugs: nextSlugs }, null, 2)}\n`);
  return nextSlugs;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const vaultDir = process.argv[2] ?? process.env.BLOG_OBSIDIAN_VAULT;
  if (!vaultDir) {
    console.error('Usage: node src/from-obsidian.mjs <vault-dir>');
    console.error('Or set BLOG_OBSIDIAN_VAULT.');
    process.exit(1);
  }
  const slugs = await publishFromObsidian({ vaultDir });
  console.log(`synced ${slugs.length} published note(s)`);
}
