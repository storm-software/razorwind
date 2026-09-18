# Theme Seeds Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@razorwind/theme-seeds`, a publishable extractor that generates self-contained DTCG semantic tokens while preserving every existing token collision.

**Architecture:** A pure `generateThemeTokens` function owns validation, normalization, and Strata-inspired arithmetic. A thin extractor detects single versus multi-theme token shapes and immutably merges existing tokens over the generated base with core's atomic token merge.

**Tech Stack:** TypeScript 6, DTCG 2025.10, Vitest 4, Nx 23, Powerlines/tsdown, pnpm 11, devenv

**Spec:** `docs/superpowers/specs/2026-09-18-theme-seeds-extractor-design.md`

## Global Constraints

- Package: `@razorwind/theme-seeds`; plugin: `theme-seeds`.
- Export `ThemeSeeds`, `ThemeSeedAppearance`, `SEED_RANGES`, `generateThemeTokens`, and the default plugin.
- Reject non-finite numeric inputs and any appearance except `dark` or `light`.
- Wrap hue modulo 360; clamp all other seeds to the approved ranges.
- Emit native DTCG color, duration, dimension, and number values only.
- Emit no CSS variables, aliases, Strata primitives, or DOM behavior.
- Existing leaves and group metadata win atomically at every collision.
- Never mutate caller-owned seeds, schemas, or token trees.
- Preserve the unrelated edit in `packages/cli/package.json`.
- Run project commands through `devenv shell --`; run tasks through `pnpm nx`.

## File Map

- `packages/theme-seeds/src/types.ts`: public seed types and ranges.
- `packages/theme-seeds/src/generate.ts`: pure validation and token generation.
- `packages/theme-seeds/src/extract.ts`: shape detection, merging, and plugin.
- `packages/theme-seeds/src/index.ts`: public exports.
- `packages/theme-seeds/tests/*.test.ts`: generator and extractor regressions.
- `packages/theme-seeds` package/Nx/TypeScript/Powerlines/Vitest files.
- `packages/theme-seeds/README.md` and `CHANGELOG.md`.
- Root `tsconfig.json` and the new `pnpm-lock.yaml` importer.

---

### Task 1: Scaffold the package and implement pure generation

**Files:**

- Create: `packages/theme-seeds/package.json`
- Create: `packages/theme-seeds/project.json`
- Create: `packages/theme-seeds/powerlines.config.ts`
- Create: `packages/theme-seeds/tsconfig.json`
- Create: `packages/theme-seeds/tsconfig.lib.json`
- Create: `packages/theme-seeds/tsconfig.spec.json`
- Create: `packages/theme-seeds/vitest.config.mts`
- Create: `packages/theme-seeds/src/types.ts`
- Create: `packages/theme-seeds/src/generate.ts`
- Create: `packages/theme-seeds/tests/generate.test.ts`

**Interfaces:**

- Consumes: `Tokens` from `@razorwind/core/schema`.
- Produces: `ThemeSeedAppearance`, `ThemeSeeds`, `SEED_RANGES`, and `generateThemeTokens(seeds: ThemeSeeds): Tokens`.

- [ ] **Step 1: Add package and runner configuration**

Create `package.json`:

```json
{
  "name": "@razorwind/theme-seeds",
  "version": "0.0.1",
  "type": "module",
  "description": "Razorwind extractor that generates semantic design tokens from theme seeds.",
  "homepage": "https://stormsoftware.com",
  "license": "Apache-2.0",
  "private": false,
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.cts",
  "typings": "dist/index.d.mts",
  "devDependencies": {
    "@powerlines/plugin-tsdown": "catalog:",
    "@types/node": "catalog:",
    "typescript": "^6.0.3"
  },
  "publishConfig": { "access": "public" }
}
```

Create `project.json` with name `theme-seeds`, source root `packages/theme-seeds/src`, tag `platform:node`, an explicit `@nx/vitest:test` target using `packages/theme-seeds/vitest.config.mts`, and the standard `nx-release-publish` target from `packages/llms`.

Configure Powerlines with inputs `src/index.ts`, `src/extract.ts`, and `src/generate.ts`; Node platform; CJS/ESM output; `skipNodeModulesBundle: true`; and `tsdown()`. Use the compact TypeScript config shapes in `packages/color-variants`, retaining `../core/tsconfig.lib.json` as the library reference.

Configure Vitest with package root, cache `../../node_modules/.vite/packages/theme-seeds`, name `theme-seeds`, Node environment, the standard test include, and aliases for `@razorwind/core/plugin`, `schema`, and `utils` to their files under `packages/core/src`.

