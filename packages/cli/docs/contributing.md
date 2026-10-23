---
title: Contribute to the CLI
description: Report an issue, follow the repository contributing guide, and run the workspace checks.
documentType: recipe
---

# Contribute to the CLI

The repository guide is [`.github/CONTRIBUTING.md`](../../../.github/CONTRIBUTING.md). The code of conduct is [`.github/CODE_OF_CONDUCT.md`](../../../.github/CODE_OF_CONDUCT.md).

1. Read the open issues at <https://github.com/storm-software/razorwind/issues>.
2. Comment on an issue, or open one, before a large change.
3. Open a pull request after you have a go-ahead. Link the issue.
4. Fix style warnings. The contributing guide says projects use StyleCop and `.editorconfig`.
5. Add unit tests for the code you write.

From the repository root:

```bash
pnpm build
pnpm lint
pnpm typecheck
```

The CLI readme documents these Nx commands:

```bash
nx build cli
nx test cli
```

Report bugs at <https://stormsoftware.com/support> or the GitHub issues above. Contact <support@stormsoftware.com>.
