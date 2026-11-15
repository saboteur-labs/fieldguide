import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { parsePage } from './frontmatter.js';
import { extract } from './markdown.js';
import { checkLinks } from './links.js';
import { checkWarnings } from './warnings.js';
import { buildNavigation } from './order.js';
import { FORMAT_VERSION, SEVERITY, makeFinding } from './types.js';

/** All `*.md` files under `root` as guide-relative `/` paths, skipping dot-directories and node_modules. */
function discover(root, rel = '') {
  const found = [];
  const entries = readdirSync(path.join(root, rel), { withFileTypes: true });
  for (const entry of entries) {
    const entryRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      found.push(...discover(root, entryRel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(entryRel);
    }
  }
  return found;
}

function compareFindings(a, b) {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  const la = a.line ?? 0;
  const lb = b.line ?? 0;
  if (la !== lb) return la - lb;
  if (a.message === b.message) return 0;
  return a.message < b.message ? -1 : 1;
}

function readPage(guideDir, file) {
  return parsePage(readFileSync(path.join(guideDir, file), 'utf8'), file);
}

/**
 * Validate a whole guide directory. Returns
 * `{ findings, navigation, config, formatVersion }`; `findings` is sorted by
 * file then line, `config` is null when the config could not be loaded, and
 * `formatVersion` is the format version this validator checked.
 */
export function validateGuide(guideDir) {
  const { config, findings: configFindings } = loadConfig(guideDir);
  const findings = [...configFindings];

  const pages = discover(guideDir)
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
