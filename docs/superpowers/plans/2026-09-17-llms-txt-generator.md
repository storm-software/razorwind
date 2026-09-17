# AI-Ready `llms.txt` Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `@razorwind/llms` as a Razorwind generator that emits a standards-compatible `llms.txt` index and token, component, icon, and font companion documents.

**Architecture:** The default export is a `llms:generate` plugin backed by pure render helpers. Focused render modules consume the prepared Razorwind `Schema`; a coordinator validates options, resolves links and output paths, and wraps five strings as Power Plant generator documents.

**Tech Stack:** TypeScript 6, Razorwind plugin/schema utilities, Power Plant generator documents, Vitest 4, Nx 23, Powerlines/tsdown.

**Spec:** `docs/superpowers/specs/2026-09-17-llms-txt-generator-design.md`

## Global Constraints

- Generate exactly `llms.txt`, `llms-tokens.txt`, `llms-components.txt`, `llms-icons.txt`, and `llms-fonts.txt`.
- Use sibling-relative links unless an absolute HTTP(S) `baseUrl` is configured.
- Always generate all four companion files, including explicit empty states.
- Derive content only from the prepared Razorwind schema and explicit plugin options.
- Exclude tokens marked `skipDocs: true` and never mutate schema input while sorting.
- Do not embed raw icon contents.
- Keep the package independent from `@razorwind/docgen` and `@razorwind/design-md`.
- Preserve unrelated edits to `devenv.lock`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `tsconfig.json` except for already-present `packages/llms` registration.
- Run repository commands through `devenv shell --` and package tasks through `pnpm nx`.

---

### Task 1: Correct the Package Scaffold and Establish the Plugin Contract

**Files:**

- Create: `packages/llms/src/types.ts`
- Create: `packages/llms/src/generate.ts`
- Create: `packages/llms/tests/generator.test.ts`
- Modify: `packages/llms/src/index.ts`
- Modify: `packages/llms/project.json`
- Modify: `packages/llms/package.json`
- Modify: `packages/llms/vitest.config.mts`

**Interfaces:**

- Produces: `LlmsPluginOptions`, `LlmsDocumentSet`, `renderLlmsDocuments(spec, options)`, `generateLlms(spec, options)`, and the default `llms:generate` plugin.
- Consumes: `Schema`, `GeneratorFunctionResult`, `definePlugin`, and `createDocument` from the existing Razorwind contracts.

- [ ] **Step 1: Correct the Nx and package metadata needed to address the project as `llms`**

Set `packages/llms/project.json` to use `name: "llms"` and
`sourceRoot: "packages/llms/src"`. Change the package description to
`"Razorwind plugin that generates AI-ready llms.txt design-system documentation."`.
Correct the `./generate` export to point at `dist/generate` and change every
`ai-spec` cache, test, and coverage name in `vitest.config.mts` to `llms`.

- [ ] **Step 2: Write the failing plugin/output-contract test**

Create `packages/llms/tests/generator.test.ts` with a minimal typed schema and
these assertions:

```ts
import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import llms, { generateLlms, renderLlmsDocuments } from "../src";

const emptySpec = {
  name: "@acme/system",
  title: "Acme Design System",
  description: "Components and tokens for Acme products.",
  tokens: {},
  components: {},
  icons: {},
  fonts: {}
} satisfies Schema;

describe("llms plugin", () => {
  it("exposes a Razorwind generate plugin", () => {
    const plugin = llms();
    expect(plugin.name).toBe("llms:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("always creates the index and all companion files", async () => {
    const documents = generateLlms(emptySpec);
    expect(Object.keys(documents)).toEqual([
      "llms.txt",
      "llms-tokens.txt",
      "llms-components.txt",
      "llms-icons.txt",
      "llms-fonts.txt"
    ]);
    expect(renderLlmsDocuments(emptySpec)).toEqual({
      index: expect.any(String),
      tokens: expect.any(String),
      components: expect.any(String),
      icons: expect.any(String),
      fonts: expect.any(String)
    });

    const pluginDocuments = await llms().generate!(emptySpec, {} as never);
    expect(Object.keys(pluginDocuments)).toEqual(Object.keys(documents));
  });

  it("places all five files under outputPath", () => {
    expect(Object.keys(generateLlms(emptySpec, { outputPath: "public" }))).toEqual([
      "public/llms.txt",
      "public/llms-tokens.txt",
      "public/llms-components.txt",
      "public/llms-icons.txt",
      "public/llms-fonts.txt"
    ]);
  });
});
```

- [ ] **Step 3: Run the test and verify the missing API fails**

