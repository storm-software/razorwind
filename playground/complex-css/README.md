# Razorwind Complex CSS Playground

A fixture that extracts tokens from complex CSS custom properties and generates
Razorwind artifacts from them.

## Quick Features

- Exercises the CSS extractor with the custom properties in `sample.css`.
- Generates CSS, Tailwind CSS, and a `DESIGN.md` specification into
  `generated/`.
- Keeps generated output out of version control for repeatable fixture runs.

## Installation

This is a private workspace playground, not a published package. Clone the
repository and install dependencies from its root:

```sh
pnpm install
```

## Usage

Generate the fixture artifacts from the repository root:

```sh
pnpm nx run playground-complex-css:generate
```

The command reads `sample.css` through `razorwind.config.ts` and writes results
under `generated/`.

## Development

Modify `sample.css` to add an extraction case or adjust
`razorwind.config.ts` to exercise another generator. Rerun the generate target
and inspect the ignored `generated/` directory.
