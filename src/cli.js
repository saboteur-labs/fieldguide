import { statSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { validateGuide } from './validate.js';
import { formatReport } from './report.js';
import { SEVERITY } from './types.js';

export const EXIT_OK = 0;
export const EXIT_ERRORS = 1;
export const EXIT_USAGE = 2;

export const USAGE = 'Usage: fieldguide validate <guidePath>';

/**
 * Run the CLI. `argv` is the argument list without node and script path.
 * Returns the exit code: 0 no errors, 1 at least one error finding,
 * 2 the validator could not run (bad flag, missing path, not a directory).
 */
export function run(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  const fail = (message) => {
    stderr.write(`${message ? `${message}\n` : ''}${USAGE}\n`);
    return EXIT_USAGE;
  };

  let positionals;
  try {
    ({ positionals } = parseArgs({ args: argv, options: {}, allowPositionals: true, strict: true }));
  } catch (err) {
    return fail(err.message);
  }

  const [command, guidePath, ...extra] = positionals;
  if (command !== 'validate') {
    return fail(command === undefined ? '' : `Unknown command: ${command}`);
  }
  if (guidePath === undefined || extra.length > 0) {
    return fail('Expected exactly one guide path.');
  }

  let stats;
  try {
    stats = statSync(guidePath);
  } catch {
    return fail(`Guide path not found: ${guidePath}`);
  }
  if (!stats.isDirectory()) return fail(`Guide path is not a directory: ${guidePath}`);

  const { findings, formatVersion } = validateGuide(guidePath);
  stdout.write(`${formatReport({ findings, formatVersion })}\n`);
  return findings.some((f) => f.severity === SEVERITY.ERROR) ? EXIT_ERRORS : EXIT_OK;
}
