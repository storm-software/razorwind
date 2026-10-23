---
title: Configure @razorwind/eslint
description: Set the output filename, prefix, and bundled guardrails.
documentType: reference
---

# Configure @razorwind/eslint

### `EslintPluginOptions`

Declared in `eslint/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `eslintPath` | No | `string` | Filename of the generated ESLint plugin module, not an output directory. Relative paths are resolved against the generation cwd. For a module in a directory, include the filename (for example, `eslint/design-system/index.mjs`). Default: "eslint/design-system/index.mjs" |
| `prefix` | No | `string` | Rule namespace used in `eslint.config.*` (`<prefix>/ensure-design-token-usage`). Default: "design-system" |
| `runtimeImport` | No | `string` | Module the generated file imports `createDesignSystemPlugin` from. Default: "@razorwind/eslint/runtime" |
| `cssVarPrefix` | No | `string \| false` | Prefix of generated CSS custom properties (`--<prefix>-color-primary`). Set `false` when tokens have no prefix. Default: initials from the schema name, matching `@razorwind/css`. |
| `tailwind` | No | `boolean` | Include the `@razorwind/tailwindcss` class guardrails, exposed as `<prefix>/tailwind-*` rules. Default: true |
| `tamagui` | No | `object` | Include the `@razorwind/tamagui` v3 flat-value guardrails, exposed as `<prefix>/tamagui-*` rules. Pass an object to forward the app's Tamagui shorthands or restrict the token types. Default: false |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, ESLint flat-config wiring steps are generated for the output file. |

`DesignSystemOptions` is the config for the generated flat-config factory. It is not an argument to the Razorwind plugin.

### `DesignSystemOptions`

Declared in `eslint/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `files` | No | `string[]` | See the type declaration. |
| `ignores` | No | `string[]` | See the type declaration. |
| `severity` | No | `Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>` | See the type declaration. |
| `tailwind` | No | `TailwindGuardrailSettings` | See the type declaration. |
| `tamagui` | No | `TamaguiGuardrailSettings` | See the type declaration. |
