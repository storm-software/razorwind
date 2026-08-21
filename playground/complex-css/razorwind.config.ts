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

import { defineConfig } from "@razorwind/core";
import type { Tokens } from "@razorwind/core/schema";
import { flattenTokens } from "@razorwind/core/utils";
import css from "@razorwind/css/extract";
import designMd from "@razorwind/design-md/generate";
import tailwindcss from "@razorwind/tailwindcss/generate";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const generated = join(root, "generated");

function cssValue(
  tokens: Tokens | Record<string, Tokens>,
  path: string,
  fallback: string
): string {
  return (
    flattenTokens(tokens).find(token => token.path === path)?.cssValue ??
    fallback
  );
}

export default defineConfig({
  name: "razorwind-playground",
  title: "Razorwind Playground",
  description:
    "Fixture design tokens used to exercise Razorwind generator plugins.",
  fonts: {
    inter: {
      name: "inter",
      title: "Inter",
      source: "google",
      family: "Inter",
      role: "sans",
      weights: [400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      display: "swap"
    }
  },
  plugins: [
    css({
      cssPath: join(root, "sample.css")
    }),
    tailwindcss({
      cssPath: join(generated, "app.css")
    }),
    designMd({
      outputPath: join(generated, "DESIGN.md"),
      name: "Razorwind Playground",
      description:
        "Fixture design tokens used to exercise Razorwind generator plugins."
    })
  ]
});
