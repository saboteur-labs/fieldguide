# Tasks: Guide format and validator

**Spec:** `specs/features/guide-format-validator.md` (Feature 1). **Branch:** `feat/guide-format-validator`.
**Estimation unit:** story points (1/2/3/5/8).
**Conventions:** Node, ES modules, tests with the built-in `node:test` runner (`node --test`), run with `npm test`. All fixtures live in the repo under `test/fixtures/`. Spec FR numbers below are this feature's local FR numbers.
**Dependencies (justified):** `yaml` for `fieldguide.yaml` and front matter, because Node has no YAML parser and FR-7 needs the parsed scalar value. `markdown-it` for heading, link, image and fenced-code extraction, because FR-6 needs fence and inline-code awareness and token source line maps; hand-rolled scanning is the riskier alternative. No other runtime dependencies; no dev dependencies (test runner is built in).

### Task 1: Node project skeleton
**What:** Establish the Node project: package.json with `yaml` and `markdown-it` dependencies, the `npm test` script, source and test layout, and a passing smoke test.
**Files:** `package.json`, `package-lock.json`, `.gitignore`, `src/index.js`, `test/smoke.test.js`
**Done when:** `npm install` succeeds; `npm test` runs `node --test` and the smoke test passes (it imports `yaml` and `markdown-it` and `src/index.js`); package.json has `"type": "module"`, an `engines.node` field, and exactly those two runtime dependencies. No code in the project requires network access at run time (FR-14).
**Depends on:** none
**Estimate:** 2
**Notes:** `src/index.js` starts as an empty module exporting nothing; later tasks add their own modules and the orchestrator in Task 9 re-exports. Install is the only step that needs the network.
**Done:** [ ]

### Task 2: Shared finding and constants interface
**What:** Define the finding shape, severity constants and format version constant that all checks and the reporter share.
**Files:** `src/types.js`, `test/types.test.js`
**Done when:** `src/types.js` exports `FORMAT_VERSION = 1`, `SEVERITY = { ERROR: 'error', WARNING: 'warning' }`, and `makeFinding({ file, line, severity, message })` returning a frozen object (`line` may be null for file-level findings); the test asserts the shape, that an invalid severity throws, and that `FORMAT_VERSION` is 1 (FR-8, FR-13). `npm test` passes.
**Depends on:** 1
**Estimate:** 1
**Notes:** This is the small interface task that lets config, page, link and report work run in parallel. `file` is a path relative to the guide root, using `/` separators.
**Done:** [ ]

### Task 3: Guide config loading and validation
**What:** Load `fieldguide.yaml`, validate `audience`, `guideType`, `verification` and `format`, and pass unknown keys through unchanged.
**Files:** `src/config.js`, `test/config.test.js`, `test/fixtures/config/valid/fieldguide.yaml`, `test/fixtures/config/missing-keys/fieldguide.yaml`, `test/fixtures/config/bad-values/fieldguide.yaml`, `test/fixtures/config/unparseable/fieldguide.yaml`, `test/fixtures/config/no-format/fieldguide.yaml`, `test/fixtures/config/newer-format/fieldguide.yaml`, `test/fixtures/config/unknown-keys/fieldguide.yaml`, `test/fixtures/config/no-config/.gitkeep`
**Done when:** `loadConfig(guideDir)` returns `{ config, findings }`, and tests prove: missing file and unparseable YAML give an error finding (FR-1); a missing `audience`, `guideType` or `verification`, and out-of-range values, each give an error (FR-2); a missing `format` gives an error, and `format: 2` gives an error stating the validator is out of date (FR-13); unknown top-level keys and nested sections appear unchanged in `config` with zero findings (FR-3); the valid fixture gives zero findings. `npm test` passes.
**Depends on:** 2
**Estimate:** 3
**Notes:** A non-integer `format` (for example `"1"` or `1.5`) is treated as an error with a message naming the key. Reporting the format version in the summary is handled by Task 10.
**Done:** [ ]

