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
