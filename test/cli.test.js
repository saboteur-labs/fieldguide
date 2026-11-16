import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/fieldguide.js', import.meta.url));
const fixture = (...parts) => fileURLToPath(new URL(`./fixtures/${parts.join('/')}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });

test('exit 0 for the valid guide, with the report on stdout', () => {
  const r = run('validate', fixture('guides', 'valid'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'Summary: errors: 0, warnings: 0, format 1 checked\n');
  assert.equal(r.stderr, '');
});

test('exit 1 for the broken guide, report lists findings per file', () => {
  const r = run('validate', fixture('guides', 'broken'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^bad-links\.md$/m);
  assert.match(r.stdout, /^ {2}\d+: error: /m);
  assert.match(r.stdout, /format 1 checked\n$/);
});

test('exit 1 when the config is missing (a finding, not a failure to run)', () => {
  const r = run('validate', fixture('config', 'no-config'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^fieldguide\.yaml$/m);
  assert.match(r.stdout, /error: .*not found/);
});

test('exit 0 for a guide with warnings only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fg-cli-'));
  writeFileSync(
    join(dir, 'fieldguide.yaml'),
    'format: 1\naudience: user\nguideType: handbook\nverification: standard\n',
  );
  writeFileSync(join(dir, 'page.md'), '---\ntitle: Page\nsummary: Too short.\n---\n\nBody.\n');
  const r = run('validate', dir);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /warning: summary is/);
  assert.match(r.stdout, /errors: 0, warnings: 1, format 1 checked\n$/);
});

test('exit 2 for a bad flag, usage on stderr', () => {
  const r = run('validate', '--bogus', fixture('guides', 'valid'));
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /Usage:/);
});

test('exit 2 for --json, which is not supported', () => {
  const r = run('validate', '--json', fixture('guides', 'valid'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage:/);
});

test('exit 2 for no command, an unknown command, or no path', () => {
  for (const args of [[], ['frobnicate', fixture('guides', 'valid')], ['validate']]) {
    const r = run(...args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /Usage:/);
    assert.equal(r.stdout, '');
  }
});

test('exit 2 for a nonexistent path', () => {
  const r = run('validate', join(tmpdir(), 'fg-cli-does-not-exist'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not found|does not exist/i);
  assert.match(r.stderr, /Usage:/);
  assert.equal(r.stdout, '');
});

test('exit 2 for a path that is a file', () => {
  const r = run('validate', fixture('guides', 'not-a-directory.txt'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not a directory/i);
  assert.match(r.stderr, /Usage:/);
  assert.equal(r.stdout, '');
});

test('exit 2 when the guide directory itself cannot be read (code review, PR #1)', (t) => {
  const guide = mkdtempSync(join(tmpdir(), 'fg-cli-unreadable-'));
  chmodSync(guide, 0o000);
  try {
    try {
      readdirSync(guide);
      return t.skip('chmod 000 does not block reads here (running as root?)');
    } catch {
      // expected: the directory is unreadable
    }
    const r = run('validate', guide);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^Cannot read guide: /m);
    assert.equal(r.stdout, '');
  } finally {
    chmodSync(guide, 0o755);
  }
});

test('bin/fieldguide.js is executable', () => {
  assert.ok(statSync(bin).mode & 0o111, 'bin/fieldguide.js has no executable bit');
});
