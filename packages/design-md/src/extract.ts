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

import { useExecution } from "@power-plant/core";
import { definePlugin } from "@razorwind/core/plugin";
import { normalizeTokenTree } from "@razorwind/core/tokens";
import { isObject } from "@razorwind/core/utils";
import { existsSync } from "@stryke/fs/exists";
import { readFile } from "@stryke/fs/read-file";
import { joinPaths } from "@stryke/path/join";
import { isEmptyObject } from "@stryke/type-checks/is-empty-object";
import type { DesignTokens } from "style-dictionary/types";
import { parse as parseYaml } from "yaml";
import type { DesignMdExtractPluginOptions } from "./types";

/**
 * Basename pattern for DESIGN.md spec files
 * (https://github.com/google-labs-code/design.md).
 */
export const DESIGN_MD_FILE_PATTERN = /(?:^|[/\\])design\.md$/i;

/** Candidate workspace paths checked for a DESIGN.md spec file. */
export const DESIGN_MD_PATH_CANDIDATES = [
  "DESIGN.md",
  "design.md",
  "docs/DESIGN.md"
] as const;

/**
 * YAML front matter fenced by `---` at the top of a DESIGN.md file.
 *
 * @see https://github.com/google-labs-code/design.md#the-specification
 */
const FRONT_MATTER_PATTERN = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** DESIGN.md `{path.to.token}` reference. */
const TOKEN_REFERENCE_PATTERN = /^\{[^{}]+\}$/;

/** Top-level front-matter keys that carry metadata rather than tokens. */
const METADATA_KEYS = new Set(["version", "name", "description"]);

/** DESIGN.md typography sub-properties defined by the spec. */
const TYPOGRAPHY_SUB_PROPERTIES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontFeature",
  "fontVariation"
] as const;

/**
 * DESIGN.md component sub-token properties mapped to DTCG `$type`s.
 * Unknown properties are accepted without a `$type` per the spec's consumer
 * behavior rules ("Unknown component property → accept with warning").
 */
const COMPONENT_PROPERTY_TYPES: Record<string, string> = {
  backgroundColor: "color",
  textColor: "color",
  typography: "typography",
  rounded: "dimension",
  padding: "dimension",
  size: "dimension",
  height: "dimension",
  width: "dimension"
};

function isTokenReference(value: unknown): value is string {
  return (
    typeof value === "string" && TOKEN_REFERENCE_PATTERN.test(value.trim())
  );
}

/**
 * Convert a DESIGN.md scalar (Color / Dimension / number / reference) into a
 * DTCG `$value`. Bare numbers in dimension scales are treated as pixels, per
 * the spec's `spacing: <Dimension | number>` rule.
 */
function toDimensionValue(value: unknown): unknown {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
}

function toTypographyValue(
  value: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const property of TYPOGRAPHY_SUB_PROPERTIES) {
    const raw = value[property];
    if (raw !== undefined && raw !== null) {
      result[property] = raw;
    }
  }

  // Unknown typography sub-properties are accepted per the spec.
  for (const [property, raw] of Object.entries(value)) {
    if (
      !(property in result) &&
      raw !== undefined &&
      raw !== null &&
      (typeof raw === "string" || typeof raw === "number")
    ) {
      result[property] = raw;
    }
  }

  return result;
}

function toScaleGroup(
  section: Record<string, unknown>,
  type: string,
  dimension = false
): DesignTokens {
  const group: DesignTokens = {};

  for (const [name, raw] of Object.entries(section)) {
    if (raw === undefined || raw === null) {
      continue;
    }

    group[name] = {
      $type: type,
      $value: isTokenReference(raw)
        ? raw.trim()
        : dimension
          ? toDimensionValue(raw)
          : raw
    };
  }

  return group;
}

function toTypographyGroup(section: Record<string, unknown>): DesignTokens {
  const group: DesignTokens = {};

  for (const [name, raw] of Object.entries(section)) {
    if (isTokenReference(raw)) {
      group[name] = { $type: "typography", $value: raw.trim() };
    } else if (isObject(raw)) {
      group[name] = {
        $type: "typography",
        $value: toTypographyValue(raw)
      };
    }
  }

  return group;
}

function toComponentsGroup(section: Record<string, unknown>): DesignTokens {
  const group: DesignTokens = {};
  for (const [componentName, component] of Object.entries(section)) {
    if (!isObject(component)) {
      continue;
    }

    const componentGroup: DesignTokens = {};
    for (const [property, raw] of Object.entries(component)) {
      if (raw === undefined || raw === null) {
        continue;
      }

      const type = COMPONENT_PROPERTY_TYPES[property];
      componentGroup[property] = {
        ...(type ? { $type: type } : {}),
        $value: isTokenReference(raw)
          ? raw.trim()
          : type === "typography" && isObject(raw)
            ? toTypographyValue(raw)
            : toDimensionValue(raw)
      };
    }

    if (Object.keys(componentGroup).length > 0) {
      group[componentName] = componentGroup;
    }
  }

  return group;
}

