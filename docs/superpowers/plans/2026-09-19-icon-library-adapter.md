# Icon Library Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed icon-library adapter to `@razorwind/core` that prepares portable library icons and make Docgen, Storybook, and LLMS display or describe them correctly.

**Architecture:** A configuration-only adapter maps imported library exports into validated `Icon` records with portable source metadata and optional SVG previews. Core owns normalization, deterministic extraction, precedence, and shared lookup helpers; consumers read only the schema and never receive live library values.

**Tech Stack:** TypeScript, Zod, Vitest, Nx, Devenv, MDX/Markdown generators

**Spec:** `docs/superpowers/specs/2026-09-19-icon-library-adapter-design.md`

## Global Constraints

- Support exactly one optional `iconLibrary` adapter per Razorwind configuration.
- Do not dynamically import packages from strings or add framework/icon-library dependencies to core.
- Never store live components, functions, or framework elements in `schema.icons`.
- Preserve existing manual and filesystem icon behavior and precedence: manual icons, then filesystem icons, then adapter icons.
- A manual/filesystem name collision excludes the whole adapter entry so library metadata cannot leak into an existing icon.
- Keep all new schema/configuration fields optional and backward compatible.
- Update every current icon consumer: `@razorwind/docgen`, `@razorwind/storybook`, and `@razorwind/llms`.
- Preserve the unrelated existing modification in `packages/cli/package.json`.
- Run repository commands through `devenv shell --` and package tasks through Nx.
- Do not modify external Storm packages, generated integration layers, or `node_modules`.

## Review Focus

- Two exports adapted to the same normalized icon name must fail contextually instead of silently replacing one another; Task 2 adds this regression test.
- Empty adapter identifiers, package names, export names, and SVG strings must fail schema validation rather than create unusable imports/previews; Tasks 1 and 2 pin these cases.
- An adapter export with no SVG must still remain usable through source metadata and render a documented name fallback; Tasks 2, 4, and 5 test this.
- A filesystem/manual collision must exclude the adapter record wholesale, including `source` and `preview`, while preserving the existing manual/filesystem merge; Task 3 tests both collisions.
- Adapter-owned input and returned metadata must not be mutated, even when exports are sorted and normalized; Task 2 freezes both values in its test.

---

## File Structure

- `packages/core/src/schema/icons.ts`: define portable icon source/preview schemas and the shared retrieval helpers.
- `packages/core/src/lib/icons/library.ts`: define adapter types and perform deterministic, validated library extraction.
- `packages/core/src/lib/icons/index.ts`: export filesystem and library extraction APIs.
- `packages/core/src/types/config.ts`: expose `iconLibrary` through public options/configuration.
- `packages/core/src/lib/resolve-config.ts`: preserve config-owned adapters when execution options are layered.
- `packages/core/src/lib/prepare.ts`: compose manual, filesystem, and adapter icon sources with the approved precedence.
- `packages/core/tests/schema/icons.test.ts`: cover portable schema fields and lookup fallback behavior.
- `packages/core/tests/icons/library.test.ts`: cover adapter normalization, determinism, omissions, validation, and errors.
- `packages/core/tests/lib/prepare.test.ts`: cover resolved configuration and cross-source precedence.
- `packages/docgen/src/generate.ts`: render normalized previews and named/default import syntax.
- `packages/docgen/tests/generator.test.ts`: prove library icons render and legacy icons remain compatible.
- `packages/storybook/src/generate.ts`: use the shared SVG preview helper for generated icon galleries.
- `packages/storybook/tests/generator.test.ts`: prove library preview and no-preview fallback output.
- `packages/llms/src/icons.ts`: document portable library/import metadata without embedding SVG.
- `packages/llms/tests/generator.test.ts`: prove source metadata and content exclusion.
- `packages/core/README.md`, `packages/docgen/README.md`, `packages/storybook/README.md`, `packages/llms/README.md`: document configuration and generated behavior.

