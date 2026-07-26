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

import { describe, expect, it } from "vitest";
import tailwindcss from "../src/index";

describe("tailwindcss plugin", () => {
  it("exposes extract / validate / generate hooks", () => {
    expect(tailwindcss.name).toBe("razorwind-tailwindcss");
    expect(typeof tailwindcss.extract).toBe("function");
    expect(typeof tailwindcss.validate).toBe("function");
    expect(typeof tailwindcss.generate).toBe("function");
  });

  it("leaves existing tokens untouched", async () => {
    const tokens = {
      color: { primary: { $type: "color", $value: "#000" } }
    };

    const spec = await tailwindcss.extract(
      { tokens, components: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [tailwindcss],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(spec.tokens).toBe(tokens);
  });
});
