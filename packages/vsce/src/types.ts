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
 * A flattened design token ready for VS Code theme mapping.
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
 * TextMate token color rule for a VS Code theme.
 *
 * @see https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
 */
export interface VsCodeTokenColor {
  name?: string;
  scope?: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

/**
 * VS Code / TextMate color theme document.
 *
 * @see https://code.visualstudio.com/api/extension-guides/color-theme
 */
export interface VsCodeTheme {
  /** Stable theme id used for the theme file name. */
  name: string;
  /** Marketplace / Color Theme picker label. Defaults to {@link name}. */
  displayName?: string;
  /** Theme kind — maps to `contributes.themes[].uiTheme`. */
  type: "light" | "dark" | "hc" | "hcLight";
  colors?: Record<string, string>;
  tokenColors?: VsCodeTokenColor[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<
    string,
    string | { foreground?: string; fontStyle?: string; bold?: boolean }
  >;
}

/**
 * Map extracted design tokens to one or more VS Code theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateVsCodeTheme = (
  tokens: Tokens | Record<string, Tokens>
) => VsCodeTheme | VsCodeTheme[] | Record<string, VsCodeTheme>;

/**
 * package.json `author` field shape.
 */
export type VscePackageAuthor =
  | string
  | {
      name: string;
      email?: string;
      url?: string;
    };

/**
 * Options for the Razorwind VS Code extension (theme) generator.
 *
 * @see https://code.visualstudio.com/api/extension-guides/color-theme
 * @see https://github.com/pierrecomputer/pierre/tree/main/packages/theme/scripts
 */
export interface VscePluginOptions {
  /**
   * Directory (relative to the execution cwd) for the generated extension
   * package.
   *
   * @defaultValue `"vscode-extension"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to VS Code theme JSON document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateVsCodeTheme;

  /**
   * Unscoped Marketplace extension id (`contributes` / VSIX name).
   * Must not include an npm scope.
   */
  name: string;

  /** Marketplace display name. Defaults to a title-cased {@link name}. */
  displayName?: string;

  /** Marketplace short description. */
  description?: string;

  /**
   * Extension version (semver without prerelease tags — vsce rejects them).
   *
   * @defaultValue `"0.0.1"`
   */
  version?: string;

  /** Marketplace publisher id. */
  publisher: string;

  /**
   * Unscoped name written into the VSIX shim when packaging.
   * Defaults to {@link name}.
   */
  extensionName?: string;

  /**
   * @defaultValue `"Apache-2.0"`
   */
  license?: string;

  repository?:
    | string
    | {
        type?: string;
        url?: string;
        directory?: string;
      };

  homepage?: string;

  bugs?:
    | string
    | {
        url?: string;
        email?: string;
      };

  author?: VscePackageAuthor;

  /**
   * Icon path relative to the extension root (e.g. `icon.png`).
   * The file itself is not generated — place it beside the package.
   */
  icon?: string;

  galleryBanner?: {
    color?: string;
    theme?: "dark" | "light";
  };

  /**
   * @defaultValue `["Themes"]`
   */
  categories?: string[];

  keywords?: string[];

  /**
   * @defaultValue `{ vscode: "^1.85.0" }`
   */
  engines?: {
    vscode: string;
  };

  /**
   * Emit pierre-style `scripts/` helpers and `package.json` script entries
   * for packaging / publishing.
   *
   * @defaultValue `true`
   *
   * @see https://github.com/pierrecomputer/pierre/tree/main/packages/theme/scripts
   */
  includeScripts?: boolean;

  /**
   * Marketplace README body. When omitted, a minimal install guide is
   * generated from the contributed themes.
   */
  readme?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Extra fields merged into the generated extension `package.json`
   * (shallow merge; `contributes.themes` / `scripts` from the plugin win).
   */
  packageJson?: Record<string, unknown>;

  /**
   * Override body for generated `INSTALL.md`. When omitted, VS Code extension
   * install steps are generated from contributed themes.
   */
  installGuide?: string;
}
