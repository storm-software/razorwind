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

import type { TokenType } from "@power-plant/dtcg-schema";

export interface DesignMdExtractPluginOptions {
  /**
   * The path to the DESIGN.md file.
   *
   * @default "DESIGN.md"
   */
  path?: string;
}

export interface DesignMdGeneratePluginOptions {
  /**
   * Output file path (relative to the execution cwd).
   *
   * @default "DESIGN.md"
   */
  outputPath?: string;

  /**
   * Design system name written to the YAML front matter.
   *
   * @defaultValue `"Razorwind Design System"`
   */
  name?: string;

  /**
   * Short design system description written to the YAML front matter.
   */
  description?: string;

  /**
   * DESIGN.md spec version written to the YAML front matter.
   *
   * @defaultValue `"alpha"`
   */
  version?: string;

  /**
   * Prose used for the `## Overview` section. When omitted, a summary is
   * generated from the extracted tokens.
   */
  overview?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, DESIGN.md wiring
   * steps are generated for the output file.
   */
  installGuide?: string;
}

/**
 * A flattened design token ready for DESIGN.md extraction.
 */
export interface FlatToken {
  /** Dot-separated token path (e.g. `color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: TokenType | string;
  /** Raw `$value` from the token document. */
  value: unknown;
  /** CSS-friendly string form of {@link value}. */
  cssValue: string;
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
  /**
   * True when an ancestor group is marked `palette: true` (or `$palette` /
   * `$type: "palette"`).
   */
  palette?: boolean;
  /**
   * True when an ancestor group is marked `primitive: true` (or `$primitive` /
   * `$type: "primitive"`).
   */
  primitive?: boolean;
}

/**
 * A DESIGN.md typography token
 * (https://github.com/google-labs-code/design.md — Token Types).
 */
export interface TypographyToken {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
}

/**
 * A DESIGN.md component token — a map of valid component properties
 * (`backgroundColor`, `textColor`, `typography`, `rounded`, `padding`,
 * `size`, `height`, `width`) to values or `{token.references}`.
 */
export type ComponentToken = Record<string, string>;

/**
 * Intermediate representation of a DESIGN.md document, extracted from the
 * Razorwind schema before rendering.
 */
export interface DesignMdDocument {
  name?: string;
  description?: string;
  version?: string;
  colors: Record<string, string>;
  /** Prose descriptions keyed by color token name. */
  colorDescriptions: Record<string, string>;
  typography: Record<string, TypographyToken>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, ComponentToken>;
}