- [ ] **Step 2: Write failing tests with hand-derived values**

Create `tests/generate.test.ts`:

```ts
import { expect, it } from "vitest"
import { generateThemeTokens } from "../src/generate"

const darkSeeds = {
  hue: 250,
  chroma: 0.12,
  warmth: -0.4,
  energy: 0.6,
  density: 1,
  appearance: "dark",
  lightness: 0
} as const

it("generates self-contained dark DTCG tokens", () => {
  const t = generateThemeTokens(darkSeeds) as any
  expect(t.surface.page).toEqual({
    $type: "color",
    $value: { colorSpace: "oklch", components: [0.17, 0.0116, 220] }
  })
  expect(t.surface.veil.$value).toEqual({
    colorSpace: "oklch",
    components: [0.1, 0.0116, 220],
    alpha: 0.62
  })
  expect(t.accent.DEFAULT.$value.components).toEqual([0.8112, 0.12, 250])
  expect(t.motion.instant.$value).toEqual({ value: 79, unit: "ms" })
  expect(t.motion.slow.$value).toEqual({ value: 475, unit: "ms" })
  expect(t.radius.interactive.$value).toEqual({ value: 0.6, unit: "rem" })
  expect(t.control.height.md.$value).toEqual({ value: 2.5, unit: "rem" })
  expect(t.density).toEqual({ $type: "number", $value: 1 })
  expect(JSON.stringify(t)).not.toMatch(/var\(|strata|\{[^}]+\}/i)
})
```

Add a light case for `{ hue: 40, chroma: 0.2, warmth: 0.8, energy: 0.75, density: 1.1, appearance: "light" }`. Assert page `[0.97, 0.0172, 108]`, accent `[0.532, 0.174, 40]`, warning `[0.63, 0.14, 75]`, durations `69/138/224/414ms`, radius `0.656rem`, and surface padding `1.65rem`.

Add hue cases `[-110, 250]` and `[610, 250]`; a clamp case with chroma `1`, warmth `-2`, energy `2`, density `0`; zero-chroma dark/light accent lightness `0.93`/`0.3`; and malformed cases for `NaN`, infinities, strings, `undefined`, and `null`. Each malformed numeric error must be `Theme seed "<name>" must be a finite number.`; invalid appearance must be `Theme seed "appearance" must be "dark" or "light".`.

- [ ] **Step 3: Verify the red state**

Run `devenv shell -- pnpm nx test theme-seeds`.

Expected: FAIL because `../src/generate` does not exist.

- [ ] **Step 4: Define public seed types**

Create `src/types.ts`:

```ts
export type ThemeSeedAppearance = "dark" | "light"
export interface ThemeSeeds {
  hue: number
  chroma: number
  warmth: number
  energy: number
  density: number
  appearance: ThemeSeedAppearance
  lightness?: number
}
export const SEED_RANGES = {
  hue: [0, 360],
  chroma: [0, 0.25],
  warmth: [-1, 1],
  energy: [0, 1],
  density: [0.85, 1.15],
  lightness: [-1, 1]
} as const
export interface NormalizedThemeSeeds extends Required<ThemeSeeds> {}
```

Keep `NormalizedThemeSeeds` out of root exports.

- [ ] **Step 5: Implement validation and value helpers**

In `src/generate.ts`, define these boundaries:

```ts
function clamp(value: number, low: number, high: number): number
function lerp(start: number, end: number, amount: number): number
function round(value: number, precision: number): number
function requireFiniteSeed(name: keyof ThemeSeeds, value: unknown): number
function normalizeSeeds(seeds: ThemeSeeds): NormalizedThemeSeeds
function color(l: number, c: number, h: number, alpha?: number): Token
function duration(value: number): Token
function dimension(value: number, precision?: number): Token
```

Default only `lightness`; wrap hue with `((hue % 360) + 360) % 360`; clamp from `SEED_RANGES`. Colors use OKLCH components, durations integer milliseconds, and dimensions rem.

- [ ] **Step 6: Implement the approved formulas**

Use these shared derivations:

```ts
const mono = 1 - clamp(chroma / 0.04, 0, 1)
const neutralHue = warmth >= 0 ? lerp(200, 85, warmth) : lerp(200, 250, -warmth)
const neutralChroma = 0.006 + Math.abs(warmth) * 0.014
const speed = lerp(1.5, 0.65, energy)
const radius = lerp(0.375, 0.75, energy)
```

For dark appearance, compute:

