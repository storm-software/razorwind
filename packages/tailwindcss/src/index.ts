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
import { appendPath } from "@stryke/path/append";
import { isEmptyObject } from "@stryke/type-checks/is-empty-object";
import { detectTailwindWorkspace, extractTailwindTokens } from "./extract";
import type { TailwindPluginOptions } from "./types";

export {
  detectTailwindWorkspace,
  extractTailwindTokens,
  getTailwindConfigFile,
  getTailwindCssFile,
  getTailwindVersion,
  resolveTailwindCssEntry,
  type TailwindWorkspaceInfo
} from "./extract";
export { getPackageInfo } from "./workspace";

/**
 * Razorwind plugin: extract design tokens from Tailwind v4 `@theme` CSS.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import tailwindcss from "@razorwind/tailwindcss";
 *
 * export default defineConfig({
 *   plugins: [tailwindcss()]
 * });
 * ```
 */
export default definePlugin((options: TailwindPluginOptions = {}) => ({
  name: "razorwind-tailwindcss",
  extract: async spec => {
    if (spec.tokens && !isEmptyObject(spec.tokens)) {
      return spec;
    }

    const { cwd } = useExecution();

    const workspace = await detectTailwindWorkspace(cwd, options.cssPath);
    if (!workspace.configured || workspace.version !== "v4") {
      return spec;
    }

    const tokens = await extractTailwindTokens({
      cwd,
      cssPath: options.cssPath
        ? appendPath(options.cssPath, cwd)
        : workspace.cssFile,
      omitDefaults: options.omitDefaults
    });

    if (!tokens || isEmptyObject(tokens)) {
      return spec;
    }

    return { ...spec, tokens };
  }
}));
