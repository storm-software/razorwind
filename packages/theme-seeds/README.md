# Razorwind Theme Seeds

`@razorwind/theme-seeds` is a Razorwind extractor plugin that derives a
self-contained semantic DTCG token tree from seven compact theme decisions.

## Installation

```sh
pnpm add -D @razorwind/theme-seeds
```

## Usage

```ts
import { defineConfig } from "@razorwind/core"
import themeSeeds from "@razorwind/theme-seeds"

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
})
```

The plugin runs after Razorwind loads token sources. Generated tokens provide a
base, while existing token leaves and group metadata win at every colliding
path. This makes seed output safe to refine with hand-authored tokens.

## Seed options

| Option       | Range                 | Meaning                                  |
| ------------ | --------------------- | ---------------------------------------- |
| `hue`        | Any finite number     | Accent hue, wrapped modulo 360           |
| `chroma`     | `0` to `0.25`         | Accent intensity                         |
| `warmth`     | `-1` to `1`           | Cool slate through neutral to warm paper |
| `energy`     | `0` to `1`            | Motion speed and shape personality       |
| `density`    | `0.85` to `1.15`      | Control and spacing scale                |
| `appearance` | `"dark"` or `"light"` | Surface and contrast model               |
| `lightness`  | `-1` to `1`, optional | Ground position; defaults to `0`         |

Hue wraps. Other finite numeric options clamp to their ranges. A non-finite or
non-numeric runtime value throws a `TypeError`, as does an invalid appearance.

## Generated tokens

The extractor generates:

- surfaces and surface padding;
- default, muted, faint, and inverse ink;
- default, strong, ink, soft, and line accents;
- default and strong lines plus a focus ring;
- positive, warning, and danger status colors with soft variants;
- shadow color;
- instant, fast, base, and slow motion durations;
- density, interactive/surface/overlay radii, control dimensions, and stack
  gap.

The output uses DTCG OKLCH colors, durations, dimensions, and numbers. It does
not generate fonts, easing variables, complete shadow recipes, pill radii, CSS
custom properties, or references to external primitives.

## Separate dark and light seeds

One plugin invocation accepts one seed set. Use Razorwind's independent config
runs when appearances need different seeds or output plugins:

```ts
import { defineConfig } from "@razorwind/core"
import themeSeeds from "@razorwind/theme-seeds"

const shared = {
  hue: 250,
  chroma: 0.12,
  warmth: -0.4,
  energy: 0.6,
  density: 1
} as const

export default defineConfig([
  {
    name: "dark",
    plugins: [themeSeeds({ ...shared, appearance: "dark" })]
  },
  {
    name: "light",
    plugins: [themeSeeds({ ...shared, appearance: "light" })]
  }
])
```

If the extractor receives an existing multi-theme token record, it adds the
same generated base beneath every theme and preserves each theme's overrides.

## Inspiration

The seed model and generation relationships are inspired by Strata's
[`ThemeSeeds`](https://github.com/Prometheus-000/strata/blob/72e122bb6fee5d5e1c06f1a4a4c75cf9dbbac1b0/engine/src/generateTheme.ts#L32)
and
[`generateTheme`](https://github.com/Prometheus-000/strata/blob/main/engine/src/generateTheme.ts).
This package adapts that model to Razorwind's DTCG contract and omits
Strata-specific DOM and primitive behavior.

## Development

Run `pnpm nx test theme-seeds` to execute unit tests and
`pnpm nx build theme-seeds` to build the package.