### Task 1: Portable Icon Schema and Retrieval Helpers

**Files:**

- Modify: `packages/core/src/schema/icons.ts`
- Modify: `packages/core/src/schema/index.ts`
- Test: `packages/core/tests/schema/icons.test.ts`

**Interfaces:**

- Consumes: existing `Icon`, `IconFile`, `iconSchema`, and `iconsSchema`.
- Produces: `IconImportKind`, `IconLibrarySource`, `IconSvgPreview`, `iconImportKindSchema`, `iconLibrarySourceSchema`, `iconSvgPreviewSchema`, `resolveIconSvgPreview(icon: Icon): string | undefined`, and `resolveIconLibrarySource(icon: Icon): IconLibrarySource | undefined`.

- [ ] **Step 1: Add failing schema and helper tests**

Add imports for the new schemas/helpers, then add focused tests equivalent to:

```ts
it("accepts portable library source metadata and an SVG preview", () => {
  expect(
    iconSchema.parse({
      name: "house",
      title: "House",
      source: {
        type: "library",
        library: "lucide",
        packageName: "lucide-react",
        exportName: "House",
        importKind: "named"
      },
      preview: { type: "svg", content: "<svg><path /></svg>" }
    })
  ).toMatchObject({ source: { exportName: "House" } })
})

it.each([
  ["packageName", ""],
  ["exportName", ""],
  ["library", ""]
])("rejects an empty library source %s", (field, value) => {
  const source = {
    type: "library",
    library: "lucide",
    packageName: "lucide-react",
    exportName: "House",
    importKind: "named",
    [field]: value
  }

  expect(iconLibrarySourceSchema.safeParse(source).success).toBe(false)
})

it("rejects invalid import kinds and empty SVG previews", () => {
  expect(
    iconLibrarySourceSchema.safeParse({
      type: "library",
      library: "lucide",
      packageName: "lucide-react",
      exportName: "House",
      importKind: "namespace"
    }).success
  ).toBe(false)
  expect(
    iconSvgPreviewSchema.safeParse({ type: "svg", content: "" }).success
  ).toBe(false)
})

it("prefers normalized previews and falls back to legacy SVG files", () => {
  const legacy = {
    name: "house",
    title: "House",
    files: [{ path: "house.svg", type: "svg", content: "<svg>legacy</svg>" }]
  } satisfies Icon
  const normalized = {
    ...legacy,
    preview: { type: "svg", content: "<svg>normalized</svg>" }
  } satisfies Icon

  expect(resolveIconSvgPreview(normalized)).toBe("<svg>normalized</svg>")
  expect(resolveIconSvgPreview(legacy)).toBe("<svg>legacy</svg>")
  expect(
    resolveIconSvgPreview({ name: "house", title: "House" })
  ).toBeUndefined()
})

it("returns only validated library source metadata", () => {
  const source = {
    type: "library" as const,
    library: "lucide",
    packageName: "lucide-react",
    exportName: "House",
    importKind: "named" as const
  }

  expect(
    resolveIconLibrarySource({ name: "house", title: "House", source })
  ).toEqual(source)
  expect(
    resolveIconLibrarySource({ name: "house", title: "House" })
  ).toBeUndefined()
})
```

- [ ] **Step 2: Run core tests and verify the new contract fails**

Run:

```sh
devenv shell -- pnpm nx test core --skipNxCache
```

Expected: FAIL because the new schemas, fields, types, and helpers are not exported.

- [ ] **Step 3: Implement the portable schema and helpers**

In `packages/core/src/schema/icons.ts`, add non-empty discriminated schemas before `iconSchema`:

