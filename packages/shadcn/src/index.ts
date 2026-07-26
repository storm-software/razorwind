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

import { useExecution } from "@power-plant/core";
import { definePlugin } from "@razorwind/core/plugin";
import { joinPaths } from "@stryke/path/join";
import { extractComponentsFromRegistry } from "./extract";

export {
  extractComponentsFromRegistry,
  registryItemsToComponents,
  registryItemToComponent,
  toDependencyRecord
} from "./extract";
export {
  BUILTIN_REGISTRIES,
  createRegistryConfig,
  DEFAULT_COMPONENTS,
  DEFAULT_STYLE,
  DEFAULT_TAILWIND_BASE_COLOR,
  DEFAULT_TAILWIND_CONFIG,
  DEFAULT_TAILWIND_CSS,
  DEFAULT_UTILS,
  getRawConfig,
  getRegistryConfig,
  resolveConfigPaths,
  type RegistryConfig
} from "./registry/config";
export type {
  ShadcnConfig,
  ShadcnRawConfig,
  ShadcnRegistryConfig,
  ShadcnWorkspaceConfig
} from "./registry/shadcn-types";

export interface ShadcnPluginOptions {
  /**
   * The path to the shadcn `registry.json` file.
   *
   * @default "registry.json"
   * @example
   * ```ts
   * import { defineConfig } from "@razorwind/core";
   * import shadcn from "@razorwind/shadcn";
   *
   * export default defineConfig({
   *   plugins: [shadcn({ configFile: "components/registry.json" })]
   * });
   * ```
   */
  configFile?: string;
}

/**
 * Razorwind plugin: load shadcn `registry.json` items into `schema.components`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import shadcn from "@razorwind/shadcn";
 *
 * export default defineConfig({
 *   plugins: [shadcn()]
 * });
 * ```
 */
export default definePlugin((options: ShadcnPluginOptions = {}) => ({
  name: "razorwind-shadcn",
  extract: async spec => {
    if (spec.components && Object.keys(spec.components).length > 0) {
      return spec;
    }

    let configFile = options.configFile;
    if (!configFile) {
      // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
      const { cwd } = useExecution();
      configFile = joinPaths(cwd, "registry.json");
    }

    const components = await extractComponentsFromRegistry(configFile);

    return { ...spec, components };
  }
}));