```ts
const pageL = 0.17 + lightness * 0.1
surface.page = color(pageL, neutralChroma, neutralHue)
surface.sunken = color(
  Math.max(0.04, pageL - 0.03),
  neutralChroma * 0.9,
  neutralHue
)
surface.raised = color(pageL + 0.04, neutralChroma * 1.1, neutralHue)
surface.overlay = color(pageL + 0.07, neutralChroma * 1.2, neutralHue)
surface.veil = color(
  Math.max(0.03, pageL - 0.07),
  neutralChroma,
  neutralHue,
  0.62
)
ink.DEFAULT = color(0.94, 0.008, neutralHue)
ink.muted = color(0.72, 0.012, neutralHue)
ink.faint = color(Math.min(0.66, pageL + 0.51), 0.012, neutralHue)
ink.inverse = color(0.16, 0.01, neutralHue)
const accentL =
  lerp(lerp(0.84, 0.78, chroma / 0.25), 0.93, mono) +
  0.04 * Math.max(0, lightness)
```

Create dark accent roles from `accentL/chroma/hue`: default; strong at `accentL + 0.06` and `chroma * 1.1`; ink at `0.16` and `min(chroma * 0.35, 0.06)`; soft alpha `0.14`; line alpha `0.45`; focus alpha `0.7`. Use lines at `[0.94, 0.008, neutralHue]` with alpha `0.12/0.24`; positive `[0.78, 0.16, 150]`; warning `[0.82, 0.15, 80]`; danger `[0.68, 0.19, 22]`; soft status alphas `0.15`; and shadow `[0.05, 0.01, neutralHue]` alpha `0.5`.

For light appearance, compute:

```ts
const pageL = 0.97 + (lightness < 0 ? lightness * 0.09 : lightness * 0.015)
surface.page = color(pageL, neutralChroma, neutralHue)
surface.sunken = color(pageL - 0.03, neutralChroma * 1.1, neutralHue)
surface.raised = color(
  Math.min(0.995, pageL + 0.025),
  neutralChroma * 0.5,
  neutralHue
)
surface.overlay = color(Math.min(1, pageL + 0.03), 0, 0)
surface.veil = color(0.3, 0.01, neutralHue, 0.4)
ink.DEFAULT = color(0.24, 0.015, neutralHue)
ink.muted = color(0.45, 0.015, neutralHue)
ink.faint = color(Math.max(0.51, pageL - 0.46), 0.012, neutralHue)
ink.inverse = color(0.97, 0.005, neutralHue)
const accentL =
  lerp(lerp(0.58, 0.52, chroma / 0.25), 0.3, mono) -
  0.06 * Math.max(0, -lightness)
const accentC = chroma * 0.87
const statusFloor = 0.07 * Math.max(0, -lightness)
```

Create light accent roles from `accentL/accentC/hue`: default; strong at `accentL - 0.08`; ink `[0.98, 0.01, hue]`; soft alpha `0.12`; line alpha `0.4`; focus alpha `0.65`. Use lines at `[0.24, 0.015, neutralHue]` with alpha `0.13/0.28`; positive `[0.6 - statusFloor, 0.15, 150]`; warning `[0.63 - statusFloor * 1.07, 0.14, 75]`; danger `[0.55, 0.19, 22]`; soft alphas `0.13/0.15/0.12`; and shadow `[0.3, 0.02, neutralHue]` alpha `0.18`.

For both appearances, compute durations by rounding `80/160/260/480 * speed`; density to three decimals; radii `radius`, `radius * 1.5`, and `radius * 2.4` to three decimals; and rhythm multipliers `2/2.5/3/1/1.5/1 * density` to four decimals for control heights, control padding, surface padding, and stack gap. Build approved paths directly with `DEFAULT` nodes. Return an object checked with `satisfies Tokens`. Do not use CSS parsing or emit excluded roles.

- [ ] **Step 7: Verify green and commit**

Run `devenv shell -- pnpm nx test theme-seeds`; expect all generator tests to pass.

Commit only this slice with message `feat(theme-seeds): generate semantic tokens from seeds`.

---

### Task 2: Add extraction and precedence

**Files:**

- Create: `packages/theme-seeds/tests/extract.test.ts`
- Create: `packages/theme-seeds/src/extract.ts`
- Create: `packages/theme-seeds/src/index.ts`

**Interfaces:**

- Consumes: `generateThemeTokens`, `mergeTokenTrees`, and `TOKEN_SET_THEME_PATTERN`.
- Produces: default `themeSeeds(seeds: ThemeSeeds): Plugin` and its extraction hook.

- [ ] **Step 1: Write failing plugin and empty-tree tests**

