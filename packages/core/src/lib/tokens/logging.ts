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

import { logVerbosityLevels } from "style-dictionary/enums";
import type { LogConfig } from "style-dictionary/types";

/**
 * Style Dictionary constructor log overrides.
 *
 * When `verbose` is true, sets `verbosity` to `"verbose"` — same override the
 * Style Dictionary CLI `--verbose` flag applies. When false or omitted, leave
 * verbosity unset so config `log.verbosity` (or Style Dictionary defaults)
 * still apply.
 *
 * @see https://styledictionary.com/reference/logging/
 */
export function styleDictionaryLogOptions(verbose?: boolean): {
  verbosity?: LogConfig["verbosity"];
} {
  if (!verbose) {
    return {};
  }

  return { verbosity: logVerbosityLevels.verbose };
}
