# Product Spec: Fieldguide

**Milestone scope:** All milestones — MVP / v1 / v2
**Status:** Draft
**Source concept:** Fieldguide (`specs/concept.md`)

## Overview
Fieldguide is a method and toolchain for writing web guides that a human or an AI agent can follow. Guide content lives in each project's own repo. A writer declares the audience and guide type, plans the page breakdown, then writes and checks each claim against the software at a verification level the guide sets, keeping the evidence in a record outside the pages. Fieldguide validates the pages and either renders an accessible static site themed by the guide's brand values or hands the validated content to an existing site. It exists because guides drift: jargon gets into user help, gotchas are missed, and claims go unchecked, and fast AI drafting makes that worse.

## Goals
- A writer (human or agent) can produce a user handbook by following Fieldguide's instructions alone, without a project-specific script.
- Every page a guide publishes has entries in the verification record that meet the guide's chosen level.
- A guide renders to a static site with navigation, mobile layout, light and dark themes, and the guide's brand values, meeting WCAG 2.2 AA.
- Getwrite's user handbook validates and renders with no edits to its pages.
- An existing site can consume a validated guide without using Fieldguide's renderer (v1).

## Non-goals
- Hosting. Users deploy the output themselves.
- A general docs framework: API references, blogs, or reference docs generated from code comments.
- A central store of other projects' guides.
- Running or testing the documented product. Projects bring their own run tooling; Fieldguide defines how results are recorded.
- Search in the MVP renderer.

## Users
**Project maintainer (writer)**
A solo developer or small team writing guides for their own projects, often through an agent.
**Key need:** Trustworthy, on-brand guides without a docs team or a bespoke toolchain per project.
**Success looks like:** The guide validates, renders, and every claim in it has evidence at the chosen level.

**AI agent (executor)**
An agent in any harness pointed at Fieldguide to write or check a guide.
**Key need:** Unambiguous instructions on what to load, what rules apply, and when a page is done.
**Success looks like:** It completes the method and the validator reports no errors.

**Site maintainer (consumer)**
Maintains an existing site that renders handbooks with its own stack (for example, a Saboteur Astro site).
**Key need:** A stable, validated content format.
**Success looks like:** It imports a guide without per-guide fixes.

## User Stories
- US-1: As a maintainer, I want to declare a guide's audience and type and get the matching writing rules and page-breakdown template, so that I start from the right focus. [MVP]
- US-2: As a maintainer, I want to set a target grade level and the phrases to ban, avoid, or allow for each guide, so that the writing suits its readers. [MVP]
- US-3: As a maintainer, I want to choose a verification level for each guide and have it enforced, so that published claims carry the evidence I require. [MVP]
- US-4: As a maintainer, I want to see validation errors and warnings reported per file so that I can fix a guide before publishing it. [MVP]
- US-5: As a maintainer, I want to render a guide to an accessible static site with my brand values, so that readers get a site that matches my product. [MVP]
- US-6: As a writing agent, I want to load one entry-point file that tells me what to read for each step so that I can follow the method without project-specific instructions. [MVP]
- US-7: As a maintainer, I want to use developer-audience rules and a developer onboarding guide type so that I can document a codebase for contributors. [v1]
- US-8: As a maintainer, I want to include screenshots in pages, recorded in the verification record, so that readers see what the product shows. [v1]
- US-9: As a maintainer, I want to see a reading grade for each page, plus replacements suggested in context, so that I can measure plain language. [v1]
- US-10: As a site maintainer, I want to follow a documented content contract so that my site can render validated guides. [v1]
- US-11: As a maintainer, I want to see pages flagged when commits since their base commit touch what they describe so that stale pages are caught. [v2]
- US-12: As a maintainer, I want to publish a guide from a release tag without editing it, so that the docs match a released version. [v2]

## Functional Requirements