```ts
export const iconImportKindSchema = z.enum(["named", "default"])
export type IconImportKind = z.infer<typeof iconImportKindSchema>

export const iconLibrarySourceSchema = z.object({
  type: z.literal("library"),
  library: z.string().min(1),
  packageName: z.string().min(1),
  exportName: z.string().min(1),
  importKind: iconImportKindSchema
})
export type IconLibrarySource = z.infer<typeof iconLibrarySourceSchema>

export const iconSvgPreviewSchema = z.object({
  type: z.literal("svg"),
  content: z.string().min(1)
})
export type IconSvgPreview = z.infer<typeof iconSvgPreviewSchema>
```

Add `source` and `preview` to `iconSchema`. After `Icon` is inferred, add:

```ts
export function resolveIconSvgPreview(icon: Icon): string | undefined {
  if (icon.preview?.type === "svg") {
    return icon.preview.content
  }

  return icon.files?.find(
    file => file.type === "svg" && typeof file.content === "string"
  )?.content
}

export function resolveIconLibrarySource(
  icon: Icon
): IconLibrarySource | undefined {
  const parsed = iconLibrarySourceSchema.safeParse(icon.source)
  return parsed.success ? parsed.data : undefined
}
```

Export all new values and types from `packages/core/src/schema/index.ts`.

- [ ] **Step 4: Re-run core tests and verify green**

Run the Task 1 command again.

Expected: PASS, including existing filesystem icon schema tests.

- [ ] **Step 5: Commit the schema boundary**

```sh
git add packages/core/src/schema/icons.ts packages/core/src/schema/index.ts packages/core/tests/schema/icons.test.ts
git commit -m "feat(core): add portable icon library schema"
```

### Task 2: Typed Adapter and Deterministic Library Extraction

**Files:**

- Create: `packages/core/src/lib/icons/library.ts`
- Modify: `packages/core/src/lib/icons/index.ts`
- Create: `packages/core/tests/icons/library.test.ts`

**Interfaces:**

- Consumes: Task 1 `Icon`, `Icons`, `IconImportKind`, and `iconSchema`.
- Produces: `IconLibraryAdaptContext<TIcon>`, `AdaptedLibraryIcon`, `IconLibraryAdapter<TIcon>`, `defineIconLibrary<TIcon>(adapter): IconLibraryAdapter<TIcon>`, and `extractIconLibrary(adapter?: IconLibraryAdapter): Promise<Icons>`.

- [ ] **Step 1: Write failing adapter normalization tests**

Create `packages/core/tests/icons/library.test.ts` with real adapter objects. Cover generic inference with `expectTypeOf`, named/default defaults, async adaptation, omission, sorted insertion, no-preview usability, and immutability:

```ts
it("normalizes named, default, async, and omitted exports deterministically", async () => {
  const icons = Object.freeze({
    Zed: Object.freeze({ id: "zed" }),
    House: Object.freeze({ id: "house" }),
    helper: Object.freeze({ id: "helper" })
  })
  const adapter = defineIconLibrary({
    name: "lucide",
    packageName: "lucide-react",
    icons,
    async adapt({ exportName, icon }) {
      expectTypeOf(icon).toEqualTypeOf<{ readonly id: string }>()
      if (exportName === "helper") return undefined
      if (exportName === "Zed") {
        return Object.freeze({
          name: "zed-mark",
          title: "Zed Mark",
          exportName: "ZedIcon",
          importKind: "default" as const
        })
      }
      return Object.freeze({ svg: `<svg data-icon="${icon.id}" />` })
    }
  })

  const result = await extractIconLibrary(adapter)

  expect(Object.keys(result)).toEqual(["House", "zed-mark"])
  expect(result.House).toMatchObject({
    name: "House",
    title: "House",
    source: {
      type: "library",
      library: "lucide",
      packageName: "lucide-react",
      exportName: "House",
      importKind: "named"
    },
    preview: { type: "svg", content: '<svg data-icon="house" />' }
  })
  expect(result["zed-mark"]).toMatchObject({
    source: { exportName: "ZedIcon", importKind: "default" }
  })
  expect(adapter.icons).toBe(icons)
})

it("accepts an empty library and false omissions", async () => {
  await expect(
    extractIconLibrary(
      defineIconLibrary({
        name: "empty",
        packageName: "empty-icons",
        icons: {},
        adapt: () => false
      })
    )
  ).resolves.toEqual({})
})
```

