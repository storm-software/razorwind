# Theme Seeds Extractor Design

## Summary

Add `@razorwind/theme-seeds`, a publishable Razorwind extractor plugin that
derives a coherent semantic DTCG token tree from a small set of theme seeds.
The generation model is inspired by Strata's `ThemeSeeds` and
`generateTheme` implementation, translated into self-contained Razorwind
tokens rather than CSS custom properties or Strata primitive references.

The plugin augments token sources that Razorwind has already loaded. Existing
tokens always win at colliding paths, which lets projects use seeds as a base
and retain explicit hand-authored decisions.

## Goals

- Generate semantic colors, motion durations, radii, density, and rhythm from
  one `ThemeSeeds` value.
- Preserve the relationships and normalization behavior of the referenced
  Strata theme-generation formulas.
- Return native DTCG values suitable for all Razorwind generators.
- Keep the generated tree self-contained, with no `var(--strata-...)` or other
  external primitive references.
- Preserve existing token leaves and metadata on every collision.
- Support both single token trees and Razorwind multi-theme token records.
- Provide a pure generator that can be used without the extractor pipeline.

## Non-Goals

- Reproduce Strata's DOM-oriented `applyTheme` behavior.
- Generate CSS custom properties directly.
- Generate fonts, complete shadow recipes, easing curves, pill radii, or other
  values whose definitions are not derivable from the seeds.
- Add presets such as Obsidian, Gallery, Ember, Ultraviolet, Meadow, or Glacier.
- Add seed options to `@razorwind/core`.
- Infer seed values from existing tokens.
- Introduce a new multi-theme configuration mechanism.

## Package and Public API

Create a new publishable package at `packages/theme-seeds` named
`@razorwind/theme-seeds`. It follows the repository's existing extractor
package conventions for Nx, TypeScript, Powerlines, Vitest, package exports,
documentation, and release metadata.

The default export is a Razorwind plugin factory named `theme-seeds`:

```ts
import { defineConfig } from "@razorwind/core";
import themeSeeds from "@razorwind/theme-seeds";

export default defineConfig({
  plugins: [
    themeSeeds({
      hue: 250,
      chroma: 0.12,
      warmth: -0.4,
      energy: 0.6,
      density: 1,
      appearance: "dark",
      lightness: 0
    })
  ]
});
```

The package exports this public contract:

```ts
export type ThemeSeedAppearance = "dark" | "light";

export interface ThemeSeeds {
  /** Accent hue on the OKLCH hue wheel. Normalized modulo 360. */
  hue: number;
  /** Accent chroma. Clamped to 0 through 0.25. */
  chroma: number;
  /** Neutral tint from cool (-1) through neutral (0) to warm (1). */
  warmth: number;
  /** Motion and shape personality. Clamped to 0 through 1. */
  energy: number;
  /** Rhythm multiplier. Clamped to 0.85 through 1.15. */
  density: number;
  appearance: ThemeSeedAppearance;
  /** Ground position within the appearance. Defaults to 0 and clamps to -1 through 1. */
  lightness?: number;
}

export const SEED_RANGES: Readonly<{
  hue: readonly [0, 360];
  chroma: readonly [0, 0.25];
  warmth: readonly [-1, 1];
  energy: readonly [0, 1];
  density: readonly [0.85, 1.15];
  lightness: readonly [-1, 1];
}>;

export function generateThemeTokens(seeds: ThemeSeeds): Tokens;
```

The exact names above are part of the intended public contract.

## Seed Normalization and Validation

All required numeric seeds must be finite numbers. If any required value, or
an explicitly provided `lightness`, is `NaN`, infinite, or not a number at
runtime, generation throws a `TypeError` naming the invalid option.
`appearance` must be exactly `"dark"` or `"light"`; any other runtime value
throws a `TypeError` naming `appearance`.

After validation:

- `hue` wraps modulo 360, including negative inputs;
- `chroma` clamps to `[0, 0.25]`;
- `warmth` clamps to `[-1, 1]`;
- `energy` clamps to `[0, 1]`;
- `density` clamps to `[0.85, 1.15]`;
- omitted `lightness` becomes `0`, then clamps to `[-1, 1]`.

