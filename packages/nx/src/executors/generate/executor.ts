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

import type { ExecutorContext } from "@nx/devkit";
import { execute } from "@power-plant/core";
import { generator } from "@razorwind/core";
import type { BaseExecutorResult } from "@storm-software/workspace-tools/types";
import type { GenerateExecutorSchema } from "./schema";

async function executorFn(
  options: GenerateExecutorSchema,
  context: ExecutorContext
): Promise<BaseExecutorResult> {
  if (!context.projectName) {
    throw new Error(
      `The Razorwind - Generate executor requires \`projectName\` on the context object.`
    );
  }

  if (
    !context.projectName ||
    !context.projectsConfigurations?.projects ||
    !context.projectsConfigurations.projects[context.projectName] ||
    !context.projectsConfigurations.projects[context.projectName]?.root
  ) {
    throw new Error(
      `The Razorwind - Generate executor requires \`projectsConfigurations\` on the context object.`
    );
  }

  await execute(generator, {
    configFile: options.configFile,
    mode: options.mode as "development" | "production",
    registryPath: options.registryPath,
    tokensPath: options.tokensPath
  });

  return {
    success: true
  };
}

export default executorFn;
