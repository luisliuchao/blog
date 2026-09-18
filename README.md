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
Set `raw: true` when the body is HTML (the family trip planner). That body is not run through markdown.

Then, on the remote workspace:

```bash
~/bin/blog-up.sh
```

## Write in Obsidian first

Keep the vault private. A note is published only when you opt in.

1. Write the note in `/home/Documents/remote-coding/notes` as usual (`created` + `tags` is enough).
2. When you want it on the blog, set `publish: true`. Optional: `title`, `date`, `description`, `slug`. If those are missing, the filename is the title and `created` is the date.
3. Flip `publish: true` and save. `blog-watch` notices, copies opted-in notes, and rebuilds. No need to run a command for that.

Manual publish still works:

```bash
npm run from-obsidian   # defaults to /home/Documents/remote-coding/notes
~/bin/blog-up.sh        # syncs, rebuilds, restarts the server and host forward
```

Workspace boot (`~/bin/blog-boot.sh`, from `bootstrap.sh`) installs deps if needed, syncs the vault, builds, starts `blog` + `blog-watch`, and recreates the host forward on **15176**. `blog-watch` (`npm run watch`) ignores `.obsidian` and private notes. It rebuilds when `publish` turns on or off, and when an already-published note is saved. `fs.watch` can miss LiveSync and Coder Desktop writes, so it also polls published-note mtime and size every 15s (`BLOG_WATCH_POLL_MS`, `0` disables). Only notes with `publish: true` are copied into `posts/`. Clearing that flag (or setting `draft: true`) removes that copy on the next sync. Hand-written files in `posts/` such as `hello.md` are left alone. Agents never set `publish` — only you do.

Use a kebab-case `slug` in front matter when the filename would not make a good URL (Chinese titles, punctuation).

This is the free path. Official Obsidian Publish is a paid host. Here, `[[Note]]` and `![[Note]]` resolve among notes you marked `publish: true`. `![[image.png]]` copies from the vault (`_attachments/` or anywhere in it) into `public/attachments/`. A wikilink or embed of a private note becomes plain text — the body never goes out.

Do not open the whole vault as `posts/`. Posts in `posts/` are still built into `dist/`. A post with `gate: true` asks for an invited email before the body is served.

That pulls (if this repo is on GitHub), rebuilds, restarts the supervisor program, and refreshes the Unraid host forward on port **15176**.

## Email gate

Set `gate: true` on a post to require an invited email before that post is served. The rest of the site stays public. Gated posts stay on the home page (marked invite only) and are left out of RSS and the sitemap.

Matching is exact (case-insensitive). Knowing an invited address is enough; there is no one-time code.

Add or remove people in `~/.blog/allowed-emails` (one address per line). The server rereads that file on each request. `luis.liu.1018@gmail.com` is seeded if the file is missing.

Optional overrides: `BLOG_ALLOWED_EMAILS` (comma-separated) and `BLOG_GATE_SECRET`.

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
