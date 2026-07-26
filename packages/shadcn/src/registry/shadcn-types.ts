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

/**
 * Infer a Zod 3 schema's output from `parse`'s return type.
 *
 * Avoids `z.infer` / `zod/v3` — this package depends on Zod 4 while shadcn's
 * schemas are typed against Zod 3, and cross-version `infer` triggers
 * "Type instantiation is excessively deep and possibly infinite".
 */
type InferShadcnSchema<T> = T extends {
  parse: (...args: never[]) => infer Output;
}
  ? Output
  : never;

export type ShadcnConfig = InferShadcnSchema<typeof configSchema>;
export type ShadcnRawConfig = InferShadcnSchema<typeof rawConfigSchema>;
export type ShadcnRegistryConfig = InferShadcnSchema<
  typeof registryConfigSchema
>;
export type ShadcnWorkspaceConfig = InferShadcnSchema<
  typeof workspaceConfigSchema
>;