### MVP Requirements
- FR-1: A guide MUST be a directory in the project repo with one guide config file at its root. [US-1]
- FR-2: The guide config MUST declare `audience` (MVP accepts `user` only), `guideType` (MVP accepts `handbook` only), and `verification` (`strict` or `standard`). [US-1][US-3]
- FR-3: Fieldguide MUST provide written user-audience rules (plain language, what the product does, no jargon) and a page-breakdown template for the handbook. [US-1]
- FR-4: The guide config MUST accept a target US school grade level, defaulting to 8 when omitted. The method MUST tell the writer to aim for it, and it MUST NOT be a pass/fail check. [US-2]
- FR-5: The guide config MUST accept lists of banned phrases, phrases to avoid (each with a suggested replacement), and allowed terms. Fieldguide MUST ship default banned and avoid lists that a guide can add to or switch off item by item. The defaults MUST be a small seed list, treated as versioned content that grows with use. [US-2]
- FR-6: The validator MUST report each banned or avoided phrase found in page text as a warning naming the file, line, and phrase (with the replacement, for avoided phrases). Allowed terms MUST NOT be reported. [US-2][US-4]
- FR-7: Each page MUST be a Markdown file with front matter containing `title` and `summary`. `order` MUST be optional and, when present, numeric. [US-4]
- FR-8: Pages MUST be ordered within their own folder by `order`, then by filename. Order values MUST NOT need to be unique across folders. [US-5]
- FR-9: A folder MAY contain an `index.md` whose `title`, `summary`, and `order` name and position that part. Without one, the part's name MUST come from the folder name (`protect-and-finish` → "Protect and finish"). [US-5]
- FR-10: A root `index.md` MUST be optional. When present it MUST render as the landing page, and it MUST NOT be required to list pages. [US-5]
- FR-11: Front matter keys that Fieldguide doesn't define MUST be preserved and passed to the renderer and to consumers unchanged. [US-4][US-10]
- FR-12: The validator MUST report as errors: missing `title` or `summary`, a non-numeric `order`, a relative link to a file that doesn't exist or lies outside the guide, and a link to an anchor that doesn't exist. The validator MUST report as warnings, not errors: a `title` over 70 characters, a `summary` under 50 or over 160 characters, and a leading h1 that differs from `title`. The versioned content contract (FR-25) MAY later promote selected checks to errors. [US-4]
- FR-13: The verification record MUST be one YAML file per page, at a path that mirrors the page's path under a record directory in the guide. Each file MUST hold the product version and base commit the page was checked at, and one row per statement with the statement, the check type (`run` or `read`), the evidence, and the outcome (`kept`, `corrected`, or `dropped`). The record MAY also hold an optional `sources` field listing the source paths the page describes. [US-3]
- FR-14: The validator MUST report an error for any page with no record entry. Under `strict` it MUST report an error for any `kept` or `corrected` row whose check type is not `run`. Under `standard`, `read` MUST be accepted. [US-3]
- FR-15: The rendered site MUST NOT include any part of the verification record. [US-3][US-5]
- FR-16: The renderer MUST produce a static HTML site with navigation built from parts and pages, a layout usable at 320px width, and light and dark themes that follow the reader's system setting. [US-5]
- FR-17: The renderer MUST meet WCAG 2.2 Level AA in both themes. The validator MUST report as an error any brand colour pair that fails AA contrast, naming the pair, the theme, and the measured ratio, and MUST NOT adjust colours itself. [US-5]
- FR-18: The guide config MUST accept brand values: colours for each theme, font family names, and a logo path. The validator MUST report a missing logo file or malformed colour value as an error. [US-5] [BLOCKED: OQ-2]
- FR-19: Fieldguide MUST include an entry-point file mapping each method step (declare, plan, write, verify, validate, render) to the files to load. All instructions MUST be plain Markdown that names no agent-specific tool. [US-6]
- FR-20: The validator and renderer MUST run from a local Fieldguide checkout against a path to a guide. [US-4][US-5][US-6]
- FR-21: Getwrite's `docs/user/handbook/` MUST pass the FR-12 checks and render with no edits to its pages, given an added guide config. Its existing verification record MUST be convertible to the FR-13 format without re-running its checks. [US-5]

### v1 Requirements
- FR-22: `audience` MUST accept `developer`, with rules focused on observed architecture, repo docs, edge cases, and gotchas, and `guideType` MUST accept `onboarding`. [US-7]
- FR-23: Pages MUST be able to include screenshots stored inside the guide, and each MUST have a verification record row. [US-8]
- FR-24: A linter MUST report a reading grade for each page and the suggested replacement for each avoided phrase in context. [US-9]
- FR-25: Fieldguide MUST publish a versioned content contract describing guide layout, front matter, ordering, and link rules. [US-10]
- FR-26: Fieldguide MUST ship Claude Code skill wrappers that call the agent-agnostic instructions without duplicating them. [US-6]

