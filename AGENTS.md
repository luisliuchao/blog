# Blog repo conventions

Public URL: https://blog.luisliuchao.com (Cloudflare tunnel on the Unraid host → host port 15176 → `blog-forward` socat container → blog server on workspace port 5176).

## Git workflow

Work directly on `main` — no feature branches, no pull requests. This is a solo personal repo; commit to `main` and push. (Owner's standing instruction, 2026-09-11.)

## Deploying

`~/bin/blog-up.sh` pulls `main`, rebuilds, restarts the `blog` and `blog-watch` supervisor programs, and refreshes the Unraid host forward on port 15176. Run it after pushing.

## Publishing model

Posts come from the Obsidian vault at `/home/Documents/remote-coding/notes`: the watcher syncs notes with `publish: true` frontmatter into `posts/` and rebuilds. Never set `publish` on a note yourself — only the owner decides what gets published. Hand-written files in `posts/` are left alone by the sync.
