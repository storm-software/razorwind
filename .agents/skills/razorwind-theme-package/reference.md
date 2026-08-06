---
name: razorwind-theme-package-reference
---

# Theme package reference

Details agents load when implementing a package. Prefer copying from `packages/shiki` / `packages/vsce` over inventing new structure.

## Dependencies (`package.json`)

```json
{
  "name": "@razorwind/<name>",
  "dependencies": {
    "@power-plant/core": "catalog:",
    "@power-plant/dtcg-schema": "catalog:",
    "@razorwind/core": "workspace:*"
  },
  "devDependencies": {
    "@powerlines/plugin-tsdown": "catalog:",
    "@types/node": "catalog:",
    "typescript": "^6.0.3"
  }
}
```

Match exports / publishConfig / files (`["dist"]`) to shiki.

## `createDocument` usage

```ts
const PLUGIN_META = { name: "razorwind-<name>" } as const;

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, PluginOptions>[string] {
  return createDocument<Schema, PluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}
```

Languages used today: `"json"`, `"markdown"`, `"typescript"`, `"ignore"`.

## Slugify filenames

```ts
function slugifyThemeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}
```

When writing multiple themes, dedupe slugs (see shiki’s suffix loop).

## `normalizeThemes` pattern

1. Array → validate each element
2. Single theme (type guard) → `[theme]`
3. Record → entries; `name: theme.name || key`
4. Else → TypeError

Type guard must match **required** fields of the target theme type (e.g. shiki needs `name`; vsce needs `name` + `type`).

## Consumer `mapTheme` example (document in README)

```ts
import { defineConfig } from "@razorwind/core";
import plugin, { flattenTokens } from "@razorwind/<name>";

export default defineConfig({
  plugins: [
    plugin({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "my-theme",
          // …target-specific fields using color("…")
        };
      }
    })
  ]
});
```

## Vitest aliases

Copy `packages/shiki/vitest.config.mts` and rename `name` / `cacheDir` / coverage path to the new package. Aliases point at `../core/src` for plugin, schema, utils, tokens.

## Target-specific research

Before defining the Theme interface:

1. Read the target app’s official theme / color-theme docs (use Context7 when applicable)
2. Encode only fields the app actually loads
3. Link those docs in JSDoc on the Theme type and plugin options

## INSTALL.md vs package README

| Artifact | Audience | Content |
|----------|----------|---------|
| Package `README.md` | Developers adding `@razorwind/<name>` | Plugin install, `mapTheme` API, options table |
| Generated `INSTALL.md` | Consumers of generated theme output | How to load/register those files in the app |

vsce historically embeds install steps in generated `README.md` for the extension Marketplace. New theme packages should still emit **`INSTALL.md`** for the generic “configure this theme” guide; add extra artifacts only when the target requires them (e.g. `package.json` for VS Code).