Clamping is intentional rather than an error because it matches the seed
engine's behavior and makes interactive or generated inputs safe at range
boundaries.

## Generated Token Model

`generateThemeTokens` returns a single DTCG token tree. Values use native DTCG
representations:

- colors use `$type: "color"` with OKLCH `colorSpace`, numeric components, and
  optional alpha;
- durations use `$type: "duration"` with `{ value, unit: "ms" }`;
- dimensions use `$type: "dimension"` with `{ value, unit: "rem" }`;
- density uses `$type: "number"`;
- groups may carry a shared `$type` when every child has that type.

The public paths are:

| Group | Token paths |
| --- | --- |
| Surface | `surface.page`, `surface.sunken`, `surface.raised`, `surface.overlay`, `surface.veil`, `surface.padding` |
| Ink | `ink.DEFAULT`, `ink.muted`, `ink.faint`, `ink.inverse` |
| Accent | `accent.DEFAULT`, `accent.strong`, `accent.ink`, `accent.soft`, `accent.line` |
| Lines and focus | `line.DEFAULT`, `line.strong`, `focus.ring` |
| Status | `status.positive.DEFAULT`, `status.positive.soft`, `status.warning.DEFAULT`, `status.warning.soft`, `status.danger.DEFAULT`, `status.danger.soft` |
| Shadow | `shadow.color` |
| Motion | `motion.instant`, `motion.fast`, `motion.base`, `motion.slow` |
| Density | `density` |
| Radius | `radius.interactive`, `radius.surface`, `radius.overlay` |
| Rhythm | `control.height.sm`, `control.height.md`, `control.height.lg`, `control.padding.x`, `stack.gap` |

`DEFAULT` follows the existing Razorwind convention for preserving a scalar
role that also has named children. The generated tree does not include CSS
variables, aliases, or references.

## Generation Formulas

The generator ports the seed-derived arithmetic from the referenced Strata
engine while producing DTCG objects directly.

Warmth selects the neutral hue between the neutral, paper, and slate anchors
and increases neutral chroma by magnitude. Appearance and lightness establish
surface positions. Chroma drives the accent's strength, including the
monochrome correction that moves very low-chroma accents toward the readable
ink pole. Appearance-specific status colors and alphas remain consistent with
the source formulas.

Energy determines motion duration scaling and the three radii. The motion
easing roles are omitted because their Strata values point to external easing
primitives rather than values derived from the seeds.

Density is emitted as a number rounded to the same three-decimal precision as
the source engine. Rhythm is always emitted in computed form:

- control heights: `2rem`, `2.5rem`, and `3rem`, multiplied by density;
- control horizontal padding: `1rem`, multiplied by density;
- surface padding: `1.5rem`, multiplied by density;
- stack gap: `1rem`, multiplied by density.

Computed rhythm values use four-decimal precision before conversion to DTCG
dimension objects. Font roles, shadow recipes, the pill radius, and every role
whose only value is an external primitive reference are omitted.

## Extractor Data Flow

The extractor runs after Razorwind has loaded token sources:

1. Validate and normalize the supplied seeds.
2. Generate a fresh DTCG token tree.
3. Detect whether `spec.tokens` is a single token tree or a multi-theme token
   record using the same theme-record conventions as core token utilities.
4. For a single tree, deep-merge it over the generated base.
5. For a multi-theme record, deep-merge each theme tree over an independently
   generated base and preserve the theme keys.
6. Return a new schema object with the merged tokens and unchanged components,
   icons, fonts, and metadata.

The existing token tree is always the override argument. Token leaves are
atomic: an existing leaf replaces the entire generated leaf, including its
`$value`, `$type`, `$description`, and extensions. Existing group metadata also
wins. Non-colliding generated tokens remain available.

The extractor does not mutate the seeds, schema, existing token tree, or
generated base. An empty or absent token tree receives the complete generated
tree.

## Multi-Theme Semantics

One plugin invocation accepts one `ThemeSeeds` value. A multi-theme input gets
the same generated base beneath each existing theme because the extractor
cannot infer distinct seeds from theme names.