- [ ] **Step 2: Run core tests and verify the adapter API is missing**

Run:

```sh
devenv shell -- pnpm nx test core --skipNxCache
```

Expected: FAIL because `library.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal adapter and extractor**

Define the public interfaces using `Readonly<Record<string, TIcon>>` for the
imported namespace:

```ts
export interface IconLibraryAdaptContext<TIcon> {
  exportName: string
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
  name: string
  packageName: string
  icons: Readonly<Record<string, TIcon>>
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
): IconLibraryAdapter<TIcon> {
  return adapter
}
```

Then implement `extractIconLibrary`:

```ts
export async function extractIconLibrary(
  adapter?: IconLibraryAdapter
): Promise<Icons> {
  if (!adapter) return {}

  const icons: Icons = {}
  for (const exportName of Object.keys(adapter.icons).toSorted()) {
    let adapted: AdaptedLibraryIcon | false | undefined
    try {
      adapted = await adapter.adapt({
        exportName,
        icon: adapter.icons[exportName]
      })
    } catch (cause) {
      throw new Error(
        `Failed to adapt icon export "${exportName}" from library "${adapter.name}".`,
        { cause }
      )
    }

    if (!adapted) continue

    const name = adapted.name ?? exportName
    if (Object.hasOwn(icons, name)) {
      throw new Error(
        `Icon library "${adapter.name}" produced duplicate icon name "${name}" from export "${exportName}".`
      )
    }

    const candidate = {
      ...adapted,
      name,
      title: adapted.title ?? titleCase(name),
      source: {
        type: "library" as const,
        library: adapter.name,
        packageName: adapter.packageName,
        exportName: adapted.exportName ?? exportName,
        importKind: adapted.importKind ?? "named"
      },
      ...(adapted.svg !== undefined
        ? { preview: { type: "svg" as const, content: adapted.svg } }
        : {})
    }
    delete (candidate as { exportName?: string }).exportName
    delete (candidate as { importKind?: IconImportKind }).importKind
    delete (candidate as { svg?: string }).svg

    const parsed = iconSchema.safeParse(candidate)
    if (!parsed.success) {
      throw new Error(
        `Invalid icon export "${exportName}" from library "${adapter.name}": ${parsed.error.message}`
      )
    }
    icons[name] = parsed.data
  }

  return icons
}
```

Prefer destructuring adapter-only fields out of `adapted` over `delete` if that keeps TypeScript cleaner; the observable output must match the snippet. Export the new module from `src/lib/icons/index.ts`.

- [ ] **Step 4: Add failing error, duplicate, and invalid-value tests**

Add separate tests asserting:

```ts
await expect(extractIconLibrary(throwingAdapter)).rejects.toMatchObject({
  message: expect.stringContaining('export "Broken"'),
  cause: originalError
})

await expect(extractIconLibrary(duplicateNameAdapter)).rejects.toThrow(
  'duplicate icon name "same"'
)

await expect(extractIconLibrary(emptyPackageAdapter)).rejects.toThrow(
  'Invalid icon export "House"'
)

