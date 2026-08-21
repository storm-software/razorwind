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

import { execute } from "@power-plant/core";
import { generator } from "@razorwind/core";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = dirname(fileURLToPath(import.meta.url));
process.chdir(cwd);
const development =
  process.argv.includes("--development") ||
  process.env.NX_TASK_TARGET_CONFIGURATION === "development";

await execute(generator, {
  configFile: "razorwind.config.ts",
  mode: development ? "development" : "production",
  ...(process.argv.includes("--verbose") ? { verbose: true } : {})
});
