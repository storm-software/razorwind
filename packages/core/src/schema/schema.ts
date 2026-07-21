/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { tokensSchema } from "@power-plant/dtcg-schema";
import z from "zod";
import { componentSchema } from "./components";

export const metaSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  repository: z.string(),
  homepage: z.string(),
  tags: z.array(z.string())
});

export type Meta = z.infer<typeof metaSchema>;

export const schema = z
  .object({
    components: z.array(componentSchema),
    tokens: z.union([tokensSchema, z.record(z.string(), tokensSchema)])
  })
  .merge(metaSchema);

export type Schema = z.infer<typeof schema>;
