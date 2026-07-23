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

import type {
  configSchema,
  rawConfigSchema,
  registryConfigSchema,
  workspaceConfigSchema
} from "shadcn/schema";
import type { z } from "zod";
import type { z as z3 } from "zod/v3";

export type ShadcnConfig = z3.infer<typeof configSchema>;
export type ShadcnRawConfig = z3.infer<typeof rawConfigSchema>;
export type ShadcnRegistryConfig = z.infer<typeof registryConfigSchema>;
export type ShadcnWorkspaceConfig = z.infer<typeof workspaceConfigSchema>;
