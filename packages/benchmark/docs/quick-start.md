---
title: Run a smoke benchmark
description: Pass an agent id and the smoke profile.
documentType: tutorial
---

# Run a smoke benchmark

```ts
import { defineConfig } from "@razorwind/core";
import benchmark from "@razorwind/benchmark";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    benchmark({
      profile: "smoke",
      concurrency: 1
    })
  ]
});
```

Reports are written under `benchmark`. When `agents` is omitted, `runBenchmark` tries `codex`, then `claude-code`, and uses the first installed executable. The default timeout is 30 minutes. `retainWorkspaces` defaults to false. A real run calls that agent CLI.
