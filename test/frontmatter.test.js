import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePage } from '../src/frontmatter.js';

const fixture = (name) =>
  readFileSync(new URL(`./fixtures/frontmatter/${name}`, import.meta.url), 'utf8');

const errors = (findings) => findings.filter((f) => f.severity === 'error');
const has = (findings, text) => findings.some((f) => f.message.includes(text));

test('valid page: data, body and zero findings', () => {
  const r = parsePage(fixture('valid.md'), 'valid.md');
  assert.deepEqual(r.findings, []);
  assert.equal(r.data.title, 'A valid page');
  assert.equal(r.data.order, 2.5);
  assert.equal(r.body, '# A valid page\n\nBody text.\n');
  assert.equal(r.bodyStartLine, 6);
});

test('missing title is an error naming the key', () => {
  const r = parsePage(fixture('no-title.md'), 'no-title.md');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.equal(r.findings[0].file, 'no-title.md');
  assert.ok(has(r.findings, 'title'));
});

test('missing summary is an error naming the key', () => {
  const r = parsePage(fixture('no-summary.md'), 'no-summary.md');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.ok(has(r.findings, 'summary'));
});

test('empty or non-string title/summary are errors', () => {
  const r = parsePage('---\ntitle: ""\nsummary: 12\n---\nx\n', 'p.md');
  assert.equal(errors(r.findings).length, 2);
});

test('non-numeric order is an error', () => {
  const r = parsePage(fixture('bad-order.md'), 'bad-order.md');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.ok(has(r.findings, 'order'));
});

test('quoted numeric string order is rejected', () => {
  const r = parsePage('---\ntitle: t\nsummary: s\norder: "3"\n---\n', 'p.md');
  assert.ok(has(r.findings, 'order'));
});

test('integer, decimal and absent order are accepted', () => {
  for (const line of ['order: 3\n', 'order: 1.5\n', 'order: -1\n', '']) {
    const r = parsePage(`---\ntitle: t\nsummary: s\n${line}---\nb\n`, 'p.md');
    assert.deepEqual(r.findings, [], line);
  }
});

test('unknown keys are preserved unchanged with zero findings', () => {
  const r = parsePage(fixture('unknown-keys.md'), 'unknown-keys.md');
  assert.deepEqual(r.findings, []);
  assert.equal(r.data.owner, 'docs-team');
  assert.deepEqual(r.data.tags, ['a', 'b']);
  assert.deepEqual(r.data.extra, { nested: true });
});

test('no front matter: required-field errors, no exception, body is whole text', () => {
  const text = fixture('no-front-matter.md');
  const r = parsePage(text, 'no-front-matter.md');
  assert.ok(has(r.findings, 'title'));
  assert.ok(has(r.findings, 'summary'));
  assert.equal(errors(r.findings).length, 2);
  assert.equal(r.body, text);
  assert.equal(r.bodyStartLine, 1);
  assert.deepEqual(r.data, {});
});

test('unparseable front matter gives a parse error, not an exception', () => {
  const r = parsePage(fixture('bad-yaml.md'), 'bad-yaml.md');
  assert.ok(errors(r.findings).length >= 1);
  assert.ok(has(r.findings, 'front matter'));
  assert.equal(r.bodyStartLine, 5);
  assert.equal(r.body, 'Body.\n');
});

test('unterminated front matter is an error', () => {
  const r = parsePage('---\ntitle: t\nsummary: s\nbody\n', 'p.md');
  assert.ok(has(r.findings, 'not closed'));
});

test('front matter that is not a mapping is an error', () => {
  const r = parsePage('---\n- a\n- b\n---\nx\n', 'p.md');
  assert.ok(has(r.findings, 'mapping'));
});

test('empty front matter block reports missing fields', () => {
  const r = parsePage('---\n---\nx\n', 'p.md');
  assert.ok(has(r.findings, 'title'));
  assert.ok(has(r.findings, 'summary'));
  assert.equal(r.bodyStartLine, 3);
});

test('CRLF line endings and BOM are handled; bodyStartLine is file-relative', () => {
  const text = '﻿---\r\ntitle: t\r\nsummary: s\r\n---\r\nbody\r\n';
  const r = parsePage(text, 'p.md');
  assert.deepEqual(r.findings, []);
  assert.equal(r.bodyStartLine, 5);
  assert.ok(r.body.startsWith('body'));
});

test('index pages use the same function and checks (FR-18)', () => {
  const r = parsePage('---\nsummary: s\n---\n', 'sub/index.md');
  assert.equal(r.findings[0].file, 'sub/index.md');
  assert.ok(has(r.findings, 'title'));
});
