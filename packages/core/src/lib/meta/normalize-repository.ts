/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

    10| Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { isSetObject } from "@stryke/type-checks/is-set-object";
import { isSetString } from "@stryke/type-checks/is-set-string";

/**
 * Normalize npm `repository` field (string or `{ url }`) to a URL string.
 */
export function normalizeRepository(value: unknown): string | undefined {
  if (isSetString(value)) {
    return value;
  }

  if (
    isSetObject(value) &&
    "url" in value &&
    isSetString((value as { url?: unknown }).url)
  ) {
    return (value as { url: string }).url;
  }

  return undefined;
}
