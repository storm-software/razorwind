---
title: Fix @razorwind/benchmark failures
description: Set agents and keep outputPath relative.
documentType: recipe
---

# Fix @razorwind/benchmark failures

When no agent CLI is installed, generation throws `No supported benchmark agent is available (tried codex, claude-code)`.

When `agents` names an agent that is not installed, generation throws `Missing required benchmark agents: ...`.

`assertSafeRelativePath` rejects an empty path, `.`, `..`, a `../` prefix, and an absolute path.

`judge.model` must be non-empty when you set `judge`.