```ts
import type { Schema, Tokens } from "@razorwind/core/schema"
import { expect, it } from "vitest"
import themeSeeds from "../src/extract"

const seeds = {
  hue: 220,
  chroma: 0.1,
  warmth: -0.8,
  energy: 0.2,
  density: 1.05,
  appearance: "light"
} as const
const schema = (tokens: Tokens | Record<string, Tokens> = {}) =>
  ({ tokens, components: {}, icons: {}, fonts: {} }) as Schema

it("defines the theme-seeds extractor", () => {
  const plugin = themeSeeds(seeds)
  expect(plugin.name).toBe("theme-seeds")
  expect(typeof plugin.extract).toBe("function")
})

it("generates a complete base for empty tokens", async () => {
  const plugin = themeSeeds(seeds)
  const result = await plugin.extract!(schema(), {} as never)
  expect((result.tokens as any).surface.page.$type).toBe("color")
  expect((result.tokens as any).motion.fast.$type).toBe("duration")
})
```

- [ ] **Step 2: Write failing precedence and immutability tests**

```ts
it("keeps existing leaves and metadata without losing generated siblings", async () => {
  const existing = {
    surface: {
      $description: "Product surfaces",
      page: { $value: "#123456", $description: "Owned" }
    }
  } as unknown as Tokens
  const before = structuredClone(existing)
  const plugin = themeSeeds(seeds)
  const result = await plugin.extract!(schema(existing), {} as never)
  const tokens = result.tokens as any

  expect(tokens.surface.$description).toBe("Product surfaces")
  expect(tokens.surface.page).toEqual(existing.surface.page)
  expect(tokens.surface.page.$type).toBeUndefined()
  expect(tokens.surface.raised.$type).toBe("color")
  expect(existing).toEqual(before)
  expect(result.tokens).not.toBe(existing)
})
```

The `$type` assertion is the atomic-leaf regression: field-wise merging would incorrectly retain the generated color type.

- [ ] **Step 3: Write the failing multi-theme test**

```ts
it("merges the generated base beneath every existing theme", async () => {
  const dark = {
    accent: { DEFAULT: { $value: "#111111" } }
  } as unknown as Tokens
  const light = {
    surface: { page: { $value: "#fafafa" } }
  } as unknown as Tokens
  const input = { dark, light }
  const before = structuredClone(input)
  const plugin = themeSeeds(seeds)
  const result = await plugin.extract!(schema(input), {} as never)
  const tokens = result.tokens as Record<string, any>

  expect(tokens.dark.accent.DEFAULT.$value).toBe("#111111")
  expect(tokens.dark.surface.page.$type).toBe("color")
  expect(tokens.light.surface.page.$value).toBe("#fafafa")
  expect(tokens.light.motion.fast.$type).toBe("duration")
  expect(input).toEqual(before)
  expect(tokens.dark).not.toBe(dark)
  expect(tokens.light).not.toBe(light)
})

it("treats ordinary top-level token groups as one tree", async () => {
  const input = { color: { brand: { $value: "#123456" } } } as unknown as Tokens
  const plugin = themeSeeds(seeds)
  const result = await plugin.extract!(schema(input), {} as never)
  expect((result.tokens as any).color.brand.$value).toBe("#123456")
  expect((result.tokens as any).surface.page.$type).toBe("color")
})
```

- [ ] **Step 4: Verify the red state**

Run `devenv shell -- pnpm nx test theme-seeds`.

Expected: FAIL because `src/extract.ts` does not exist.

- [ ] **Step 5: Implement shape detection and merging**

```ts
function isThemeRecord(
  tokens: Tokens | Record<string, Tokens>
): tokens is Record<string, Tokens> {
  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"))
  return keys.length > 0 && keys.every(key => TOKEN_SET_THEME_PATTERN.test(key))
}

function mergeThemeSeedTokens(
  current: Tokens | Record<string, Tokens>,
  generated: Tokens
) {
  if (!isThemeRecord(current))
    return mergeTokenTrees(current as Tokens, generated)
  return Object.fromEntries(
    Object.entries(current).map(([theme, tokens]) => [
      theme,
      mergeTokenTrees(tokens, generated)
    ])
  )
}
```

Define the plugin with `definePlugin`. Generate inside `extract`, merge current tokens over the base, and return `{ ...spec, tokens }`. Do not mutate or cache caller-visible objects.

- [ ] **Step 6: Define root exports**

```ts
export { default } from "./extract"
export { generateThemeTokens } from "./generate"
export { SEED_RANGES } from "./types"
export type { ThemeSeedAppearance, ThemeSeeds } from "./types"
```

