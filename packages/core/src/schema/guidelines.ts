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

import { z } from "zod";

export const guidelineSchema = z.object({
  name: z
    .string()
    .describe(
      "The display name of the guideline - if not provided, the key of the record will be converted to title-case."
    ),
  version: z.string().optional(),
  content: z.string().describe("The markdown content of the guideline."),
  data: z
    .record(z.string(), z.any())
    .optional()
    .describe("Additional data for the guideline.")
});

export type Guideline = z.infer<typeof guidelineSchema>;

export interface Guidelines {
  [key: string]: Guideline | Guidelines;
}

export const guidelinesSchema: z.ZodType<Guidelines> = z
  .lazy(() => z.record(z.string(), guidelineSchema.or(guidelinesSchema)))
  .describe(
    "A record of guidelines, that should be followed by the development team. Each key maps to either a guideline or a nested set of guidelines."
  );
