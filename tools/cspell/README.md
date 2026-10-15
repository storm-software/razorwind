# Razorwind - CSpell Tools

Workspace spelling resources for Razorwind.

## Quick Features

- Maintains the project-specific terms in `misc-phrases.txt`.
- Keeps product names, design-token terminology, and other accepted terms in a
  versioned workspace resource.

## Installation

This is an internal workspace package, not a published dependency. Clone the
repository and install its dependencies from the root:

```sh
pnpm install
```

## Usage

Add an accepted project term to `misc-phrases.txt`, one entry per line, when it
is needed by the workspace spelling configuration. It does not provide a
standalone command or runtime API.

## Development

Keep entries focused on established project terminology. Inspect this package's
workspace metadata with `pnpm nx show project tools-cspell` after changing the
word list.
