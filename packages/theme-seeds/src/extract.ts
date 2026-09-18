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
