---
title: Configure @razorwind/tailwindcss
description: Set CSS paths, the class prefix, and guardrail outputs.
documentType: reference
---

# Configure @razorwind/tailwindcss

### `TailwindExtractPluginOptions`

Declared in `tailwindcss/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `cssPath` | No | `string \| null` | Optional CSS entry override used for extraction (registry `tailwind.css` / explicit path to read). When omitted, the detected workspace CSS entry is used. |
| `omitDefaults` | No | `boolean` | When true, skip entries that carry only the DEFAULT theme option bit during extraction. Default: false |

### `TailwindGeneratePluginOptions`

Declared in `tailwindcss/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `prefix` | No | `string` | Prefix applied by Tailwind to compiled utility classes and CSS variables. The generated `@theme` declarations remain unprefixed as required by Tailwind CSS v4. |
| `cssPath` | No | `string \| null` | Output path written relative to the execution cwd. When omitted, the detected workspace CSS entry is used (falling back to `src/app.css`). |
| `includeImport` | No | `boolean` | When generating CSS, include `@import "tailwindcss";` at the top of the file. Default: true |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Tailwind CSS wiring steps are generated for the output file. |

### `TailwindEslintPluginOptions`

Declared in `tailwindcss/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `eslintPath` | No | `string` | Output path of the generated ESLint plugin module, written relative to the execution cwd. Default: "eslint/razorwind-guardrails.mjs" |
| `prefix` | No | `string` | Rule namespace used in `eslint.config.*` (`<prefix>/no-color-literal`). Default: "design-system" |
| `runtimeImport` | No | `string` | Module the generated file imports `createGuardrails` from. Default: "@razorwind/tailwindcss/eslint-runtime" |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, ESLint flat-config wiring steps are generated for the output file. |

### `TailwindStylelintPluginOptions`

Declared in `tailwindcss/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `stylelintPath` | No | `string` | Output path of the generated Stylelint plugin module, written relative to the execution cwd. Default: "stylelint/razorwind-guardrails.mjs" |
| `prefix` | No | `string` | Rule namespace used in `stylelint.config.*` (`<prefix>/no-color-literal`). Default: "design-system" |
| `runtimeImport` | No | `string` | Module the generated file imports `createGuardrails` from. Default: "@razorwind/tailwindcss/stylelint-runtime" |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Stylelint config wiring steps are generated for the output file. |


ESLint guardrails default to `eslint/razorwind-guardrails.mjs`. Stylelint guardrails default to `stylelint/razorwind-guardrails.mjs`. Both use the prefix `design-system`.
