# Fieldguide

Fieldguide is a method plus a toolchain for writing trustworthy product guides.
Guide content lives in each project's own repository and versions with the code
it describes. Pages are Markdown with structured front matter, and Fieldguide
validates them against a fixed format. The aim is guides that are consistent
across projects and whose claims have been checked, whether a person or an AI
agent wrote them. It lives outside the projects it documents and is not a
hosting service.

## Status

This is Feature 1 of the MVP: the guide format validator only. There is no
renderer, no writing rules and no verification record yet. The package is
private and is not published to npm.

## Run the validator

You need Node.js 20 or later. From a local checkout:

```
npm ci
node bin/fieldguide.js validate <guidePath>
```

`<guidePath>` is a directory holding a `fieldguide.yaml` and the guide's
Markdown pages. The report is printed to stdout. The exit code is 0 when there
are no errors (warnings alone still exit 0), 1 when the guide has errors, and 2
when the validator could not run (for example a bad path or an unknown flag).

To run the tests: `npm test`.

## Minimal `fieldguide.yaml`

```yaml
format: 1
audience: user
guideType: handbook
verification: standard
```

`verification` may be `strict` or `standard`. Each page needs front matter with
a `title` and a `summary`:

```markdown
---
title: Getting started
summary: How to install the app and create your first project in a few steps.
---

# Getting started
```

## Documentation

- [Guide format validator](docs/validator.md): report layout, exit codes,
  config keys, and the link and warning rules.