await expect(extractIconLibrary(emptySvgAdapter)).rejects.toThrow(
  'Invalid icon export "House"'
)
```

Use one adapter with `name: ""`, one with `packageName: ""`, one returning `exportName: ""`, and one returning `svg: ""` so every non-empty constraint is exercised. Confirm the tests fail until adapter-level fields are validated through each candidate.

- [ ] **Step 5: Complete contextual validation and re-run core tests**

Make the smallest changes needed for all Task 2 tests to pass. Do not silently drop invalid exports. Run the Task 2 test command.

Expected: PASS with deterministic output and contextual failures.

- [ ] **Step 6: Commit adapter extraction**

```sh
git add packages/core/src/lib/icons/library.ts packages/core/src/lib/icons/index.ts packages/core/tests/icons/library.test.ts
git commit -m "feat(core): extract icons through library adapters"
```

### Task 3: Configuration Resolution and Icon Precedence

**Files:**

- Modify: `packages/core/src/types/config.ts`
- Modify: `packages/core/src/lib/resolve-config.ts`
- Modify: `packages/core/src/lib/prepare.ts`
- Modify: `packages/core/tests/lib/resolve-config.test.ts`
- Modify: `packages/core/tests/lib/prepare.test.ts`
- Modify: `packages/core/README.md`

**Interfaces:**

- Consumes: Task 2 `IconLibraryAdapter` and `extractIconLibrary`.
- Produces: public `Options.iconLibrary?: IconLibraryAdapter` and prepared `Schema.icons` with effective manual > filesystem > adapter precedence.

- [ ] **Step 1: Write failing configuration ownership and extraction tests**

In `resolve-config.test.ts`, add a config-file test whose adapter object is retained when a different execution adapter is also passed. Assert `config.iconLibrary?.name` equals the config-file adapter name. This pins `iconLibrary` in `CONFIG_OWNED_OPTION_KEYS`.

In `prepare.test.ts`, call `prepareSpec` with a real temporary filesystem icon plus:

```ts
const manual = { name: "house", title: "Manual House" }
const iconLibrary = defineIconLibrary({
  name: "test-icons",
  packageName: "@example/icons",
  icons: { House: {}, Star: {}, User: {} },
  adapt({ exportName }) {
    return {
      name: exportName.toLowerCase(),
      title: `Library ${exportName}`,
      svg: `<svg data-library="${exportName}" />`
    }
  }
})
```

Arrange a filesystem `star.svg`, configure manual `house`, and assert:

```ts
expect(spec.icons.house).toEqual(manual)
expect(spec.icons.house?.source).toBeUndefined()
expect(spec.icons.star?.files?.[0]?.content).toContain("filesystem")
expect(spec.icons.star?.source).toBeUndefined()
expect(spec.icons.user).toMatchObject({
  title: "Library User",
  source: { packageName: "@example/icons", exportName: "User" }
})
```

Also retain an assertion that manual metadata still merges with filesystem data according to the existing `defu` behavior.

- [ ] **Step 2: Run core tests and verify configuration/preparation failures**

Run:

```sh
devenv shell -- pnpm nx test core --skipNxCache
```

Expected: FAIL because configuration has no adapter field and `prepareSpec` does not extract adapter icons.

- [ ] **Step 3: Wire the adapter through configuration and preparation**

Add a documented `iconLibrary?: IconLibraryAdapter` to `Options`, import its type from `../lib/icons`, and add `"iconLibrary"` to `CONFIG_OWNED_OPTION_KEYS`.

In `prepareSpec`, extract library icons and compose without deep-merging adapter collisions:

```ts
const existingIcons = defu(
  context.options.icons ?? {},
  (await loadIcons(context)) ?? {}
)
const libraryIcons = await extractIconLibrary(context.options.iconLibrary)

