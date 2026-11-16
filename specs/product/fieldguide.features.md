# Feature breakdown: Fieldguide

**Source spec:** `specs/product/fieldguide.md`
**Milestone scope:** All milestones — MVP (Features 1–5), v1 (Features 6–10), v2 (Features 11–13)

## MVP

### Feature 1: Guide format and validator
**Value:** A maintainer can point the validator at a guide directory and get every front matter, ordering and link error reported per file, before anything else exists.
**Vertical slice:** data (guide config, page front matter, part `index.md`) / logic (parsing, ordering, link and anchor resolution) / interface (command run from a local checkout, per-file error output)
**Requirements covered:** FR-1, FR-2, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-20
**User stories:** US-1, US-3, US-4, US-5, US-6, US-10
**Depends on:** none
**Branch suggestion:** feat/guide-format-validator
**Notes:** FR-2 is validated here as a config field only; enforcing `verification` belongs to Feature 3, and acting on `audience`/`guideType` belongs to Feature 2. The ordering and part-naming rules (FR-8, FR-9) live here because navigation in Feature 4 consumes their output. The OQ-4 length and h1 checks are warnings in FR-12. The page format must be versioned from this feature onward (spec Constraints).

### Feature 2: User-audience writing method and rules
**Value:** A writer, human or agent, can follow Fieldguide's instructions from one entry point to plan and write a user handbook, with per-guide grade level and phrase rules, and get phrase warnings from the validator.
**Vertical slice:** content (user-audience rules, handbook page-breakdown template, entry-point file, default phrase lists) / data (writing-rules section of the guide config) / logic (phrase matching that respects allowed terms) / interface (warnings in validator output)
**Requirements covered:** FR-3, FR-4, FR-5, FR-6, FR-19
**User stories:** US-1, US-2, US-4, US-6
**Depends on:** Feature 1
**Branch suggestion:** feat/user-writing-method
**Notes:** FR-5 is no longer blocked (OQ-1 resolved 2026-11-15): the default lists are a small seed list, versioned content that grows with use, and writing the specific seed entries is Feature 2 work. FR-19 maps every method step; the verify and render entries point at files that Features 3 and 4 deliver, so each of those features updates the entry point as it lands.

### Feature 3: Verification record and level enforcement
**Value:** A maintainer can record evidence for each page in a per-page YAML file, and the validator fails any page that lacks a record or doesn't meet the guide's `strict` or `standard` level.
**Vertical slice:** data (per-page YAML record schema) / logic (coverage and level checks) / interface (validator errors) / content (verify step of the method)
**Requirements covered:** FR-13, FR-14
**User stories:** US-3
**Depends on:** Feature 1
**Branch suggestion:** feat/verification-record
**Notes:** This feature reserves the optional `sources` field in the record schema (OQ-3 resolved 2026-11-15); Feature 11 consumes it. The validator can confirm that every page has a record and that row labels meet the level. It cannot confirm that every statement on a page has a row; the method docs must say so rather than imply the check covers it.

### Feature 4: Branded static site renderer
**Value:** A maintainer can render a validated guide to an accessible static site with navigation, mobile layout, light and dark themes, and their own brand values.
**Vertical slice:** data (brand values in the guide config) / logic (navigation from parts and pages, theming, contrast checks) / interface (generated HTML site, contrast errors in validator output)
**Requirements covered:** FR-15, FR-16, FR-17, FR-18
**User stories:** US-3, US-5
**Depends on:** Feature 1
**Branch suggestion:** feat/static-renderer
**Notes:** FR-18 is blocked on OQ-2 (required colour roles), which also determines which pairs FR-17 checks. OQ-2 and OQ-5 are deferred to this feature (owner decision, 2026-11-15): before task breakdown, spike build-vs-adapt (for example Astro Starlight) against Getwrite's handbook, then choose colour roles to fit what the renderer can map. FR-15 only requires that record files never reach the output, so this feature does not need Feature 3 to ship.

### Feature 5: Getwrite handbook as the proof case
**Value:** Getwrite's existing user handbook validates, carries its verification record in Fieldguide's format, and renders as a branded site without edits to its pages.
**Vertical slice:** data (Getwrite guide config, converted per-page records) / logic (record conversion) / interface (rendered Getwrite handbook)
**Requirements covered:** FR-21
**User stories:** US-5
**Depends on:** Features 1, 3, 4
**Branch suggestion:** feat/getwrite-proof
**Notes:** Getwrite's record is one Markdown file with columns that differ between sections, so conversion may need per-section mapping. Work in the Getwrite repo (adding the guide config and converted records) happens on a branch there.

## v1

### Feature 6: Developer audience and onboarding guide type
**Value:** A maintainer can write developer onboarding guides with rules focused on observed architecture, repo docs, edge cases and gotchas.
**Vertical slice:** content (developer rules, onboarding page-breakdown template, entry-point entries) / data (`developer` and `onboarding` config values, developer default phrase lists) / logic (validator accepts the new values)
**Requirements covered:** FR-22
**User stories:** US-7
**Depends on:** Feature 2
**Branch suggestion:** feat/developer-audience
**Notes:** Writing rules are per guide (concept decision), so developer guides need their own default lists, which usually allow terms a user guide bans.

