---
title: @razorwind/preset API
description: Call preset, presetPlugin, and the map adapters.
documentType: reference
---

# @razorwind/preset API

The default export throws `@razorwind/preset requires options.mapTheme` or `@razorwind/preset requires at least one plugin` when those are missing.

`presetPlugin(factory, options)` stores options other than `mapTheme`. The preset injects `mapTheme`.

`mapChromeTheme`, `mapCursorTheme`, `mapGhosttyTheme`, `mapMapLibreTheme`, `mapNotepadPlusPlusTheme`, `mapSandpackTheme`, `mapShellShockTheme`, `mapShikiTheme`, `mapStorybookTheme`, `mapThunderbirdTheme`, `mapVivaldiTheme`, `mapVsceTheme`, `mapZedTheme`, and `mapZshTheme` convert a `PresetTheme` into that plugin's theme value.

Each selected plugin must define `generate`. The preset throws when it does not. An unknown plugin name throws `@razorwind/preset has no adapter for "<name>"`.
