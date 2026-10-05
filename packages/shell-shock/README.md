<!-- START header -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->


<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/razorwind/media/banner-1280x427-dark.gif">
  <source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/razorwind/media/banner-1280x427-light.gif">
<img src="https://public.storm-cdn.com/razorwind/media/banner-1280x427-dark.gif" width="100%" alt="Razorwind" />
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

# Razorwind - Shell Shock Integration

**Razorwind - Shell Shock Integration** connects a Razorwind design system to a [Shell Shock](https://github.com/storm-software/shell-shock) command-line application. It ships two plugins:

- A **Razorwind plugin** (`@razorwind/shell-shock`) that maps extracted design tokens to a Shell Shock CLI theme and writes `<name>.theme.json`, a `design-system.json` snapshot and an `INSTALL.md`.
- A **Shell Shock plugin** (`@razorwind/shell-shock/plugin`) that bakes the extracted design system into a CLI: it themes the CLI through [`@shell-shock/plugin-theme`](https://github.com/storm-software/shell-shock/tree/main/packages/plugin-theme), adds design-system commands modelled on the [Atlassian Design System MCP server](https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/master/design-system/ads-mcp/), and exposes those commands as MCP tools through [`@shell-shock/plugin-mcp`](https://github.com/storm-software/shell-shock/tree/main/packages/plugin-mcp).

## Installing

Using [pnpm](http://pnpm.io):

```bash
pnpm add -D @razorwind/shell-shock
```

<details>
  <summary>Using npm</summary>

```bash
npm install -D @razorwind/shell-shock
```

</details>

<details>
  <summary>Using yarn</summary>

```bash
yarn add -D @razorwind/shell-shock
```

</details>

## Shell Shock plugin

Register the plugin in `shell-shock.config.ts`. The design system is loaded once at build time and compiled into the CLI, so the generated commands have no runtime dependency on the Razorwind config.

```ts
import razorwind from "@razorwind/shell-shock/plugin";
import { defineConfig } from "@shell-shock/core/config";
import preset from "@shell-shock/preset-cli";

export default defineConfig({
  name: "acme",
  input: "src/commands",
  plugins: [
    preset(),
    razorwind({
      // One of: `spec` (inline schema), `specFile` (JSON schema or a
      // `design-system.json` snapshot), or `root` (directory holding a
      // `razorwind.config.*` — defaults to the Shell Shock project root).
      root: "../design-system",
      // Optional Markdown guideline documents served by `guidelines`.
      guidelines: "./guidelines"
    })
  ]
});
```

The generated MCP server imports `@modelcontextprotocol/server` and `zod` at runtime, so add both to the CLI project's dependencies alongside `@razorwind/shell-shock` (the generated commands import `@razorwind/shell-shock/runtime`).

### Commands and MCP tools

Every command prints JSON (Markdown for `guidelines`) and is exposed as an MCP tool of the same name by the `mcp` command. The table maps them to their ADS MCP equivalents.

| Command             | ADS MCP tool            | Description                                                                                                          |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `search-tokens`     | `ads_search_tokens`     | Fuzzy search tokens by name, path, description, type and value (`--terms`, `--limit`, `--include-metadata`)         |
| `list-tokens`       | `ads_get_all_tokens`    | Every token with value, type, description, hex and CSS variable                                                      |
| `search-components` | `ads_search_components` | Fuzzy search components by name, title, category, description and tags; returns files, dependencies and examples   |
| `list-components`   | `ads_get_all_components`| Every component record                                                                                               |
| `search-icons`      | `ads_search_icons`      | Fuzzy search icons by name, title, aliases, tags and category                                                        |
| `list-icons`        | `ads_get_all_icons`     | Every icon record                                                                                                    |
| `search-fonts`      | —                       | Fuzzy search fonts by name, family, role, tags and category (Razorwind extension)                                    |
| `list-fonts`        | —                       | Every font record with its CSS `font-family` stack                                                                   |
| `plan`              | `ads_plan`              | Run token, icon, component and font searches in one call                                                             |
| `guidelines`        | `ads_get_guidelines`    | Markdown guidelines generated from the spec (overview, components with usage examples, typography) plus bundled docs |
| `analyze-a11y`      | `ads_analyze_a11y`      | Heuristic accessibility analysis of a JSX string / file; hard-coded colors are mapped to the nearest token           |

Search semantics follow the ADS tools: `--limit` is the number of matches **per term**, results are merged by score and de-duplicated, and an empty result returns an error object listing the available names.

The remaining ADS tools are tied to Atlassian-specific content (`atlaskit_*` package catalogs, `ads_migration_guides`, `ads_i18n_conversion_guide`, `ads_get_lint_rules`, `ads_get_a11y_guidelines`, `ads_suggest_a11y_fixes`) or need a headless browser (`ads_analyze_localhost_a11y`) and have no Razorwind-spec-derived equivalent.

### Plugin options

| Option      | Default              | Description                                                                                                                  |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `spec`      | —                    | Inline Razorwind `Schema`                                                                                                    |
| `specFile`  | —                    | Path to a JSON `Schema` or `design-system.json` snapshot (relative to the CLI project)                                        |
| `root`      | CLI project root     | Directory containing `razorwind.config.*` to extract from                                                                    |
| `configFile`| —                    | Explicit Razorwind config file                                                                                               |
| `themeId`   | first non-shared set | Token set used for the CLI theme when tokens are multi-theme (`light` / `dark`)                                              |
| `guidelines`| —                    | `GuidelineDocument[]` or a directory of Markdown files (front matter `title` / `keywords` are honoured)                      |
| `prefix`    | —                    | Prefix for every contributed command name (`"ds"` → `ds-search-tokens`)                                                      |
| `commands`  | all                  | `DesignSystemCommandId[]` or `{ [id]: false }` to restrict the contributed commands                                          |
| `mapTheme`  | `inferPalette`       | `(spec) =>` `ShellShockPalette` or full `ThemeUserConfig`                                                                     |
| `theme`     | —                    | Explicit theme values merged over the mapped theme; `false` skips `@shell-shock/plugin-theme`                                |
| `mcp`       | `{}`                 | `@shell-shock/plugin-mcp` options (`command`, `include`/`exclude`, `includeTags`/`excludeTags`); `false` skips the MCP server |

### Theme mapping

By default the CLI theme is inferred from token paths (`color.primary`, `color.text.muted`, `color.success`, `color.border`, …). Provide `mapTheme` to control the mapping with a compact palette:

```ts
razorwind({
  root: "../design-system",
  mapTheme: spec => ({
    ...inferPalette(spec),
    primary: "#0066cc",
    warning: "#f59e0b"
  })
});
```

`inferPalette`, `paletteToTheme` and `resolveTheme` are exported from `@razorwind/shell-shock` for use in custom mappings.

## Razorwind plugin

Generate the theme (and snapshot) from a `razorwind.config.ts` instead of extracting inside the Shell Shock build:

```ts
import { defineConfig } from "@razorwind/core";
import shellShock, { inferPalette } from "@razorwind/shell-shock";

export default defineConfig({
  plugins: [
    shellShock({
      mapTheme: spec => ({ ...inferPalette(spec), name: "acme" })
    })
  ]
});
```

Generated files (under `shell-shock/` by default):

- `{theme-name}.theme.json` — Shell Shock `theme` config (`ThemeUserConfig`), loadable by `@shell-shock/plugin-theme` / `@shell-shock/preset-cli`
- `design-system.json` — snapshot of the extracted spec for the Shell Shock plugin's `specFile` option
- `INSTALL.md` — wiring steps for the Shell Shock project

### Options

| Option              | Default         | Description                                                            |
| ------------------- | --------------- | ---------------------------------------------------------------------- |
| `mapTheme`          | _(required)_    | `(spec) =>` palette / theme config, array, or record keyed by theme id |
| `outputPath`        | `"shell-shock"` | Output directory                                                       |
| `snapshot`          | `true`          | Also write `design-system.json`                                        |
| `stripFileContents` | `true`          | Omit component / icon `files[].content` from the snapshot              |
| `installGuide`      | —               | Override the generated `INSTALL.md` body                               |

The `@razorwind/preset` package exposes `mapShellShockTheme` so this plugin can be composed with the other theme generators around one shared `PresetTheme`.

## Runtime helpers

`@razorwind/shell-shock/runtime` contains the pure functions the generated commands call (`searchTokens`, `listComponents`, `plan`, `getGuidelines`, `analyzeA11y`, `fuzzySearch`, …). They operate on a `DesignSystemSnapshot` and can be reused in other tooling.

<!-- START footer -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->


## Storm Workspaces

Storm workspaces are built using
<a href="https://nx.dev/" target="_blank">Nx</a>, a set of extensible dev tools
for monorepos, which helps you develop like Google, Facebook, and Microsoft.
Building on top of Nx, the Open System provides a set of tools and patterns that
help you scale your monorepo to many teams while keeping the codebase
maintainable.

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## Roadmap

See the [open issues](https://github.com/storm-software/razorwind/issues) for
a list of proposed features (and known issues).

- [Top Feature Requests](https://github.com/storm-software/razorwind/issues?q=label%3Aenhancement+is%3Aopen+sort%3Areactions-%2B1-desc)
  (Add your votes using the 👍 reaction)
- [Top Bugs](https://github.com/storm-software/razorwind/issues?q=is%3Aissue+is%3Aopen+label%3Abug+sort%3Areactions-%2B1-desc)
  (Add your votes using the 👍 reaction)
- [Newest Bugs](https://github.com/storm-software/razorwind/issues?q=is%3Aopen+is%3Aissue+label%3Abug)

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## Support

Reach out to the maintainer at one of the following places:

- [Contact](https://stormsoftware.com/contact)
- [GitHub discussions](https://github.com/storm-software/razorwind/discussions)
- <support@stormsoftware.com>

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## License

This project is licensed under the **Apache License 2.0**. Feel free to edit and
distribute this template as you like.

See [LICENSE](LICENSE) for more information.

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## Changelog

This project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Every release, along
with the migration instructions, is documented in the [CHANGELOG](CHANGELOG.md)
file

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## Contributing

First off, thanks for taking the time to contribute! Contributions are what
makes the open-source community such an amazing place to learn, inspire, and
create. Any contributions you make will benefit everybody else and are **greatly
appreciated**.

Please try to create bug reports that are:

- _Reproducible._ Include steps to reproduce the problem.
- _Specific._ Include as much detail as possible: which version, what
  environment, etc.
- _Unique._ Do not duplicate existing opened issues.
- _Scoped to a Single Bug._ One bug per report.

Please adhere to this project's [code of conduct](.github/CODE_OF_CONDUCT.md).

You can use
[markdownlint-cli](https://github.com/storm-software/razorwind/markdownlint-cli)
to check for common markdown style inconsistency.

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

## Contributors

Thanks goes to these wonderful people
([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.sullypat.com/"><img src="https://avatars.githubusercontent.com/u/99053093?v=4?s=100" width="100px;" alt="Patrick Sullivan"/><br /><sub><b>Patrick Sullivan</b></sub></a><br /><a href="#design-sullivanpj" title="Design">🎨</a> <a href="https://github.com/storm-software/razorwind/commits?author=sullivanpj" title="Code">💻</a> <a href="#tool-sullivanpj" title="Tools">🔧</a> <a href="https://github.com/storm-software/razorwind/commits?author=sullivanpj" title="Documentation">📖</a> <a href="https://github.com/storm-software/razorwind/commits?author=sullivanpj" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tylerbenning.com/"><img src="https://avatars.githubusercontent.com/u/7265547?v=4?s=100" width="100px;" alt="Tyler Benning"/><br /><sub><b>Tyler Benning</b></sub></a><br /><a href="#design-tbenning" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://stormsoftware.com"><img src="https://avatars.githubusercontent.com/u/149802440?v=4?s=100" width="100px;" alt="Stormie"/><br /><sub><b>Stormie</b></sub></a><br /><a href="#maintenance-stormie-bot" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg" alt="All Contributors">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the
[all-contributors](https://github.com/all-contributors/all-contributors)
specification. Contributions of any kind welcome!

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />

<hr />
<br />

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/storm-software/media/banner-1280x320-dark.webp">
  <source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/storm-software/media/banner-1280x320-light.webp">
<img src="https://public.storm-cdn.com/storm-software/media/banner-1280x320-dark.webp" width="100%" alt="Storm Software" />
</picture>
</div>
<br />

<div align="center">
<a href="https://stormsoftware.com" target="_blank">Website</a>  •  <a href="https://stormsoftware.com/contact" target="_blank">Contact</a>  •  <a href="https://linkedin.com/in/patrick-sullivan-865526b0" target="_blank">LinkedIn</a>  •  <a href="https://medium.com/@pat.joseph.sullivan" target="_blank">Medium</a>  •  <a href="https://github.com/storm-software" target="_blank">GitHub</a>  •  <a href="https://keybase.io/sullivanp" target="_blank">OpenPGP Key</a>
</div>

<div align="center">
<b>Fingerprint:</b> 1BD2 7192 7770 2549 F4C9 F238 E6AD C420 DA5C 4C2D
</div>
<br />

Storm Software is an open source software development organization and creator
of Acidic, StormStack and StormCloud.

Our mission is to make software development more accessible. Our ideal future is
one where anyone can create software without years of prior development
experience serving as a barrier to entry. We hope to achieve this via LLMs,
Generative AI, and intuitive, high-level data modeling/programming languages.

Join us on [Discord](https://discord.gg/MQ6YVzakM5) to chat with the team,
receive release notifications, ask questions, and get involved.

If this sounds interesting, and you would like to help us in creating the next
generation of development tools, please reach out on our
[website](https://stormsoftware.com/contact) or join our
[Slack channel](https://join.slack.com/t/storm-software/shared_invite/zt-2gsmk04hs-i6yhK_r6urq0dkZYAwq2pA)!

<br />

<div align="center"><a href="https://stormsoftware.com" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/storm-software/icons/circle-dark.webp"><source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/storm-software/icons/circle-light.webp"><img src="https://public.storm-cdn.com/storm-software/icons/circle-dark.webp" width="200px" alt="Storm Software" /></picture></a></div>
<br />
<div align="center"><a href="https://stormsoftware.com" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/misc/text/visit-us-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/misc/text/visit-us-light.png"><img src="https://public.storm-cdn.com/misc/text/visit-us-dark.png" height="90px" alt="Visit us at stormsoftware.com" /></picture></a></div>
<br />

<div align="right">[ <a href="#table-of-contents">Back to top ▲</a> ]</div>
<br />
<br />


<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- END footer -->
