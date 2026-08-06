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
import type { Tokens } from "@razorwind/core/schema";

/**
 * A flattened design token ready for Zed theme mapping.
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
}

/**
 * Zed syntax highlight style entry.
 *
 * @see https://zed.dev/schema/themes/v0.2.0.json
 */
export interface ZedSyntaxStyle {
  color?: string | null;
  font_style?: string | null;
  font_weight?: number | null;
}

/**
 * Collaborative player cursor colors in a Zed theme variant.
 */
export interface ZedPlayerColors {
  cursor?: string;
  background?: string;
  selection?: string;
}

/**
 * One appearance variant inside a Zed theme collection document.
 *
 * `style` holds UI color keys, optional `syntax` map, and optional `players`.
 *
 * @see https://zed.dev/schema/themes/v0.2.0.json
 */
export interface ZedThemeVariant {
  /** Theme label shown in Zed's theme picker. */
  name: string;
  appearance: "dark" | "light";
  style: Record<string, unknown>;
}

/**
 * Zed theme collection document (`themes/*.json`).
 *
 * Matches the format used by official Zed extensions such as
 * [Dracula for Zed](https://draculatheme.com/zed).
 *
 * @see https://zed.dev/schema/themes/v0.2.0.json
 */
export interface ZedTheme {
  /** Collection name — also used for the theme file slug when omitted. */
  name: string;
  /** JSON schema URL written to `$schema`. */
  $schema?: string;
  author?: string;
  themes: ZedThemeVariant[];
}

/**
 * Map extracted design tokens to one or more Zed theme collection documents.
 *
 * Return a single collection, an array, or a record keyed by collection id.
 */
export type GenerateZedTheme = (
  tokens: Tokens | Record<string, Tokens>
) => ZedTheme | ZedTheme[] | Record<string, ZedTheme>;

/**
 * Options for the Razorwind Zed theme extension generator.
 *
 * @see https://draculatheme.com/zed
 */
export interface ZedPluginOptions {
  /**
   * Directory (relative to the execution cwd) for the generated extension
   * package.
   *
   * @defaultValue `"zed-extension"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Zed theme collection JSON document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateZedTheme;

  /**
   * Extension id written to `extension.toml`.
   *
   * Must be a lowercase slug (no scopes).
   */
  id: string;

  /**
   * Human-readable extension name. Defaults to a title-cased {@link id}.
   */
  name?: string;

  /**
   * Extension version (semver).
   *
   * @defaultValue `"0.0.1"`
   */
  version?: string;

  /**
   * `extension.toml` schema version.
   *
   * @defaultValue `1`
   */
  schemaVersion?: number;

  /**
   * Extension authors for `extension.toml`.
   *
   * @example `["Jane Doe <jane@example.com>"]`
   */
  authors?: string[];

  /** Extension short description. */
  description?: string;

  /** Source repository URL for `extension.toml`. */
  repository?: string;

  /**
   * Default `$schema` for emitted theme JSON when {@link ZedTheme.$schema} is
   * omitted.
   *
   * @defaultValue `"https://zed.dev/schema/themes/v0.2.0.json"`
   */
  themeSchema?: string;

  /**
   * Extension README body. When omitted, a minimal overview is generated from
   * contributed themes.
   */
  readme?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Zed install steps
   * are written (extensions store + manual copy to `~/.config/zed/themes`).
   *
   * @see https://draculatheme.com/zed
   */
  installGuide?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];
}
