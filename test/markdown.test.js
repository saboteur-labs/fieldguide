import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extract } from '../src/markdown.js';

const fixture = readFileSync(new URL('./fixtures/markdown/links-and-headings.md', import.meta.url), 'utf8');

test('slugs are lowercase, strip punctuation, hyphenate spaces', () => {
  const { headings } = extract('# Hello, World! Foo_bar-baz 2\n');
  assert.equal(headings[0].slug, 'hello-world-foo_bar-baz-2');
  assert.equal(headings[0].level, 1);
});

test('heading text is rendered text without emphasis or code markers', () => {
  const { headings } = extract('## A *big* `deal`\n');
  assert.equal(headings[0].text, 'A big deal');
  assert.equal(headings[0].slug, 'a-big-deal');
});

test('repeated headings get -1, -2 suffixes', () => {
  const { headings } = extract('# Repeat\n\n## Repeat\n\n## Repeat\n');
  assert.deepEqual(headings.map((h) => h.slug), ['repeat', 'repeat-1', 'repeat-2']);
});

test('removed punctuation leaves surrounding spaces as hyphens', () => {
  const { headings } = extract('## Setup & Install: step 1\n');
  assert.equal(headings[0].slug, 'setup--install-step-1');
});

test('non-ASCII letters are kept', () => {
  const { headings } = extract('# Café Ünï\n');
  assert.equal(headings[0].slug, 'café-ünï');
});

test('fixture headings carry file-relative line numbers; fenced headings ignored', () => {
  const { headings } = extract(fixture, 5);
  assert.deepEqual(
    headings.map((h) => [h.level, h.text, h.slug, h.line]),
    [
      [1, 'Getting started with code', 'getting-started-with-code', 5],
      [2, 'Setup & Install: step 1', 'setup--install-step-1', 10],
      [2, 'Repeat', 'repeat', 12],
      [2, 'Repeat', 'repeat-1', 14],
      [2, 'Repeat', 'repeat-2', 16],
    ],
  );
});

test('fixture links: inline, image, reference; fences, code spans, indented code, raw HTML ignored', () => {
  const { links } = extract(fixture, 1);
  assert.deepEqual(links, [
    { kind: 'inline', target: 'intro.md#setup', line: 3 },
    { kind: 'image', target: 'img/diagram.png', line: 3 },
    { kind: 'inline', target: 'other.md', line: 4 },
    { kind: 'reference', target: 'docs/guide.md', line: 22 },
    { kind: 'reference', target: 'docs/with space.md', line: 23 },
  ]);
});

test('reference-style usages are not double counted', () => {
  const { links } = extract('See [the docs][d] and [d].\n\n[d]: docs.md\n', 1);
  assert.deepEqual(links, [{ kind: 'reference', target: 'docs.md', line: 3 }]);
});

test('links inside list items and table cells are found', () => {
  const body = '- item [a](a.md)\n\n| h |\n|---|\n| [b](b.md) |\n';
  const { links } = extract(body, 1);
  assert.deepEqual(links.map((l) => [l.target, l.line]), [['a.md', 1], ['b.md', 5]]);
});

test('empty body yields nothing', () => {
  assert.deepEqual(extract('', 1), { headings: [], links: [] });
});

// Regression tests for reference definitions, which come from markdown-it's own
// reference rule rather than a line scan (code review, PR #1).
test('a "[label]: x" line inside a paragraph is not a reference definition', () => {
  assert.deepEqual(extract('Para line\n[note]: not a def\n').links, []);
});

test('a "[label]: x" line inside an HTML block is not a reference definition', () => {
  assert.deepEqual(extract('<div>\n[h]: h.md\n</div>\n').links, []);
});

test('definitions inside block quotes and with the URL on the next line are found', () => {
  assert.deepEqual(extract('> [q]: q.md\n').links, [{ kind: 'reference', target: 'q.md', line: 1 }]);
  assert.deepEqual(extract('[w]:\n  w.md\n').links, [{ kind: 'reference', target: 'w.md', line: 1 }]);
});

test('the first of duplicate definitions wins, with its file line', () => {
  assert.deepEqual(extract('[a]: one.md\n[a]: two.md\n', 5).links, [
    { kind: 'reference', target: 'one.md', line: 5 },
  ]);
});

test('slugs keep combining marks, as GitHub does', () => {
  assert.equal(extract('# Café\n').headings[0].slug, 'café');
});

test('headings carry their inline source alongside rendered text', () => {
  const [h] = extract('# Using `foo`\n').headings;
  assert.equal(h.text, 'Using foo');
  assert.equal(h.source, 'Using `foo`');
});
