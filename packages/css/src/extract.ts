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
import type { Tokens } from "@razorwind/core/schema";
import { parseCssCustomProperties } from "@razorwind/core/tokens";
import { existsSync } from "@stryke/fs/exists";
import { readFile } from "@stryke/fs/read-file";
import { isAbsolute, resolve } from "node:path";
import type { CssExtractPluginOptions } from "./types";

export type { CssExtractPluginOptions } from "./types";

/**
 * Basename pattern for CSS token files.
 */
export const CSS_FILE_PATTERN = /\.css$/i;

/** Default CSS entry when `cssPath` is omitted. */
export const DEFAULT_CSS_PATH = "src/styles.css";

/** Candidate workspace paths checked for a CSS token file. */
export const CSS_PATH_CANDIDATES = [
  DEFAULT_CSS_PATH,
  "styles.css",
  "src/globals.css",
  "globals.css",
  "src/app.css",
  "tokens.css"
] as const;

function hasTokens(tokens: unknown): tokens is Tokens {
  return (
    typeof tokens === "object" &&
    tokens !== null &&
    Object.keys(tokens).length > 0
  );
}

/**
 * Parse CSS custom properties (`:root`, `@theme`, `[data-theme]`, …) into a
 * nested DTCG token tree.
 */
export function parseCssTokens(contents: string): Tokens {
  return parseCssCustomProperties(contents) as Tokens;
}

/**
 * Resolve an absolute CSS file path from an explicit hint or common defaults.
 */
export function resolveCssPath(
  cwd: string,
  cssPath?: string | null
): string | null {
  if (cssPath) {
    const absolute = isAbsolute(cssPath) ? cssPath : resolve(cwd, cssPath);

    return existsSync(absolute) ? absolute : null;
  }

  for (const candidate of CSS_PATH_CANDIDATES) {
    const absolute = resolve(cwd, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }

  return null;
}

/**
 * Extract design tokens by reading and parsing a CSS file.
 */
export async function extractCssTokens(
  options: CssExtractPluginOptions & { cwd: string }
): Promise<Tokens | undefined> {
  const path = resolveCssPath(options.cwd, options.cssPath);
  if (!path) {
    return undefined;
  }

  const tokens = parseCssTokens(await readFile(path));
  if (!hasTokens(tokens)) {
    return undefined;
  }

  return tokens;
}

/**
 * Razorwind plugin: extract design tokens from a CSS file of custom properties.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import css from "@razorwind/css/extract";
 *
 * export default defineConfig({
 *   plugins: [css({ cssPath: "src/styles.css" })]
 * });
 * ```
 */
export default definePlugin((options?: CssExtractPluginOptions) => ({
  name: "css:extract",
  parsers: [
    {
      name: "css",
      pattern: CSS_FILE_PATTERN,
      parser: (contents: string): Tokens => parseCssTokens(contents)
    }
  ],
  extract: async spec => {
    if (hasTokens(spec.tokens)) {
      return spec;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const { cwd } = useExecution();

    const tokens = await extractCssTokens({
      cwd,
      cssPath: options?.cssPath
    });

    if (!hasTokens(tokens)) {
      return spec;
    }

    return { ...spec, tokens };
  }
}));
