import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';

const dir = (name) => fileURLToPath(new URL(`./fixtures/config/${name}`, import.meta.url));
const errors = (r) => r.findings.filter((f) => f.severity === 'error');

function loadFromText(text) {
  const d = mkdtempSync(join(tmpdir(), 'fg-config-'));
  try {
    writeFileSync(join(d, 'fieldguide.yaml'), text);
    return loadConfig(d);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}

test('valid config gives zero findings', () => {
  const r = loadConfig(dir('valid'));
  assert.deepEqual(r.findings, []);
  assert.equal(r.config.audience, 'user');
  assert.equal(r.config.format, 1);
});

test('missing file is an error finding (FR-1)', () => {
  const r = loadConfig(dir('no-config'));
  assert.equal(r.config, null);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.equal(r.findings[0].file, 'fieldguide.yaml');
  assert.match(r.findings[0].message, /not found/);
});

test('unparseable YAML is an error finding, not an exception (FR-1)', () => {
  const r = loadConfig(dir('unparseable'));
  assert.equal(r.config, null);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.match(r.findings[0].message, /parse/i);
});

test('missing audience, guideType and verification each error (FR-2)', () => {
  const r = loadConfig(dir('missing-keys'));
  const msgs = errors(r).map((f) => f.message);
  assert.equal(msgs.length, 3);
  for (const key of ['audience', 'guideType', 'verification']) {
    assert.ok(msgs.some((m) => m.includes(`"${key}"`)), key);
  }
});

test('out-of-range values each error (FR-2)', () => {
  const r = loadConfig(dir('bad-values'));
  const msgs = errors(r).map((f) => f.message);
  assert.equal(msgs.length, 3);
  for (const key of ['audience', 'guideType', 'verification']) {
    assert.ok(msgs.some((m) => m.includes(`"${key}"`) && /Invalid value/.test(m)), key);
  }
});

test('missing format is an error naming the key (FR-13)', () => {
  const r = loadConfig(dir('no-format'));
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.match(r.findings[0].message, /"format"/);
});

test('format 2 errors stating the validator is out of date (FR-13)', () => {
  const r = loadConfig(dir('newer-format'));
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
  assert.match(r.findings[0].message, /out of date/);
});

test('non-integer format values error naming the key (FR-13)', () => {
  for (const bad of ['"1"', '1.5', 'true', '[1]']) {
    const r = loadFromText(
      `format: ${bad}\naudience: user\nguideType: handbook\nverification: strict\n`,
    );
    assert.equal(r.findings.length, 1, bad);
    assert.match(r.findings[0].message, /"format"/, bad);
  }
});

test('unknown top-level keys and nested sections pass through unchanged (FR-3)', () => {
  const r = loadConfig(dir('unknown-keys'));
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.config.site, { name: 'Example', nav: ['home', 'about'] });
  assert.deepEqual(r.config.brand, { color: '#112233' });
  assert.equal(r.config.futureKey, 42);
});

test('non-mapping config is an error', () => {
  const r = loadFromText('- a\n- b\n');
  assert.equal(r.config, null);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, 'error');
});
