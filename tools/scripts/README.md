# Razorwind - Shared Scripts Tools

A collection of tools for managing shared configuration files used in the Razorwind monorepo.

This library was generated with [Nx](https://nx.dev).

## Quick Features

- Implements the root workspace workflows for bootstrap, build, format, lint,
  release, type checking, and dependency updates.
- Provides the Orca workspace setup script and publishing-manifest preparation
  used by repository automation.

## Installation

These scripts are internal to the Razorwind workspace. Clone the repository and
install dependencies from its root:

```sh
pnpm install
```

## Usage

Run the root package scripts rather than invoking a file in `src/` directly.
For example, `pnpm build`, `pnpm typecheck`, and `pnpm update-storm` dispatch
to the corresponding implementation here.

## Development

Edit the script that owns the workflow, then exercise the matching root command
in the workspace environment. Use `pnpm nx show project tools-scripts` to
inspect any inferred project targets.
