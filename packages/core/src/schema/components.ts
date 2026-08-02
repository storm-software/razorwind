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

export const componentFileSchema = z.object({
  path: z.string(),
  type: z
    .enum([
      "lib",
      "block",
      "component",
      "ui",
      "hook",
      "theme",
      "page",
      "file",
      "style",
      "base",
      "font",
      "item"
    ])
    .optional(),
  content: z.string().optional(),
  target: z
    .string()
    .optional()
    .describe(
      "The target path of the file. This is the path to the file in the project. Supports registry target placeholders @components/, @ui/, @lib/, and @hooks/, which resolve to the corresponding aliases configured in components.json. These placeholders are independent of the project's import prefix."
    )
});

export type ComponentFile = z.infer<typeof componentFileSchema>;

export const componentSchema = z.object({
  name: z.string(),
  title: z.string(),
  type: z.enum(["block", "component", "ui", "page"]).default("component"),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  since: z.string().optional(),
  version: z.string().optional(),
  repository: z.string().optional(),
  homepage: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  registryDependencies: z.record(z.string(), z.string()).optional(),
  files: z.array(componentFileSchema).optional()
});

export type Component = z.infer<typeof componentSchema>;

export const componentsSchema = z.record(z.string(), componentSchema);

export type Components = z.infer<typeof componentsSchema>;
