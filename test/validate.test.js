import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGuide } from '../src/validate.js';
import * as api from '../src/index.js';

const fixture = (...parts) => fileURLToPath(new URL(`./fixtures/${parts.join('/')}`, import.meta.url));
const find = (findings, file, severity, re) =>
  findings.filter((f) => f.file === file && f.severity === severity && re.test(f.message));

test('valid guide yields zero findings, navigation and config', () => {
  const result = validateGuide(fixture('guides', 'valid'));
  assert.deepEqual(result.findings, []);
  assert.equal(result.formatVersion, 1);
  assert.equal(result.config.audience, 'user');
  assert.equal(result.navigation.landing.path, 'index.md');
  assert.equal(result.navigation.pages[0].path, 'intro.md');
  assert.equal(result.navigation.parts[0].title, 'Protect and finish');
  assert.equal(result.navigation.parts[0].pages[0].path, 'protect-and-finish/sealing.md');
});

test('broken guide reports every error and warning class with file and severity', () => {
  const { findings } = validateGuide(fixture('guides', 'broken'));
  for (const f of findings) {
    assert.ok(f.file && (f.severity === 'error' || f.severity === 'warning'));
  }
  assert.equal(find(findings, 'missing-fields.md', 'error', /"title"/).length, 1);
  assert.equal(find(findings, 'missing-fields.md', 'error', /"summary"/).length, 1);
  assert.equal(find(findings, 'missing-fields.md', 'error', /"order"/).length, 1);

  assert.equal(find(findings, 'bad-links.md', 'error', /not found: nope\.md/).length, 1);
  assert.equal(find(findings, 'bad-links.md', 'error', /nope\.png/).length, 1);
  assert.equal(find(findings, 'bad-links.md', 'error', /outside the guide/).length, 1);
  assert.equal(find(findings, 'bad-links.md', 'error', /Anchor not found on this page/).length, 1);
  assert.equal(find(findings, 'bad-links.md', 'error', /Anchor not found in index\.md/).length, 1);
  assert.equal(find(findings, 'bad-links.md', 'warning', /starts with "\/"/).length, 1);
  assert.equal(findings.filter((f) => f.file === 'bad-links.md').length, 6);

  assert.equal(find(findings, 'warnings.md', 'warning', /^title is/).length, 1);
  assert.equal(find(findings, 'warnings.md', 'warning', /^summary is/).length, 1);
  assert.equal(find(findings, 'warnings.md', 'warning', /leading h1/).length, 1);
  assert.equal(findings.filter((f) => f.file === 'warnings.md' && f.severity === 'error').length, 0);
});

test('folder and root index.md get the same front matter checks', () => {
  const { findings } = validateGuide(fixture('guides', 'broken'));
  assert.equal(find(findings, 'index.md', 'error', /"title"/).length, 1);
});

test('code fences and inline code never produce link findings', () => {
  const { findings } = validateGuide(fixture('guides', 'broken'));
  assert.equal(findings.filter((f) => /fenced-missing|code-missing/.test(f.message)).length, 0);
});

test('findings are sorted by file then line', () => {
  const { findings } = validateGuide(fixture('guides', 'broken'));
  for (let i = 1; i < findings.length; i++) {
    const a = findings[i - 1];
    const b = findings[i];
    assert.ok(
      a.file < b.file || (a.file === b.file && (a.line ?? 0) <= (b.line ?? 0)),
      `${a.file}:${a.line} before ${b.file}:${b.line}`,
    );
  }
});

test('missing config is a finding and page checks still run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fg-validate-'));
  writeFileSync(join(dir, 'page.md'), 'no front matter\n');
  const result = validateGuide(dir);
  assert.equal(result.config, null);
  assert.equal(find(result.findings, 'fieldguide.yaml', 'error', /not found/).length, 1);
  assert.equal(find(result.findings, 'page.md', 'error', /"title"/).length, 1);
});

test('unparseable config is a finding and page checks still run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fg-validate-'));
  writeFileSync(join(dir, 'fieldguide.yaml'), 'a: [unclosed\n');
  writeFileSync(join(dir, 'page.md'), 'no front matter\n');
  const result = validateGuide(dir);
  assert.equal(find(result.findings, 'fieldguide.yaml', 'error', /Cannot parse/).length, 1);
  assert.equal(find(result.findings, 'page.md', 'error', /"summary"/).length, 1);
});

test('discovery skips dot-directories and node_modules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fg-validate-'));
  writeFileSync(
    join(dir, 'fieldguide.yaml'),
    'format: 1\naudience: user\nguideType: handbook\nverification: standard\n',
  );
  for (const skipped of ['.hidden', 'node_modules']) {
    mkdirSync(join(dir, skipped));
    writeFileSync(join(dir, skipped, 'bad.md'), 'no front matter\n');
  }
  assert.deepEqual(validateGuide(dir).findings, []);
});

test('index.js re-exports validateGuide', () => {
  assert.equal(api.validateGuide, validateGuide);
});

test('no network module is imported anywhere under src/', () => {
  const banned =
    /(?:from|import\(|require\()\s*['"](?:node:)?(?:http|https|http2|net|tls|dgram|dns)['"]|\bfetch\(/;
  const walk = (d) =>
    readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));
  for (const file of walk(srcDir).filter((p) => p.endsWith('.js'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), banned, file);
  }
});
