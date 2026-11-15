import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/fieldguide.js', import.meta.url));
const configFixture = fileURLToPath(new URL('./fixtures/getwrite/fieldguide.yaml', import.meta.url));

const VARIABLE = 'FIELDGUIDE_GETWRITE_DIR';

/** The handbook directory inside the checkout named by the variable, or null. */
function findHandbook() {
  const root = process.env[VARIABLE];
  if (!root) return null;
  const handbook = join(root, 'docs', 'user', 'handbook');
  return existsSync(handbook) && statSync(handbook).isDirectory() ? handbook : null;
}

/** Parse the plain-text report into { file, line, severity, message } entries. */
function parseReport(stdout) {
  const findings = [];
  let file = null;
  for (const text of stdout.split('\n')) {
    const finding = /^ {2}(\d+): (error|warning): (.*)$/.exec(text);
    if (finding) {
      findings.push({ file, line: Number(finding[1]), severity: finding[2], message: finding[3] });
    } else if (text && !text.startsWith(' ') && !text.startsWith('Summary:')) {
      file = text;
    }
  }
  return findings;
}

test('Getwrite handbook yields exactly one invalid-YAML error and two warnings (FR-16)', (t) => {
  const handbook = findHandbook();
  if (!handbook) {
    t.skip(
      `${VARIABLE} is unset or has no docs/user/handbook beneath it; ` +
        'the Getwrite acceptance check was not run',
    );
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'fg-getwrite-'));
  try {
    cpSync(handbook, dir, { recursive: true });
    cpSync(configFixture, join(dir, 'fieldguide.yaml'));

    const r = spawnSync(process.execPath, [bin, 'validate', dir], { encoding: 'utf8' });
    const report = `${r.stdout}${r.stderr}`;
    const findings = parseReport(r.stdout);
    const summarize = (list) => list.map((f) => `${f.severity} ${f.file}`).join('; ');

    assert.equal(r.status, 1, `expected exit 1; full report:\n${report}`);
    assert.equal(findings.length, 3, `expected exactly 3 findings, got: ${summarize(findings)}; full report:\n${report}`);

    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    assert.equal(errors.length, 1, `expected exactly 1 error; full report:\n${report}`);
    assert.equal(errors[0].file, 'story/metadata.md');
    assert.ok(
      errors[0].message.startsWith('front matter is not valid YAML'),
      `unexpected error kind for story/metadata.md; full report:\n${report}`,
    );

    assert.equal(warnings.length, 2, `expected exactly 2 warnings; full report:\n${report}`);
    const warningFor = (file, pattern) => warnings.filter((f) => f.file === file && pattern.test(f.message));
    assert.equal(
      warningFor('protect-and-finish/compiling.md', /^summary is \d+ characters/).length,
      1,
      `missing summary-length warning for protect-and-finish/compiling.md; full report:\n${report}`,
    );
    assert.equal(
      warningFor('write/writing-log.md', /^leading h1 .* differs from title/).length,
      1,
      `missing h1 warning for write/writing-log.md; full report:\n${report}`,
    );
    t.diagnostic(report);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
