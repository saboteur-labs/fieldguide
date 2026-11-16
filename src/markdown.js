import MarkdownIt from 'markdown-it';

/**
 * Parser that keeps link targets as written. Reference-style usages carry
 * `meta.label` and are skipped; their definitions are recorded instead by
 * wrapping markdown-it's own `reference` block rule, so CommonMark's rules
 * (definitions can't interrupt a paragraph, may sit inside block quotes, may
 * put the URL on the next line, first duplicate wins) come from the parser.
 */
function createParser() {
  const md = new MarkdownIt();
  md.normalizeLink = (url) => url;

  const original = md.block.ruler.__rules__.find((rule) => rule.name === 'reference').fn;
  md.block.ruler.at('reference', (state, startLine, endLine, silent) => {
    const before = new Set(Object.keys(state.env.references ?? {}));
    const matched = original(state, startLine, endLine, silent);
    if (matched && !silent) {
      for (const [label, { href }] of Object.entries(state.env.references ?? {})) {
        if (!before.has(label) && !label.startsWith('^')) {
          state.env.definitions.push({ target: href, line: startLine });
        }
      }
    }
    return matched;
  });
  return md;
}

const parser = createParser();

/** GitHub-style slug of heading text, before duplicate suffixing. Keeps combining marks, as GitHub does. */
function baseSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} _-]/gu, '')
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
  const env = { definitions: [] };
  const tokens = parser.parse(body, env);
  const headings = [];
  const links = [];
  const usedSlugs = new Set();
  let currentLine = 0;
  let pendingHeading = null;

  for (const token of tokens) {
    if (token.map) currentLine = token.map[0];
    if (token.type === 'heading_open') {
      pendingHeading = { level: Number(token.tag.slice(1)), line: bodyStartLine + token.map[0] };
    } else if (token.type === 'inline') {
      if (pendingHeading) {
        const text = renderedText(token);
        const source = token.content.trim();
        headings.push({ ...pendingHeading, text, source, slug: uniqueSlug(baseSlug(text), usedSlugs) });
        pendingHeading = null;
      }
      linksInInline(token, bodyStartLine + currentLine, links);
    }
  }

  for (const { target, line } of env.definitions) {
    links.push({ kind: 'reference', target, line: bodyStartLine + line });
  }
  links.sort((a, b) => a.line - b.line);
  return { headings, links };
}
