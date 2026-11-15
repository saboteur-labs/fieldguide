import MarkdownIt from 'markdown-it';

const REFERENCE_DEFINITION = /^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^>]*)>|(\S+))/;

/**
 * Parser that keeps link targets as written. Reference-style usages carry
 * `meta.label` and are skipped, since their definitions are extracted instead.
 */
function createParser() {
  const md = new MarkdownIt();
  md.normalizeLink = (url) => url;
  return md;
}

const parser = createParser();

/** GitHub-style slug of heading text, before duplicate suffixing. */
function baseSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');
}

function renderedText(inline) {
  let text = '';
  for (const child of inline.children ?? []) {
    if (child.type === 'text' || child.type === 'code_inline' || child.type === 'image') {
      text += child.content;
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      text += ' ';
    }
  }
  return text.trim();
}

function linksInInline(inline, firstLine, links) {
  let line = firstLine;
  for (const child of inline.children ?? []) {
    if (child.type === 'softbreak' || child.type === 'hardbreak') {
      line += 1;
    } else if (child.type === 'link_open' && child.markup !== 'autolink' && child.markup !== 'linkify') {
      if (!child.meta?.label) {
        links.push({ kind: 'inline', target: child.attrGet('href'), line });
      }
    } else if (child.type === 'image' && !child.meta?.label) {
      links.push({ kind: 'image', target: child.attrGet('src'), line });
    }
  }
}

function referenceDefinitions(lines, codeRanges, bodyStartLine, links) {
  lines.forEach((text, index) => {
    if (codeRanges.some(([start, end]) => index >= start && index < end)) return;
    const match = REFERENCE_DEFINITION.exec(text);
    if (!match || match[1].startsWith('^')) return;
    links.push({ kind: 'reference', target: match[2] ?? match[3], line: bodyStartLine + index });
  });
}

/** Unique slug for a heading: `base`, then `base-1`, `base-2`, ... */
function uniqueSlug(base, used) {
  let slug = base;
  let n = 0;
  while (used.has(slug)) slug = `${base}-${++n}`;
  used.add(slug);
  return slug;
}

/**
 * Extract headings (with GitHub-style slugs) and link targets from a page body.
 * `bodyStartLine` is the file line number of the first line of `body`.
 */
export function extract(body, bodyStartLine = 1) {
  const tokens = parser.parse(body, {});
  const headings = [];
  const links = [];
  const codeRanges = [];
  const usedSlugs = new Set();
  let currentLine = 0;
  let pendingHeading = null;

  for (const token of tokens) {
    if (token.map) currentLine = token.map[0];
    if (token.type === 'fence' || token.type === 'code_block') {
      codeRanges.push(token.map);
    } else if (token.type === 'heading_open') {
      pendingHeading = { level: Number(token.tag.slice(1)), line: bodyStartLine + token.map[0] };
    } else if (token.type === 'inline') {
      if (pendingHeading) {
        const text = renderedText(token);
        headings.push({ ...pendingHeading, text, slug: uniqueSlug(baseSlug(text), usedSlugs) });
        pendingHeading = null;
      }
      linksInInline(token, bodyStartLine + currentLine, links);
    }
  }

  referenceDefinitions(body.split('\n'), codeRanges, bodyStartLine, links);
  links.sort((a, b) => a.line - b.line);
  return { headings, links };
}
