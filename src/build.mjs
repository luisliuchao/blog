import { mkdir, readdir, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { site } from './site.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'posts');
const publicDir = join(root, 'public');
const distDir = join(root, 'dist');

marked.setOptions({ gfm: true });

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function layout({ title, description, canonical, bodyClass, content }) {
  const pageTitle = title === site.title ? site.title : `${title} · ${site.title}`;
  return `<!doctype html>
<html lang="${site.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(site.author)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" type="application/atom+xml" href="/feed.xml" title="${escapeHtml(site.title)}">
  <link rel="stylesheet" href="/style.css">
</head>
<body class="${bodyClass}">
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="wordmark" href="/">${escapeHtml(site.title)}</a>
    <nav>
      <a href="/about/">About</a>
      <a href="/feed.xml">RSS</a>
    </nav>
  </header>
  <main id="main">
${content}
  </main>
  <footer class="site-footer">
    <p>${escapeHtml(site.tagline)}. <a href="${escapeHtml(site.url)}">${escapeHtml(site.url.replace('https://', ''))}</a></p>
  </footer>
</body>
</html>
`;
}

async function loadPosts() {
  const names = (await readdir(postsDir)).filter((name) => name.endsWith('.md')).sort();
  const posts = [];
  for (const name of names) {
    const raw = await readFile(join(postsDir, name), 'utf8');
    const parsed = matter(raw);
    if (parsed.data.draft === true) {
      continue;
    }
    const slug = name.replace(/\.md$/, '');
    const title = String(parsed.data.title ?? slug);
    const dateValue = parsed.data.date;
    const date =
      dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`${name}: date must be YYYY-MM-DD`);
    }
    posts.push({
      slug,
      title,
      date,
      description: String(parsed.data.description ?? ''),
      html: marked.parse(parsed.content, { async: false }),
      path: `/posts/${slug}/`
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return posts;
}

function renderIndex(posts) {
  const items = posts
    .map((post) => {
      return `    <li>
      <time datetime="${post.date}">${formatDate(post.date)}</time>
      <a href="${post.path}">${escapeHtml(post.title)}</a>
      ${post.description ? `<p>${escapeHtml(post.description)}</p>` : ''}
    </li>`;
    })
    .join('\n');
  return layout({
    title: site.title,
    description: site.tagline,
    canonical: `${site.url}/`,
    bodyClass: 'home',
    content: `    <p class="lede">${escapeHtml(site.tagline)}.</p>
    <ol class="post-list">
${items}
    </ol>`
  });
}

function renderPost(post) {
  return layout({
    title: post.title,
    description: post.description || post.title,
    canonical: `${site.url}${post.path}`,
    bodyClass: 'post',
    content: `    <article>
      <header>
        <h1>${escapeHtml(post.title)}</h1>
        <time datetime="${post.date}">${formatDate(post.date)}</time>
      </header>
      <div class="prose">
${post.html}
      </div>
    </article>`
  });
}

function renderAbout() {
  return layout({
    title: 'About',
    description: `About ${site.author}`,
    canonical: `${site.url}/about/`,
    bodyClass: 'page',
    content: `    <article>
      <header>
        <h1>About</h1>
      </header>
      <div class="prose">
        <p>I'm ${escapeHtml(site.author)}. I write here when something I built or ran into is worth keeping.</p>
        <p>Posts are markdown in git. Publishing is a rebuild on the same machine that serves <a href="${escapeHtml(site.url)}">${escapeHtml(site.url.replace('https://', ''))}</a>.</p>
      </div>
    </article>`
  });
}

function renderFeed(posts) {
  const updated = posts[0]?.date ?? '2026-09-10';
  const entries = posts
    .map((post) => {
      return `  <entry>
    <id>${site.url}${post.path}</id>
    <title>${escapeHtml(post.title)}</title>
    <link href="${site.url}${post.path}" rel="alternate"/>
    <updated>${post.date}T00:00:00Z</updated>
    <summary>${escapeHtml(post.description || post.title)}</summary>
    <content type="html">${escapeHtml(post.html)}</content>
  </entry>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(site.title)}</title>
  <subtitle>${escapeHtml(site.tagline)}</subtitle>
  <link href="${site.url}/feed.xml" rel="self"/>
  <link href="${site.url}/"/>
  <updated>${updated}T00:00:00Z</updated>
  <id>${site.url}/</id>
  <author><name>${escapeHtml(site.author)}</name></author>
${entries}
</feed>
`;
}

function renderSitemap(posts) {
  const urls = [`/`, `/about/`, ...posts.map((post) => post.path)]
    .map((path) => `  <url><loc>${site.url}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
const posts = await loadPosts();
await writeFile(join(distDir, 'index.html'), renderIndex(posts));
await mkdir(join(distDir, 'about'), { recursive: true });
await writeFile(join(distDir, 'about', 'index.html'), renderAbout());
for (const post of posts) {
  const dir = join(distDir, 'posts', post.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), renderPost(post));
}
await writeFile(join(distDir, 'feed.xml'), renderFeed(posts));
await writeFile(join(distDir, 'sitemap.xml'), renderSitemap(posts));
await writeFile(
  join(distDir, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`
);
await writeFile(
  join(distDir, 'llms.txt'),
  `# ${site.title}\n\n${site.tagline}. ${site.url}\n`
);
await cp(publicDir, distDir, { recursive: true });
console.log(`built ${posts.length} post(s) -> dist/`);
