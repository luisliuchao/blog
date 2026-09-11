import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublishedMarkdown } from './from-obsidian.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaultDir = resolve(process.env.BLOG_OBSIDIAN_VAULT ?? '/home/Documents/notes');
const debounceMs = Number(process.env.BLOG_WATCH_DEBOUNCE_MS ?? 1500);
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

async function readPublished(filePath) {
  const raw = await readFile(filePath, 'utf8').catch(() => null);
  if (raw === null) {
    return false;
  }
  return isPublishedMarkdown(raw);
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
  const published = new Map();
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

  watch(vaultDir, { recursive: true }, (_event, filename) => {
    if (!filename) {
      return;
    }
    const filePath = join(vaultDir, filename);
    if (!isWatchedNote(vaultDir, filePath)) {
      return;
    }
    void readPublished(filePath).then((isPublished) => {
      const wasPublished = published.get(filePath) === true;
      published.set(filePath, isPublished);
      if (shouldRebuild({ wasPublished, isPublished })) {
        console.log(`blog-watch: ${filename} publish=${isPublished}`);
        schedule();
      }
    });
  });

  console.log(`blog-watch: watching ${vaultDir}`);
}