for (const [name, icon] of Object.entries(libraryIcons)) {
  if (!Object.hasOwn(existingIcons, name)) {
    existingIcons[name] = icon
  }
}
```

Use `existingIcons` in the prepared schema. Do not change component/font/token loading order.

- [ ] **Step 4: Re-run core tests and verify precedence is green**

Run the Task 3 command again.

Expected: PASS; manual/filesystem collision tests prove adapter metadata is absent from existing records.

- [ ] **Step 5: Document core configuration**

Add an `iconLibrary` section to `packages/core/README.md` using the approved `defineIconLibrary` example. Explicitly document filtering non-icon exports, optional SVG serialization, portable import metadata, and manual/filesystem precedence.

- [ ] **Step 6: Run core build and formatting checks**

Run:

```sh
devenv shell -- pnpm nx run-many -t test build lint lint-markdown -p core --excludeTaskDependencies --skipNxCache
```

Expected: all available core targets PASS. If Nx reports a target is unavailable, run `devenv shell -- pnpm nx show project core` and retain only targets actually listed, recording that adjustment in the execution log.

- [ ] **Step 7: Commit the prepared-schema integration**

```sh
git add packages/core/src/types/config.ts packages/core/src/lib/resolve-config.ts packages/core/src/lib/prepare.ts packages/core/tests/lib/resolve-config.test.ts packages/core/tests/lib/prepare.test.ts packages/core/README.md
git commit -m "feat(core): populate schema icons from a library"
```

### Task 4: Docgen Library Preview and Import Usage

**Files:**

- Modify: `packages/docgen/src/generate.ts`
- Modify: `packages/docgen/tests/generator.test.ts`
- Modify: `packages/docgen/README.md`

**Interfaces:**

- Consumes: Task 1 `resolveIconSvgPreview` and `resolveIconLibrarySource`.
- Produces: Docgen icon MDX with normalized previews and correct named/default import blocks.

- [ ] **Step 1: Write failing library-icon Docgen tests**

Add a schema fixture with one named icon, one default icon, and one library icon without a preview. Assert:

```ts
expect(content).toContain('<svg data-icon="house"')
expect(content).toContain('import { House } from "lucide-react"')
expect(content).toContain('import BrandMark from "@example/brand-mark"')
expect(content).toContain("## User")
```

Retain the existing assertion that a legacy `files[].content` SVG produces `### Preview`. Add an assertion that no-preview `User` has import metadata but no empty `dangerouslySetInnerHTML` block.

- [ ] **Step 2: Run Docgen tests and verify library output is absent**

Run:

```sh
devenv shell -- pnpm nx test docgen --skipNxCache
```

Expected: FAIL because Docgen only inspects `files` and does not render imports.

- [ ] **Step 3: Use shared helpers and render import syntax**

Import `Icon`, `iconSchema`, and the two helpers from
`@razorwind/core/schema`. Change `extractIcons` to return `Icon[]`: parse each
record with `iconSchema.safeParse`, retain successful results, and sort them by
`name`. Change `renderIconPreview` and `renderIcon` to accept `Icon`, then call
`resolveIconSvgPreview` instead of reading preview content from `files`
directly.

Add a helper with exact behavior:

````ts
function renderIconImport(icon: Icon): string {
  const source = resolveIconLibrarySource(icon)
  if (!source) return ""

  const statement =
    source.importKind === "default"
      ? `import ${source.exportName} from ${JSON.stringify(source.packageName)}`
      : `import { ${source.exportName} } from ${JSON.stringify(source.packageName)}`

  return ["### Import", "```ts", statement, "```"].join("\n")
}
````

Insert this section for library-backed icons even when no preview exists. Preserve existing files, tags, aliases, and metadata output.

- [ ] **Step 4: Re-run Docgen tests and verify green**

Run the Task 4 command again.

Expected: PASS for named/default imports, library preview, no-preview behavior, and legacy preview fallback.

- [ ] **Step 5: Document library icon output and commit**

Update `packages/docgen/README.md` to state that library-backed icons display adapter SVG previews and include import examples. Then:

```sh
git add packages/docgen/src/generate.ts packages/docgen/tests/generator.test.ts packages/docgen/README.md
git commit -m "feat(docgen): render library-backed icons"
```

### Task 5: Storybook Library Icon Gallery

**Files:**

- Modify: `packages/storybook/src/generate.ts`
- Modify: `packages/storybook/tests/generator.test.ts`
- Modify: `packages/storybook/README.md`

**Interfaces:**

- Consumes: Task 1 `iconSchema` and `resolveIconSvgPreview`.
- Produces: generated `IconGalleryBlock.tsx` that renders normalized library SVGs and keeps name fallbacks.

- [ ] **Step 1: Write failing Storybook gallery tests**

