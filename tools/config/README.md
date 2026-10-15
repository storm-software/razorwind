# Razorwind - Shared Config Tools

A collection of tools for managing shared configuration files used in the Razorwind monorepo.

This library was generated with [Nx](https://nx.dev).

## Quick Features

- Centralizes the Verdaccio, GitGuardian, Zizmor, and shared tsdown
  configuration used by the workspace.
- Keeps repository-level tooling settings versioned beside the projects that
  consume them.

## Installation

This is an internal workspace package, not a published dependency. Clone the
repository and install the workspace dependencies from its root:

```sh
pnpm install
```

## Usage

Tooling in this repository consumes the files in this directory directly. For
example, the root `local-registry` target uses `verdaccio.yml`; update a
configuration file here only when changing the corresponding workspace tool.

## Development

Keep configuration changes narrowly scoped to the tool that reads them. Use
`pnpm nx show project monorepo` to inspect root targets, then run the affected
target from the repository root when one is available.