### Task 4: Front matter parsing and required-field checks
**What:** Parse page front matter, check `title`, `summary` and `order`, and preserve unknown keys.
**Files:** `src/frontmatter.js`, `test/frontmatter.test.js`, `test/fixtures/frontmatter/valid.md`, `test/fixtures/frontmatter/no-title.md`, `test/fixtures/frontmatter/no-summary.md`, `test/fixtures/frontmatter/bad-order.md`, `test/fixtures/frontmatter/unknown-keys.md`, `test/fixtures/frontmatter/no-front-matter.md`, `test/fixtures/frontmatter/bad-yaml.md`
**Done when:** `parsePage(text, file)` returns `{ data, body, bodyStartLine, findings }`, and tests prove: missing `title`, missing `summary`, and non-numeric `order` each give an error (FR-4, FR-5); numeric `order` (integer or decimal) is accepted and absent `order` is accepted; unknown keys appear in `data` unchanged with zero findings (FR-12); a file with no front matter or unparseable front matter yields errors for the missing required fields or a parse error, not an exception; `bodyStartLine` allows later checks to report file-relative line numbers. `npm test` passes.
**Depends on:** 2
**Estimate:** 3
**Notes:** The same function is used for folder and root `index.md` pages (FR-18). `data` holds parsed YAML values so Task 7 can count code points of the scalar, not of source text.
**Done:** [ ]

### Task 5: Markdown extraction (headings, anchors, links, images)
**What:** Extract headings with GitHub-style slugs, links, reference definitions and images with line numbers, skipping fenced code and inline code.
**Files:** `src/markdown.js`, `test/markdown.test.js`, `test/fixtures/markdown/links-and-headings.md`
**Done when:** `extract(body, bodyStartLine)` returns `{ headings: [{ level, text, slug, line }], links: [{ kind: 'inline'|'reference'|'image', target, line }] }`, and tests prove (FR-6): slugs lowercase, strip punctuation other than letters, digits, spaces, `-` and `_`, turn spaces into `-`, and add `-1`, `-2` suffixes for repeated headings; headings and links inside fenced code blocks and inline code spans are ignored; inline links, reference definitions `[label]: target` and image targets are all returned; raw HTML links are not returned. `npm test` passes.
**Depends on:** 1
**Estimate:** 5
**Notes:** Use `markdown-it` tokens for headings, fences, inline links and images. Reference definitions are not exposed as tokens with line numbers, so scan lines for the definition pattern while skipping lines inside fences (fence ranges come from token maps). Verify slug behaviour against the 10 distinct anchor targets cited in the spec (OQ-2); heading text must be the rendered text of inline content (strip emphasis and code markers) before slugging. Highest-uncertainty task in the slice.
**Done:** [ ]

### Task 6: Link checks
**What:** Check extracted links for missing files, paths escaping the guide, missing anchors, and `/`-rooted targets.
**Files:** `src/links.js`, `test/links.test.js`, `test/fixtures/links/guide/fieldguide.yaml`, `test/fixtures/links/guide/index.md`, `test/fixtures/links/guide/target.md`, `test/fixtures/links/guide/sub/page.md`
**Done when:** `checkLinks({ guideDir, file, links, headingsOf })` returns findings, and tests prove (FR-6, FR-17): a relative link to a missing file is an error; a relative link resolving outside the guide root is an error; `#anchor` on the same page and `page.md#anchor` to another page are errors when no heading slug matches and pass when one does; anchors on non-`.md` targets are not checked; image targets are checked for file existence only; `http:`, `https:`, `mailto:` and other scheme targets are skipped; a target starting with `/` yields a warning, not an error. `npm test` passes.
**Depends on:** 2, 5
**Estimate:** 5
**Notes:** Target-page headings are obtained through the injected `headingsOf(path)` function so this module does not own file discovery or caching; Task 9 supplies it. Strip query strings and percent-decode path segments before the existence check. Fixture pages used by this task need valid front matter only if the test goes through Task 9; here they are plain files.
**Done:** [ ]

### Task 7: Page warning checks
**What:** Emit warnings for over-long title, out-of-range summary length, and a leading h1 that differs from the title.
**Files:** `src/warnings.js`, `test/warnings.test.js`
**Done when:** `checkWarnings({ file, data, headings })` returns warning findings, and tests prove (FR-7): a title of 71 code points warns and 70 does not; a summary of 49 or 161 code points warns and 50 and 160 do not; astral-plane characters count as one code point each, not two (so 70 emoji in a title do not warn); a leading h1 differing from the title warns, including a case-only difference; a page with no leading h1 gets no h1 warning; none of these produce an error severity. `npm test` passes.
**Depends on:** 2, 4, 5
**Estimate:** 3
**Notes:** "Leading h1" means the first heading in the body when it has level 1; define and test the exact rule (a first heading of level 2 is not a leading h1). Count with `[...value].length` on the parsed scalar from front matter. Non-string title or summary values are skipped here because Task 4 already reports missing fields.
**Done:** [ ]