Generate docs from a schema containing:

```ts
icons: {
  house: {
    name: "house",
    title: "House",
    source: {
      type: "library",
      library: "lucide",
      packageName: "lucide-react",
      exportName: "House",
      importKind: "named"
    },
    preview: { type: "svg", content: '<svg data-icon="house" />' }
  },
  user: {
    name: "user",
    title: "User",
    source: {
      type: "library",
      library: "lucide",
      packageName: "lucide-react",
      exportName: "User",
      importKind: "named"
    }
  }
}
```

Assert generated `blocks/IconGallery.tsx` contains the house SVG, contains `<code>user</code>` for the missing preview, and does not import `lucide-react`.

- [ ] **Step 2: Run Storybook tests and verify normalized previews fail**

Run:

```sh
devenv shell -- pnpm nx test storybook --skipNxCache
```

Expected: FAIL because the gallery only inspects legacy SVG files.

- [ ] **Step 3: Switch gallery preview retrieval to the shared helper**

Import `iconSchema` and `resolveIconSvgPreview` from `@razorwind/core/schema`. For each object entry, safely parse it; use the parsed name and `resolveIconSvgPreview(icon)`. Emit the existing `dangerouslySetInnerHTML` span when SVG is available and the existing `<code>` fallback when it is not. Invalid icon objects should keep the current defensive name fallback rather than crash generation.

- [ ] **Step 4: Re-run Storybook tests and verify green**

Run the Task 5 command again.

Expected: PASS, including existing legacy file preview and icon omission tests.

- [ ] **Step 5: Document gallery behavior and commit**

Update `packages/storybook/README.md` to mention adapter-provided SVG previews and the icon-name fallback. Then:

```sh
git add packages/storybook/src/generate.ts packages/storybook/tests/generator.test.ts packages/storybook/README.md
git commit -m "feat(storybook): display library icon previews"
```

### Task 6: LLMS Portable Import Metadata

**Files:**

- Modify: `packages/llms/src/icons.ts`
- Modify: `packages/llms/tests/generator.test.ts`
- Modify: `packages/llms/README.md`

**Interfaces:**

- Consumes: Task 1 `resolveIconLibrarySource`.
- Produces: `llms-icons.txt` metadata for library, package, export, and import kind without SVG payloads.

- [ ] **Step 1: Write failing LLMS metadata and exclusion tests**

Add a library-backed icon to `iconSpec` with preview content `LIBRARY_SVG_SENTINEL`. Assert:

```ts
expect(content).toContain("- **Library:** `lucide`")
expect(content).toContain("- **Package:** `lucide-react`")
expect(content).toContain("- **Export:** `House`")
expect(content).toContain("- **Import kind:** `named`")
expect(content).not.toContain("LIBRARY_SVG_SENTINEL")
```

Add a default-import fixture and assert `Import kind: default`. Keep existing raw file-content exclusion assertions.

- [ ] **Step 2: Run LLMS tests and verify source metadata is absent**

Run:

```sh
devenv shell -- pnpm nx test llms --skipNxCache
```

Expected: FAIL because `renderIcon` does not include library source fields.

- [ ] **Step 3: Render validated source metadata without preview content**

Import `resolveIconLibrarySource`. In `renderIcon`, append these metadata rows only when the helper returns a source:

```ts
const source = resolveIconLibrarySource(icon)
const sourceMetadata = source
  ? [
      `- **Library:** \`${source.library}\``,
      `- **Package:** \`${source.packageName}\``,
      `- **Export:** \`${source.exportName}\``,
      `- **Import kind:** \`${source.importKind}\``
    ]
  : []
