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
3. Publish:

```bash
npm run from-obsidian   # defaults to /home/Documents/notes
~/bin/blog-up.sh        # syncs that vault, then rebuilds
```

Only notes with `publish: true` are copied into `posts/`. Clearing that flag (or setting `draft: true`) removes that copy on the next sync. Hand-written files in `posts/` such as `hello.md` are left alone. Agents never set `publish` — only you do.

Use a kebab-case `slug` in front matter when the filename would not make a good URL (Chinese titles, punctuation). Wiki links (`[[Note]]`) and embeds (`![[image]]`) are not rewritten yet — use normal markdown links and images on notes you publish.

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
