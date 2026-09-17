# AI-Ready `llms.txt` Generator Design

## Summary

Implement `@razorwind/llms` as a self-contained Razorwind generator plugin that
turns a prepared Razorwind design-system schema into a standards-compatible
`llms.txt` index and four detailed companion documents:

- `llms-tokens.txt`
- `llms-components.txt`
- `llms-icons.txt`
- `llms-fonts.txt`

The generated files give AI agents a compact, deterministic map of the design
system plus enough source-derived detail to use its tokens, components, icons,
and fonts without inventing unsupported values or APIs.

## Goals

- Generate all five documents from the same prepared `Schema` consumed by
  other Razorwind generator plugins.
- Follow the `llms.txt` Markdown structure: one H1, an optional blockquote
  summary, optional non-heading details, then H2 link-list sections.
- Use relative companion links by default and absolute links when `baseUrl` is
  configured.
- Preserve descriptions, guidance, usage examples, and relevant metadata from
  the schema.
- Produce stable output through deterministic grouping and sorting.
- Keep the package independent of other documentation generators.

## Non-Goals

- Crawl a deployed documentation site or infer links from a sitemap.
- Generate `llms-full.txt`.
- Audit generated application code for design-system compliance.
- Invent design principles, accessibility guidance, component behavior, or
  usage examples not present in the schema or plugin options.
- Embed full SVG source in the icon companion.
- Depend on the output of `@razorwind/docgen` or `@razorwind/design-md`.

## Public API

The package default export is a Razorwind generate plugin named
`llms:generate`. The package also exports the generation and rendering helpers
and their public types so callers can test or compose the output without
running the complete Razorwind pipeline.

```ts
export interface LlmsPluginOptions {
  /** Directory relative to the generation cwd. Defaults to the cwd. */
  outputPath?: string;

  /** Design-system title. Overrides schema title/name. */
  title?: string;

  /** Short blockquote summary. Overrides schema description. */
  summary?: string;

  /** Optional Markdown placed after the summary and before link sections. */
  details?: string;

  /**
   * Deployment URL used to make links absolute. When omitted, links use
   * sibling filenames such as `llms-tokens.txt`.
   */
  baseUrl?: string;
}

export interface LlmsDocumentSet {
  index: string;
  tokens: string;
  components: string;
  icons: string;
  fonts: string;
}

export function renderLlmsIndex(
  spec: Schema,
  options?: LlmsPluginOptions
): string;

export function renderTokensDocument(spec: Schema): string;
export function renderComponentsDocument(spec: Schema): string;
export function renderIconsDocument(spec: Schema): string;
export function renderFontsDocument(spec: Schema): string;

export function renderLlmsDocuments(
  spec: Schema,
  options?: LlmsPluginOptions
): LlmsDocumentSet;

export function generateLlms(
  spec: Schema,
  options?: LlmsPluginOptions
): GeneratorFunctionResult<Schema, LlmsPluginOptions>;
```

The exact helper names above are part of the intended public contract.

## Output Paths and Links

The generator always emits these paths under `outputPath`:

| Document | Filename |
| --- | --- |
| Index | `llms.txt` |
| Tokens | `llms-tokens.txt` |
| Components | `llms-components.txt` |
| Icons | `llms-icons.txt` |
| Fonts | `llms-fonts.txt` |

`outputPath` defaults to the current generation root, so the default result
keys are the filenames themselves. An `outputPath` of `"public"` produces
`public/llms.txt`, `public/llms-tokens.txt`, and so on.

Without `baseUrl`, links in `llms.txt` are sibling-relative filenames. With a
`baseUrl` such as `https://example.com/design-system/`, links are resolved to
`https://example.com/design-system/llms-tokens.txt` and the equivalent URLs for
the other companions. URL resolution must preserve a pathname prefix and avoid
duplicate slashes.

An explicitly supplied `baseUrl` must be an absolute `http:` or `https:` URL.
Other URL schemes and invalid URLs throw an error that identifies `baseUrl` as
the invalid option.

## Index Document

The index follows this fixed order:

1. `# <title>`
2. `> <summary>` when a non-empty summary exists
3. `details` when supplied
4. `## Design System Reference`
5. One Markdown link-list item for each companion, in this order: tokens,
   components, icons, fonts
6. `## Project Resources` when the schema contains a homepage or repository

The title is resolved from `options.title`, then `schema.title`, then the
title-cased unscoped `schema.name`, and finally `Design System`. An explicitly
supplied blank title is invalid and throws an actionable error.

The summary is resolved from `options.summary`, then `schema.description`. A
missing summary is allowed by the format and does not produce an empty
blockquote. `details` is emitted verbatim after trimming its outer whitespace;
it must not contain H1 or H2 headings because those would make the index
ambiguous. Supplying such headings throws an actionable error.

Each companion link includes a concise description of its contents. Homepage
and repository values are emitted as Markdown links only when they are absolute
`http:` or `https:` URLs; malformed optional schema URLs are ignored rather
than breaking generation.

## Token Companion

`llms-tokens.txt` contains:

- An H1 and a short explanation that the listed names and values are the
  allowed design-token source of truth.
