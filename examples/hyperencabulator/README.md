# Example: Saboteur HyperEncabulator HX-1

A user handbook for a fictional machine, used as test content for Fieldguide.

## Why this machine

The HyperEncabulator is a joke about over-complicated machines whose parts have
absurd, jargon-heavy names. That makes it a good test of plain-language writing:

- Part names such as **Marzlevane** and **Diractance** are printed on the machine, so
  the handbook has to use them exactly. They are the kind of word a guide's
  *allowed terms* list exists for.
- Everything around those names has to be plain. If a page explains a control with
  more jargon ("modulates reactive diractance"), the writing rules have failed.

## Files

| Path | What it is |
| --- | --- |
| `handbook/` | The guide: `fieldguide.yaml` and its pages. Validates with no errors or warnings. |
| `product-facts.md` | The source of truth for the fictional product. Not part of the guide. |

## Checking claims without a real product

There is no running HX-1 to test against. `product-facts.md` stands in for it: every
factual statement in `handbook/` must trace to a numbered fact there (F-1, F-2, and so
on). When verification records exist (Feature 3), this example's records can cite those
facts as evidence, at the `standard` level the guide's config declares.

## Running it

```sh
node bin/fieldguide.js validate examples/hyperencabulator/handbook
```

`npm test` also validates it, and writes the report to
`.artifacts/hyperencabulator/validate.txt`.
