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
| 2 | The validator could not run: an unknown flag, a command other than `validate`, a missing or extra guide path, a guide path that does not exist, a guide path that is not a directory, or a guide directory that cannot be read. A usage line goes to stderr and no report is printed. |

A subdirectory inside the guide that cannot be read is not a failure to run: it
is a file-level (`-`) error on that directory, and the rest of the guide is
still checked.

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

## Other config keys

Besides `format`, `fieldguide.yaml` must set these keys. A missing key or a
value outside the list is an error:

| Key | Allowed values |
| --- | -------------- |
| `audience` | `user` |
| `guideType` | `handbook` |
| `verification` | `strict`, `standard` |

Unknown keys are not checked and produce no finding. They are passed through
unchanged in the `config` object that `validateGuide()` returns, so later
features and other consumers can read them. A missing, unreadable or unparseable
`fieldguide.yaml`, or one that is not a mapping, is an error on the file
`fieldguide.yaml`.

## What it checks in pages

The validator reads every `*.md` file under the guide directory, skipping
directories that start with `.` and `node_modules`.

**Front matter (errors).** Each page opens with a `---` fenced YAML block. It
must be closed, must be a mapping, and must contain a non-empty string `title`
and a non-empty string `summary`. If present, `order` must be a number. A page
with no front matter block gets file-level (`-`) errors for the missing keys.
A YAML syntax error is reported on the file line where the parser stopped.

**Links (errors unless noted).** Inline links, images and reference-style link
definitions are checked; links inside code blocks are not. Reference
definitions follow CommonMark: a `[label]: target` line inside a paragraph or an
HTML block is not a definition, definitions inside block quotes or with the
target on the next line are, and the first of two definitions with the same
label wins.

- Targets with a URL scheme (`https:`, `mailto:`, and so on) and `//` targets
  are skipped. External links are never fetched.
- A target starting with `/` is a warning: use a relative path. It is not
  resolved further.
- Relative targets resolve from the page's own folder. Percent-encoding is
  decoded and a `?query` part is dropped.
- A target that resolves outside the guide directory is an error, as is a
  target that does not exist (any file type, including images).
- A target whose letter case differs from the file on disk (`Index.md` for
  `index.md`) is a warning on every platform. Such a link works on macOS and
  Windows but breaks on Linux and GitHub.
- A `#anchor` is checked against the headings of the target page, or of the
  same page when the target is only `#anchor`. Anchors are only checked when
  the target is a `.md` file (any case), and not for images.
- Anchors are GitHub-style heading slugs: lower-cased, punctuation removed
  (letters, accent marks, digits, spaces, `_` and `-` are kept), spaces turned
  into `-`. Repeated headings get `-1`, `-2` and so on.

**Warnings.** These never change the exit code:

- `title` longer than 70 characters (counted as Unicode code points).
- `summary` shorter than 50 or longer than 160 characters.
- The page's leading `h1` (the first heading, if it is level 1) differs from
  `title`. The comparison is case-sensitive. A title matches if it equals the
  heading either as written (``Using `foo` ``) or as plain text (`Using foo`).
- A link target whose case differs from the file on disk (see Links).

## Known gap

Raw HTML links (for example `<a href="...">`) are not checked, and explicit
`<a id="...">` anchors are not supported: anchors derive from headings only.
