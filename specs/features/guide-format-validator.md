# Feature Spec: Guide format and validator

**Source:** Feature 1 in `specs/product/fieldguide.features.md`; product spec `specs/product/fieldguide.md` (FR-1, FR-2, FR-7 to FR-12, FR-20; OQ-4 decision folded into FR-12). Branch: `feat/guide-format-validator`.
**Scope note:** This spec exceeds the usual 500-word guideline because it defines the page format every later feature reads. The scope is one vertical slice; it is not split further.
**ID note:** US and FR numbers below are local to this feature. Product-spec IDs appear in brackets as "(product FR-n)".

## Overview
A Fieldguide guide is a directory of Markdown pages with front matter and one config file. This feature defines that format, versions it, and delivers a validator that checks a guide and reports every error and warning per file. It exists so a maintainer finds broken front matter, ordering and links before anything is rendered or published, and so later features (writing rules, verification, rendering) build on one stable, versioned format.

## Goals
- A maintainer can run the validator from a local Fieldguide checkout against a guide path and get findings grouped per file, with no network access.
- Every error class in the product spec's FR-12 is detected, and every warning class is reported without failing the guide.
- Page order and part names are computed by one defined rule that the renderer can consume.
- The page format carries a version, so consumers can tell which format a guide follows.
- Getwrite's handbook, given an added guide config, validates with zero errors.

## Non-goals
- Enforcing `verification` levels or reading verification records (Feature 3).
- Acting on `audience` or `guideType`, writing rules, phrase checks, or grade levels (Feature 2).
- Brand values and contrast checks (Feature 4).
- Rendering HTML.
- Publishing the content contract document (Feature 9).
- Editing Getwrite's pages or converting its verification record (Feature 5).

## User stories
- US-1: As a maintainer, I want to declare a guide's audience, type and verification level in one config file so that the guide states what it is. (product US-1, US-3)
- US-2: As a maintainer, I want to see errors and warnings reported per file so that I can fix a guide before publishing it. (product US-4)
- US-3: As a maintainer, I want to have pages and parts ordered by simple, predictable rules so that navigation matches my intent. (product US-5)
- US-4: As a site maintainer, I want to rely on preserved unknown front matter and a versioned page format so that my site can read a guide without per-guide fixes. (product US-10)
- US-5: As a writing agent, I want to run the validator from a local checkout against a path so that I can check my work without project-specific tooling. (product US-6)

