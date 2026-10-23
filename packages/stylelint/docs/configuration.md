---
title: Configure @razorwind/stylelint
description: Set the output filename, prefix, and token domains.
documentType: reference
---

# Configure @razorwind/stylelint

### `StylelintPluginOptions`

Declared in `stylelint/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `stylelintPath` | No | `string` | Filename of the generated Stylelint plugin module, not an output directory. Relative paths are resolved against the generation cwd. For a module in a directory, include the filename (for example, `stylelint/design-system/index.mjs`). Default: "stylelint/design-system/index.mjs" |
| `prefix` | No | `string` | Rule namespace used in `stylelint.config.*` (`<prefix>/ensure-design-token-usage`). Default: "design-system" |
| `runtimeImport` | No | `string` | Module the generated file imports `createDesignSystemPlugin` from. Default: "@razorwind/stylelint/runtime" |
| `cssVarPrefix` | No | `string \| false` | Prefix of generated CSS custom properties (`--<prefix>-color-primary`). Set `false` when tokens have no prefix. Default: initials from the schema name, matching `@razorwind/css`. |
| `tailwind` | No | `boolean` | Include the `@razorwind/tailwindcss` guardrails, exposed as `<prefix>/tailwind-*` rules that read `@apply` preludes and theme variable references. Default: true |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Stylelint config wiring steps are generated for the output file. |

`DesignSystemOptions` is the config for the generated Stylelint config factory. It is not an argument to the Razorwind plugin.

### `DesignSystemOptions`

Declared in `stylelint/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `files` | No | `string[]` | See the type declaration. |
| `ignoreFiles` | No | `string[]` | See the type declaration. |
| `severity` | No | `Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>` | See the type declaration. |
| `tokenUsage` | No | `TokenUsageDomains` | See the type declaration. |
| `fallbackUsage` | No | `FallbackUsage` | Fallback strategy of `no-unsafe-design-token-usage`. Default: "optional" |
