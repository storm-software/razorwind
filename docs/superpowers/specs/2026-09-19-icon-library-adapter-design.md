# Icon Library Adapter Design

## Summary

Extend `@razorwind/core` with a library-agnostic icon adapter that turns an
imported icon library into portable entries under `schema.icons`. Each
library-backed icon records enough information for generators to import and
use it, and may include a serialized SVG preview for documentation renderers.

The schema remains the shared boundary. Live component functions and other
library-specific runtime values stay in the configuration adapter and never
enter the prepared schema.

## Goals

- Allow a Razorwind configuration to provide one imported icon library through
  a typed adapter.
- Normalize library exports into the existing `schema.icons` record during
  core extraction.
- Preserve package, export, and import-kind information so generators can
  produce correct imports and usage.
- Support an optional serialized SVG preview without requiring core to depend
  on React, Tamagui, or any particular icon implementation.
- Give all plugins shared helpers for retrieving a preferred preview and
  library import metadata.
- Update every current schema-icon consumer, including Docgen, Storybook, and
  LLMS, to understand library-backed icons.
- Preserve existing filesystem and manually configured icon behavior.

## Non-Goals

- Bundle first-party adapters for Lucide, Tamagui, Iconify, or other specific
  libraries.
- Dynamically import a package from a string supplied to core.
- Store live components, functions, or framework elements in the schema.
- Render framework components inside core.
- Support more than one icon-library adapter in a single configuration.
- Change the existing `iconsPath` directory conventions.
- Require an SVG preview for an icon to be usable.

## Configuration API

Add `iconLibrary?: IconLibraryAdapter` to `Options`, which makes it available
to both direct generator options and `UserConfig`. The common use is in a
TypeScript Razorwind configuration where the library is imported normally.

Core exports the adapter contract and an identity helper that retains the
generic type of the imported icon values:

```ts
export type IconImportKind = "named" | "default"

export interface IconLibraryAdaptContext<TIcon> {
  /** Record key exported by the imported library object. */
  exportName: string
  /** Raw value at `icons[exportName]`; it never enters the schema directly. */
  icon: TIcon
}

export interface AdaptedLibraryIcon extends Partial<
  Omit<Icon, "name" | "title" | "source" | "preview">
> {
  name?: string
  title?: string
  exportName?: string
  importKind?: IconImportKind
  svg?: string
}

export interface IconLibraryAdapter<TIcon = unknown> {
  /** Stable library identifier stored in the schema. */
  name: string
  /** Package or module specifier used by generated imports. */
  packageName: string
  /** Imported module exports to inspect. */
  icons: Record<string, TIcon>
  /** Normalize an export, or omit it by returning false/undefined. */
  adapt(
    context: IconLibraryAdaptContext<TIcon>
  ):
    | AdaptedLibraryIcon
    | false
    | undefined
    | Promise<AdaptedLibraryIcon | false | undefined>
}

export function defineIconLibrary<TIcon>(
  adapter: IconLibraryAdapter<TIcon>
): IconLibraryAdapter<TIcon>
```

The adapter callback is required because module namespaces commonly contain
helpers, aliases, and metadata in addition to icons. The adapter owns that
library-specific filtering and serialization.

Example:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import * as LucideIcons from "lucide-react"
import { defineConfig, defineIconLibrary } from "@razorwind/core"
import docgen from "@razorwind/docgen/generate"

export default defineConfig({
  iconLibrary: defineIconLibrary({
    name: "lucide",
    packageName: "lucide-react",
    icons: LucideIcons,
    adapt({ exportName, icon }) {
      if (!isLucideIcon(icon)) {
        return undefined
      }

      return {
        title: exportName,
        svg: renderToStaticMarkup(createElement(icon))
      }
    }
  }),
  plugins: [docgen()]
})
```

The rendering imports and `isLucideIcon` predicate above belong to the
consumer configuration. They are illustrative and are not exported by core.

## Schema Contract

Extend each icon with optional, portable source and preview fields:

```ts
export interface IconLibrarySource {
  type: "library"
  library: string
  packageName: string
  exportName: string
  importKind: "named" | "default"
}

export interface IconSvgPreview {
  type: "svg"
  content: string
}

export interface Icon {
  // Existing fields remain unchanged.
  source?: IconLibrarySource
  preview?: IconSvgPreview
}
```

The actual implementation uses Zod schemas and inferred TypeScript types, as
the existing icon schema does. `source` is discriminated by `type`, and
`preview` is discriminated by its media type so future schema revisions can
add source or preview variants without overloading filesystem fields.

For every accepted adapter result, core applies these defaults:

- `name`: the imported record key;
- `title`: `titleCase(name)`;
- `source.exportName`: the adapter result's `exportName`, otherwise the
  imported record key;
- `source.importKind`: the adapter result's `importKind`, otherwise `"named"`;
- `source.library` and `source.packageName`: the adapter-level values;
- `preview`: `{ type: "svg", content: svg }` when `svg` is provided.

The final icon is validated with `iconSchema`. Adapter output cannot override
the adapter-owned `source.library`, `source.packageName`, or discriminator.
It can still provide existing icon metadata and files.

For a named import, a consumer has enough data to produce:

```ts
import { House } from "lucide-react"
```

For a default import, it has enough data to produce:

```ts
import House from "@example/house-icon"
```

`source.exportName` is also the preferred local identifier for a default
import. Generators remain responsible for escaping or aliasing identifiers in
the output language they own.

## Extraction and Merge Flow

`prepareSpec` performs icon preparation in this order:

1. Run the configured icon-library adapter, if present.
2. Load existing filesystem icons from `iconsPath`.
3. Merge existing manual `config.icons` with filesystem icons using the
   repository's current behavior.
4. Add each library icon only when the merged manual/filesystem record does
   not already contain that icon name.
5. Pass the completed schema through plugin extraction hooks as today.

This produces the approved effective precedence:

1. manually configured `icons`;
2. filesystem icons;
3. library-adapter icons.

The existing manual/filesystem merge behavior is not changed. A name already
owned by either existing source completely excludes the matching adapter
entry, preventing a filesystem icon from accidentally inheriting library
import metadata.

Adapter iteration is deterministic: export keys are sorted before adaptation
and schema insertion. The adapter record and returned metadata are not
mutated.

## Shared Consumer Helpers

Core exports two helpers with the icon schema types:

```ts
export function resolveIconSvgPreview(icon: Icon): string | undefined

