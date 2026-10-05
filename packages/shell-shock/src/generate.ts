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

import type { GeneratorFunctionResult } from "@power-plant/core";
import type { Schema } from "@razorwind/core/schema";
import { createDocument, slugifyThemeName } from "@razorwind/core/utils";
import { joinPaths } from "@stryke/path/join";
import type { InstallThemeMeta } from "./install";
import { renderInstallMd } from "./install";
import { createSnapshot } from "./snapshot";
import { normalizeThemes, resolveTheme, themeName } from "./theme";
import type { ShellShockPluginOptions, ThemeUserConfig } from "./types";

const PLUGIN_META = { name: "razorwind-shell-shock" } as const;

/** File name of the design-system snapshot written next to the theme. */
export const SNAPSHOT_FILE_NAME = "design-system.json";

const getCreateDocument =
  (outputPath: string) =>
  (
    file: string,
    content: string,
    language?: string
  ): GeneratorFunctionResult<Schema, ShellShockPluginOptions>[string] => {
    return createDocument<Schema, ShellShockPluginOptions>(
      joinPaths(outputPath, file),
      content,
      PLUGIN_META,
      (_: string, theme: string) => {
        return joinPaths(outputPath, slugifyThemeName(theme), file);
      },
      language
    );
  };

function assertOptions(
  options: ShellShockPluginOptions
): asserts options is ShellShockPluginOptions & {
  mapTheme: NonNullable<ShellShockPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/shell-shock requires options.mapTheme");
  }
}

/**
 * Serialize a resolved Shell Shock theme config as JSON.
 */
export function renderThemeJson(theme: ThemeUserConfig): string {
  return `${JSON.stringify(theme, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate Shell Shock theme JSON (and a design-system snapshot) from a
 * Razorwind schema.
 */
export function generateShellShockTheme(
  spec: Schema,
  options: ShellShockPluginOptions
): GeneratorFunctionResult<Schema, ShellShockPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "shell-shock";
  const themes = normalizeThemes(options.mapTheme(spec));

  if (themes.length === 0) {
    throw new Error("@razorwind/shell-shock mapTheme() returned no themes");
  }

  const createDoc = getCreateDocument(outputPath);
  const documents: GeneratorFunctionResult<Schema, ShellShockPluginOptions> =
    {};
  const usedNames = new Set<string>();
  const meta: InstallThemeMeta[] = [];

  for (const theme of themes) {
    const name = themeName(theme, spec.theme ?? "theme");
    const base = slugifyThemeName(name) || "theme";
    let fileName = `${base}.theme.json`;
    let suffix = 2;
    while (usedNames.has(fileName)) {
      fileName = `${base}-${suffix++}.theme.json`;
    }
    usedNames.add(fileName);

    documents[joinPaths(outputPath, fileName)] = createDoc(
      fileName,
      renderThemeJson(resolveTheme(theme)),
      "json"
    );
    meta.push({ name, fileName });
  }

  const includeSnapshot = options.snapshot !== false;
  if (includeSnapshot) {
    documents[joinPaths(outputPath, SNAPSHOT_FILE_NAME)] = createDoc(
      SNAPSHOT_FILE_NAME,
      `${JSON.stringify(
        createSnapshot(spec, {
          stripFileContents: options.stripFileContents
        }),
        null,
        2
      )}\n`,
      "json"
    );
  }

  documents[joinPaths(outputPath, "INSTALL.md")] = createDoc(
    "INSTALL.md",
    renderInstallMd(
      spec,
      meta,
      options,
      includeSnapshot ? SNAPSHOT_FILE_NAME : undefined
    ),
    "markdown"
  );

  return documents;
}
