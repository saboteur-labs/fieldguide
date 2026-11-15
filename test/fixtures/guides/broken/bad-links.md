---
title: Bad links
summary: A page whose links are broken in each of the ways the validator checks.
---

# Bad links

[missing file](nope.md)

[outside](../../outside.md)

[bad anchor here](#no-such-heading)

[bad anchor there](index.md#no-such-heading)

[rooted](/docs/page.md)

![missing image](nope.png)

```md
[in a fence](fenced-missing.md)
```

Inline `[in code](code-missing.md)` is skipped.
