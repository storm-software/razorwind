---
title: Generate a project from the CLI
description: Add a Razorwind config and run razorwind generate.
documentType: tutorial
---

# Generate a project from the CLI

Create `razorwind.config.ts` as described in the [core quick start](../../core/docs/quick-start.md). From that directory, run:

```bash
razorwind generate
```

The command uses the current working directory as `root`. It calls the core generator. Plugin files are written on success. The handler itself does not print a success line.

Check a static HTML file:

```bash
razorwind test ./site/index.html
```

A file with no violations prints a line in this shape, then a summary:

```text
✔ ./site/index.html (0 violation(s))

0 accessibility violation(s) found across 1 file(s).
```

The path and the counts follow the targets you pass. A violation line includes the impact, rule id, help text, and help URL.

Show command help:

```bash
razorwind help generate
```
