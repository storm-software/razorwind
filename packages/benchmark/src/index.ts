/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { definePlugin } from "@razorwind/core/plugin";
import { generateBenchmark } from "./generate";
import type { BenchmarkOptions } from "./types";

export default definePlugin((options: BenchmarkOptions = {}) => ({
  name: "benchmark",
  themeGeneration: "combined",
  generate: async (schema, config) => generateBenchmark(schema, config, options)
}));

export { runBenchmark, runCell } from "./engine";
export type { RunBenchmarkRequest, RunCellRequest } from "./engine";
export { BUILT_IN_PROFILES, expandMatrix } from "./engine/matrix";
export { generateBenchmark } from "./generate";
export type {
  BenchmarkDocument,
  BenchmarkDocuments,
  GenerateBenchmarkDependencies
} from "./generate";
export { assertSafeRelativePath, resolveBenchmarkOptions } from "./options";
export { renderManifest, renderReportHtml, renderResults } from "./report";
export { adaptSchema, renderComponentDeclarations } from "./schema";
export { BUNDLED_TASKS, loadTasks, validateTask } from "./tasks";
export type * from "./types";
