import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../src/markdown.js';
import { checkLinks } from '../src/links.js';

const guideDir = fileURLToPath(new URL('./fixtures/links/guide', import.meta.url));

function headingsOf(relativePath) {
  return extract(readFileSync(path.join(guideDir, relativePath), 'utf8')).headings;
}

function check(file, targets) {
  const links = targets.map((t, i) =>
    typeof t === 'string' ? { kind: 'inline', target: t, line: i + 1 } : { line: i + 1, ...t },
  );
  return checkLinks({ guideDir, file, links, headingsOf });
}

test('fixture pages produce no findings from their own links', () => {
  for (const file of ['index.md', 'target.md', 'sub/page.md']) {
    const body = readFileSync(path.join(guideDir, file), 'utf8');
    const { links } = extract(body);
    assert.deepEqual(checkLinks({ guideDir, file, links, headingsOf }), []);
  }
});

test('missing relative file is an error with file and line', () => {
  const [f, ...rest] = check('index.md', ['nope.md']);
  assert.equal(rest.length, 0);
  assert.equal(f.severity, 'error');
  assert.equal(f.file, 'index.md');
  assert.equal(f.line, 1);
});

test('link resolving outside the guide is an error', () => {
  const findings = check('sub/page.md', ['../../outside.md', '../../..']);
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.severity === 'error' && /outside/.test(f.message)));
});

test('same-page anchors: missing errors, present passes', () => {
  assert.equal(check('index.md', ['#index']).length, 0);
  const [f] = check('index.md', ['#absent']);
  assert.equal(f.severity, 'error');
});

test('cross-page anchors: missing errors, present passes, suffixed slug passes', () => {
  assert.equal(check('index.md', ['target.md#second-section', 'target.md#second-section-1']).length, 0);
  const [f] = check('index.md', ['target.md#nope']);
  assert.equal(f.severity, 'error');
  assert.match(f.message, /target\.md/);
});

test('anchors on non-.md targets are not checked', () => {
  assert.equal(check('index.md', ['fieldguide.yaml#anything']).length, 0);
});

test('image targets are checked for existence only', () => {
  assert.equal(check('index.md', [{ kind: 'image', target: 'target.md#nope' }]).length, 0);
  const [f] = check('index.md', [{ kind: 'image', target: 'missing.png' }]);
  assert.equal(f.severity, 'error');
});

test('scheme targets are skipped', () => {
  const targets = ['http://x.test/a', 'https://x.test/a#b', 'mailto:a@b.test', 'tel:123', 'ftp://x.test/f'];
  assert.equal(check('index.md', targets).length, 0);
});

test('target starting with / is a warning, not an error', () => {
  const findings = check('index.md', ['/abs/path.md']);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
});

test('query strings are stripped and path segments percent-decoded', () => {
  assert.equal(check('index.md', ['target.md?x=1', 'sub/my%20page.md', 'target.md?x=1#second-section']).length, 0);
});

test('reference definitions are checked like inline links', () => {
  assert.equal(check('index.md', [{ kind: 'reference', target: 'target.md' }]).length, 0);
  assert.equal(check('index.md', [{ kind: 'reference', target: 'gone.md' }]).length, 1);
});

test('relative links resolve from the page directory', () => {
  assert.equal(check('sub/page.md', ['../target.md#target']).length, 0);
  assert.equal(check('sub/page.md', ['target.md']).length, 1);
});