## Functional requirements
1. FR-1: A guide MUST be a directory with one guide config file named `fieldguide.yaml` (YAML) at its root; the validator MUST report an error if the config is missing or unparseable. (product FR-1, FR-20) [US-1]
2. FR-2: The validator MUST report an error if the config lacks `audience`, `guideType` or `verification`, or holds a value outside `audience` = `user`, `guideType` = `handbook`, `verification` = `strict` or `standard`. (product FR-2) [US-1]
3. FR-3: Config keys and sections the validator does not define MUST be preserved and passed through unchanged, and MUST NOT cause an error or warning, so later features can add sections without changing this feature; this mirrors FR-12 for front matter. [US-1]
4. FR-4: Each page MUST be a Markdown file with front matter containing `title` and `summary`; `order` MAY be present and, when present, MUST be numeric. (product FR-7) [US-2]
5. FR-5: The validator MUST report as errors a missing `title`, a missing `summary`, and a non-numeric `order`. (product FR-12) [US-2]
6. FR-6: The validator MUST report as errors a relative link to a file that does not exist, a relative link that resolves outside the guide, and a link to an anchor that does not exist in the target page. Checked links are inline `[text](target)` links, reference definitions `[label]: target`, and relative image targets (file existence only). Targets with a URL scheme (`http:`, `https:`, `mailto:` and similar) MUST be skipped, as MUST links inside fenced code blocks and inline code spans. Anchors MUST be checked only when the target is a `.md` file or the same page (`#anchor`). Anchors MUST derive from headings only, as GitHub-style slugs: lowercase; punctuation removed other than letters, digits, spaces, `-` and `_`; spaces become `-`; repeated headings in one file take `-1`, `-2`, ... suffixes; headings inside fenced code blocks are ignored. Explicit `<a id>` anchors are not supported in the MVP. Known gap: raw HTML links are not checked in the MVP. (product FR-12) [US-2]
7. FR-7: The validator MUST report as warnings, not errors, a `title` over 70 characters, a `summary` under 50 or over 160 characters, and a leading h1 that differs from `title`; a page with no leading h1 MUST get no h1 warning. Lengths MUST count Unicode code points of the parsed YAML scalar value, not rendered text and not UTF-16 units. (product FR-12, OQ-4) [US-2]
8. FR-8: Every finding MUST name its file and severity (error or warning), and findings MUST be grouped per file. (product US-4) [US-2]
9. FR-9: The validator MUST order pages within their own folder by `order`, then by filename; pages with no `order` MUST come after all pages that have `order`, sorted by filename; `order` values MUST NOT need to be unique across folders. (product FR-8) [US-3]
10. FR-10: A folder MAY contain an `index.md` whose `title`, `summary` and `order` name and position that part; without one the part name MUST derive from the folder name (`protect-and-finish` gives "Protect and finish"). (product FR-9) [US-3]
11. FR-11: A root `index.md` MUST be optional, MUST be treated as the landing page when present, and MUST NOT be required to list pages. (product FR-10) [US-3]
12. FR-12: Front matter keys the format does not define MUST be preserved and exposed unchanged to the renderer and consumers, and MUST NOT cause errors or warnings. (product FR-11) [US-4]
13. FR-13: `fieldguide.yaml` MUST contain an integer `format` key, whose current value is 1; the validator MUST report an error if it is absent, and an error stating that the validator is out of date if the value is newer than the validator supports. The validator MUST state the format version it checked in the report summary. [US-4]
14. FR-14: The validator MUST run from a local Fieldguide checkout against a guide path, without network access. (product FR-20) [US-5]
15. FR-15: The validator MUST exit 0 when no errors are found, 1 when at least one error finding exists (warnings alone MUST NOT cause failure), and 2 when it could not run (bad flag, or guide path missing or not a directory). A missing or unparseable `fieldguide.yaml` is an error finding and exits 1. [US-5]
16. FR-16: Run against a local Getwrite checkout's `docs/user/handbook` with a guide config added (a `fieldguide.yaml` containing `format: 1`), the validator MUST report zero errors, and MUST report warnings for `protect-and-finish/compiling.md` (summary over 160 characters) and `write/writing-log.md` (h1 differs in case from title). [US-2]
17. FR-17: The validator MUST report a warning for a link whose target starts with `/`. [US-2]
18. FR-18: A folder `index.md` and a root `index.md`, when present, MUST receive the same front matter and link checks as other pages, including required `title` and `summary`. [US-2]
19. FR-19: The report MUST be plain text, grouped per file, with one line per finding in the form `line: severity: message`, ending with a summary line that includes the format version checked; this layout MUST be documented as stable. [US-2]

## Open questions
- OQ-1: Resolved (2026-11-15): the guide config is `fieldguide.yaml` at the guide root (YAML); see FR-1.
- OQ-2: Resolved (2026-11-15): heading anchors are GitHub-style slugs from headings only; see FR-6. Evidence: matches Getwrite's checker (`check-links.mjs` in its user-handbook feature, lines 52-57 and 70) and all 10 distinct anchor targets in Getwrite's handbook by hand derivation; anchor links occur in 12 files (this corrects an earlier figure of 10 pages).
- OQ-3: Resolved (2026-11-15): plain-text report with a stable layout; see FR-19. A `--json` option is deferred (see Out of scope).
- OQ-4: Resolved (2026-11-15): exit codes 0, 1 and 2; see FR-15.
- OQ-5: Resolved (2026-11-15): integer `format` key in `fieldguide.yaml`, current value 1; see FR-13.
- OQ-6: Resolved (2026-11-15): unknown config keys and sections pass through unchanged with no finding; see FR-3.
- OQ-7: Resolved (2026-11-15): Unicode code points of the parsed YAML scalar value; see FR-7.
- OQ-8: Resolved (2026-11-15): inline links, reference definitions and relative images are checked; URL-scheme targets are skipped; `/`-rooted links warn; raw HTML links are a known gap; see FR-6 and FR-17.
- OQ-9: Resolved (2026-11-15): index pages get the same checks as other pages; the h1 warning applies only when a leading h1 exists; see FR-7 and FR-18.


## Out of scope (deferred)
- [Feature 2] Phrase warnings and reading grade target.
- [Feature 3] Verification record checks and `strict` or `standard` enforcement.
- [Feature 4] Brand value and colour contrast validation.
- [Feature 5] Getwrite render and record conversion.
- [Feature 9] Published content contract; promoting selected warnings to errors; reconciling with the saboteur-sites importer's rule that `order` is required.
- [Deferred until a consumer needs it] A `--json` machine-readable report option.
- [v2] Packaged install such as an npm CLI.
