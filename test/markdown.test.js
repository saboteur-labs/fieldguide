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
