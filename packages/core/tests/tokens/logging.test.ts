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
import { describe, expect, it } from "vitest";
import { styleDictionaryLogOptions } from "../../src/lib/tokens/logging";

describe("styleDictionaryLogOptions", () => {
  it("leaves verbosity unset when verbose is omitted or false", () => {
    expect(styleDictionaryLogOptions()).toEqual({});
    expect(styleDictionaryLogOptions(false)).toEqual({});
    expect(styleDictionaryLogOptions(undefined)).toEqual({});
  });

  it("sets Style Dictionary verbosity to verbose when verbose is true", () => {
    expect(styleDictionaryLogOptions(true)).toEqual({
      verbosity: logVerbosityLevels.verbose
    });
  });
});
