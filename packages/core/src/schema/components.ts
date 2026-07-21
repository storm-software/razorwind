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

import { z } from "zod";

export const componentSchema = z.object({
  category: z.enum(["block", "component", "ui", "page"]),
  name: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  since: z.string().optional(),
  version: z.string().optional(),
  repository: z.string().optional(),
  homepage: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  registryDependencies: z.record(z.string(), z.string()).optional(),
  files: z.array(z.string()).optional()
});

export type Component = z.infer<typeof componentSchema>;

export const schema = z.record(z.string(), componentSchema);

export type Components = z.infer<typeof schema>;
