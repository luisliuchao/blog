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