### v2 Requirements
- FR-27: The validator MUST list pages whose base commit is older than commits touching the paths in the `sources` field of the page's verification record (FR-13). [US-11]
- FR-28: Fieldguide MUST render a guide as it exists at a named git tag. [US-12]
- FR-29: Fieldguide SHOULD ship wrappers for at least one agent harness besides Claude Code. [US-6]

## Constraints
- Pages MUST stay readable on GitHub without a build: plain Markdown, relative links.
- The page format MUST be versioned from MVP, because other sites consume it.
- The renderer MUST be optional: a validated guide must be usable by another site.
- Fieldguide MUST NOT require the documented product to be runnable. `standard` exists for projects without run tooling.
- No network access is required to validate or render.

## Open Questions
**OQ-1: What goes in the default banned and avoid lists for user guides?**
Resolved (2026-11-15): Fieldguide ships a small seed list of default banned and avoid phrases, treated as versioned content that grows with use. The specific seed entries are written as part of Feature 2.
**Impact:** FR-5, FR-6
**Owner:** Product owner

**OQ-2: Which named colour roles (for example text, background, accent, link) must a guide supply for each theme, and which are optional with defaults?**
Deferred to Feature 4 (owner decision, 2026-11-15). Neither this question nor OQ-5 affects Feature 1. Before Feature 4's task breakdown, spike build-vs-adapt (for example Astro Starlight) against Getwrite's handbook, then choose colour roles to fit what the renderer can map. Measured fact: Saboteur's accent #D44040 on #0A0A0A measures 4.36:1 (saboteur-sites `compliance/accessibility.md` line 18), under 4.5:1 for normal text, so which pairs are checked decides whether that brand passes.
**Impact:** FR-17, FR-18
**Owner:** Product owner

**OQ-3: How does a guide map pages to the source paths they describe, for drift detection?**
Resolved (2026-11-15): Each page's verification record MAY hold an optional `sources` field listing the source paths the page describes; drift detection (FR-27) compares commits touching those paths with the record's base commit.
**Impact:** FR-27
**Owner:** Tech lead

**OQ-4: Should the validator enforce title and summary lengths and an h1 that matches the title, as saboteur-sites' importer does?**
Resolved (2026-11-15): The validator reports a title over 70 characters, a summary under 50 or over 160 characters, and a leading h1 that differs from `title` as warnings (FR-12). Feature 9's versioned contract MAY later promote selected checks to errors. Background, measured by grep: Getwrite's `protect-and-finish/compiling.md` summary is over 160 characters and `write/writing-log.md` h1 "Daily writing log" differs in case from title "Daily Writing Log"; with warnings, Getwrite still satisfies FR-21.
**Impact:** FR-12, FR-25
**Owner:** Product owner

**OQ-5: Should the renderer be built, or adapted from an existing static generator?**
Deferred to Feature 4 (owner decision, 2026-11-15). Before Feature 4's task breakdown, spike build-vs-adapt (for example Astro Starlight) against Getwrite's handbook, then choose colour roles (OQ-2) to fit what the renderer can map.
**Impact:** FR-16, FR-17
**Owner:** Tech lead

**OQ-6: Does Feature 5 fix Getwrite's `story/metadata.md` front matter, or amend FR-21?**
Measured fact: in a Getwrite checkout, `docs/user/handbook/story/metadata.md` front matter has an unquoted `summary:` value containing ": ". Three independent checks reject it: the `yaml` npm library ("Nested mappings are not allowed in compact mappings"), Python PyYAML safe_load (parse error), and saboteur-sites' `scripts/import-handbook.mjs` ("summary is not valid YAML unquoted"). FR-21 requires the handbook to pass the FR-12 checks with no edits to its pages, which cannot hold for the current page. Decide whether Feature 5 fixes Getwrite's page (one quoting fix) or amends FR-21.
**Impact:** FR-21, Feature 5
**Owner:** Product owner

## Out of Scope (Deferred)
- [v2] Further user guide types (getting started, FAQ, troubleshooting).
- [v2] Theming beyond brand values (layouts, components).
- [v2] A packaged install, such as an npm CLI.
- [Post-v2] Search in the rendered site.