```

Spread `sourceMetadata` into the existing `metadata` array immediately after
the Name row. Preserve every existing optional metadata row. Do not read or
serialize `icon.preview` anywhere in this renderer.

- [ ] **Step 4: Re-run LLMS tests and verify green**

Run the Task 6 command again.

Expected: PASS with metadata present and both legacy/library SVG sentinels absent.

- [ ] **Step 5: Document LLMS metadata and commit**

Update `packages/llms/README.md` to include library import metadata in the `llms-icons.txt` description. Then:

```sh
git add packages/llms/src/icons.ts packages/llms/tests/generator.test.ts packages/llms/README.md
git commit -m "feat(llms): describe icon library imports"
```

### Task 7: Integrated Verification and Documentation Consistency

**Files:**

- Modify if needed: files changed in Tasks 1-6 only
- Verify: `docs/superpowers/specs/2026-09-19-icon-library-adapter-design.md`
- Verify: `packages/core/README.md`
- Verify: `packages/docgen/README.md`
- Verify: `packages/storybook/README.md`
- Verify: `packages/llms/README.md`

**Interfaces:**

- Consumes: all prior task outputs.
- Produces: a formatted, buildable, tested four-package feature with no unrelated changes.

- [ ] **Step 1: Run the complete focused test/build/lint matrix**

Run:

```sh
devenv shell -- pnpm nx run-many -t test build lint lint-markdown -p core docgen storybook llms --excludeTaskDependencies --skipNxCache
```

Expected: every available target PASS. If Nx reports an unavailable target,
inspect target ownership with these exact commands and re-run only supported
target/project pairs, recording the exact adjustment:

```sh
devenv shell -- pnpm nx show projects --with-target test
devenv shell -- pnpm nx show projects --with-target build
devenv shell -- pnpm nx show projects --with-target lint
devenv shell -- pnpm nx show projects --with-target lint-markdown
```

- [ ] **Step 2: Run the wider test suite required by TDD completion**

Run:

```sh
devenv shell -- pnpm nx run-many -t test --all --skipNxCache
```

Expected: PASS. If a pre-existing unrelated test fails, capture its project, test name, and full final exit code; do not describe the overall suite as passing.

- [ ] **Step 3: Format only task-owned files**

Run Prettier with the explicit files changed in Tasks 1-6 rather than formatting the whole dirty worktree:

```sh
devenv shell -- pnpm exec prettier --write packages/core/src/schema/icons.ts packages/core/src/schema/index.ts packages/core/src/lib/icons/library.ts packages/core/src/lib/icons/index.ts packages/core/src/types/config.ts packages/core/src/lib/resolve-config.ts packages/core/src/lib/prepare.ts packages/core/tests/schema/icons.test.ts packages/core/tests/icons/library.test.ts packages/core/tests/lib/resolve-config.test.ts packages/core/tests/lib/prepare.test.ts packages/core/README.md packages/docgen/src/generate.ts packages/docgen/tests/generator.test.ts packages/docgen/README.md packages/storybook/src/generate.ts packages/storybook/tests/generator.test.ts packages/storybook/README.md packages/llms/src/icons.ts packages/llms/tests/generator.test.ts packages/llms/README.md
```

Expected: command exits 0 and touches no unrelated file.

- [ ] **Step 4: Re-run focused tests after formatting**

Run:

```sh
devenv shell -- pnpm nx run-many -t test build -p core docgen storybook llms --excludeTaskDependencies --skipNxCache
```

Expected: PASS after the final mechanical rewrite.

- [ ] **Step 5: Inspect final scope and whitespace**

Run each command separately:

```sh
git diff --check
git status --short
git diff --stat
git diff -- packages/cli/package.json
```

Expected: `git diff --check` exits 0; only task-owned files plus the pre-existing `packages/cli/package.json` modification appear; the CLI diff is unchanged from the pre-task snapshot.

- [ ] **Step 6: Commit final formatting or documentation corrections if present**

If Step 3 changed task-owned files after their task commits:

```sh
git add packages/core packages/docgen packages/storybook packages/llms
git commit -m "chore: finalize icon library adapter"
```

Do not stage `packages/cli/package.json`. If there are no task-owned changes, do not create an empty commit.
