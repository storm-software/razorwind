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
import type { Tokens } from "@power-plant/dtcg-schema";
import { configSchema } from "shadcn/schema";
import type { z as z3 } from "zod/v3";
import z from "zod";
import type { ShadcnConfig } from "../registry/shadcn-types";

function fromZod3<T extends z3.ZodTypeAny>(source: T): z.ZodType<z3.infer<T>> {
  return z.unknown().transform((value, ctx) => {
    const result = source.safeParse(value);

    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path
        });
      }

      return z.NEVER;
    }

    return result.data;
  });
}

const tokensFieldSchema = z.union([
  tokensSchema,
  z.record(z.string(), tokensSchema)
]);

export type Schema = {
  registry: ShadcnConfig;
  tokens: Tokens | Record<string, Tokens>;
};

export const schema: z.ZodType<Schema> = z.object({
  registry: fromZod3(configSchema),
  tokens: tokensFieldSchema
});
