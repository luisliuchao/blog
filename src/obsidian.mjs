import { marked } from 'marked';

const wikiPattern = /(!)?\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;
const codeSplit = /(```[\s\S]*?```|`[^`]+`)/;
const imageName = /\.(png|jpe?g|gif|webp|svg|avif|pdf)$/i;
const maxEmbedDepth = 3;

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function normalizeNoteName(value) {
  return String(value).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function headingId(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function isAttachmentRef(target) {
  return imageName.test(target.trim());
}

export function collectWikiTargets(markdown) {
  const targets = [];
  for (const part of markdown.split(codeSplit)) {
    if (part.startsWith('```') || part.startsWith('`')) {
      continue;
    }
    for (const match of part.matchAll(wikiPattern)) {
      targets.push(match[2].trim());
    }
  }
  return targets;
}

export function indexPosts(posts) {
  const byKey = new Map();
  for (const post of posts) {
    byKey.set(normalizeNoteName(post.title), post);
    byKey.set(normalizeNoteName(post.slug), post);
  }
  return (name) => {
    return byKey.get(normalizeNoteName(name)) ?? null;
  };
}

function rewriteSegment(segment, ctx) {
  return segment.replace(wikiPattern, (_full, bang, rawTarget, heading, alias) => {
    const target = rawTarget.trim();
    const label = (alias ?? target).trim();
    if (bang) {
      if (isAttachmentRef(target)) {
        const href = ctx.attachments.get(target.toLowerCase()) ?? ctx.attachments.get(target);
        if (!href) {
          return label;
        }
        return `![${label}](${href})`;
      }
      const post = ctx.findPost(target);
      if (!post || ctx.stack.has(post.slug) || ctx.depth >= maxEmbedDepth) {
        return label;
      }
      const inner = rewriteObsidian(post.content, {
        findPost: ctx.findPost,
        attachments: ctx.attachments,
        stack: new Set(ctx.stack).add(post.slug),
        depth: ctx.depth + 1
      });
      const html = marked.parse(inner, { async: false });
      return `\n\n<div class="embed">\n${html}\n</div>\n\n`;
    }
    const post = ctx.findPost(target);
    if (!post) {
      return label;
    }
    const hash = heading ? `#${headingId(heading)}` : '';
    return `[${label}](${post.path}${hash})`;
  });
}

export function rewriteObsidian(markdown, ctx) {
  return markdown
    .split(codeSplit)
    .map((part) => {
      if (part.startsWith('```') || part.startsWith('`')) {
        return part;
      }
      return rewriteSegment(part, ctx);
    })
    .join('');
}

export function renderMarkdown(markdown, ctx) {
  return marked.parse(
    rewriteObsidian(markdown, {
      findPost: ctx.findPost,
      attachments: ctx.attachments,
      stack: ctx.stack ?? new Set(),
      depth: ctx.depth ?? 0
    }),
    { async: false }
  );
}
