import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { SEVERITY, makeFinding } from './types.js';

const URL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Split a target into decoded path and decoded anchor; query strings are dropped. */
function splitTarget(target) {
  const hashAt = target.indexOf('#');
  const beforeHash = hashAt === -1 ? target : target.slice(0, hashAt);
  const anchor = hashAt === -1 ? null : decodeSegment(target.slice(hashAt + 1));
  const queryAt = beforeHash.indexOf('?');
  const rawPath = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const decodedPath = rawPath.split('/').map(decodeSegment).join('/');
  return { decodedPath, anchor };
}

function isFile(absolutePath) {
  return existsSync(absolutePath) && statSync(absolutePath).isFile();
}

/**
 * The guide-relative path as it is spelled on disk, segment by segment, or
 * null if a segment can't be listed. On case-insensitive filesystems this is
 * how a link whose case differs from the file is detected; on Linux and GitHub
 * such a link is broken.
 */
function onDiskSpelling(root, relativePosix) {
  let dir = root;
  const actual = [];
  for (const segment of relativePosix.split('/')) {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return null;
    }
    const match = names.includes(segment)
      ? segment
      : names.find((name) => name.toLowerCase() === segment.toLowerCase());
    if (match === undefined) return null;
    actual.push(match);
    dir = path.join(dir, match);
  }
  return actual.join('/');
}

function hasSlug(headings, anchor) {
  return (headings ?? []).some((h) => (typeof h === 'string' ? h : h.slug) === anchor);
}

/**
 * Check extracted links of one page.
 *
 * `file` is the page path relative to `guideDir` (`/` separators). `links` is
 * the `links` array from `extract()`. `headingsOf(relativePath)` returns the
 * headings (objects with a `slug`) of a guide page given its guide-relative
 * `/`-separated path.
 */
export function checkLinks({ guideDir, file, links, headingsOf }) {
  const findings = [];
  const root = path.resolve(guideDir);
  const pageDir = path.dirname(path.resolve(root, file));

  const report = (line, severity, message) =>
    findings.push(makeFinding({ file, line, severity, message }));

  for (const { kind, target, line } of links) {
    if (!target || URL_SCHEME.test(target) || target.startsWith('//')) continue;

    if (target.startsWith('/')) {
      report(line, SEVERITY.WARNING, `Link target starts with "/": ${target} (use a relative path)`);
      continue;
    }

    const { decodedPath, anchor } = splitTarget(target);

    if (decodedPath === '') {
      if (anchor && kind !== 'image' && !hasSlug(headingsOf(file), anchor)) {
        report(line, SEVERITY.ERROR, `Anchor not found on this page: #${anchor}`);
      }
      continue;
    }

    const resolved = path.resolve(pageDir, decodedPath);
    const relative = path.relative(root, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      report(line, SEVERITY.ERROR, `Link resolves outside the guide: ${target}`);
      continue;
    }
    let relativePosix = relative.split(path.sep).join('/');
    // Looked up segment by segment, so a case mismatch gets the same warning on
    // every platform instead of passing on macOS and failing on Linux.
    const spelled = relativePosix === '' ? '' : onDiskSpelling(root, relativePosix);
    if (spelled === null) {
      report(line, SEVERITY.ERROR, `Linked file not found: ${target}`);
      continue;
    }
    if (spelled !== relativePosix) {
      report(
        line,
        SEVERITY.WARNING,
        `Link target case differs from the file on disk: ${target} (file is ${spelled}); this link breaks on case-sensitive systems`,
      );
      relativePosix = spelled;
    }

    if (
      kind === 'image' ||
      !anchor ||
      !relativePosix.toLowerCase().endsWith('.md') ||
      !isFile(path.join(root, relativePosix))
    ) {
      continue;
    }
    if (!hasSlug(headingsOf(relativePosix), anchor)) {
      report(line, SEVERITY.ERROR, `Anchor not found in ${relativePosix}: #${anchor}`);
    }
  }
  return findings;
}
