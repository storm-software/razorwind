# Razorwind Tokens Playground

A single-token-file fixture for exercising Razorwind generator plugins.

## Quick Features

- Uses `tokens.json` as the fixture design-system input.
- Generates CSS, Tailwind CSS, Style Dictionary, DESIGN.md, Docgen, Storybook,
  and Shiki artifacts.
- Provides the token source consumed by the sibling playground CLI.

## Installation

This is a private workspace playground, not a published package. Clone the
repository and install dependencies from its root:

```sh
pnpm install
```

## Usage

Generate the fixture artifacts from the repository root:

```sh
pnpm nx run playground-tokens:generate
```

The target reads `tokens.json` and writes its results under `generated/`.

## Development

Edit `tokens.json` to add or adjust fixture tokens, or update
`razorwind.config.ts` to exercise a generator configuration. Rerun the
generate target and inspect the ignored generated output.
