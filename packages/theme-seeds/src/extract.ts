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

import { definePlugin } from "@razorwind/core/plugin";
import type { Schema, Tokens } from "@razorwind/core/schema";
import {
  mergeTokenTrees,
  TOKEN_SET_THEME_PATTERN
} from "@razorwind/core/utils";
import { generateThemeTokens } from "./generate";
import type { ThemeSeeds } from "./types";

function isThemeRecord(
  tokens: Tokens | Record<string, Tokens>
): tokens is Record<string, Tokens> {
  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));

  return (
    keys.length > 0 && keys.every(key => TOKEN_SET_THEME_PATTERN.test(key))
  );
}

function mergeThemeSeedTokens(
  current: Tokens | Record<string, Tokens>,
  generated: Tokens
): Tokens | Record<string, Tokens> {
  if (!isThemeRecord(current)) {
    return mergeTokenTrees(current as Tokens, generated);
  }

  return Object.fromEntries(
    Object.entries(current).map(([key, tokens]) => [
      key,
      key.startsWith("$") ? tokens : mergeTokenTrees(tokens, generated)
    ])
  ) as Record<string, Tokens>;
}

export default definePlugin((seeds: ThemeSeeds) => ({
  name: "theme-seeds",
  extract: async (spec: Schema) => ({
    ...spec,
    tokens: mergeThemeSeedTokens(spec.tokens ?? {}, generateThemeTokens(seeds))
  })
}));
