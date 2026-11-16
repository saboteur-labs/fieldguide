import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGuide } from '../src/index.js';
import { formatReport } from '../src/report.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const artifactsDir = (name) => {
  const dir = join(repoRoot, '.artifacts', name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

test('HyperEncabulator example handbook validates with no findings', () => {
  const result = validateGuide(join(repoRoot, 'examples', 'hyperencabulator', 'handbook'));
  writeFileSync(join(artifactsDir('hyperencabulator'), 'validate.txt'), formatReport(result) + '\n');

  assert.deepEqual(result.findings, []);
  assert.equal(result.config.audience, 'user');
  assert.equal(result.config.guideType, 'handbook');

  const nav = result.navigation;
  assert.equal(nav.landing.path, 'index.md');
  // Parts with an index.md `order` come first; "Care and troubleshooting" has no
  // index.md, so it sorts after them and takes its name from its folder.
  assert.deepEqual(
    nav.parts.map((p) => p.title),
    ['Getting started', 'Everyday use', 'Care and troubleshooting'],
  );
  assert.equal(nav.parts[2].index, null);
  assert.deepEqual(
    nav.parts[0].pages.map((p) => p.path),
    ['getting-started/setting-up.md', 'getting-started/first-start.md'],
  );
});
