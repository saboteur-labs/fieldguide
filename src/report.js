import { SEVERITY } from './types.js';

/**
 * Placeholder printed in the line position for file-level findings
 * (findings whose `line` is null). Part of the stable report layout.
 */
export const FILE_LEVEL_LINE = '-';

const SEVERITY_RANK = { [SEVERITY.ERROR]: 0, [SEVERITY.WARNING]: 1 };

function compareStrings(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

// File-level findings (null line) sort before line-numbered ones.
function compareLines(a, b) {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

function compareFindings(a, b) {
  return (
    compareLines(a.line, b.line) ||
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    compareStrings(a.message, b.message)
  );
}

/**
 * Format findings as a plain-text report. The layout is stable:
 *
 *   <file>                       one header per file, files sorted
 *     <line>: <severity>: <msg>  one line per finding, sorted by line
 *                                (`-` stands in for file-level findings)
 *   <blank line between file groups>
 *   Summary: errors: <n>, warnings: <n>, format <n> checked
 *
 * The summary is always the last line (no trailing newline). With no
 * findings the report is just the summary line.
 */
export function formatReport({ findings, formatVersion }) {
  const byFile = new Map();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) byFile.set(finding.file, []);
    byFile.get(finding.file).push(finding);
  }

  const blocks = [];
  for (const file of [...byFile.keys()].sort(compareStrings)) {
    const lines = [file];
    for (const f of byFile.get(file).sort(compareFindings)) {
      const line = f.line === null ? FILE_LEVEL_LINE : String(f.line);
      lines.push(`  ${line}: ${f.severity}: ${f.message}`);
    }
    blocks.push(lines.join('\n'));
  }

  const count = (severity) => findings.filter((f) => f.severity === severity).length;
  blocks.push(
    `Summary: errors: ${count(SEVERITY.ERROR)}, warnings: ${count(SEVERITY.WARNING)}, format ${formatVersion} checked`,
  );
  return blocks.join('\n\n');
}
