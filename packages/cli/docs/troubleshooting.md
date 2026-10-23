---
title: Fix CLI failures
description: Handle missing targets, failed accessibility checks, and a private package manifest.
documentType: recipe
---

# Fix CLI failures

## `generate` throws about plugins

The config has no plugins. Add one. See [core troubleshooting](../../core/docs/troubleshooting.md).

## `test` throws before an audit

Pass a target. A directory must contain at least one `.html` file outside `node_modules`.

## `test` exits 1

The exit code is 1 when any violation is reported. The printed rule id and help URL identify the axe-core rule. The command does not write a report file.

## Accessibility results look incomplete

jsdom does not compute layout and does not run client scripts. Use a browser audit when you need color contrast or a rendered page.

## `gc` removes the wrong files

The command deletes directories from the resolved environment paths. Run it only when those cache, data, log, and temp directories are disposable. There is no dry-run flag in the handler.

## The package is not on npm

`@razorwind/cli` is marked private in its manifest. Build it from this repository.
