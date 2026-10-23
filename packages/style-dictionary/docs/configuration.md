---
title: Configure @razorwind/style-dictionary
description: Set platforms and the optional CSS prefix.
documentType: reference
---

# Configure @razorwind/style-dictionary

`StyleDictionaryPluginOptions` is a Style Dictionary config without `tokens`, plus the fields below.

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `platforms` | No | none | Style Dictionary platforms. This is how you choose formats and destinations. |
| `prefix` | No | Initials from the schema name | Default prefix for `css/variables` files. A platform `prefix` wins. |
| `verbose` | No | `false` | Sets Style Dictionary `log.verbosity` to `verbose` when true. |
| `installGuide` | No | Generated steps | Replacement body for `INSTALL.md`. |
| `installPath` | No | Parent of the first output file, or `INSTALL.md` | Where to write `INSTALL.md`. |

Other Style Dictionary config fields are accepted, except `tokens`.