### Task 8: Page and part ordering
**What:** Compute ordered pages per folder and part names, for the renderer to consume.
**Files:** `src/order.js`, `test/order.test.js`
**Done when:** `buildNavigation(pages)` (input: array of `{ path, data }` with `/`-separated relative paths) returns a tree with root landing page (optional), parts and ordered pages, and tests prove: pages sort within their own folder by numeric `order` then filename, with pages lacking `order` sorted by filename (FR-9); equal `order` values across different folders do not conflict (FR-9); a folder `index.md` supplies the part's title, summary and order (FR-10); a folder without `index.md` derives its name from the folder name with `protect-and-finish` giving "Protect and finish" (FR-10); a root `index.md` is the landing page when present and is not required, and its content does not need to list pages (FR-11); unknown front matter keys are carried through unchanged on each page entry (FR-12). `npm test` passes.
**Depends on:** 4
**Estimate:** 3
**Notes:** Per FR-9, pages with `order` come first (by `order`, then filename) and pages without `order` come after them (by filename); the test must assert this placement explicitly. Parts themselves are ordered by their `index.md` `order` then folder name.
**Done:** [ ]

### Task 9: Whole-guide validation orchestrator
**What:** Walk a guide directory, run config, front matter, markdown, link and warning checks per file, and return findings, navigation and config.
**Files:** `src/validate.js`, `src/index.js`, `test/validate.test.js`, `test/fixtures/guides/valid/fieldguide.yaml`, `test/fixtures/guides/valid/index.md`, `test/fixtures/guides/valid/intro.md`, `test/fixtures/guides/valid/protect-and-finish/index.md`, `test/fixtures/guides/valid/protect-and-finish/sealing.md`, `test/fixtures/guides/broken/fieldguide.yaml`, `test/fixtures/guides/broken/index.md`, `test/fixtures/guides/broken/missing-fields.md`, `test/fixtures/guides/broken/bad-links.md`, `test/fixtures/guides/broken/warnings.md`
**Done when:** `validateGuide(guideDir)` returns `{ findings, navigation, config, formatVersion }` and tests prove end to end: the valid fixture yields zero findings (including a folder and a root `index.md`, FR-10, FR-11); the broken fixture yields the expected errors and warnings, each with file and severity, for all FR-5, FR-6, FR-7 and FR-17 classes (FR-8); folder and root `index.md` receive the same front matter and link checks, so an `index.md` missing `title` errors (FR-18); a missing or unparseable config is reported as a finding and does not abort page checks; code fences and inline code never produce link findings; no network module is imported anywhere under `src/` (FR-14). `npm test` passes.
**Depends on:** 3, 6, 7, 8
**Estimate:** 5
**Notes:** Discovery covers all `*.md` files under the guide, excluding dot-directories and `node_modules`. Provide `headingsOf(path)` to Task 6 with a per-run cache. Findings are returned sorted by file then line. This task also fills in `src/index.js` exports.
**Done:** [ ]

### Task 10: Plain-text report formatter
**What:** Format findings as a per-file plain-text report with `line: severity: message` lines and a summary line stating the format version.
**Files:** `src/report.js`, `test/report.test.js`
**Done when:** `formatReport({ findings, formatVersion })` returns text, and tests prove (FR-8, FR-19): findings are grouped under one header per file; each finding is one line of the form `line: severity: message` (file-level findings use a defined placeholder for the line, documented in Task 12); the final line is a summary including error count, warning count and `format <n>` checked (FR-13); a report with no findings is just the summary line; output is deterministic (files and lines sorted). `npm test` passes.
**Depends on:** 2
**Estimate:** 2
**Notes:** The layout is declared stable (FR-19), so keep it covered by an exact-string snapshot assertion in the test.
**Done:** [ ]

