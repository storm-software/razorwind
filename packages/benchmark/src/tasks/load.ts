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

import type { BenchmarkTask } from "../types";
import { BUNDLED_TASKS } from "./bundled";

export function validateTask(task: BenchmarkTask): BenchmarkTask {
  if (!task.id.trim()) throw new Error("task id must not be empty");
  if (!task.title.trim())
    throw new Error(`task "${task.id}" title must not be empty`);
  if (!task.prompt.trim())
    throw new Error(`task "${task.id}" prompt must not be empty`);
  if (task.rubrics.length === 0) {
    throw new Error(`task "${task.id}" requires at least one rubric`);
  }

  for (const expected of task.hiddenExpectations ?? []) {
    if (
      new RegExp(
        `\\b${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      ).test(task.prompt)
    ) {
      throw new Error(
        `task "${task.id}" prompt reveals hidden component "${expected}"`
      );
    }
  }

  const rubricIds = new Set<string>();
  for (const rubric of task.rubrics) {
    if (!rubric.id.trim() || !rubric.description.trim()) {
      throw new Error(`task "${task.id}" contains an incomplete rubric`);
    }
    if (rubricIds.has(rubric.id)) {
      throw new Error(
        `task "${task.id}" has duplicate rubric id "${rubric.id}"`
      );
    }
    if (!(rubric.weight > 0 && rubric.weight <= 1)) {
      throw new Error(`task "${task.id}" rubric weights must be in (0, 1]`);
    }
    rubricIds.add(rubric.id);
  }
  return task;
}

export function loadTasks(input: "bundled" | BenchmarkTask[]): BenchmarkTask[] {
  const tasks = input === "bundled" ? BUNDLED_TASKS : input;
  const ids = new Set<string>();

  return tasks.map(task => {
    validateTask(task);
    if (ids.has(task.id)) throw new Error(`duplicate task id "${task.id}"`);
    ids.add(task.id);
    return task;
  });
}