Run:

```sh
devenv shell -- pnpm nx test llms
```

Expected: FAIL because `generateLlms`, `renderLlmsDocuments`, and the default
plugin do not exist.

- [ ] **Step 4: Add the public types**

Create `src/types.ts` with the exact approved interfaces:

```ts
export interface LlmsPluginOptions {
  outputPath?: string;
  title?: string;
  summary?: string;
  details?: string;
  baseUrl?: string;
}

export interface LlmsDocumentSet {
  index: string;
  tokens: string;
  components: string;
  icons: string;
  fonts: string;
}
```

- [ ] **Step 5: Implement the minimal five-document coordinator and plugin**

In `src/generate.ts`, use a fixed ordered descriptor list and
`createDocument` so insertion order matches the accepted contract:

```ts
const FILES = [
  ["index", "llms.txt"],
  ["tokens", "llms-tokens.txt"],
  ["components", "llms-components.txt"],
  ["icons", "llms-icons.txt"],
  ["fonts", "llms-fonts.txt"]
] as const;

export function renderLlmsDocuments(
  spec: Schema,
  options: LlmsPluginOptions = {}
): LlmsDocumentSet {
  const title = options.title ?? resolveSchemaIdentity(spec).title ?? "Design System";
  return {
    index: `# ${title}\n`,
    tokens: `# ${title} Tokens\n`,
    components: `# ${title} Components\n`,
    icons: `# ${title} Icons\n`,
    fonts: `# ${title} Fonts\n`
  };
}

export function generateLlms(
  spec: Schema,
  options: LlmsPluginOptions = {}
): GeneratorFunctionResult<Schema, LlmsPluginOptions> {
  const rendered = renderLlmsDocuments(spec, options);
  const outputPath = options.outputPath?.trim();
  return Object.fromEntries(
    FILES.map(([key, file]) => {
      const path = outputPath ? join(outputPath, file) : file;
      return [
        path,
        createDocument<Schema, LlmsPluginOptions>(
          path,
          rendered[key],
          { name: "llms" },
          false,
          "markdown"
        )
      ];
    })
  );
}
```

In `src/index.ts`, remove the copied exports and expose the contract:

```ts
import { definePlugin } from "@razorwind/core/plugin";
import type { LlmsPluginOptions } from "./types";
import { generateLlms } from "./generate";

export * from "./generate";
export type * from "./types";

export default definePlugin((options?: LlmsPluginOptions) => ({
  name: "llms:generate",
  generate: async spec => generateLlms(spec, options ?? {})
}));
```

- [ ] **Step 6: Run the focused test and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: all Task 1 tests PASS.

- [ ] **Step 7: Commit Task 1**

```sh
git add packages/llms/src packages/llms/tests/generator.test.ts packages/llms/project.json packages/llms/package.json packages/llms/vitest.config.mts
git commit -m "feat(llms): establish generator plugin contract"
```

---

### Task 2: Render and Validate the Standards-Compatible Index

**Files:**

- Create: `packages/llms/src/format.ts`
- Modify: `packages/llms/src/generate.ts`
- Modify: `packages/llms/tests/generator.test.ts`

**Interfaces:**

- Produces: `renderLlmsIndex(spec, options)`, `resolveResourceUrl(baseUrl, file)`, `escapeTableCell(value)`, and `codeFence(content, language)`.
- Consumes: the Task 1 `LlmsPluginOptions` contract and four fixed companion filenames.

- [ ] **Step 1: Add failing tests for exact index structure and relative links**

Add tests asserting the generated index equals:

```md
# Acme Design System

> Components and tokens for Acme products.

Follow Acme accessibility guidance.

## Design System Reference

- [Design Tokens](llms-tokens.txt): Approved design tokens, values, themes, and usage descriptions.
- [Components](llms-components.txt): Available components, dependencies, files, and usage examples.
- [Icons](llms-icons.txt): Available icon names, aliases, metadata, and asset variants.
- [Fonts](llms-fonts.txt): Approved font families, roles, sources, weights, and files.

## Project Resources

