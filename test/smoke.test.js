import { test } from 'node:test';
import assert from 'node:assert/strict';

test('dependencies and source entry point import', async () => {
  const yaml = await import('yaml');
  const markdownIt = await import('markdown-it');
  const index = await import('../src/index.js');

  assert.equal(typeof yaml.parse, 'function');
  assert.equal(typeof markdownIt.default, 'function');
  assert.deepEqual(Object.keys(index), []);
});
