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
const generatedDark = join(generated, "dark");
const generatedLight = join(generated, "light");

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

export default defineConfig([
  {
    name: "razorwind-multi-themed-dark",
    title: "Razorwind Multi-Themed Dark",
    description:
      "Fixture multi-themed design tokens used to exercise Razorwind generator plugins for the dark theme.",
    verbose: true,
    tokensPath: [
      join(root, "tokens/**/tokens.json"),
      join(root, "tokens/**/dark.tokens.json")
    ],
    plugins: [
      css({
        outputPath: join(generatedDark, "styles.css")
      }),
      tailwindcss({
        cssPath: join(generatedDark, "app.css")
      }),
      styleDictionary({
        platforms: {
          css: {
            transformGroup: "css",
            buildPath: `${join(generatedDark, "style-dictionary")}/`,
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
        outputPath: join(generatedDark, "DESIGN.md"),
        name: "Razorwind Playground Dark",
        description:
          "Fixture design tokens used to exercise Razorwind generator plugins."
      }),
      docgen({
        outputPath: join(generatedDark, "docs"),
        title: "Razorwind Playground Dark"
      }),
      storybook({
        outputPath: join(generatedDark, "storybook"),
        mapTheme: tokens => ({
          base: "dark",
          colorPrimary: cssValue(tokens, "color.primary", "#0066cc"),
          colorSecondary: cssValue(tokens, "color.secondary", "#663399"),
          appBg: cssValue(tokens, "color.bg", "#0d0d12"),
          textColor: cssValue(tokens, "color.fg", "#e8e8ed"),
          textMutedColor: cssValue(tokens, "color.muted", "#6a6a7a"),
          appBorderColor: cssValue(tokens, "color.border", "#2a2a38"),
          brandTitle: "Razorwind Playground Dark"
        })
      }),
      shiki({
        outputPath: join(generatedDark, "shiki-themes"),
        mapTheme: tokens => ({
          name: "razorwind-playground-dark",
          displayName: "Razorwind Playground Dark",
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
  },
  {
    name: "razorwind-multi-themed-light",
    title: "Razorwind Multi-Themed Light",
    description:
      "Fixture multi-themed design tokens used to exercise Razorwind generator plugins for the light theme.",
    verbose: true,
    tokensPath: [
      join(root, "tokens/**/tokens.json"),
      join(root, "tokens/**/light.tokens.json")
    ],
    plugins: [
      css({
        outputPath: join(generatedLight, "styles.css")
      }),
      tailwindcss({
        cssPath: join(generatedLight, "app.css")
      }),
      styleDictionary({
        platforms: {
          css: {
            transformGroup: "css",
            buildPath: `${join(generatedLight, "style-dictionary")}/`,
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
        outputPath: join(generatedLight, "DESIGN.md"),
        name: "Razorwind Playground Light",
        description:
          "Fixture design tokens used to exercise Razorwind generator plugins."
      }),
      docgen({
        outputPath: join(generatedLight, "docs"),
        title: "Razorwind Playground Light"
      }),
      storybook({
        outputPath: join(generatedLight, "storybook"),
        mapTheme: tokens => ({
          base: "light",
          colorPrimary: cssValue(tokens, "color.primary", "#0066cc"),
          colorSecondary: cssValue(tokens, "color.secondary", "#663399"),
          appBg: cssValue(tokens, "color.bg", "#0d0d12"),
          textColor: cssValue(tokens, "color.fg", "#e8e8ed"),
          textMutedColor: cssValue(tokens, "color.muted", "#6a6a7a"),
          appBorderColor: cssValue(tokens, "color.border", "#2a2a38"),
          brandTitle: "Razorwind Playground Light"
        })
      }),
      shiki({
        outputPath: join(generatedLight, "shiki-themes"),
        mapTheme: tokens => ({
          name: "razorwind-playground-light",
          displayName: "Razorwind Playground Light",
          type: "light",
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
  }
]);
