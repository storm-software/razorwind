# Razorwind - Workspace Error Config Tools

A collection of tools for managing error message configuration files used in the
Razorwind monorepo.

## Quick Features

- Stores the workspace error-code catalog in `codes.json`.
- Provides one versioned source for tooling that needs stable error metadata.

## Installation

This is an internal workspace package, not a published dependency. Clone the
repository and install its dependencies from the root:

```sh
pnpm install
```

## Usage

Read or update `codes.json` when a Razorwind workspace tool needs an error-code
entry. The package has no standalone executable or public runtime API.

## Development

Keep the catalog valid JSON and make changes alongside the tool that consumes
the code. Inspect available workspace targets with:

```sh
pnpm nx show project tools-errors
```
