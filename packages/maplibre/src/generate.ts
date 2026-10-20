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

import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import type { GeneratorFunctionResult } from "@power-plant/core";
import type { Schema } from "@razorwind/core/schema";
import {
  createDocument,
  isObject,
  slugifyThemeName
} from "@razorwind/core/utils";
import { join } from "node:path";
import { renderInstallMd } from "./install";
import type { MapLibrePluginOptions, MapLibreStyle } from "./types";

const PLUGIN_META = { name: "razorwind-maplibre" } as const;

function isStyle(value: unknown): value is MapLibreStyle {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

/** Normalize a single style, list, or keyed style record. */
export function normalizeStyles(
  result: MapLibreStyle | MapLibreStyle[] | Record<string, StyleSpecification>
): MapLibreStyle[] {
  if (Array.isArray(result)) {
    return result.map((style, index) => {
      if (!isStyle(style)) {
        throw new TypeError(
          `@razorwind/maplibre mapTheme()[${index}] must be a MapLibre style with name`
        );
      }

      return style;
    });
  }

  if (isStyle(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/maplibre mapTheme() must return a style, style array, or style record"
    );
  }

  return Object.entries(result).map(([key, style]) => {
    if (
      !isObject(style) ||
      style.version !== 8 ||
      !isObject(style.sources) ||
      !Array.isArray(style.layers)
    ) {
      throw new TypeError(
        `@razorwind/maplibre mapTheme()["${key}"] must be a complete MapLibre style`
      );
    }

    return {
      ...style,
      name:
        typeof style.name === "string" && style.name.trim() ? style.name : key
    };
  });
}

/** Serialize and validate an entire MapLibre style without changing its fields. */
export function renderStyleJson(style: MapLibreStyle): string {
  const errors = validateStyleMin(style);
  if (errors.length > 0) {
    throw new TypeError(
      `@razorwind/maplibre invalid MapLibre style "${style.name}":\n${errors.map(String).join("\n")}`
    );
  }

  return `${JSON.stringify(style, null, 2)}\n`;
}

/** Generate MapLibre style JSON and setup instructions from Razorwind tokens. */
export function generateMapLibreStyle(
  spec: Schema,
  options: MapLibrePluginOptions
): GeneratorFunctionResult<Schema, MapLibrePluginOptions> {
  if (!options?.mapTheme) {
    throw new Error("@razorwind/maplibre requires options.mapTheme");
  }

  const styles = normalizeStyles(options.mapTheme(spec.tokens));
  if (styles.length === 0) {
    throw new Error("@razorwind/maplibre mapTheme() returned no styles");
  }

  const outputPath = options.outputPath ?? "maplibre-styles";
  const documents: GeneratorFunctionResult<Schema, MapLibrePluginOptions> = {};
  const usedNames = new Set<string>();
  const entries: Array<{ name: string; fileName: string }> = [];

  for (const style of styles) {
    const content = renderStyleJson(style);
    const baseName = slugifyThemeName(style.name);

    let fileName = `${baseName}.json`;
    let suffix = 2;
    while (usedNames.has(fileName)) {
      fileName = `${baseName}-${suffix}.json`;
      suffix += 1;
    }
    usedNames.add(fileName);

    const path = join(outputPath, fileName);
    documents[path] = createDocument<Schema, MapLibrePluginOptions>(
      path,
      content,
      PLUGIN_META,
      undefined,
      "json"
    );

    entries.push({ name: style.name, fileName });
  }

  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = createDocument<Schema, MapLibrePluginOptions>(
    installPath,
    options.installGuide ?? renderInstallMd(entries),
    PLUGIN_META,
    undefined,
    "markdown"
  );
  return documents;
}