### Task 11: Command-line entry point and exit codes
**What:** Provide the CLI that runs the validator against a guide path and maps outcomes to exit codes 0, 1 and 2.
**Files:** `src/cli.js`, `bin/fieldguide.js`, `package.json`, `test/cli.test.js`, `test/fixtures/guides/not-a-directory.txt`
**Done when:** Running `node bin/fieldguide.js validate <guidePath>` as a child process in `test/cli.test.js` proves (FR-14, FR-15): exit 0 for `test/fixtures/guides/valid`, with the report on stdout; exit 1 for `test/fixtures/guides/broken` and for `test/fixtures/config/no-config` (missing config is a finding, exit 1); exit 0 for a guide with warnings only (covers the warnings-alone case, using a dedicated warnings-only fixture created inside this test with a temp directory); exit 2 for a bad flag, for a nonexistent path and for a path that is a file; usage text on exit 2 goes to stderr. `package.json` gains a `bin` entry. `npm test` passes.
**Depends on:** 9, 10
**Estimate:** 3
**Notes:** Parse arguments with `node:util` `parseArgs` to avoid a dependency. `--json` is deferred and must not be added. Tests that need a warnings-only guide should build it in an `os.tmpdir()` directory at test time rather than adding more fixture files.
**Done:** [ ]

### Task 12: Report layout and format documentation
**What:** Document the stable report layout, exit codes, and the guide format version in the repository.
**Files:** `docs/validator.md`
**Done when:** `docs/validator.md` states: the plain-text layout from FR-19 (grouping, `line: severity: message`, summary line with format version, and the file-level line placeholder) as stable (FR-19); exit codes 0, 1 and 2 with their meanings (FR-15); how to run it from a local checkout with no network (FR-14); the `format` key and its meaning, with current value 1, and what happens with a newer value (FR-13); the known gap that raw HTML links and explicit `<a id>` anchors are not checked (FR-6). A reviewer can check each statement against `src/report.js` and `src/cli.js` behaviour.
**Depends on:** 10, 11
**Estimate:** 2
**Notes:** Documentation only; does not define the Feature 9 content contract.
**Done:** [ ]

### Task 13: Getwrite acceptance check
**What:** Add an acceptance test that runs the validator over a local Getwrite handbook with a guide config added, skipping cleanly when no checkout is supplied.
**Files:** `test/getwrite-acceptance.test.js`, `test/fixtures/getwrite/fieldguide.yaml`
**Done when:** The test reads the Getwrite checkout path from env var `FIELDGUIDE_GETWRITE_DIR` (env var only, no flag), and (FR-16): when the variable is unset or the path `docs/user/handbook` beneath it does not exist, the test is skipped via `t.skip` with a message naming the variable and stating that the acceptance check was not run; when present, the test copies the handbook into a temp directory, adds `test/fixtures/getwrite/fieldguide.yaml` (`format: 1`, `audience: user`, `guideType: handbook`, `verification: standard`) there without touching the checkout, runs the CLI, and asserts exactly this finding set and no other: 1 error (invalid front matter YAML in `story/metadata.md`) and 2 warnings (`protect-and-finish/compiling.md` summary over 160 characters, measured at 165; `write/writing-log.md` h1 differs in case from title), with CLI exit code 1. `npm test` passes with the skip message visible when the variable is unset; no personal path appears anywhere in the repo.
**Depends on:** 11
**Estimate:** 3
**Notes:** The one error is real invalid YAML in Getwrite's page (unquoted `summary:` containing ": "), and Getwrite's handbook stays unedited by owner decision (2026-11-15); do not loosen the check to make it pass. Cannot be verified without a Getwrite checkout; a pass with the skip is not evidence of FR-16, and the implementer must run it once with `FIELDGUIDE_GETWRITE_DIR` set and record the outcome in the task report. Failures here may expose slug or link-extraction defects from Tasks 5 and 6; fix them in those modules with new unit tests rather than loosening this check.
**Done:** [ ]

## Summary
- Total tasks: 13
- Total estimated effort: 40 points
- Critical path: 1 → 5 → 6 → 9 → 11 → 13
- Risks: Task 5 (Markdown extraction and slug rules) is the highest-uncertainty task and sits on the critical path; reference-definition line numbers are not provided by the parser and need a line scan. Task 13 cannot be fully verified without a local Getwrite checkout, so its skip path says nothing about FR-16 and it needs one manual run with the env var set. Task 8 implements the FR-9 ordering rule (unordered pages sort after ordered ones, by filename), which the spec now states explicitly. Tasks 3, 4, 5 and 10 can run in parallel after Tasks 1 and 2.
