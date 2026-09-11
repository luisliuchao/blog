# Blog

Personal notes at **https://blog.luisliuchao.com**.

Markdown in `posts/` becomes static HTML. The Coder workspace serves `dist/` on port 5176; a host-port forward exposes it for the Cloudflare Tunnel hostname.

## Write a post

Create `posts/your-slug.md`:

```md
---
title: Title
date: 2026-09-10
description: One-line summary for the index and RSS.
---

Body in markdown.
```

Set `draft: true` to keep a file out of the build. Dates are `YYYY-MM-DD`.

Then, on the remote workspace:

```bash
~/bin/blog-up.sh
```

## Write in Obsidian first

Keep the vault private. A note is published only when you opt in.

1. Write the note in `/home/Documents/notes` as usual (`created` + `tags` is enough).
2. When you want it on the blog, set `publish: true`. Optional: `title`, `date`, `description`, `slug`. If those are missing, the filename is the title and `created` is the date.
3. Flip `publish: true` and save. `blog-watch` notices, copies opted-in notes, and rebuilds. No need to run a command for that.

Manual publish still works:

```bash
npm run from-obsidian   # defaults to /home/Documents/notes
~/bin/blog-up.sh        # syncs, rebuilds, restarts the server and host forward
```

Workspace boot (`~/bin/blog-boot.sh`, from `bootstrap.sh`) installs deps if needed, syncs the vault, builds, starts `blog` + `blog-watch`, and recreates the host forward on **15176**. `blog-watch` (`npm run watch`) ignores `.obsidian` and private notes. It rebuilds when `publish` turns on or off, and when an already-published note is saved. Only notes with `publish: true` are copied into `posts/`. Clearing that flag (or setting `draft: true`) removes that copy on the next sync. Hand-written files in `posts/` such as `hello.md` are left alone. Agents never set `publish` — only you do.

Use a kebab-case `slug` in front matter when the filename would not make a good URL (Chinese titles, punctuation).

This is the free path. Official Obsidian Publish is a paid host. Here, `[[Note]]` and `![[Note]]` resolve among notes you marked `publish: true`. `![[image.png]]` copies from the vault (`_attachments/` or anywhere in it) into `public/attachments/`. A wikilink or embed of a private note becomes plain text — the body never goes out.

Do not open the whole vault as `posts/`. The blog treats every non-draft file there as public.

That pulls (if this repo is on GitHub), rebuilds, restarts the supervisor program, and refreshes the Unraid host forward on port **15176**.

## Local preview

```bash
npm install
npm run dev          # build + serve http://127.0.0.1:5176
```

## Cloudflare hostname

`blog.luisliuchao.com` is not in DNS yet. In Cloudflare Zero Trust → Networks → Tunnels, add a public hostname next to `luci.luisliuchao.com`:

| Field | Value |
|---|---|
| Subdomain | `blog` |
| Domain | `luisliuchao.com` |
| Type | HTTP |
| URL | `localhost:15176` (or the same Unraid host target luci uses, with port **15176**) |

Luci already uses host port `15175` → workspace `5175`. This blog uses `15176` → workspace `5176`.
