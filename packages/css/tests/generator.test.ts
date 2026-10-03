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

import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import generate from "../src/generate";

const spec = {
  name: "Acme Design System",
  components: {},
  icons: {},
  fonts: {},
  tokens: {
    color: {
      $type: "color",
      primary: {
        $value: "#0066cc",
        $description: "Brand primary"
      }
    }
  }
} as Schema;

function cssContent(
  documents: Record<string, { chunks?: Array<{ content?: string }> }>,
  path: string
): string {
  return documents[path]?.chunks?.[0]?.content ?? "";
}

describe("css generate plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = generate({});
    expect(plugin.name).toBe("css:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("emits CSS custom properties from tokens", async () => {
    const plugin = generate({ outputPath: "src/styles.css" });
    const documents = await plugin.generate!(spec, {
      cwd: process.cwd()
    } as never);

    const css = cssContent(documents, "src/styles.css");
    expect(css).toContain("--ads-color-primary");
    expect(css).toContain("#0066cc");
  });

  it("uses a custom CSS variable prefix", async () => {
    const plugin = generate({
      outputPath: "src/styles.css",
      prefix: "storm"
    });
    const documents = await plugin.generate!(spec, {
      cwd: process.cwd()
    } as never);

    const css = cssContent(documents, "src/styles.css");
    expect(css).toContain("--storm-color-primary");
    expect(css).not.toContain("--ads-color-primary");
  });

  it("prepends Google Fonts @import when spec.fonts is set", async () => {
    const plugin = generate({ outputPath: "src/styles.css" });
    const documents = await plugin.generate!(
      {
        ...spec,
        fonts: {
          inter: {
            name: "inter",
            title: "Inter",
            source: "google",
            family: "Inter",
            role: "sans",
            weights: [400, 700],
            display: "swap"
          }
        }
      },
      { cwd: process.cwd() } as never
    );

    const css = cssContent(documents, "src/styles.css");
    expect(css).toContain(
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");'
    );
    expect(css).toContain("--ads-color-primary");
  });

  it("uses the configured font asset CDN in local font src URLs", async () => {
    const plugin = generate({ outputPath: "src/styles.css" });
    const documents = await plugin.generate!(
      {
        ...spec,
        fonts: {
          acme: {
            name: "acme",
            title: "Acme Sans",
            source: "local",
            files: [
              {
                path: "/workspace/fonts/Acme Sans.woff2",
                format: "woff2"
              }
            ]
          }
        }
      },
      {
        cwd: process.cwd(),
        fontAssetBaseUrl: "https://cdn.acme.test/fonts"
      } as never
    );

    expect(cssContent(documents, "src/styles.css")).toContain(
      'src: url("https://cdn.acme.test/fonts/Acme%20Sans.woff2") format("woff2");'
    );
  });
});