- [ ] **Step 7: Verify green and commit**

Run `devenv shell -- pnpm nx test theme-seeds`; expect both suites to pass.

Commit the slice with message `feat(theme-seeds): merge generated tokens during extraction`.

---

### Task 3: Integrate and document the package

**Files:**

- Create: `packages/theme-seeds/README.md`
- Create: `packages/theme-seeds/CHANGELOG.md`
- Modify: `tsconfig.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: the public API from Tasks 1 and 2.
- Produces: workspace discovery, publish metadata, and user guidance.

- [ ] **Step 1: Add the root TypeScript reference**

Insert `{ "path": "./packages/theme-seeds" }` immediately after `packages/color-variants` in root `tsconfig.json`. Run `devenv shell -- pnpm nx sync`, then inspect `git status --short`. Retain only theme-seeds sync changes and preserve the CLI edit.

- [ ] **Step 2: Synchronize the lockfile importer**

Run `devenv shell -- pnpm install --lockfile-only --ignore-scripts --filter @razorwind/theme-seeds`.

Inspect the new importer. If unrelated importers or resolutions churn, determine the environment mismatch before retaining those changes.

- [ ] **Step 3: Write README and changelog**

README must show the approved plugin call, all seed ranges, wrapping/clamping/errors, generated groups, existing-token precedence, exclusions, and Razorwind multi-config usage for distinct theme seeds. Cite both user-provided Strata URLs as inspiration.

Create this initial changelog entry:

```md
# Changelog for Razorwind - Theme Seeds

## Unreleased

### Features

- Generate self-contained semantic DTCG tokens from theme seed options while preserving existing token values.
```

- [ ] **Step 4: Verify project discovery**

Run `devenv shell -- pnpm nx show project theme-seeds`.

Expected: `test`, `build`, a type-checking target, and `nx-release-publish`. Record the exact type-check target name.

- [ ] **Step 5: Commit integration**

Stage only the new docs, root TypeScript reference, and lockfile. Commit with message `docs(theme-seeds): document seed generation`.

---

### Task 4: Verify the completed package

**Files:**

- Modify only package files when fresh verification exposes a defect.
- Preserve: `packages/cli/package.json`.

**Interfaces:**

- Consumes: the complete package.
- Produces: fresh test, type, build, format, and diff evidence.

- [ ] **Step 1: Snapshot user-owned work**

Run `git status --short` and `git diff -- packages/cli/package.json`. Save the CLI diff for final comparison.

- [ ] **Step 2: Run focused tests**

Run `devenv shell -- pnpm nx test theme-seeds`.

Expected: zero failed tests.

- [ ] **Step 3: Type-check and build**

Run the exact type-check target reported by Nx, then `devenv shell -- pnpm nx build theme-seeds`.

Expected: both exit 0 with no diagnostics.

- [ ] **Step 4: Check formatting and patch hygiene**

Run `devenv shell -- pnpm prettier --check packages/theme-seeds docs/superpowers/specs/2026-09-18-theme-seeds-extractor-design.md docs/superpowers/plans/2026-09-18-theme-seeds-extractor.md tsconfig.json`.

Run `git diff --check`.

Expected: both exit 0.

- [ ] **Step 5: Perform mutation-oriented coverage review**

Confirm tests fail for reversed merge order, field-wise leaf merging, omission of one theme, removed finite validation, removed wrapping/clamping, reintroduced `var(--strata-...)`, and changed energy/density arithmetic. For any uncovered mutation, first add and observe a failing test, then apply the minimum production correction and rerun tests.

- [ ] **Step 6: Compare final scope**

Run `git status --short`, inspect the feature commits' diff for `packages/theme-seeds`, `tsconfig.json`, and `pnpm-lock.yaml`, then rerun `git diff -- packages/cli/package.json`. Confirm the CLI diff matches Step 1 and was never staged.

- [ ] **Step 7: Commit verification corrections only when needed**

If Step 5 required changes, commit only package files with `test(theme-seeds): cover seed generation regressions`. Do not create an empty commit.

## Completion Checklist

- [ ] Public names match the approved spec.
- [ ] DTCG value shapes match the 2025.10 contract.
- [ ] Dark and light literal fixtures cover every token family.
- [ ] Output has no unresolved references.
- [ ] Existing leaves and metadata win atomically.
- [ ] Single and multi-theme inputs remain immutable.
- [ ] Tests, type checking, build, formatting, and diff checks pass freshly.
- [ ] README covers ranges, paths, precedence, exclusions, and multi-config use.
- [ ] `packages/cli/package.json` remains unstaged and unchanged by this work.
