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

export const iconFileSchema = z.object({
  path: z.string(),
  type: z
    .enum(["svg", "png", "webp", "jpg", "jpeg", "gif", "ico", "file"])
    .optional(),
  content: z.string().optional(),
  theme: z
    .string()
    .optional()
    .describe(
      "Optional theme variant for this asset (for example light or dark)."
    ),
  target: z
    .string()
    .optional()
    .describe(
      "The target path of the file in the project. Supports registry-style placeholders independent of the project's import prefix."
    )
});

export type IconFile = z.infer<typeof iconFileSchema>;

export const iconSchema = z.object({
  name: z.string(),
  title: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  since: z.string().optional(),
  version: z.string().optional(),
  repository: z.string().optional(),
  homepage: z.string().optional(),
  files: z.array(iconFileSchema).optional()
});

export type Icon = z.infer<typeof iconSchema>;

export const iconsSchema = z.record(z.string(), iconSchema);

export type Icons = z.infer<typeof iconsSchema>;
