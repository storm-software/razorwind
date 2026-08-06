<!-- START header -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->


<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/razorwind/media/banner-1280x640-dark.gif">
  <source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/razorwind/media/banner-1280x640-light.gif">
<img src="https://public.storm-cdn.com/razorwind/media/banner-1280x640-dark.gif" width="100%" alt="Razorwind" />
</picture>
</div>
<br />

<div align="center">
<b>
<a href="https://stormsoftware.com" target="_blank">Website</a>  •
<a href="https://github.com/storm-software/razorwind" target="_blank">GitHub</a>  •
<a href="https://discord.gg/MQ6YVzakM5">Discord</a>  •  <a href="https://stormstack.github.io/stormstack/" target="_blank">Docs</a>  •  <a href="https://stormsoftware.com/contact" target="_blank">Contact</a>  •
<a href="https://github.com/storm-software/stack/issues/new?assignees=&labels=bug&template=bug-report.yml&title=Bug Report%3A+">Report a Bug</a>
</b>
</div>
<br />

💨 Razorwind is a unified set of tools that make creating design systems a breeze.

<h3 align="center">💻 Visit <a href="https://stormsoftware.com" target="_blank">stormsoftware.com</a> to stay up to date with this developer</h3>
<br />

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge&logo=commitlint&color=1fb2a6)](http://commitizen.github.io/cz-cli/)&nbsp;![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=for-the-badge&color=1fb2a6)&nbsp;![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/storm-software/razorwind/release.yml?style=for-the-badge&logo=github-actions&color=1fb2a6)

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

> [!IMPORTANT] 
> This repository, and the apps, libraries, and tools contained within, is still in it's initial development phase. As a result, bugs and issues are expected with it's usage. When the main development phase completes, a proper release will be performed, the packages will be available through NPM (and other distributions), and this message will be removed. However, in the meantime, please feel free to report any issues you may come across.

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<div align="center">
<b>Be sure to ⭐ this repository on <a href="https://github.com/storm-software/razorwind" target="_blank">GitHub</a> so you can keep up to date on any daily progress!</b>
</div>

<br />

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- END header -->


# Razorwind - Zed Theme Extension Plugin

**Razorwind - Zed Theme Extension** creates Zed-installable theme extensions from design tokens. Output matches official Zed extension layout ([Dracula for Zed](https://draculatheme.com/zed) is a good reference).

## Installing

Using [pnpm](http://pnpm.io):

```bash
pnpm add -D @razorwind/zed
```

<details>
  <summary>Using npm</summary>

```bash
npm install -D @razorwind/zed
```

</details>

<details>
  <summary>Using yarn</summary>

```bash
yarn add -D @razorwind/zed
```

</details>

## Usage

```ts
import { defineConfig } from "@razorwind/core";
import zed, { flattenTokens } from "@razorwind/zed";

export default defineConfig({
  plugins: [
    zed({
      id: "my-theme",
      name: "My Theme",
      authors: ["Acme <themes@acme.com>"],
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "My Theme",
          themes: [
            {
              name: "My Theme Dark",
              appearance: "dark",
              style: {
                "editor.background": color("color.bg"),
                "editor.foreground": color("color.fg"),
                syntax: {
                  comment: { color: color("color.muted") }
                }
              }
            },
            {
              name: "My Theme Light",
              appearance: "light",
              style: {
                "editor.background": color("color.bg"),
                "editor.foreground": color("color.fg")
              }
            }
          ]
        };
      }
    })
  ]
});
```

Generated package (under `zed-extension/` by default):

- `themes/*.json` — Zed theme collection documents from `mapTheme`
- `extension.toml` — Zed extension manifest
- `README.md`
- `INSTALL.md` — Zed extensions store + manual install steps

### Options

| Option          | Default                                      | Description                                              |
| --------------- | -------------------------------------------- | -------------------------------------------------------- |
| `id`            | _(required)_                                 | Extension id slug for `extension.toml`                   |
| `mapTheme`      | _(required)_                                 | `(tokens) =>` collection, array, or record             |
| `outputPath`    | `"zed-extension"`                            | Output directory for the extension package               |
| `name`          | title-cased `id`                             | Human-readable extension name                            |
| `version`       | `"0.0.1"`                                    | Extension version                                        |
| `schemaVersion` | `1`                                          | `extension.toml` schema version                          |
| `authors`       | —                                            | `extension.toml` authors array                           |
| `themeSchema`   | `https://zed.dev/schema/themes/v0.2.0.json` | Default `$schema` for theme JSON                        |
| `installGuide`  | _(generated)_                                | Override body for generated `INSTALL.md`               |

`mapTheme` return shapes: a single `ZedTheme` collection, an array, or a `Record<string, ZedTheme>`. Each collection contains `themes[]` variants with `appearance: "dark" | "light"` and a `style` object (UI keys, optional `syntax`, optional `players`).

### Install in Zed

Publish or install via the Zed extensions store, or copy `themes/*.json` to `~/.config/zed/themes` and pick the theme under **Settings → Select Theme**. See generated `INSTALL.md` for full steps.

## Development

### Building

Run `nx build zed` to build the library.

### Running unit tests

Run `nx test zed` to execute the unit tests via [Vitest](https://vitest.dev/).
