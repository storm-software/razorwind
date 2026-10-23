---
title: Configure @razorwind/design-md
description: Set the DESIGN.md path and front-matter fields.
documentType: reference
---

# Configure @razorwind/design-md

### `DesignMdExtractPluginOptions`

Declared in `design-md/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `path` | No | `string` | The path to the DESIGN.md file. Default: DESIGN.md |

### `DesignMdGeneratePluginOptions`

Declared in `design-md/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Output file path (relative to the execution cwd). Default: DESIGN.md |
| `name` | No | `string` | Design system name written to the YAML front matter. Default: "Razorwind Design System" |
| `description` | No | `string` | Short design system description written to the YAML front matter. |
| `version` | No | `string` | DESIGN.md spec version written to the YAML front matter. Default: "alpha" |
| `overview` | No | `string` | Prose used for the `## Overview` section. When omitted, a summary is generated from the extracted tokens. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, DESIGN.md wiring steps are generated for the output file. |
