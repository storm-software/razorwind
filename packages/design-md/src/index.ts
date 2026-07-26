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
import { readFile } from "@stryke/fs/read-file";
import { isEmptyObject } from "@stryke/type-checks/is-empty-object";
import type { DesignTokens } from "style-dictionary/types";
import { generateDesignMd } from "./generate";
import {
  DESIGN_MD_FILE_PATTERN,
  parseDesignMdTokens,
  resolveDesignMdPath
} from "./load";

export { extractDesignMd, selectPrimaryTheme } from "./extract";
export { flattenTokens, resolveTokenSets } from "./flatten";
export { formatTokenValue, toTokenName, toYamlScalar } from "./format";
export {
  generateDesignMd,
  renderBody,
  renderDesignMd,
  renderFrontMatter
} from "./generate";
export {
  DESIGN_MD_FILE_PATTERN,
  DESIGN_MD_PATH_CANDIDATES,
  designMdToTokens,
  extractDesignMdFrontMatter,
  isDesignMdFile,
  parseDesignMdTokens,
  resolveDesignMdPath
} from "./load";
export type {
  ComponentToken,
  DesignMdDocument,
  FlatToken,
  Options,
  TypographyToken
} from "./types";

export interface DesignMdPluginOptions {
  /**
   * The path to the DESIGN.md file.
   *
   * @default "DESIGN.md"
   */
  path?: string;
}

/**
 * Razorwind plugin: load DESIGN.md tokens on extract, emit DESIGN.md on generate.
 *
 * @see https://github.com/google-labs-code/design.md
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import designMd from "@razorwind/design-md";
 *
 * export default defineConfig({
 *   plugins: [designMd()]
 * });
 * ```
 */
export default definePlugin((options: DesignMdPluginOptions = {}) => ({
  name: "razorwind-design-md",
  parsers: [
    {
      name: "razorwind-design-md",
      pattern: DESIGN_MD_FILE_PATTERN,
      parser: (contents: string): DesignTokens => parseDesignMdTokens(contents)
    }
  ],
  extract: async (spec, config) => {
    if (spec.tokens && !isEmptyObject(spec.tokens)) {
      return spec;
    }

    let path = options.path;
    if (!path) {
      const { cwd } = useExecution();
      path = resolveDesignMdPath(cwd);
      if (!path) {
        return spec;
      }
    }

    const tokens = parseDesignMdTokens(await readFile(path));
    if (!tokens || isEmptyObject(tokens)) {
      return spec;
    }

    return { ...spec, tokens };
  },
  generate: async (spec, config) => {
    return generateDesignMd(spec, config);
  }
}));
