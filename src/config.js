import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { FORMAT_VERSION, SEVERITY, makeFinding } from './types.js';

export const CONFIG_FILE = 'fieldguide.yaml';

const ALLOWED = Object.freeze({
  audience: ['user'],
  guideType: ['handbook'],
  verification: ['strict', 'standard'],
});

function error(message, line = null) {
  return makeFinding({ file: CONFIG_FILE, line, severity: SEVERITY.ERROR, message });
}

function checkFormat(config) {
  if (!Object.hasOwn(config, 'format') || config.format === null) {
    return [error(`Missing required key "format" (expected integer ${FORMAT_VERSION}).`)];
  }
  const { format } = config;
  if (typeof format !== 'number' || !Number.isInteger(format)) {
    return [error(`Key "format" must be an integer, got ${JSON.stringify(format)}.`)];
  }
  if (format > FORMAT_VERSION) {
    return [
      error(
        `Guide format ${format} is newer than this validator supports (format ${FORMAT_VERSION}); the validator is out of date.`,
      ),
    ];
  }
  if (format < FORMAT_VERSION) {
    return [error(`Key "format" must be ${FORMAT_VERSION}, got ${format}.`)];
  }
  return [];
}

function checkEnums(config) {
  const findings = [];
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    if (!Object.hasOwn(config, key) || config[key] === null) {
      findings.push(error(`Missing required key "${key}" (one of: ${allowed.join(', ')}).`));
    } else if (!allowed.includes(config[key])) {
      findings.push(
        error(
          `Invalid value ${JSON.stringify(config[key])} for "${key}" (one of: ${allowed.join(', ')}).`,
        ),
      );
    }
  }
  return findings;
}

/**
 * Load and validate `fieldguide.yaml` in `guideDir`. Returns `{ config, findings }`;
 * `config` is the parsed object with unknown keys untouched, or null when the
 * file could not be read or parsed.
 */
export function loadConfig(guideDir) {
  let text;
  try {
    text = readFileSync(join(guideDir, CONFIG_FILE), 'utf8');
  } catch (err) {
    const why = err?.code === 'ENOENT' ? 'file not found' : `cannot read file (${err.message})`;
    return { config: null, findings: [error(`Guide config ${CONFIG_FILE}: ${why}.`)] };
  }

  let config;
  try {
    config = parse(text);
  } catch (err) {
    const line = err.linePos?.[0]?.line ?? null;
    const reason = String(err.message).split('\n')[0];
    return { config: null, findings: [error(`Cannot parse ${CONFIG_FILE}: ${reason}`, line)] };
  }

  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return {
      config: null,
      findings: [error(`${CONFIG_FILE} must contain a mapping of keys to values.`)],
    };
  }

  return { config, findings: [...checkFormat(config), ...checkEnums(config)] };
}
