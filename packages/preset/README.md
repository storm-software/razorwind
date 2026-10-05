# @razorwind/preset

Compose several Razorwind theme plugins around one DTCG token mapping. The
`mapTheme` result uses the shared `PresetTheme` vocabulary; the preset adapts
it to each selected plugin's native `mapTheme` callback.

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