/**
 * Extract the YAML front matter object from DESIGN.md contents.
 *
 * @param contents - The raw DESIGN.md file contents.
 * @returns The parsed front matter, or `undefined` when no front matter fence
 * is present.
 */
export function extractDesignMdFrontMatter(
  contents: string
): Record<string, unknown> | undefined {
  const match = FRONT_MATTER_PATTERN.exec(contents);
  if (!match?.[1]) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse DESIGN.md front matter as YAML: ${message}`
    );
  }

  return isObject(parsed) ? parsed : undefined;
}

/**
 * Convert DESIGN.md front-matter tokens (colors, typography, rounded,
 * spacing, components) into a DTCG design-token tree.
 *
 * DESIGN.md `{path.to.token}` references are preserved verbatim — the group
 * names in the emitted tree match the front-matter section names, so the
 * references resolve as DTCG aliases without rewriting.
 *
 * @see https://github.com/google-labs-code/design.md#the-specification
 *
 * @param frontMatter - The parsed DESIGN.md YAML front matter.
 * @returns The equivalent DTCG token tree.
 */
export function designMdToTokens(
  frontMatter: Record<string, unknown>
): DesignTokens {
  const tokens: DesignTokens = {};

  for (const [section, value] of Object.entries(frontMatter)) {
    if (METADATA_KEYS.has(section) || !isObject(value)) {
      continue;
    }

    switch (section) {
      case "colors":
        tokens[section] = toScaleGroup(value, "color");
        break;
      case "typography":
        tokens[section] = toTypographyGroup(value);
        break;
      case "rounded":
      case "spacing":
        tokens[section] = toScaleGroup(value, "dimension", true);
        break;
      case "components":
        tokens[section] = toComponentsGroup(value);
        break;
      default:
        // Custom extension keys stay: accept as a generic token group and let
        // type inference classify the values.
        tokens[section] = value;
        break;
    }
  }

  return normalizeTokenTree(tokens) as DesignTokens;
}

/**
 * Parse DESIGN.md file contents into a DTCG token tree.
 *
 * @param contents - The raw DESIGN.md file contents.
 * @returns The extracted tokens; an empty object when the file has no YAML
 * front matter.
 */
export function parseDesignMdTokens(contents: string): DesignTokens {
  const frontMatter = extractDesignMdFrontMatter(contents);
  if (!frontMatter) {
    return {};
  }

  return designMdToTokens(frontMatter);
}

/**
 * Check whether a path points at a DESIGN.md spec file.
 *
 * @param filePath - The file path to test.
 * @returns True when the basename is `DESIGN.md` (case-insensitive).
 */
export function isDesignMdFile(filePath: string): boolean {
  return DESIGN_MD_FILE_PATTERN.test(filePath);
}

/**
 * Resolve the DESIGN.md file for a workspace, if one exists.
 *
 * @param cwd - The workspace root to search from.
 * @returns The absolute path to the first matching candidate, or `undefined`.
 */
export function resolveDesignMdPath(cwd: string): string | undefined {
  for (const candidate of DESIGN_MD_PATH_CANDIDATES) {
    const absolute = joinPaths(cwd, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }

  return undefined;
}

/**
 * Load DTCG tokens from the DESIGN.md file in a workspace, if present.
 *
 * @param cwd - The workspace root to search from.
 * @returns Parsed tokens, or `undefined` when no DESIGN.md exists.
 */
export async function loadDesignMdTokens(
  cwd: string
): Promise<DesignTokens | undefined> {
  const path = resolveDesignMdPath(cwd);
  if (!path) {
    return undefined;
  }

  return parseDesignMdTokens(await readFile(path));
}

/**
 * Extract design-system specification from DESIGN.md
 *
 * @see https://github.com/google-labs-code/design.md
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import designMd from "@razorwind/design-md/extract";
 *
 * export default defineConfig({
 *   plugins: [designMd()]
 * });
 * ```
 */
export default definePlugin((options: DesignMdExtractPluginOptions = {}) => ({
  name: "design-md:extract",
  parsers: [
    {
      name: "design-md",
      pattern: DESIGN_MD_FILE_PATTERN,
      parser: (contents: string): DesignTokens => parseDesignMdTokens(contents)
    }
  ],
  extract: async spec => {
    if (spec.tokens && !isEmptyObject(spec.tokens)) {
      return spec;
    }

    let path = options.path;
    if (!path) {
      // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
      const { cwd } = useExecution();
      path = resolveDesignMdPath(cwd);
      if (!path) {
        return spec;
      }
    }

    const tokens = parseDesignMdTokens(await readFile(path));
    if (!tokens || isEmptyObject(tokens)) {
      return spec;
    }

    return { ...spec, tokens };
  }
}));
