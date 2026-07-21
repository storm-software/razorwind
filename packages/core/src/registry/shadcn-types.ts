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

import type {
  configSchema,
  rawConfigSchema,
  registryConfigSchema,
  workspaceConfigSchema
} from "shadcn/schema";

// Read precomputed schema output types directly to avoid deep Zod inference.
export type ShadcnConfig = (typeof configSchema)["_output"];
export type ShadcnRawConfig = (typeof rawConfigSchema)["_output"];
export type ShadcnRegistryConfig = (typeof registryConfigSchema)["_output"];
export type ShadcnWorkspaceConfig = (typeof workspaceConfigSchema)["_output"];
