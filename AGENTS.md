# Patching Dependencies

When a bug or missing behavior is traced to an external Storm package, **do not patch it in this repository**.

The following ecosystems are maintained in separate repositories and must never be modified locally (including `node_modules`, `pnpm patch`, `patchedDependencies`, or vendored copies):

| Ecosystem | Package scopes | External repository |
| --- | --- | --- |
| **powerlines** | `powerlines`, `@powerlines/*` | [storm-software/powerlines](https://github.com/storm-software/powerlines) |
| **power-plant** | `@power-plant/*` | [storm-software/power-plant](https://github.com/storm-software/power-plant) |
| **shell-shock** | `@shell-shock/*` | [storm-software/shell-shock](https://github.com/storm-software/shell-shock) |
| **storm-ops** | `@storm-software/*` | [storm-software/storm-ops](https://github.com/storm-software/storm-ops) |

Instead, produce a **descriptive fix outline** that can be applied in the correct external repository. Work around the issue in Razorwind only when a local workaround is explicitly requested and does not require patching these packages.

## Fix outline format

When the fix belongs upstream, write an outline with these sections:

1. **Summary** — One or two sentences describing the problem and the intended outcome.
2. **Affected packages** — Exact package name(s), version observed, and npm scope.
3. **Symptoms** — Error messages, failing commands, or incorrect behavior seen in Razorwind.
4. **Root cause** — Where the bug lives (file path, function, config option) in the external repo.
5. **Proposed change** — Concrete edits: files to touch, code to add/remove/replace, and any config updates.
6. **Verification** — How to confirm the fix in the external repo (build, test, or CLI command).
7. **Razorwind follow-up** — Catalog or dependency version bump needed here after the upstream release.

Keep the outline actionable enough that someone can open the external repository and implement the fix without re-investigating from scratch.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
