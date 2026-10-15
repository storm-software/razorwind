# Razorwind Split-Themed Playground

A fixture that exercises Razorwind's split-theme handling with shared and
theme-specific DTCG token files.

## Quick Features

- Loads the token tree with `splitThemes: true`.
- Generates color variants, CSS, Tailwind CSS, Tamagui, Style Dictionary,
  DESIGN.md, Docgen, Storybook, and Shiki artifacts.
- Keeps generated fixture output in the ignored `generated/` directory.

## Installation

This is a private workspace playground, not a published package. Clone the
repository and install dependencies from its root:

```sh
pnpm install
```

## Usage

Generate the split-theme fixture from the repository root:

```sh
pnpm nx run playground-split-themed:generate
```

The target reads the token tree and writes generated artifacts beneath
`generated/`.

## Development

Edit shared or theme-specific files in `tokens/`, then rerun the generate
target. Adjust `razorwind.config.ts` to change the split-theme fixture or its
generator outputs.
