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

import type { DesignSystemSettings } from "../types";
import type { RuleContext } from "./ast";

/** Settings key the core rules read their sources from. */
export const SETTINGS_KEY = "razorwind-design-system";

export const DEFAULT_TOKEN_FUNCTIONS = ["token"];

export const DEFAULT_STYLE_CALLEES = [
  "css",
  "cssMap",
  "xcss",
  "keyframes",
  "injectGlobal",
  "createGlobalStyle"
];

export const DEFAULT_STYLE_ATTRIBUTES = ["style", "css", "xcss", "sx"];

export const DEFAULT_UNSAFE_STYLE_PROPS = [
  "style",
  "css",
  "xcss",
  "sx",
  "UNSAFE_style",
  "UNSAFE_className"
];

export type ResolvedSettings = Required<
  Omit<DesignSystemSettings, "componentModules">
> &
  Pick<DesignSystemSettings, "componentModules">;

export function readSettings(context: RuleContext): ResolvedSettings {
  const settings = (context.settings?.[SETTINGS_KEY] ??
    {}) as DesignSystemSettings;

  return {
    tokenFunctions: settings.tokenFunctions ?? DEFAULT_TOKEN_FUNCTIONS,
    tokenReference: settings.tokenReference ?? "css-var",
    styleCallees: settings.styleCallees ?? DEFAULT_STYLE_CALLEES,
    styleAttributes: settings.styleAttributes ?? DEFAULT_STYLE_ATTRIBUTES,
    unsafeStyleProps: settings.unsafeStyleProps ?? DEFAULT_UNSAFE_STYLE_PROPS,
    componentModules: settings.componentModules,
    bannedImports: settings.bannedImports ?? {}
  };
}
