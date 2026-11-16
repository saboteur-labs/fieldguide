import { SEVERITY, makeFinding } from './types.js';

const TITLE_MAX = 70;
const SUMMARY_MIN = 50;
const SUMMARY_MAX = 160;

/** Length in Unicode code points (not UTF-16 units). */
const codePoints = (value) => [...value].length;

/**
 * The leading h1 is the first heading in the body, provided its level is 1.
 * A first heading of any other level means the page has no leading h1.
 */
function leadingH1(headings) {
  const first = headings?.[0];
  return first && first.level === 1 ? first : null;
}

/**
 * Warn about an over-long title, an out-of-range summary and a leading h1
 * that differs from the title (compared case-sensitively). `data` holds the
 * parsed front matter; non-string `title` or `summary` values are skipped,
 * since missing fields are reported as errors elsewhere. Front matter
 * findings use line 1; the h1 finding uses the heading's own line.
 */
export function checkWarnings({ file, data, headings }) {
  const findings = [];
  const warn = (line, message) =>
    findings.push(makeFinding({ file, line, severity: SEVERITY.WARNING, message }));

  const { title, summary } = data ?? {};

  if (typeof title === 'string') {
    const length = codePoints(title);
    if (length > TITLE_MAX) {
      warn(1, `title is ${length} characters; keep it to ${TITLE_MAX} or fewer`);
    }
    // A title may be written with the heading's inline markup (`code`, *emphasis*)
    // or as plain text; either matches.
    const h1 = leadingH1(headings);
    const wanted = title.trim();
    if (h1 && h1.text !== wanted && (h1.source ?? h1.text) !== wanted) {
      warn(h1.line, `leading h1 "${h1.source ?? h1.text}" differs from title "${wanted}"`);
    }
  }

  if (typeof summary === 'string') {
    const length = codePoints(summary);
    if (length < SUMMARY_MIN || length > SUMMARY_MAX) {
      warn(
        1,
        `summary is ${length} characters; keep it between ${SUMMARY_MIN} and ${SUMMARY_MAX}`,
      );
    }
  }

  return findings;
}
