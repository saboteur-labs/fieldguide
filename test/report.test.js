import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEVERITY, makeFinding } from '../src/types.js';
import { formatReport, FILE_LEVEL_LINE } from '../src/report.js';

const f = (file, line, severity, message) => makeFinding({ file, line, severity, message });

test('no findings yields just the summary line', () => {
  assert.equal(
    formatReport({ findings: [], formatVersion: 1 }),
    'Summary: errors: 0, warnings: 0, format 1 checked',
  );
});

test('exact-string snapshot of the stable layout', () => {
  const findings = [
    f('write/b.md', 12, SEVERITY.WARNING, 'image has no alt text'),
    f('a.md', 3, SEVERITY.ERROR, 'broken link: ./x.md'),
    f('write/b.md', null, SEVERITY.ERROR, 'missing title'),
    f('a.md', 3, SEVERITY.WARNING, 'second on same line'),
    f('write/b.md', 2, SEVERITY.ERROR, 'bad heading'),
  ];
  const expected = [
    'a.md',
    '  3: error: broken link: ./x.md',
    '  3: warning: second on same line',
    '',
    'write/b.md',
    '  -: error: missing title',
    '  2: error: bad heading',
    '  12: warning: image has no alt text',
    '',
    'Summary: errors: 3, warnings: 2, format 1 checked',
  ].join('\n');
  assert.equal(formatReport({ findings, formatVersion: 1 }), expected);
});

test('placeholder for file-level findings is "-"', () => {
  assert.equal(FILE_LEVEL_LINE, '-');
});

test('one header per file and summary is the last line', () => {
  const findings = [
    f('a.md', 1, SEVERITY.ERROR, 'x'),
    f('b.md', 1, SEVERITY.ERROR, 'y'),
    f('a.md', 2, SEVERITY.ERROR, 'z'),
  ];
  const lines = formatReport({ findings, formatVersion: 1 }).split('\n');
  assert.equal(lines.filter((l) => l === 'a.md').length, 1);
  assert.equal(lines.filter((l) => l === 'b.md').length, 1);
  assert.equal(lines.at(-1), 'Summary: errors: 3, warnings: 0, format 1 checked');
});

test('output is deterministic regardless of input order', () => {
  const findings = [
    f('b.md', 5, SEVERITY.WARNING, 'w'),
    f('a.md', 10, SEVERITY.ERROR, 'e'),
    f('a.md', 9, SEVERITY.ERROR, 'e2'),
  ];
  const a = formatReport({ findings, formatVersion: 1 });
  const b = formatReport({ findings: [...findings].reverse(), formatVersion: 1 });
  assert.equal(a, b);
  assert.ok(a.indexOf('  9: error') < a.indexOf('  10: error'));
});

test('summary states the format version given', () => {
  assert.match(formatReport({ findings: [], formatVersion: 7 }), /format 7 checked$/);
});

test('does not mutate the input array', () => {
  const findings = [f('b.md', 1, SEVERITY.ERROR, 'x'), f('a.md', 1, SEVERITY.ERROR, 'y')];
  formatReport({ findings, formatVersion: 1 });
  assert.equal(findings[0].file, 'b.md');
});
