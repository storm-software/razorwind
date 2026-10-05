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

import type { CommandMetadata } from "@shell-shock/core";

export const metadata = {
  title: "Hello",
  description: "Prints a greeting styled with the design-system theme.",
  icon: "👋"
} satisfies CommandMetadata;

export interface HelloOptions {
  /**
   * The name to greet.
   *
   * @defaultValue "world"
   */
  name?: string;
}

async function handler(options: HelloOptions = {}) {
  process.stdout.write(`Hello, ${options.name ?? "world"}!\n`);
}

export default handler;
