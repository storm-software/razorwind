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

import type { Tokens } from "@power-plant/dtcg-schema";
import type { EnvPaths } from "@stryke/env";
import type { RequiredKeys } from "@stryke/types/base";
import type { Components } from "../schema/components";
import type { Plugin } from "./plugin";

export interface Options {
  /**
   * The directory or file containing a Razorwind configuration file.
   *
   * @defaultValue "razorwind.config.ts"
   */
  configFile?: string;

  /**
   * The path(s) to directories containing component directories or files.
   */
  componentsPath?: string | string[];

  /**
   * The directory(ies) or file(s) containing the tokens.
   *
   * @see https://styledictionary.com/info/tokens/
   *
   * @defaultValue "tokens.json" (or "tokens" directory)
   */
  tokensPath?: string | string[];

  /**
   * The mode to use for the configuration.
   *
   * @defaultValue "production"
   */
  mode?: "development" | "test" | "production";

  /**
   * Whether to split multi-file token sources into a record keyed by theme.
   *
   * @remarks
   * When `true`, each resolved source file is inspected for a theme-like basename. The recognized names include (case-insensitive):
   * - `light`
   * - `dark`
   * - `dim`
   * - `dimmed`
   * - `high-contrast`
   * - `hc`
   * - `default`
   * - `base`
   * - `theme`
   *
   * The basename is optionally followed by a suffix separated by `.`, `_`, or `-` (for example `light.json`, `dark-mode.tokens.json`, `theme.custom.yaml`).
   *
   * Files that match are grouped under that theme key. Non-theme files are merged into a shared `base` entry when at least two distinct themes are detected. If fewer than two themes are found, all sources are merged into a single {@link Tokens} object instead of a record.
   *
   * When `false`, every source file is merged into one flat {@link Tokens} object regardless of filename.
   *
   * Basename detection uses {@link ../lib/tokens/constants#THEME_BASENAME_PATTERN}.
   *
   * @defaultValue true
   */
  splitThemes?: boolean;
}

export interface UserConfig extends Options {
  name?: string;
  title?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  tags?: string[];
  tokens?: Tokens | Record<string, Tokens>;
  components?: Components;
  plugins?: Plugin[];
}

export interface UserConfigParams {
  cwd: string;
  mode: string;
}

export type UserConfigFnObject = (config: UserConfig) => UserConfig;
export type UserConfigFnPromise = (
  params: UserConfigParams
) => Promise<UserConfig | UserConfig[]>;
export type UserConfigFn = (
  params: UserConfigParams
) => UserConfig | UserConfig[] | Promise<UserConfig | UserConfig[]>;
export type UserConfigExport =
  | UserConfig
  | UserConfig[]
  | Promise<UserConfig | UserConfig[]>
  | UserConfigFnObject
  | UserConfigFnPromise
  | UserConfigFn;

export type Config = RequiredKeys<UserConfig, "componentsPath" | "plugins"> & {
  cwd: string;
  envPaths: EnvPaths & {
    home: string;
  };
};
