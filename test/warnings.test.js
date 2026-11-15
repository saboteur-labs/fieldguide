import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePage } from '../src/frontmatter.js';
import { extract } from '../src/markdown.js';
import { checkWarnings } from '../src/warnings.js';

const FILE = 'page.md';
const summary = (n) => 's'.repeat(n);

function check(data, headings = []) {
  return checkWarnings({ file: FILE, data, headings });
}

const messages = (findings) => findings.map((f) => f.message);

test('title of 70 code points does not warn, 71 does', () => {
  assert.deepEqual(check({ title: 't'.repeat(70), summary: summary(80) }), []);
  const findings = check({ title: 't'.repeat(71), summary: summary(80) });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, FILE);
  assert.match(findings[0].message, /title/);
  assert.match(findings[0].message, /71/);
});

test('summary of 50 and 160 code points do not warn; 49 and 161 do', () => {
  for (const n of [50, 160]) {
    assert.deepEqual(check({ title: 'T', summary: summary(n) }), [], `length ${n}`);
  }
  for (const n of [49, 161]) {
    const findings = check({ title: 'T', summary: summary(n) });
    assert.equal(findings.length, 1, `length ${n}`);
    assert.match(findings[0].message, /summary/);
    assert.match(findings[0].message, new RegExp(String(n)));
  }
});

test('astral-plane characters count as one code point each', () => {
  const title = '😀'.repeat(70);
  assert.equal(title.length, 140);
  assert.deepEqual(check({ title, summary: '😀'.repeat(50) }), []);
  assert.equal(check({ title: '😀'.repeat(71), summary: summary(80) }).length, 1);
  assert.equal(check({ title: 'T', summary: '😀'.repeat(49) }).length, 1);
});

test('a leading h1 that differs from the title warns, with its line', () => {
  const findings = check(
    { title: 'Sealing', summary: summary(80) },
    [{ level: 1, text: 'Finishing', slug: 'finishing', line: 6 }],
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 6);
  assert.match(findings[0].message, /h1/);
});

test('a case-only difference between h1 and title warns', () => {
  const findings = check(
    { title: 'Writing log', summary: summary(80) },
    [{ level: 1, text: 'Writing Log', slug: 'writing-log', line: 4 }],
  );
  assert.equal(findings.length, 1);
});

test('a leading h1 equal to the title does not warn', () => {
  const findings = check(
    { title: 'Sealing', summary: summary(80) },
    [{ level: 1, text: 'Sealing', slug: 'sealing', line: 4 }],
  );
  assert.deepEqual(findings, []);
});

test('no headings means no h1 warning', () => {
  assert.deepEqual(check({ title: 'Sealing', summary: summary(80) }, []), []);
});

test('a first heading of level 2 is not a leading h1', () => {
  const findings = check(
    { title: 'Sealing', summary: summary(80) },
    [{ level: 2, text: 'Other', slug: 'other', line: 3 }],
  );
  assert.deepEqual(findings, []);
});

test('only the first heading counts: a later h1 is not a leading h1', () => {
  const findings = check(
    { title: 'Sealing', summary: summary(80) },
    [
      { level: 2, text: 'Intro', slug: 'intro', line: 3 },
      { level: 1, text: 'Different', slug: 'different', line: 9 },
    ],
  );
  assert.deepEqual(findings, []);
});

test('non-string or missing title and summary are skipped', () => {
  assert.deepEqual(check({}), []);
  assert.deepEqual(check({ title: 12345, summary: ['a'] }), []);
  assert.deepEqual(
    check({ title: 42 }, [{ level: 1, text: 'Heading', slug: 'heading', line: 1 }]),
    [],
  );
});

test('all findings are warnings, never errors', () => {
  const findings = check(
    { title: 't'.repeat(71), summary: summary(10) },
    [{ level: 1, text: 'Other', slug: 'other', line: 5 }],
  );
  assert.equal(findings.length, 3);
  assert.ok(findings.every((f) => f.severity === 'warning'));
  assert.equal(messages(findings).length, 3);
});

test('works on real parsed output, with the h1 line in file coordinates', () => {
  const text = `---\ntitle: Sealing\nsummary: ${summary(60)}\n---\n\n# Finishing\n`;
  const { data, body, bodyStartLine } = parsePage(text, FILE);
  const { headings } = extract(body, bodyStartLine);
  const findings = checkWarnings({ file: FILE, data, headings });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 6);
});