Projects that need different dark and light seed sets use Razorwind's existing
array/multi-config mechanism and configure one plugin instance per config.
This keeps theme selection and output splitting owned by core rather than
adding a second theme orchestration API to this package.

## Internal Structure

The package uses small modules with clear responsibilities:

- `src/types.ts` defines `ThemeSeeds`, `ThemeSeedAppearance`, and seed ranges.
- `src/generate.ts` validates and normalizes seeds, implements the pure
  arithmetic, and builds DTCG token values.
- `src/extract.ts` detects token-tree shape, performs immutable precedence
  merges, and defines the plugin.
- `src/index.ts` exports the default plugin and public types/helpers.

Tests live under `packages/theme-seeds/tests`. Package metadata mirrors the
existing publishable extractor packages without modifying external Storm
packages or generated integration layers.

## Error Handling

- Throw a descriptive `TypeError` for a non-finite numeric seed.
- Throw a descriptive `TypeError` for an invalid `appearance`.
- Clamp valid out-of-range finite values instead of throwing.
- Do not throw when existing tokens are empty or absent.
- Do not throw solely because a multi-theme record has arbitrary theme names
  already accepted by Razorwind core.
- Do not mutate caller-owned objects while normalizing or merging.

## Documentation and Attribution

The package README documents installation, the plugin example, all seed
ranges, normalization behavior, generated token groups, precedence, and the
multi-config pattern for distinct theme seeds.

Source documentation identifies the linked Strata `generateTheme.ts` as the
design inspiration. The implementation is adapted to Razorwind's public DTCG
contract and intentionally excludes Strata-only primitives and DOM behavior.

## Testing Strategy

Implementation follows red-green-refactor. Expected values are literal,
hand-checked DTCG fixtures rather than values produced by the generator's own
helpers.

Focused Vitest coverage verifies:

- plugin name and extraction hook;
- exact representative dark output;
- exact representative light output;
- default `lightness` behavior;
- negative and greater-than-360 hue wrapping;
- clamping at every seed boundary;
- low-chroma monochrome accent correction;
- energy-derived durations and radii on both sides of meaningful thresholds;
- density-derived rhythm values and precision;
- omission of fonts, shadow recipes, easing, pill radius, aliases, and CSS
  variable references;
- descriptive errors for each malformed runtime option;
- complete output when existing tokens are empty;
- existing leaf and group-metadata precedence;
- preservation of non-colliding generated tokens;
- immutable single-tree extraction;
- immutable per-theme merging for multi-theme records.

Each test names a concrete production regression it catches. The generator
tests exercise the real pure function, and extractor tests invoke the real
plugin hook without mocking core merge behavior.

## Package Integration and Verification

The package adds standard package, Nx, TypeScript, Powerlines, Vitest, README,
and changelog files. The root TypeScript project references
`packages/theme-seeds`, and the workspace lockfile is updated only when the new
workspace package requires it.

Final verification runs through Nx inside the repository's devenv:

```sh
devenv shell -- pnpm nx test theme-seeds
devenv shell -- pnpm nx typecheck theme-seeds
devenv shell -- pnpm nx build theme-seeds
devenv shell -- pnpm prettier --check packages/theme-seeds \
  docs/superpowers/specs/2026-09-18-theme-seeds-extractor-design.md \
  tsconfig.json
git diff --check
```

Before using a target, inspect `pnpm nx show project theme-seeds`; if the
inferred target name differs, run the actual target instead of guessing flags.
Check `git status --short` before and after broad workspace commands, preserve
the existing unrelated `packages/cli/package.json` modification, and revert no
user-owned work.

## Acceptance Criteria

- `@razorwind/theme-seeds` is a publishable extractor package with the public
  API specified above.
- A complete valid seed set produces deterministic, self-contained DTCG
  semantic tokens.
- Dark and light appearances follow the documented generation formulas.
- Generated output contains no Strata CSS-variable dependencies.
- Existing token leaves and metadata win at every collision.
- Single-tree and multi-theme extraction are immutable and retain all
  non-token schema data.
- Focused tests, type checking, build, formatting, and diff checks pass without
  altering the unrelated CLI package edit.