- [Homepage](https://design.acme.test): Design system website.
- [Repository](https://github.com/acme/system): Source repository.
```

Use a schema containing the two resource URLs and `{ details: "Follow Acme accessibility guidance." }`.

- [ ] **Step 2: Add failing tests for absolute links and validation**

Assert `baseUrl: "https://design.acme.test/docs"` creates URLs under
`https://design.acme.test/docs/`, then add:

```ts
expect(() => renderLlmsIndex(emptySpec, { title: "   " })).toThrow(
  /title.*empty/i
);
expect(() => renderLlmsIndex(emptySpec, { baseUrl: "/docs" })).toThrow(
  /baseUrl.*absolute HTTP/i
);
expect(() => renderLlmsIndex(emptySpec, { baseUrl: "ftp://acme.test" })).toThrow(
  /baseUrl.*HTTP/i
);
expect(() => renderLlmsIndex(emptySpec, { details: "## Override" })).toThrow(
  /details.*H1 or H2/i
);
```

Also assert absent descriptions/resources omit the blockquote and `Project
Resources`, and malformed optional schema URLs are ignored.

- [ ] **Step 3: Run the tests and verify they fail on the placeholder index**

Run `devenv shell -- pnpm nx test llms`. Expected: FAIL on missing index body
and missing validation errors.

- [ ] **Step 4: Implement shared Markdown and URL helpers**

Create `src/format.ts` with pure helpers. URL resolution must use `new URL`
with a normalized trailing slash and explicitly allow only `http:` and
`https:`. Details validation must reject multiline headings matching
`/^#{1,2}\s+/m`. Implement these concrete behaviors:

```ts
export function escapeTableCell(value: unknown): string {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll(/\r?\n/g, "<br>");
}

export function codeFence(content: string, language = ""): string {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map(match => match[0].length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}
```

- [ ] **Step 5: Implement `renderLlmsIndex` and route the document set through it**

Resolve identity with `resolveSchemaIdentity`, enforce the title/details
rules, emit the four links in fixed order, and add only valid homepage and
repository URLs. Join blocks with exactly one blank line and terminate with one
newline.

- [ ] **Step 6: Run focused tests and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: all index, URL, and
validation tests PASS.

- [ ] **Step 7: Commit Task 2**

```sh
git add packages/llms/src/format.ts packages/llms/src/generate.ts packages/llms/tests/generator.test.ts
git commit -m "feat(llms): render standards compatible index"
```

---

### Task 3: Generate the Token Companion

**Files:**

- Create: `packages/llms/src/tokens.ts`
- Modify: `packages/llms/src/generate.ts`
- Modify: `packages/llms/tests/generator.test.ts`

**Interfaces:**

- Produces: `renderTokensDocument(spec: Schema): string`.
- Consumes: `flattenTokens`, `formatTokenValue`, `escapeTableCell`, schema identity, and DTCG token metadata.

- [ ] **Step 1: Add failing token rendering tests**

Create token fixtures covering:

```ts
const tokenSpec = {
  ...emptySpec,
  tokens: {
    light: {
      color: {
        $type: "color",
        primary: { $value: "#0066cc", $description: "Brand primary" },
        hidden: { $value: "#ff00ff", skipDocs: true }
      },
      spacing: {
        $type: "dimension",
        sm: { $value: { value: 8, unit: "px" } }
      }
    },
    dark: {
      color: {
        $type: "color",
        primary: { $value: "#66aaff", $description: "Brand primary | dark" }
      }
    }
  }
} satisfies Schema;
```

Assert the document contains themed headings in lexicographic order, group
headings, `#0066cc`, `8px`, the escaped description
`Brand primary \\| dark`, and no `hidden` token. Assert a schema with `{}` tokens
contains `No documented tokens were found.`.

- [ ] **Step 2: Add a non-mutation regression test**

Capture `JSON.stringify(tokenSpec.tokens)` before rendering and assert it is
unchanged afterward. Also render twice and assert byte-identical output.

- [ ] **Step 3: Run tests and verify token assertions fail**

Run `devenv shell -- pnpm nx test llms`. Expected: FAIL because the token
companion is still a heading-only placeholder.

- [ ] **Step 4: Implement `renderTokensDocument`**

Use `flattenTokens(spec.tokens, { shouldIncludeToken: token => token.skipDocs !== true })`.
For each flat token, compute its first path segment and use its existing
formatted `cssValue`; group by `theme ?? ""` and group name without mutating
source arrays. Render this table:

```md
| Token | Type | Value | Description |
| --- | --- | --- | --- |
| `color.primary` | `color` | `#0066cc` | Brand primary |
```

Unthemed tokens come first, named themes sort lexicographically, groups sort
lexicographically, and rows sort by full token path. Use `Default` as the
display heading for a mixed document's unthemed set. Omit a separate theme
heading when the complete document has only unthemed tokens.

- [ ] **Step 5: Connect the renderer and export it**

Replace the `tokens` placeholder in `renderLlmsDocuments` and export
`renderTokensDocument` from the package entry point through `generate.ts` or a
direct named export.

- [ ] **Step 6: Run tests and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: token and prior tests PASS.

- [ ] **Step 7: Commit Task 3**

```sh
git add packages/llms/src/tokens.ts packages/llms/src/generate.ts packages/llms/src/index.ts packages/llms/tests/generator.test.ts
git commit -m "feat(llms): generate token companion"
```

---

### Task 4: Generate the Component Companion

**Files:**

- Create: `packages/llms/src/components.ts`
- Modify: `packages/llms/src/generate.ts`
- Modify: `packages/llms/src/index.ts`
- Modify: `packages/llms/tests/generator.test.ts`

**Interfaces:**

- Produces: `renderComponentsDocument(spec: Schema): string`.
- Consumes: typed `Component` schema entries plus `escapeTableCell` and `codeFence`.

- [ ] **Step 1: Add failing component metadata and ordering tests**

Add two components in reverse insertion order. Include category, tags, related,
since, version, all three dependency maps, and files in reverse path order.
Assert headings sort by component `name`; dependency entries include both
package and version and sort by package; file rows sort by path; absent fields
do not create empty labels.

- [ ] **Step 2: Add failing usage-example and safe-fence tests**

Include a TSX usage example whose content contains a triple-backtick Markdown
string. Assert the generated example uses a four-backtick outer fence, retains
the source unchanged, and includes its title, description, path, and language.
Add a metadata-only usage entry and assert its path is retained without an
empty code fence.

- [ ] **Step 3: Run tests and verify component assertions fail**

Run `devenv shell -- pnpm nx test llms`. Expected: FAIL because no component
sections or usage examples exist.

- [ ] **Step 4: Implement typed component render helpers**

In `src/components.ts`, implement focused private helpers for:

```ts
function renderDependencies(
  heading: string,
  dependencies: Record<string, string> | undefined
): string | undefined;

function renderFiles(files: Component["files"]): string | undefined;
function renderUsage(usage: ComponentUsage): string;
function renderComponent(component: Component): string;
```

Render scalar metadata as bullets, dependency maps as `- \`name@range\``, files
as a `Path | Type | Target` table, and usage content through `codeFence`.
Sort copied entries/arrays with `toSorted`; never call `sort` on schema arrays.

- [ ] **Step 5: Implement the document wrapper and connect it**

The document begins with `# <title> Components` and
`Use documented components and examples instead of creating one-off replacements.`.
Render components sorted by name, or `No documented components were found.`.
Replace the coordinator placeholder and export the named renderer.

- [ ] **Step 6: Run tests and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: component and prior tests PASS.

- [ ] **Step 7: Commit Task 4**

```sh
git add packages/llms/src/components.ts packages/llms/src/generate.ts packages/llms/src/index.ts packages/llms/tests/generator.test.ts
git commit -m "feat(llms): generate component companion"
```

---

### Task 5: Generate the Icon Companion

**Files:**

- Create: `packages/llms/src/icons.ts`
- Modify: `packages/llms/src/generate.ts`
- Modify: `packages/llms/src/index.ts`
- Modify: `packages/llms/tests/generator.test.ts`

**Interfaces:**

- Produces: `renderIconsDocument(spec: Schema): string`.
- Consumes: typed `Icon` entries and Markdown table escaping.

- [ ] **Step 1: Add failing icon behavior tests**

Create icons in reverse name order with category, description, tags, aliases,
related, since, version, and light/dark SVG files in reverse order. Put a unique
sentinel in each `content` field. Assert metadata is present, icon headings sort
by name, files sort by theme then path, and neither content sentinel appears.
Assert the empty schema renders `No documented icons were found.`.

- [ ] **Step 2: Run tests and verify icon assertions fail**

Run `devenv shell -- pnpm nx test llms`. Expected: FAIL on missing icon content.

- [ ] **Step 3: Implement `renderIconsDocument`**

Render an H1, the guidance sentence
`Use documented icon names and aliases; do not invent unavailable assets.`, and
an H2 per icon. Render available metadata as bullets and files as:

```md
| Path | Type | Theme | Target |
| --- | --- | --- | --- |
```

Read only `path`, `type`, `theme`, and `target` from each file. Sort copied icon
and file arrays with `toSorted`.

- [ ] **Step 4: Connect and export the renderer**

Replace the icon placeholder in the coordinator and expose the named helper.

- [ ] **Step 5: Run tests and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: icon and prior tests PASS.

- [ ] **Step 6: Commit Task 5**

```sh
git add packages/llms/src/icons.ts packages/llms/src/generate.ts packages/llms/src/index.ts packages/llms/tests/generator.test.ts
git commit -m "feat(llms): generate icon companion"
```

---

### Task 6: Generate the Font Companion

**Files:**

- Create: `packages/llms/src/fonts.ts`
- Modify: `packages/llms/src/generate.ts`
- Modify: `packages/llms/src/index.ts`
- Modify: `packages/llms/tests/generator.test.ts`

**Interfaces:**

- Produces: `renderFontsDocument(spec: Schema): string`.
- Consumes: the discriminated `Font`, `GoogleFont`, and `LocalFont` schema entries.

- [ ] **Step 1: Add failing Google and local font tests**

Create one Google font with family, role, fallbacks, display, category,
description, tags, weights, styles, subsets, and `variable: true`. Create one
local font with multiple files inserted out of order and values for format,
weight, style, and `unicodeRange`. Assert every configured field is represented,
fonts sort by name, list values are stable, and local files sort by path.
Assert the empty schema renders `No documented fonts were found.`.

- [ ] **Step 2: Run tests and verify font assertions fail**

Run `devenv shell -- pnpm nx test llms`. Expected: FAIL on missing font content.

- [ ] **Step 3: Implement `renderFontsDocument`**

Render the guidance sentence
`Use only documented font families and roles when selecting typography.`.
Common metadata is rendered as bullets. Narrow on `font.source`:

- `google`: render weights, styles, subsets, and variable status.
- `local`: render a `Path | Format | Weight | Style | Unicode Range` table.

Sort fonts and copied lists/files without mutating input.

- [ ] **Step 4: Connect and export the renderer**

Replace the font placeholder and expose the named helper.

- [ ] **Step 5: Run tests and verify green**

Run `devenv shell -- pnpm nx test llms`. Expected: all generator tests PASS.

- [ ] **Step 6: Commit Task 6**

```sh
git add packages/llms/src/fonts.ts packages/llms/src/generate.ts packages/llms/src/index.ts packages/llms/tests/generator.test.ts
git commit -m "feat(llms): generate font companion"
```

---

### Task 7: Document the Package and Run Full Verification

**Files:**

- Modify: `packages/llms/README.md`
- Modify if required by formatter only: files changed in Tasks 1-6

**Interfaces:**

- Consumes: the completed public package API.
- Produces: accurate installation/configuration/deployment documentation and final verification evidence.

- [ ] **Step 1: Replace the copied README with an `@razorwind/llms` guide**

Document:

- installation with pnpm, npm, and yarn;
- default plugin usage in `defineConfig`;
- the five generated files;
- `outputPath`, `title`, `summary`, `details`, and `baseUrl` options;
- relative versus absolute deployment links;
- direct `generateLlms` and render-helper usage;
- the rule that generated files should be regenerated from schema sources,
  not hand-edited.

Use this configuration example:

```ts
import { defineConfig } from "@razorwind/core";
import llms from "@razorwind/llms";

export default defineConfig({
  plugins: [
    llms({
      outputPath: "public",
      baseUrl: "https://design.example.com/",
      details: "Prefer documented tokens and components over custom values."
    })
  ]
});
```

- [ ] **Step 2: Check the inferred project definition after metadata repair**

Run:

```sh
devenv shell -- pnpm nx show project llms
```

Expected: project `llms` exists and exposes at least `test` and `build`. Record
the actual type-checking target name, if present.

- [ ] **Step 3: Run the focused test target**

Run `devenv shell -- pnpm nx test llms`. Expected: PASS with no test warnings.

- [ ] **Step 4: Run the build target**

Run `devenv shell -- pnpm nx build llms`. Expected: PASS and package outputs
for both `index` and `generate` exports.

- [ ] **Step 5: Run the actual Nx type-check target when distinct**

Use the target reported by Step 2. If it is `typecheck`, run:

```sh
devenv shell -- pnpm nx typecheck llms
```

If build already owns type checking and no distinct target exists, record that
fact rather than inventing a target.

- [ ] **Step 6: Run repository consistency checks**

Run:

```sh
git diff --check
git status --short
```

Expected: no whitespace errors. Confirm unrelated pre-existing workspace edits
remain present and were not included in feature commits.

- [ ] **Step 7: Commit documentation and any formatter-only corrections**

```sh
git add packages/llms/README.md
git commit -m "docs(llms): document AI-ready output"
```

- [ ] **Step 8: Review the completed change against every acceptance criterion**

Confirm all five artifacts, relative and absolute links, deterministic ordering,
empty states, non-mutation, public exports, README accuracy, focused tests,
build, and type checking. Do not report completion until the commands in Steps
2-6 have current successful output or an explicitly documented environment
boundary.
