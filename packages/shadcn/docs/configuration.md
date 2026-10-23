---
title: Configure @razorwind/shadcn
description: Set the registry path, name, and local scopes.
documentType: reference
---

# Configure @razorwind/shadcn

### `ShadcnExtractPluginOptions`

Declared in `shadcn/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `configFile` | No | `string` | Path to the shadcn `registry.json` file. Default: "registry.json" ```ts import { defineConfig } from "@razorwind/core"; import shadcn from "@razorwind/shadcn/extract"; export default defineConfig({ plugins: [shadcn({ configFile: "components/registry.json" })] }); ``` |

### `ShadcnGeneratePluginOptions`

Declared in `shadcn/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `localDependencyScopes` | No | `string[]` | npm scopes whose packages are installed as local source files instead of npm packages (for example `["@cyclone-ui"]`). Excludes these packages from emitted dependencies and devDependencies. Registered runtime component dependencies are retained as unversioned registryDependencies |
| `configFile` | No | `string` | Output path for the generated `registry.json` file. Default: "registry.json" |
| `name` | No | `string` | Registry `name` field written into `registry.json`. |
| `homepage` | No | `string` | Registry `homepage` field written into `registry.json`. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, shadcn registry wiring steps are generated for the output file. |
