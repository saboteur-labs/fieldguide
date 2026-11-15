import { parse } from 'yaml';
import { SEVERITY, makeFinding } from './types.js';

const FENCE = /^---[ \t]*$/;

/**
 * Split text into front matter source and body. `yamlSource` is null when the
 * file does not open with a `---` line, or when the opening fence is never
 * closed (`unterminated` is then true).
 */
function split(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (!FENCE.test(lines[0])) {
    return { yamlSource: null, bodyLines: lines, bodyStartLine: 1, unterminated: false };
  }
  for (let i = 1; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      return {
        yamlSource: lines.slice(1, i).join('\n'),
        bodyLines: lines.slice(i + 1),
        bodyStartLine: i + 2,
        unterminated: false,
      };
    }
  }
  return { yamlSource: null, bodyLines: lines, bodyStartLine: 1, unterminated: true };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Parse a page's front matter and check `title`, `summary` and `order`.
 * Never throws on malformed input; problems come back as findings.
 * `data` holds parsed YAML values, with unknown keys preserved unchanged.
 * `bodyStartLine` is the 1-based file line on which `body` begins.
 */
export function parsePage(text, file) {
  const findings = [];
  const add = (line, message) =>
    findings.push(makeFinding({ file, line, severity: SEVERITY.ERROR, message }));

  const { yamlSource, bodyLines, bodyStartLine, unterminated } = split(text);
  const body = bodyLines.join('\n');
  let data = {};
  let parsed = true;

  if (unterminated) {
    add(1, 'front matter is not closed: expected a closing "---" line');
    parsed = false;
  } else if (yamlSource !== null) {
    try {
      const value = parse(yamlSource);
      if (value === null || value === undefined) {
        data = {};
      } else if (isPlainObject(value)) {
        data = value;
      } else {
        add(1, 'front matter must be a YAML mapping of keys to values');
        parsed = false;
      }
    } catch (err) {
      const first = String(err.message).split('\n')[0];
      add(1, `front matter is not valid YAML: ${first}`);
      parsed = false;
    }
  }

  if (parsed) {
    const line = yamlSource === null ? null : 1;
    if (!isNonEmptyString(data.title)) {
      add(line, 'front matter is missing required key "title" (a non-empty string)');
    }
    if (!isNonEmptyString(data.summary)) {
      add(line, 'front matter is missing required key "summary" (a non-empty string)');
    }
    if ('order' in data && !(typeof data.order === 'number' && Number.isFinite(data.order))) {
      add(line, 'front matter key "order" must be a number');
    }
  }

  return { data, body, bodyStartLine, findings };
}
