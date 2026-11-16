import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { parsePage } from './frontmatter.js';
import { extract } from './markdown.js';
import { checkLinks } from './links.js';
import { checkWarnings } from './warnings.js';
import { buildNavigation } from './order.js';
import { compareFindings } from './report.js';
import { FORMAT_VERSION, SEVERITY, makeFinding } from './types.js';

/**
 * All `*.md` files under `root` as guide-relative `/` paths, skipping
 * dot-directories and node_modules. A subdirectory that can't be read becomes
 * an error finding; an unreadable guide root throws (the caller can't validate
 * anything, so the CLI reports it as "could not run").
 */
function discover(root, findings, rel = '') {
  const found = [];
  let entries;
  try {
    entries = readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch (err) {
    if (rel === '') throw err;
    findings.push(
      makeFinding({
        file: rel,
        line: null,
        severity: SEVERITY.ERROR,
        message: `cannot read directory (${err.code ?? err.message})`,
      }),
    );
    return found;
  }
  for (const entry of entries) {
    const entryRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      found.push(...discover(root, findings, entryRel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(entryRel);
    }
  }
  return found;
}

function readPage(guideDir, file) {
  return parsePage(readFileSync(path.join(guideDir, file), 'utf8'), file);
}

/**
 * Validate a whole guide directory. Returns
 * `{ findings, navigation, config, formatVersion }`; `findings` is in the
 * documented report order (see `compareFindings`), `config` is null when the config could not be loaded, and
 * `formatVersion` is the format version this validator checked.
 */
export function validateGuide(guideDir) {
  const { config, findings: configFindings } = loadConfig(guideDir);
  const findings = [...configFindings];

  const pages = discover(guideDir, findings)
    .sort()
    .map((file) => {
      let parsed;
      try {
        parsed = readPage(guideDir, file);
      } catch (err) {
        findings.push(
          makeFinding({
            file,
            line: null,
            severity: SEVERITY.ERROR,
            message: `cannot read file (${err.message})`,
          }),
        );
        return { path: file, data: {}, headings: [], links: [] };
      }
      const { headings, links } = extract(parsed.body, parsed.bodyStartLine);
      findings.push(...parsed.findings);
      findings.push(...checkWarnings({ file, data: parsed.data, headings }));
      return { path: file, data: parsed.data, headings, links };
    });

  const headingCache = new Map(pages.map((p) => [p.path, p.headings]));
  const headingsOf = (relativePath) => {
    if (!headingCache.has(relativePath)) {
      let headings = [];
      try {
        const parsed = readPage(guideDir, relativePath);
        headings = extract(parsed.body, parsed.bodyStartLine).headings;
      } catch {
        headings = [];
      }
      headingCache.set(relativePath, headings);
    }
    return headingCache.get(relativePath);
  };

  for (const page of pages) {
    findings.push(...checkLinks({ guideDir, file: page.path, links: page.links, headingsOf }));
  }

  findings.sort(compareFindings);
  const navigation = buildNavigation(pages.map(({ path: p, data }) => ({ path: p, data })));
  return { findings, navigation, config, formatVersion: FORMAT_VERSION };
}
