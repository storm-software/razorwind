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

import type { Tokens } from "@power-plant/dtcg-schema";
import { tokensSchema } from "@power-plant/dtcg-schema";
import z from "zod";
import type { Components } from "./components";
import { componentsSchema } from "./components";
import type { Icons } from "./icons";
import { iconsSchema } from "./icons";

const tokensFieldSchema = z.union([
  tokensSchema,
  z.record(z.string(), tokensSchema)
]);

export interface Schema {
  components: Components;
  icons: Icons;
  tokens: Tokens | Record<string, Tokens>;
}

export const schema: z.ZodType<Schema> = z.object({
  tokens: tokensFieldSchema,
  components: componentsSchema,
  icons: iconsSchema
});
