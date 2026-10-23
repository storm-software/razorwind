---
title: Configure @razorwind/theme-seeds
description: Set each seed inside its allowed range.
documentType: reference
---

# Configure @razorwind/theme-seeds

The plugin argument is `ThemeSeeds`.

| Field | Required | Range | Description |
| --- | --- | --- | --- |
| `hue` | Yes | 0 to 360 | Base hue. |
| `chroma` | Yes | 0 to 0.25 | Color intensity. |
| `warmth` | Yes | -1 to 1 | Warm or cool shift. |
| `energy` | Yes | 0 to 1 | Contrast and accent strength. |
| `density` | Yes | 0.85 to 1.15 | Spacing scale. |
| `appearance` | Yes | `dark` or `light` | Base appearance. |
| `lightness` | No | -1 to 1 | Lightness offset. |

`SEED_RANGES` exports those bounds.
