---
title: @razorwind/shell-shock API
description: Use the generator, the Shell Shock plugin, and the command ids.
documentType: reference
---

# @razorwind/shell-shock API

`@razorwind/shell-shock` is the Razorwind plugin named `shell-shock`. It throws `@razorwind/shell-shock requires options: { mapTheme }` without options. `inferPalette` fills common color roles. `SNAPSHOT_FILE_NAME` is `design-system.json`.

`@razorwind/shell-shock/plugin` exports `plugin`. It loads `spec`, `specFile`, or the project `razorwind.config.*`. Command ids are `search-tokens`, `list-tokens`, `search-components`, `list-components`, `search-icons`, `list-icons`, `search-fonts`, `list-fonts`, `plan`, `guidelines`, and `analyze-a11y`. Set `prefix` to prepend it, for example `ds-search-tokens`. Pass `theme: false` or `mcp: false` to skip those child plugins.

`@razorwind/shell-shock/runtime` exports the search and plan functions used by the generated commands.
