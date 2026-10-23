---
title: Configure @razorwind/tamagui
description: Choose the Tamagui target, output file, and animation driver.
documentType: reference
---

# Configure @razorwind/tamagui

### `TamaguiPluginOptions`

Declared in `tamagui/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `target` | No | `TamaguiTarget` | Tamagui major-version syntax to target in generated output. V3 output enables flat-value settings, augments the `tamagui` module, and documents bare token names. V2 remains the default to preserve existing generated output. Default: "v2" |
| `tamaguiModule` | No | `string` | The module the generated config imports `createTamagui` (and friends) from, and augments with `TamaguiCustomConfig`. Use `"@tamagui/core"` for an app that depends on the core package rather than `tamagui`. Default: "tamagui" |
| `outputPath` | No | `string` | Output path written relative to the execution cwd. Light and dark schemes are always written to this single file — Tamagui `createThemes` encodes both as `light` / `dark` plus nested children. Default: "tamagui.config.ts" |
| `animations` | No | `TamaguiAnimationDriver` | Animation driver import from `@tamagui/config/v5-*`. Set to `false` to omit animations (v5 base config includes none). Default: "css" |
| `shorthands` | No | `Record<string, string \| number>` | Shorthands to include in the generated config. Default: {} |
| `media` | No | `CreateTamaguiProps["media"]` | Media queries to include in the generated config. Default: {} |
| `defaultFont` | No | `string` | Default font family to include in the generated config. |
| `importConfig` | No | `string` | A module to import config from to include in the generated config. |
| `useDefaultConfig` | No | `boolean` | When true, spread `defaultConfig` from `@tamagui/config/v5` and merge generated tokens/themes on top. When false, emit a minimal config from Razorwind tokens only. Default: false |
| `includeTypes` | No | `TokenType[]` | Restrict generated token rows to these DTCG `$type` values. When omitted, all supported types are included. |
| `includeTypeAugmentation` | No | `boolean` | Include a TypeScript module augmentation so `$` token autocomplete picks up generated tokens. Default: true |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Tamagui wiring steps are generated for the output config file. |

### `TamaguiEslintPluginOptions`

Declared in `tamagui/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `target` | No | `TamaguiTarget` | Tamagui major-version syntax the app is written in. Only `"v3"` emits the guardrails plugin; V2 `$token` / condition-object syntax is not linted. Default: "v2" |
| `eslintPath` | No | `string` | Output path of the generated ESLint plugin module, written relative to the execution cwd. Default: "eslint/tamagui/razorwind-guardrails.mjs" |
| `prefix` | No | `string` | Rule namespace used in `eslint.config.*` (`<prefix>/no-color-literal`). Default: "design-system" |
| `runtimeImport` | No | `string` | Module the generated file imports `createGuardrails` from. Default: "@razorwind/tamagui/eslint-runtime" |
| `shorthands` | No | `Record<string, string>` | Shorthands configured on the app's Tamagui config, merged over the `@tamagui/shorthands/v5` defaults so `bg` / `p` / `rounded` resolve to their style property. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, ESLint flat-config wiring steps are generated for the output file. |


`tamaguiModule` defaults to `tamagui` for target `v3`, and to `@tamagui/core` otherwise. `animations` defaults to `css`. `includeTypeAugmentation` defaults to true.
