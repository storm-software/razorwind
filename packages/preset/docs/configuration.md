---
title: Configure @razorwind/preset
description: Provide mapTheme, plugins, and the shared theme fields.
documentType: reference
---

# Configure @razorwind/preset

### `PresetPluginOptions`

Declared in `preset/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `plugins` | Yes | `readonly PresetPluginInput[]` | Theme generators to configure from this preset. A direct plugin factory is enough when it only needs `mapTheme`: `plugins: [shiki]`. Wrap factories with presetPlugin to provide additional target-specific options. |
| `mapTheme` | Yes | `GeneratePresetTheme` | Maps extracted DTCG tokens once per generation input. The preset adapts this shared theme to each selected plugin's native theme shape. |

`mapTheme` must return a `PresetTheme` object. Required fields are `name`, `appearance` (`light` or `dark`), and `primary`. Optional roles include `secondary`, `success`, `error`, `warning`, `muted`, `border`, `selection`, `cursor`, and font fields.

Supported plugin names are `chrome`, `cursor`, `ghostty`, `maplibre`, `notepad-plus-plus`, `sandpack`, `shell-shock`, `shiki`, `storybook`, `thunderbird`, `vivaldi`, `vsce`, `zed`, and `zsh`.
