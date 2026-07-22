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

import { PRESET_BASES } from "shadcn/preset";

export function parsePresetStyle(style: string | undefined) {
  const base = style
    ? PRESET_BASES.find(base => style.startsWith(`${base}-`))
    : undefined;

  return {
    base,
    style: base ? style?.slice(base.length + 1) : style
  };
}
