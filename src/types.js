export const FORMAT_VERSION = 1;

export const SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
});

const SEVERITIES = new Set(Object.values(SEVERITY));

/**
 * Build an immutable finding. `file` is a path relative to the guide root
 * using `/` separators; `line` is null for file-level findings.
 */
export function makeFinding({ file, line, severity, message }) {
  if (!SEVERITIES.has(severity)) {
    throw new Error(
      `Invalid severity: ${String(severity)} (expected one of ${[...SEVERITIES].join(', ')})`,
    );
  }
  return Object.freeze({ file, line, severity, message });
}
