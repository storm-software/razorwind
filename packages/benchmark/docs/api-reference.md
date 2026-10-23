---
title: @razorwind/benchmark API
description: Call the plugin or runBenchmark.
documentType: reference
---

# @razorwind/benchmark API

The default plugin name is `benchmark`. `themeGeneration` is `combined`.

`runBenchmark` detects an agent when the list is empty. It tries `codex`, then `claude-code`, and stops at the first executable that exists. An explicit `agents` list is required to be installed. `expandMatrix` builds the cell list and throws `benchmark profile resolved to zero evaluation cells` when the task or agent matrix is empty. `BUILT_IN_PROFILES` holds the four named profiles. `BUNDLED_TASKS` and `loadTasks` supply tasks. `renderReportHtml` and `renderResults` format the report.
