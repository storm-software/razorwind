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

# Razorwind - ESLint Extension Plugin

A Razorwind plugin that generates an ESLint plugin from the design system
spec. It ports the rules of
[`@atlaskit/eslint-plugin-design-system`](https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/master/design-system/eslint-plugin/)
onto your own tokens, components, icons and fonts, and bundles the
`@razorwind/tailwindcss` and `@razorwind/tamagui` guardrails in the same
plugin.

## Installing

Using [pnpm](http://pnpm.io):

```bash
pnpm add -D @razorwind/eslint
```

<details>
  <summary>Using npm</summary>

```bash
npm install -D @razorwind/eslint
```

</details>

<details>
  <summary>Using yarn</summary>

```bash
yarn add -D @razorwind/eslint
```

</details>

## Usage

Add the plugin to `razorwind.config.ts`:

```ts
import { defineConfig } from "@razorwind/core";
import eslint from "@razorwind/eslint";

export default defineConfig({
  plugins: [
    eslint({
      // Rule namespace: `acme/ensure-design-token-usage`.
      prefix: "acme",
      // Also lint Tamagui v3 flat values (`<View bg="…">`).
      tamagui: true
    })
  ]
});
```

Generating writes `eslint/design-system/index.mjs` (the plugin, with the
design-system manifest inlined) and an `INSTALL.md` listing every rule and its
default severity. Multi-theme token sets generate one shared plugin and guide,
not separate files per theme. Wire the plugin into `eslint.config.mjs`:

```js
import designSystem from "./eslint/design-system/index.mjs";

export default [
  designSystem({
    files: ["src/**/*.{ts,tsx}"],
    // How suggestions reference tokens: `var(--acme-color-primary)` ("css-var")
    // or `token("color.primary")` ("function").
    tokenReference: "css-var",
    // Only treat components imported from these modules as design-system components.
    componentModules: ["@acme/ui"],
    severity: { "no-physical-properties": "error" }
  })
];
```

### Options

| Option          | Default                            | Description                                                                          |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `eslintPath`    | `"eslint/design-system/index.mjs"` | Output path of the generated plugin module.                                          |
| `prefix`        | `"design-system"`                  | Rule namespace used in `eslint.config.*`.                                            |
| `runtimeImport` | `"@razorwind/eslint/runtime"`      | Module the generated file imports the runtime from.                                  |
| `cssVarPrefix`  | initials of the schema name        | Prefix of the token CSS variables, matching `@razorwind/css`. `false` for none.      |
| `tailwind`      | `true`                             | Include the `@razorwind/tailwindcss` class guardrails as `tailwind-*` rules.         |
| `tamagui`       | `false`                            | Include the `@razorwind/tamagui` v3 guardrails as `tamagui-*` rules.                 |
| `installGuide`  | generated                          | Override the generated `INSTALL.md`.                                                 |

### Rules

Every rule reads its allowlist, suggestions and examples from the design
system. Token rules are enabled when the schema defines that token category,
and component rules when it defines the replacement component.

- **Tokens:** `ensure-design-token-usage`, `no-unsafe-design-token-usage`,
  `no-deprecated-design-token-usage` (DTCG `$deprecated`, with the replacement
  read from a `{token.path}` reference in the note), `use-tokens-space`,
  `use-tokens-shape`, `use-tokens-typography`, `use-tokens-motion`,
  `expand-motion-shorthand`. Literals with a matching token value get a
  suggestion that swaps in the token.
- **CSS-in-JS:** `no-margin`, `no-physical-properties`, `no-nested-styles`,
  `no-exported-css`, `no-exported-keyframes`, `no-empty-styled-expression`,
  `no-css-tagged-template-expression`, `no-styled-tagged-template-expression`,
  `no-keyframes-tagged-template-expression`, `use-visually-hidden`.
- **Components:** `no-html-anchor`, `no-html-button`, `no-html-checkbox`,
  `no-html-code`, `no-html-heading`, `no-html-image`, `no-html-radio`,
  `no-html-range`, `no-html-select`, `no-html-text-input`, `no-html-textarea`,
  `use-primitives-text`, `prefer-primitives`, `no-unsafe-style-overrides`,
  `icon-label`, `no-empty-icon-button-label`, `no-placeholder`,
  `no-readonly-or-disabled-inputs`, `no-deprecated-imports` (components tagged
  `deprecated`, suggesting their `related` components), `no-banned-imports`.
- **Tailwind / Tamagui:** the `@razorwind/tailwindcss` and `@razorwind/tamagui`
  guardrails, prefixed `tailwind-` and `tamagui-`.

## Development

### Building

Run `nx build eslint` to build the library.

### Running unit tests

Run `vitest run --project eslint` to execute the unit tests via [Vitest](https://vitest.dev/).

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
