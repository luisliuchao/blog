import { existsSync, watch } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublishedMarkdown } from './from-obsidian.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaultDir = resolve(process.env.BLOG_OBSIDIAN_VAULT ?? '/home/Documents/remote-coding/notes');
const debounceMs = Number(process.env.BLOG_WATCH_DEBOUNCE_MS ?? 1500);
const pollMs = Number(process.env.BLOG_WATCH_POLL_MS ?? 15000);
const skipDirNames = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

export function shouldRebuild({ wasPublished, isPublished }) {
  return wasPublished || isPublished;
}

export function isWatchedNote(vaultRoot, filePath) {
  const rel = relative(vaultRoot, filePath);
  if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
    return false;
  }
  if (extname(filePath) !== '.md') {
    return false;
  }
  return !rel.split(sep).some((part) => skipDirNames.has(part));
}

export function noteFingerprint({ mtimeMs, size }) {
  return `${mtimeMs}:${size}`;
}

export function watchEventAction(vaultRoot, filename) {
  if (filename == null || filename === '') {
    return 'scan';
  }
  const filePath = join(vaultRoot, filename);
  if (!isWatchedNote(vaultRoot, filePath)) {
    return 'ignore';
  }
  return 'note';
}

export function pollChangedNotes({ previous, current }) {
  const changed = [];
  for (const [path, curr] of current) {
    const prev = previous.get(path);
    if (curr.published) {
      if (!prev?.published || prev.fingerprint !== curr.fingerprint) {
        changed.push(path);
      }
      continue;
    }
    if (prev?.published) {
      changed.push(path);
    }
  }
  for (const [path, prev] of previous) {
    if (prev.published && !current.has(path)) {
      changed.push(path);
    }
  }
  return changed;
}

export function pollShouldRebuild({ previous, current }) {
  return pollChangedNotes({ previous, current }).length > 0;
}

async function readPublished(filePath) {
  const raw = await readFile(filePath, 'utf8').catch(() => null);
  if (raw === null) {
    return false;
  }
  return isPublishedMarkdown(raw);
}

export async function collectNoteStates(vaultRoot) {
  const states = new Map();

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirNames.has(entry.name)) {
          continue;
        }
        await walk(path);
        continue;
      }
      if (!entry.isFile() || !isWatchedNote(vaultRoot, path)) {
        continue;
      }
      const [fileStat, published] = await Promise.all([stat(path), readPublished(path)]);
      states.set(path, {
        published,
        fingerprint: noteFingerprint(fileStat)
      });
    }
  }

  if (existsSync(vaultRoot)) {
    await walk(vaultRoot);
  }
  return states;
}

function rebuild() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npm', ['run', 'from-obsidian'], {
      cwd: root,
      env: { ...process.env, BLOG_OBSIDIAN_VAULT: vaultDir },
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`from-obsidian exited ${code}`));
        return;
      }
      const build = spawn('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
      build.on('error', reject);
      build.on('exit', (buildCode) => {
        if (buildCode !== 0) {
          reject(new Error(`build exited ${buildCode}`));
          return;
        }
        resolvePromise();
      });
    });
  });
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  void (async () => {
  let lastStates = new Map();
  let ready = false;
  let timer = null;
  let running = false;
  let queued = false;

  async function run() {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      console.log(`blog-watch: publishing from ${vaultDir}`);
      await rebuild();
      lastStates = await collectNoteStates(vaultDir);
      ready = true;
    } catch (error) {
      console.error(`blog-watch: ${error.message}`);
    } finally {
      running = false;
      if (queued) {
        queued = false;
        timer = setTimeout(() => {
          void run();
        }, debounceMs);
      }
    }
  }

  function schedule() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void run();
    }, debounceMs);
  }

  async function checkFingerprints(reason) {
    if (!ready) {
      return;
    }
    const current = await collectNoteStates(vaultDir);
    const changed = pollChangedNotes({ previous: lastStates, current });
    if (changed.length === 0) {
      return;
    }
    const names = changed.map((path) => relative(vaultDir, path) || path);
    console.log(`blog-watch: ${reason} ${names.join(', ')}`);
    schedule();
  }

  while (!existsSync(vaultDir)) {
    console.log(`blog-watch: waiting for ${vaultDir}`);
    await new Promise((resolveWait) => {
      setTimeout(resolveWait, 5000);
    });
  }

  watch(vaultDir, { recursive: true }, (_event, filename) => {
    const action = watchEventAction(vaultDir, filename);
    if (action === 'ignore') {
      return;
    }
    if (action === 'scan') {
      void checkFingerprints('watch');
      return;
    }
    const filePath = join(vaultDir, filename);
    void readPublished(filePath).then((isPublished) => {
      const wasPublished = lastStates.get(filePath)?.published === true;
      if (shouldRebuild({ wasPublished, isPublished })) {
        console.log(`blog-watch: ${filename} publish=${isPublished}`);
        schedule();
      }
    });
  });

  console.log(`blog-watch: watching ${vaultDir}`);
  if (Number.isFinite(pollMs) && pollMs > 0) {
    setInterval(() => {
      void checkFingerprints('poll');
    }, pollMs);
    console.log(`blog-watch: polling every ${pollMs}ms`);
  }
  // fs.watch misses some Coder Desktop / LiveSync writes; sync once at start
  // so a later frontmatter fix still publishes after a failed first attempt.
  void run();
  })();
}
