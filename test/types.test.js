import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT_VERSION, SEVERITY, makeFinding } from '../src/types.js';

test('FORMAT_VERSION is 1', () => {
  assert.equal(FORMAT_VERSION, 1);
});

test('SEVERITY has error and warning', () => {
  assert.deepEqual(SEVERITY, { ERROR: 'error', WARNING: 'warning' });
});

test('makeFinding returns a frozen object with the finding shape', () => {
  const finding = makeFinding({
    file: 'write/page.md',
    line: 7,
    severity: SEVERITY.ERROR,
    message: 'missing title',
  });
  assert.deepEqual(finding, {
    file: 'write/page.md',
    line: 7,
    severity: 'error',
    message: 'missing title',
  });
  assert.ok(Object.isFrozen(finding));
});

test('makeFinding accepts a null line for file-level findings', () => {
  const finding = makeFinding({
    file: 'fieldguide.yaml',
    line: null,
    severity: SEVERITY.WARNING,
    message: 'note',
  });
  assert.equal(finding.line, null);
  assert.equal(finding.severity, 'warning');
});

test('makeFinding throws on an invalid severity', () => {
  assert.throws(
    () => makeFinding({ file: 'a.md', line: 1, severity: 'fatal', message: 'x' }),
    /severity/,
  );
  assert.throws(
    () => makeFinding({ file: 'a.md', line: 1, message: 'x' }),
    /severity/,
  );
});