- Token sections grouped by theme first and top-level token path second.
- A Markdown table for each group with columns for token path, DTCG type,
  formatted value, and description.

Tokens are flattened with the shared core token utilities. Tokens marked
`skipDocs: true` are excluded. Values use the shared Razorwind token formatter,
including stable formatting for colors, dimensions, shadows, arrays, and DTCG
aliases. Unthemed tokens appear before named themes; themes and token paths are
sorted lexicographically.

If no tokens are available, the document still exists and states that no
documented tokens were found.

## Component Companion

`llms-components.txt` contains an H1, an instruction to prefer documented
components over one-off replacements, and one H2 section per component.

Each component section includes available schema fields:

- name, type, category, description, tags, related items, since, and version;
- runtime, development, and registry dependencies with version ranges;
- source path, type, and target for each file;
- usage examples with title, description, source path, language, and fenced
  source content.

Components are sorted by name. Dependency maps and files are sorted by key or
path. Usage examples are sorted by name, falling back to path. Missing optional
fields are omitted rather than rendered as empty placeholders. A component
without embedded usage content still records the example path and metadata.

If no components are available, the document still exists and states that no
documented components were found.

## Icon Companion

`llms-icons.txt` contains an H1, selection guidance to use documented icon
names and aliases, and one H2 section per icon.

Each icon includes available name, category, description, tags, aliases,
related items, since, version, and file metadata. File rows include path, type,
theme, and target. Raw SVG and bitmap contents are not embedded because they
add substantial context without improving icon selection.

Icons are sorted by name and files by theme then path. If no icons are
available, the document still exists and states that no documented icons were
found.

## Font Companion

`llms-fonts.txt` contains an H1, guidance to use only documented font families
and roles, and one H2 section per font.

Each font includes available name, source, family, role, fallbacks, display,
category, description, and tags. Google fonts additionally include weights,
styles, subsets, and variable-font status. Local fonts include file path,
format, weight, style, and Unicode range.

Fonts are sorted by name. List values and local files are sorted
deterministically. If no fonts are available, the document still exists and
states that no documented fonts were found.

## Internal Structure

The package uses small modules with one responsibility:

- `src/types.ts` defines the public options and document-set interfaces.
- `src/format.ts` contains Markdown escaping, fenced-code selection, URL
  resolution, and stable list/table helpers.
- `src/tokens.ts` renders the token companion using shared core token
  flattening and formatting.
- `src/components.ts` renders component metadata and usage examples.
- `src/icons.ts` renders icon metadata and asset variants.
- `src/fonts.ts` renders Google and local font metadata.
- `src/generate.ts` validates options, renders the index and companions, and
  maps them to Razorwind generator documents.
- `src/index.ts` defines the `llms:generate` plugin and exports the public API.

The implementation may combine very small formatting helpers when that keeps
the code clearer, but it must preserve the public API and behavioral boundaries
defined here.

## Error Handling

- Reject a blank explicit `title`.
- Reject an invalid or non-HTTP(S) `baseUrl`.
- Reject `details` containing an H1 or H2 Markdown heading.
- Do not fail on missing optional schema metadata or empty schema collections.
- Do not mutate the input schema or its nested arrays/maps while sorting.
- Escape table cell delimiters and line breaks so schema prose cannot corrupt
  generated tables.
- Choose a code fence longer than any backtick run in usage content so source
  examples cannot terminate their own fence.

## Documentation and Package Metadata

Replace the copied Notepad++ README content with installation, configuration,
generated-file, deployment, and API examples for `@razorwind/llms`. Correct
the package description, Nx project name/source root, Vitest name/cache paths,
and any other copied `ai-spec` or Notepad++ references. Do not alter unrelated
workspace dependency updates already present in the worktree.

## Testing and Verification

Development follows red-green-refactor. Focused Vitest coverage must verify:

- the default plugin name and five default output paths;
- custom `outputPath` behavior;
- exact index ordering and omission of an absent summary/resources section;
- relative companion links and normalized absolute links;
- invalid title, details headings, and `baseUrl` errors;
- token formatting, `skipDocs`, multiple themes, grouping, and ordering;
- component metadata, dependency ordering, file metadata, usage code fences,
  and missing content;
- icon aliases, themed files, sorting, and omission of raw SVG content;
- Google and local font fields and sorting;
- explicit empty-state prose in every companion;
- deterministic output without mutating the input schema.

Final verification runs through the workspace's Nx entry points:

```sh
devenv shell -- pnpm nx test llms
devenv shell -- pnpm nx build llms
devenv shell -- pnpm nx typecheck llms
git diff --check
```

If the inferred project does not expose a distinct `typecheck` target, inspect
`pnpm nx show project llms` and run the package's actual Nx type-checking
target rather than guessing a replacement flag.

## Acceptance Criteria

- Configuring the default export in a Razorwind config generates all five
  documents.
- `llms.txt` follows the specified Markdown order and links to every companion.
- Relative and `baseUrl`-absolute links both work as specified.
- Companion content is derived only from maintained schema data and explicit
  options.
- Generated order is stable, empty collections remain valid documents, and
  input data is not mutated.
- Package tests and build pass through Nx, and the README accurately describes
  the implemented API.
