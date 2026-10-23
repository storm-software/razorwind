---
title: Configure @razorwind/shell-shock
description: Set the theme mapper and the Shell Shock command options.
documentType: reference
---

# Configure @razorwind/shell-shock

Razorwind generate options:

### `ShellShockPluginOptions`

Declared in `shell-shock/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated files. Default: "shell-shock" |
| `mapTheme` | Yes | `GenerateShellShockTheme` | Map extracted tokens to Shell Shock theme document(s). Required — without a mapping there is nothing to emit. Use inferPalette inside the mapping for a heuristic starting point. |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
| `snapshot` | No | `boolean` | Also write a `design-system.json` snapshot of the extracted spec, for use with the Shell Shock plugin's `specFile` option. Default: true |
| `stripFileContents` | No | `boolean` | Omit component / icon `files[].content` from the snapshot to keep it small. Usage examples are always retained. Default: true |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. |


Shell Shock plugin options:

### `DesignSystemSourceOptions`

Declared in `shell-shock/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `spec` | No | `Schema` | See the type declaration. |
| `specFile` | No | `string` | Path to a JSON file containing a Razorwind schema or a snapshot written by the Razorwind Shell Shock plugin (`design-system.json`). |
| `root` | No | `string` | Project root containing a `razorwind.config.*` file. Defaults to the Shell Shock project root. |
| `configFile` | No | `string` | See the type declaration. |
| `themeId` | No | `string` | Active theme id to use when the token record is multi-theme (`light`, `dark`, …). Defaults to the first non-shared theme. |
| `guidelines` | No | `GuidelineDocument[] \| string` | Additional guideline documents served by the `guidelines` command. A string is treated as a directory of Markdown files; each file's front matter `keywords` (or filename) become the search keywords. |
| `stripFileContents` | No | `boolean` | Omit component / icon `files[].content` from the baked snapshot. Default: true |

### `ShellShockDesignSystemPluginOptions`

Declared in `shell-shock/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `prefix` | No | `string` | Prefix applied to every contributed command name, for example `"ds"` produces `ds-search-tokens`. |
| `commands` | No | `DesignSystemCommandId[]` or a partial record of booleans | Restrict the contributed commands. Defaults to all commands. |
| `mapTheme` | No | `(spec: Schema) => ShellShockTheme` | Map the loaded design system to the Shell Shock CLI theme. Defaults to inferPalette — a heuristic lookup of common token roles. |
| `theme` | No | `Partial<ThemeUserConfig> \| false` | Explicit theme values merged over the mapped theme (explicit values win). Pass `false` to skip the `@shell-shock/plugin-theme` child plugin and leave the CLI theme untouched. |
| `mcp` | No | `McpPluginOptions \| false` | Options for the `@shell-shock/plugin-mcp` child plugin. Pass `false` to skip MCP. The generated server imports `@modelcontextprotocol/server` and `zod`. Add both to the CLI project. |
