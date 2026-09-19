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

import type { GeneratedDocument } from "@power-plant/core";
import type { Config } from "@razorwind/core";
import type { Schema } from "@razorwind/core/schema";
import { runBenchmark } from "./engine";
import { resolveBenchmarkOptions } from "./options";
import { renderManifest, renderReportHtml, renderResults } from "./report";
import { adaptSchema } from "./schema";
import { loadTasks } from "./tasks";
import type { BenchmarkOptions } from "./types";

export type BenchmarkDocument = GeneratedDocument & {
  plugin: { name: "benchmark" };
};
export type BenchmarkDocuments = Record<string, BenchmarkDocument>;

export interface GenerateBenchmarkDependencies {
  runBenchmark: typeof runBenchmark;
}

function document(
  path: string,
  content: string,
  language: string
): BenchmarkDocument {
  const meta = { name: "benchmark" } as const;

  return {
    path,
    language,
    plugin: meta,
    meta,
    chunks: [{ content, meta }]
  };
}

export async function generateBenchmark(
  schema: Schema,
  config: Config,
  options: BenchmarkOptions = {},
  dependencies: GenerateBenchmarkDependencies = { runBenchmark }
): Promise<BenchmarkDocuments> {
  const resolved = resolveBenchmarkOptions(options, config.cwd);
  const groundTruth = await adaptSchema(schema, {
    packageName: resolved.packageName
  });
  const tasks = loadTasks(resolved.tasks);
  const run = await dependencies.runBenchmark({
    groundTruth,
    options: resolved,
    tasks
  });
  const root = resolved.outputPath;

  return {
    [`${root}/manifest.json`]: document(
      `${root}/manifest.json`,
      renderManifest(run),
      "json"
    ),
    [`${root}/report.html`]: document(
      `${root}/report.html`,
      renderReportHtml(run),
      "html"
    ),
    [`${root}/results.json`]: document(
      `${root}/results.json`,
      renderResults(run),
      "json"
    )
  };
}
