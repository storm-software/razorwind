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

export interface InputOptions {
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
}

export interface Config extends InputOptions {
  name?: string;
  title?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  tags?: string[];
}

export interface UserConfigParams {
  cwd: string;
  mode: string;
}

export type UserConfig = Config;
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
