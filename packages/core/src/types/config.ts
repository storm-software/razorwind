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
import type { Plugin } from "./plugin";

export interface Options {
  /**
   * The directory or file containing a Razorwind configuration file.
   *
   * @defaultValue "razorwind.config.ts"
   */
  configFile?: string;

  /**
   * The path to the registry.json file.
   *
   * @see https://shadcn.com/docs/registry
   */
  registryPath?: string;

  /**
   * The directory or file containing the tokens.
   *
   * @see https://styledictionary.com/info/tokens/
   *
   * @defaultValue "tokens.json" (or "tokens" directory)
   */
  tokensPath?: string;

  /**
   * The mode to use for the configuration.
   *
   * @defaultValue "production"
   */
  mode?: "development" | "test" | "production";
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

export type Config = RequiredKeys<UserConfig, "registryPath" | "plugins"> & {
  cwd: string;
  envPaths: EnvPaths & {
    home: string;
  };
};
