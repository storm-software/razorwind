---
title: Configure Razorwind
description: Choose a config file, set source paths, and register plugins.
documentType: reference
---

# Configure Razorwind

Call `defineConfig` from `@razorwind/core`. The function returns the value you pass. The export may be an object, an array of objects, a promise, or a function. A function receives `{ cwd, mode }`. When `mode` is omitted, that argument is `"development"`.

An array is one generation run per item.

## File lookup

`resolveConfigs` picks the first existing path:

1. `configFile`, when that path exists.
2. `razorwind.<mode>.ts`, `.js`, `.mts`, `.mjs`, `.cjs`, `.cts`, `.json`, `.yaml`, then `.yml`.
3. `razorwind.config.ts`, `.js`, `.mts`, `.mjs`, `.cjs`, `.cts`, `.json`, `.yaml`, then `.yml`.

If you omit `mode`, the second step looks for `razorwind.undefined.*`. Those files are skipped when they are absent, and lookup continues at `razorwind.config.*`.

## Merge order

The first source wins.

1. Execute or CLI options. Core removes `tokensPath`, `componentsPath`, `iconsPath`, `fontsPath`, `guidelinesPath`, and `fontAssetsUrl` from those options when the config item already sets them.
2. The loaded config item.
3. Other workspace layers from `c12`, including `.razorwindrc`, the `razorwind` key in `package.json`, and `extends`. The main config file is not merged a second time.
4. The config directory from the Razorwind environment paths.
5. A Razorwind config in the home directory.

`componentsPath` defaults to the current working directory. `plugins` defaults to an empty array. `verbose` becomes true only when the execute options or the user config set `verbose` to true.

## Source options

### `Options`

Declared in `core/src/types/config.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `configFile` | No | `string` | The directory or file containing a Razorwind configuration file. If not provided, the application will look for a configuration file in the following order: - `razorwind.config.ts` - `razorwind.config.js` - `razorwind.config.mts` - `razorwind.config.mjs` - `razorwind.config.cjs` |
| `componentsPath` | No | `string \| string[]` | The path(s) to directories containing component directories or files. |
| `iconsPath` | No | `string \| string[]` | The path(s) to directories containing icon assets or icon directories. |
| `fontsPath` | No | `string \| string[]` | The path(s) to directories containing font files or font directories. |
| `fontAssetsUrl` | No | `string` | Absolute HTTP(S) base URL used for local font asset references emitted by generators. Font filenames are appended to this URL. |
| `tokensPath` | No | `string \| string[]` | Default: "tokens.json" (or "tokens" directory) |
| `guidelinesPath` | No | `string \| string[]` | The path(s) to directories containing guideline markdown files or guideline directories. Each guideline should be a markdown file with optional frontmatter for metadata. |
| `mode` | No | `"development" \| "test" \| "production"` | The mode to use for the configuration. Default: "production" |
| `verbose` | No | `boolean` | When true, Style Dictionary runs with `log.verbosity: "verbose"`. Overrides `log.verbosity` on a Style Dictionary config, matching the Style Dictionary CLI `--verbose` flag. When omitted or false, config `log.verbosity` (or Style Dictionary defaults) still apply. Default: false |
| `splitThemes` | No | `boolean` | Whether to split multi-file token sources into a record keyed by theme. When `true`, each resolved source file is inspected for a theme-like basename. The recognized names include (case-insensitive): - `light` - `dark` - `dim` - `dimmed` - `high-contrast` - `hc` - `highContrast` |

`splitThemes` splits theme files only when the value is `true`. The type comment says the default is true. The loader does not apply that default. Set `splitThemes: true` when you want the split.

Theme file names match this basename pattern: `light`, `dark`, `dim`, `dimmed`, `high-contrast`, `hc`, `protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia`, `achromatomaly`, `monochrome`, `monochromatic`, `grayscale`, `greyscale`, `bw`, `black-and-white`, `black-white`, `blackWhite`, `default`, `base`, and `theme`. A suffix after `.`, `_`, or `-` is allowed. The shared `base` set is not written as its own theme.

Token directories expand to `**/*.{json,json5,jsonc,yaml,yml,toml,css,js,mjs,cjs,ts,mts,cts}`.

## Identity and inline data

These fields sit on `UserConfig` in addition to the source options:

| Field | Purpose |
| --- | --- |
| `name`, `title`, `version`, `description` | Design-system identity copied onto the schema. |
| `author`, `license`, `repository`, `homepage`, `logo`, `tags` | Metadata for generators that read the schema. |
| `tokens`, `components`, `icons`, `fonts`, `guidelines` | Inline data. Inline tokens are used when the value is not empty, instead of `tokensPath`. |
| `plugins` | Plugin objects. Nested `plugins` arrays are flattened. The first plugin with a given `name` is kept. |

## Plugin contract

A plugin may set `parsers`, `preprocessors`, `extract`, `validate`, `generate`, and `themeGeneration`.

`themeGeneration` defaults to `"split"`. Split plugins run once per theme. Output paths gain `-<theme>` before the extension. `"combined"` plugins run once on the full token record.

Built-in Style Dictionary parsers are `razorwind-json`, `razorwind-yaml`, `razorwind-toml`, and `razorwind-css`. Plugin parsers are registered with those hooks.
