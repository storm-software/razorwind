# Razorwind Playground CLI

A Shell Shock CLI built on top of the [`tokens`](../tokens) playground design
system using [`@razorwind/shell-shock/plugin`](../../packages/shell-shock).

```bash
pnpm nx build playground-cli
```

The build extracts the design system from `../tokens/razorwind.config.ts`,
themes the CLI from its color tokens, adds the design-system commands
(`search-tokens`, `plan`, `guidelines`, `analyze-a11y`, …) and generates an
`mcp` command that exposes them as MCP tools.

## Quick Features

- Demonstrates a Shell Shock CLI themed from the sibling token playground.
- Adds design-system search, planning, guidelines, and accessibility commands.
- Exposes generated design-system commands through an MCP entry point.

## Installation

This is a private workspace playground, not a published CLI. Clone the
repository and install dependencies from the root:

```sh
pnpm install
```

## Usage

Build the playground, then run its generated command entry point:

```sh
pnpm nx build playground-cli
node playground/cli/dist/bin.mjs hello
```

The build uses the sibling `tokens` playground as its design-system source.

## Development

Update commands in `src/commands`, Markdown guidelines in `guidelines`, or the
Shell Shock integration in `shell-shock.config.ts`. Rebuild with
`pnpm nx build playground-cli` after each change.
