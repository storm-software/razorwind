# Razorwind Multi-Themed Playground

A fixture that generates distinct dark and light design-system artifacts from
theme-specific DTCG token files.

## Quick Features

- Combines shared primitive tokens with dark and light semantic and component
  token files.
- Runs two Razorwind configurations, one for each theme.
- Produces CSS, Tailwind CSS, Style Dictionary, DESIGN.md, Docgen, Storybook,
  and Shiki outputs in separate theme directories.

## Installation

This is a private workspace playground, not a published package. Clone the
repository and install dependencies from its root:

```sh
pnpm install
```

## Usage

Generate both theme variants from the repository root:

```sh
pnpm nx run playground-multi-themed:generate
```

The results are written below `generated/dark/` and `generated/light/`.

## Development

Change the relevant files under `tokens/primitives`, `tokens/semantic`, or
`tokens/components`, then rerun the generate target. Update
`razorwind.config.ts` when adding a generator or altering a theme mapping.
