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

import type { GeneratedDocument } from "@power-plant/core";
import {
  copyFontFiles,
  isEmptyFonts,
  prependFontCss
} from "@razorwind/core/lib/fonts";
import { definePlugin } from "@razorwind/core/plugin";
import type { Fonts, Schema } from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import styleDictionary from "@razorwind/style-dictionary/generate";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { CssGeneratePluginOptions } from "./types";

export type { CssGeneratePluginOptions } from "./types";

const DEFAULT_OUTPUT_PATH = "src/styles.css";

function documentContent(document: GeneratedDocument | undefined): string {
  return (document?.chunks ?? []).map(chunk => chunk.content ?? "").join("");
}

async function applyFontsToCssDocuments(
  documents: Record<string, GeneratedDocument>,
  fonts: Fonts | undefined,
  outputPath: string,
  cwd: string
): Promise<Record<string, GeneratedDocument>> {
  if (isEmptyFonts(fonts)) {
    return documents;
  }

  const cssPath =
    documents[outputPath] != null
      ? outputPath
      : (Object.keys(documents).find(path => path.endsWith(".css")) ??
        outputPath);
  const existing = documents[cssPath];
  const combined = prependFontCss(documentContent(existing), fonts, {
    urlPrefix: "./fonts/"
  });

  const fontsDir = join(
    dirname(isAbsolute(cssPath) ? cssPath : resolve(cwd, cssPath)),
    "fonts"
  );
  await copyFontFiles(fonts, fontsDir);

  return {
    ...documents,
    [cssPath]: createDocument<Schema, CssGeneratePluginOptions>(
      existing?.path || cssPath,
      combined,
      { name: "css:generate" },
      "css"
    )
  };
}

export default definePlugin(
  (options?: CssGeneratePluginOptions) => {
    const outputPath = options?.outputPath || DEFAULT_OUTPUT_PATH;
    const inner = styleDictionary({
      platforms: {
        css: {
          transformGroup: "css",
          files: [
            {
              destination: outputPath,
              format: "css/variables"
            }
          ]
        }
      }
    });

    return {
      ...inner,
      generate: async (spec, config) => {
        const documents = (await inner.generate?.(spec, config)) ?? {};

        return applyFontsToCssDocuments(
          documents,
          spec.fonts,
          outputPath,
          config.cwd
        );
      }
    };
  },
  {
    name: "css:generate"
  }
);
