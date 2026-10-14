# @razorwind/preset

Compose several Razorwind theme plugins around one DTCG token mapping. The
`mapTheme` result uses the shared `PresetTheme` vocabulary; the preset adapts
it to each selected plugin's native `mapTheme` callback.

## Quick Features

- Map tokens to theme colors once with the shared `PresetTheme` vocabulary.
- Compose several theme plugins (Shiki, VS Code, Shell Shock, and more) in one
  `preset` call.
- Adapt the shared mapping to each plugin with `map<Name>Theme` adapters.
- Pass extra per-plugin options with `presetPlugin` without losing the mapping.

## Installing

Using [pnpm](http://pnpm.io):

```bash
pnpm add -D @razorwind/preset
```

<details>
  <summary>Using npm</summary>

```bash
npm install -D @razorwind/preset
```

</details>

<details>
  <summary>Using yarn</summary>

```bash
yarn add -D @razorwind/preset
```

</details>

## Usage

```ts
import { defineConfig } from "@razorwind/core"
import preset, { presetPlugin } from "@razorwind/preset"
import shiki from "@razorwind/shiki"
import vsce from "@razorwind/vsce"

export default defineConfig({
  plugins: [
    preset({
      plugins: [
        shiki,
        presetPlugin(vsce, { name: "acme-theme", publisher: "acme" })
      ],
      mapTheme: tokens => ({
        name: "acme-dark",
        displayName: "Acme Dark",
        appearance: "dark",
        primary: {
          background: "#111111",
          foreground: "#eeeeee"
        }
      })
    })
  ]
})
```

Use a plugin factory directly when its only required option is `mapTheme`.
Use `presetPlugin(factory, options)` when that target also needs options such
as an output path, package name, or publisher. The selected plugins are
expanded during configuration, so their normal output and multi-theme behavior
remain unchanged. Individual adapters (`mapShikiTheme`, `mapVsceTheme`,
`mapShellShockTheme`, and the other `map<Name>Theme` exports) are also
available when configuring one plugin directly.

## Development

### Building

Run `nx build preset` to build the library.

### Running unit tests

Run `nx test preset` to execute the unit tests via [Vitest](https://vitest.dev/).