### Feature 7: Screenshots in pages
**Value:** A maintainer can include screenshots stored inside the guide, each recorded in the verification record, and readers see them on the rendered site.
**Vertical slice:** data (image location rules, record rows for images) / logic (image link validation, record coverage of images) / interface (images rendered on the site)
**Requirements covered:** FR-23
**User stories:** US-8
**Depends on:** Features 3, 4
**Branch suggestion:** feat/screenshots
**Notes:** The saboteur-sites importer currently rejects relative images, so this feature affects Feature 9's contract and that importer.

### Feature 8: Writing-rules linter
**Value:** A maintainer can see a reading grade for each page and the suggested replacement for each avoided phrase, in context.
**Vertical slice:** logic (readability scoring, in-context replacement suggestions) / interface (per-page lint report)
**Requirements covered:** FR-24
**User stories:** US-9
**Depends on:** Feature 2
**Branch suggestion:** feat/writing-linter
**Notes:** The grade stays a target, not a gate (FR-4). The concept notes that product UI names can inflate a formula's grade; allowed terms are the likely input for handling that.

### Feature 9: Published content contract
**Value:** A site maintainer can render validated guides with their own stack, following a versioned contract.
**Vertical slice:** content (versioned contract document) / data (documents the `format` marker that Feature 1 defines in `fieldguide.yaml`) / logic (validator reports the contract version it checks against)
**Requirements covered:** FR-25
**User stories:** US-10
**Depends on:** Feature 1
**Branch suggestion:** feat/content-contract
**Notes:** The contract documents decisions Feature 1 made. Reconciling it with the saboteur-sites importer's extra rules is part of OQ-4. The importer treats a missing or non-integer `order` as an error (import-handbook.mjs line 184), which conflicts with FR-7 (order optional); the contract must reconcile this. Feature 9 may also promote selected FR-12 warnings to errors.

### Feature 10: Claude Code skill wrappers
**Value:** A maintainer using Claude Code can run the method through skills that call the agent-agnostic instructions.
**Vertical slice:** interface (skills) / content (pointers into the entry point and method docs)
**Requirements covered:** FR-26
**User stories:** US-6
**Depends on:** Feature 2
**Branch suggestion:** feat/claude-code-skills
**Notes:** Wrappers must not duplicate instructions, so they stay thin and change only when the entry point changes.

## v2

### Feature 11: Drift detection
**Value:** A maintainer can list pages whose verification predates commits that touch the source paths they describe.
**Vertical slice:** data (page-to-source-path mapping in the `sources` field of each verification record) / logic (comparing git history with each record's base commit) / interface (drift report)
**Requirements covered:** FR-27
**User stories:** US-11
**Depends on:** Feature 3
**Branch suggestion:** feat/drift-detection
**Notes:** No longer blocked (OQ-3 resolved 2026-11-15): pages map to source paths through the optional `sources` field in each verification record, reserved by Feature 3.

### Feature 12: Publish from a release tag
**Value:** A maintainer can render a guide as it existed at a named git tag, so published docs match a release.
**Vertical slice:** logic (reading the guide at a tag) / interface (render command option)
**Requirements covered:** FR-28
**User stories:** US-12
**Depends on:** Feature 4
**Branch suggestion:** feat/tag-publishing

### Feature 13: Wrappers for another agent harness
**Value:** A maintainer using an agent harness other than Claude Code can run the method through native wrappers.
**Vertical slice:** interface (harness-specific wrappers) / content (pointers into the entry point)
**Requirements covered:** FR-29
**User stories:** US-6
**Depends on:** Feature 2
**Branch suggestion:** feat/agent-wrappers
**Notes:** Which harness is not chosen. Feature 10's thin-wrapper pattern is the model.

## Coverage check
- Requirements covered: FR-1 → F1, FR-2 → F1, FR-3 → F2, FR-4 → F2, FR-5 → F2, FR-6 → F2, FR-7 → F1, FR-8 → F1, FR-9 → F1, FR-10 → F1, FR-11 → F1, FR-12 → F1, FR-13 → F3, FR-14 → F3, FR-15 → F4, FR-16 → F4, FR-17 → F4, FR-18 → F4, FR-19 → F2, FR-20 → F1, FR-21 → F5, FR-22 → F6, FR-23 → F7, FR-24 → F8, FR-25 → F9, FR-26 → F10, FR-27 → F11, FR-28 → F12, FR-29 → F13
- Unassigned requirements: none

## Summary
- Total features: 13
- Suggested build order: MVP: 1, then 2, 3 and 4 in parallel, then 5. v1: 6, 8, 9 and 10 in parallel, then 7. v2: 11, 12 and 13 in parallel.
- Independently shippable: Feature 1 (no dependencies). After Feature 1, Features 2, 3, 4 and 9 each need only Feature 1.
- Risks:
  - Feature 5 depends on three features, and the record conversion may be unexpectedly costly.
  - Feature 2's entry point (FR-19) is touched by Features 3, 4, 6, 10 and 13; edits must stay small to avoid conflicts between parallel branches.
  - Blocked items: only Feature 4 remains blocked, on OQ-2 and OQ-5 (deferred to Feature 4 by owner decision, 2026-11-15).
  - Feature 1 is the format contract every other feature reads; changes to it after Features 2–4 start will ripple.
