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
import css from "@razorwind/css/generate";
import designMd from "@razorwind/design-md/generate";
import docgen from "@razorwind/docgen/generate";
import shiki from "@razorwind/shiki";
import storybook from "@razorwind/storybook";
import styleDictionary from "@razorwind/style-dictionary";
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
  name: "razorwind-theme",
  title: "Razorwind Theme",
  description:
    "Fixture design tokens used to exercise Razorwind generator plugins.",
  verbose: true,
  splitThemes: true,
  tokensPath: join(root, "tokens/**/*.json"),
  plugins: [
    css({
      outputPath: join(generated, "styles.css")
    }),
    tailwindcss({
      cssPath: join(generated, "app.css")
    }),
    styleDictionary({
      platforms: {
        css: {
          transformGroup: "css",
          buildPath: `${join(generated, "style-dictionary")}/`,
          files: [
            {
              destination: "variables.css",
              format: "css/variables"
            }
          ]
        }
      }
    }),
    designMd({
      outputPath: join(generated, "DESIGN.md"),
      name: "Razorwind Playground",
      description:
        "Fixture design tokens used to exercise Razorwind generator plugins."
    }),
    docgen({
      outputPath: join(generated, "docs"),
      title: "Razorwind Playground"
    }),
    storybook({
      outputPath: join(generated, "storybook"),
      mapTheme: tokens => ({
        colorPrimary: cssValue(tokens, "color.primary", "#0066cc"),
        colorSecondary: cssValue(tokens, "color.secondary", "#663399"),
        appBg: cssValue(tokens, "color.bg", "#0d0d12"),
        textColor: cssValue(tokens, "color.fg", "#e8e8ed"),
        textMutedColor: cssValue(tokens, "color.muted", "#6a6a7a"),
        appBorderColor: cssValue(tokens, "color.border", "#2a2a38"),
        brandTitle: "Razorwind Playground"
      })
    }),
    shiki({
      outputPath: join(generated, "shiki-themes"),
      mapTheme: tokens => ({
        name: "razorwind-playground",
        displayName: "Razorwind Playground",
        type: "dark",
        bg: cssValue(tokens, "color.bg", "#0d0d12"),
        fg: cssValue(tokens, "color.fg", "#e8e8ed"),
        colors: {
          "editor.background": cssValue(tokens, "color.bg", "#0d0d12"),
          "editor.foreground": cssValue(tokens, "color.fg", "#e8e8ed")
        },
        settings: [
          {
            scope: ["comment"],
            settings: {
              foreground: cssValue(tokens, "color.muted", "#6a6a7a")
            }
          },
          {
            scope: ["string"],
            settings: {
              foreground: cssValue(tokens, "color.accent", "#0066cc")
            }
          },
          {
            scope: ["keyword"],
            settings: {
              foreground: cssValue(tokens, "color.secondary", "#663399")
            }
          }
        ]
      })
    })
  ]
});