export function resolveIconLibrarySource(
  icon: Icon
): IconLibrarySource | undefined
```

`resolveIconSvgPreview` returns `icon.preview.content` first. When there is no
normalized preview, it returns the content of the first SVG entry in
`icon.files`, preserving existing asset-backed previews. It returns
`undefined` when neither form exists.

`resolveIconLibrarySource` returns validated library source metadata or
`undefined` for manual and filesystem icons. Keeping these decisions in core
prevents plugins from developing incompatible fallback rules.

## Plugin Behavior

### Docgen

Docgen uses `resolveIconSvgPreview` for the existing icon preview block. A
library icon with an SVG therefore renders the same way as an asset-backed
icon. When library source metadata exists, the icon page adds an `Import`
section containing syntax for the correct named or default import. Existing
metadata and file tables remain unchanged.

### Storybook

The generated `IconGalleryBlock` uses `resolveIconSvgPreview` while generating
its source. Library SVG previews render in `IconItem`; icons without a preview
retain the existing code-name fallback. Storybook does not import arbitrary
consumer icon packages into its generated block.

### LLMS

The icon companion document adds library name, package name, export name, and
import kind for library-backed icons. It does not embed SVG content. This lets
agents select and import available icons without inflating the text artifact.

These are all current consumers found in the repository. Future plugins use
the same helpers rather than interpreting `preview`, `source`, or legacy files
independently.

## Error Handling

- If the adapter callback throws or rejects, core throws an error that names
  the adapter and export while preserving the original error as its cause.
- If an adapter returns an object that cannot be normalized into a valid
  `Icon`, core throws an error that names the adapter and export and includes
  the schema validation message.
- Returning `false` or `undefined` deliberately omits an export without error.
- An empty `icons` record and an adapter that omits every export both produce
  no library icons and are valid.
- A missing optional SVG preview is valid; import metadata still makes the
  icon usable by code-oriented consumers.
- Invalid manual or filesystem icon behavior remains unchanged by this
  feature.

Failures are not silently converted into partial library extraction because
that would make generated documentation and usage incomplete without warning.

## Internal Structure

Core keeps responsibilities separated:

- `src/schema/icons.ts` defines source and preview schemas, inferred types, and
  retrieval helpers.
- `src/lib/icons/library.ts` defines adapter types, `defineIconLibrary`, and
  normalization/extraction.
- `src/lib/icons/index.ts` exports icon loading and library APIs.
- `src/types/config.ts` adds the optional adapter to configuration.
- `src/lib/prepare.ts` composes manual, filesystem, and library icon sources.

Docgen, Storybook, and LLMS change only their icon rendering modules and
focused tests. Core and relevant package READMEs document the portable
contract and consumer-visible output where appropriate. No external Storm
package, generated integration layer, or `node_modules` content is modified.

## Testing Strategy

Implementation follows red-green-refactor. Tests invoke real adapters and
renderers; mocks are unnecessary for the pure normalization boundary.

Core focused coverage verifies:

- `defineIconLibrary` preserves generic adapter input;
- named imports use record-key defaults;
- default imports retain the configured local/export name;
- synchronous and asynchronous adapter results normalize correctly;
- `false` and `undefined` omit non-icon exports;
- export adaptation and insertion order is deterministic;
- SVG strings become normalized previews;
- metadata overrides and existing `files` survive normalization;
- empty libraries are valid;
- thrown/rejected adapters produce contextual errors with causes;
- invalid adapter output produces contextual schema errors;
- manual icons take precedence over filesystem and adapter icons;
- filesystem icons take precedence over same-named adapter icons;
- adapter extraction does not mutate configuration-owned values;
- preview lookup prefers normalized previews and falls back to legacy SVG
  file content;
- source lookup returns metadata only for library-backed icons;
- the root schema accepts valid source/preview data and rejects malformed
  discriminators or import kinds.

Consumer coverage verifies:

- Docgen displays a library SVG and emits correct named/default import syntax;
- Docgen retains legacy file-backed preview behavior;
- Storybook displays a library SVG and retains the no-preview name fallback;
- LLMS exposes package, export, library, and import-kind metadata without
  embedding SVG content.

Verification runs through the repository's Devenv environment and Nx targets:

```sh
devenv shell -- pnpm nx run-many -t test build -p core docgen storybook llms --skipNxCache
```

The relevant wider test target, formatting/lint targets supported by these
projects, and `git diff --check` run before completion. Any existing unrelated
failure is reported separately with its exact command and output. The existing
unrelated modification to `packages/cli/package.json` is preserved.

## Compatibility and Release Surface

All new configuration and schema fields are optional. Existing configurations
without `iconLibrary` prepare the same schema shape they do today, apart from
the newly accepted optional fields. Existing asset-backed icons continue to
render through the shared preview fallback.

The public release surface changes in `@razorwind/core`, with corresponding
consumer changes in `@razorwind/docgen`, `@razorwind/storybook`, and
`@razorwind/llms`. Changelog/version handling remains owned by the repository's
normal release process rather than this implementation.
