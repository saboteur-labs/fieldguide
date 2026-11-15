# Guide format validator

The validator checks a guide directory against the Fieldguide guide format and
prints a plain-text report. This page documents the report layout, the exit
codes and the `format` key. The layout and exit codes below are stable.

This page describes the validator only. It does not define the content contract
for guides.

## Running it

Run the validator from a local checkout of this repository. It needs no network
access once dependencies are installed.

```
npm ci
node bin/fieldguide.js validate <guidePath>
```

`npm ci` is the only step that uses the network, and only to install the two
dependencies (`markdown-it` and `yaml`). `package.json` also declares a
`fieldguide` bin entry that points at `bin/fieldguide.js`. The command takes
exactly one command word (`validate`) and exactly one guide path. It accepts no
flags; any flag is a usage error (exit code 2).

The report is written to stdout. Usage and error messages for exit code 2 are
written to stderr.

## Report layout (stable)

The report is plain text. Findings are grouped under one header per file, and
the last line is a summary.

```
<file>
  <line>: <severity>: <message>
  <line>: <severity>: <message>

<file>
  <line>: <severity>: <message>

Summary: errors: <n>, warnings: <n>, format <n> checked
```

- **File header.** One line per file that has findings, holding the file name
  as the validator recorded it (guide-relative path, for example
  `index.md` or `fieldguide.yaml`). Files are sorted by name (plain string
  comparison).
- **Finding line.** Indented by 2 spaces under its file header, in the form
  `line: severity: message`. `severity` is `error` or `warning`.
- **File-level placeholder.** A finding that belongs to a file as a whole, with
  no line number, prints `-` in the line position, for example
  `  -: error: <message>`.
- **Order within a file.** File-level findings (`-`) come first, then findings
  by ascending line number. Findings on the same line are ordered errors before
  warnings, then by message text.
- **Blank lines.** One blank line separates each file group, and one separates
  the last file group from the summary.
- **Summary line.** Always the last line:
  `Summary: errors: <n>, warnings: <n>, format <n> checked`. The counts after
  `errors:` and `warnings:` cover the whole guide. `format <n> checked` is the
  guide format version this validator checked (see below).
- **No findings.** The report is just the summary line, for example
  `Summary: errors: 0, warnings: 0, format 1 checked`.
- Output is deterministic for a given guide and ends with a single newline.

Example, from `node bin/fieldguide.js validate test/fixtures/guides/broken`
(abridged):

```
bad-links.md
  8: error: Linked file not found: nope.md
  16: warning: Link target starts with "/": /docs/page.md (use a relative path)

index.md
  1: error: front matter is missing required key "title" (a non-empty string)

Summary: errors: 9, warnings: 4, format 1 checked
```

The message wording is not part of the stable layout. The structure above is.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| 0 | The validator ran and found no errors. Warnings alone still exit 0. |
| 1 | The validator ran and found at least one error finding. A missing or unparseable `fieldguide.yaml` is an error finding, so it exits 1. |
| 2 | The validator could not run: an unknown flag, a command other than `validate`, a missing or extra guide path, a guide path that does not exist, or a guide path that is not a directory. A usage line goes to stderr and no report is printed. |

## The `format` key

`fieldguide.yaml` at the guide root must contain an integer `format` key. The
current value is `1`.

- If `format` is absent (or null), the validator reports an error. It also
  reports an error if the value is not an integer, or is an integer lower than
  the current value.
- If `format` is newer than the validator supports (greater than `1` today), the
  validator reports an error saying the guide format is newer than the validator
  supports and that the validator is out of date. That is an error finding, so
  the exit code is 1.
- The summary line states `format <n> checked`, where `<n>` is the format
  version the validator supports (currently 1), not the value read from the
  guide.

## Known gap

Raw HTML links (for example `<a href="...">`) are not checked, and explicit
`<a id="...">` anchors are not supported: anchors derive from headings only.
