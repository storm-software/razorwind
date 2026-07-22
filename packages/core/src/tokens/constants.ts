/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

/** Style Dictionary parser hook names registered by Windie. */
export const WINDIE_PARSERS = [
  "windie-json",
  "windie-yaml",
  "windie-toml",
  "windie-css"
] as const;

export type WindieParserName = (typeof WINDIE_PARSERS)[number];

/** File extensions treated as design-token sources. */
export const TOKEN_FILE_EXTENSIONS = [
  "json",
  "json5",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "mts",
  "cts"
] as const;

const EXT_GLOB = TOKEN_FILE_EXTENSIONS.join(",");

/**
 * Candidate paths checked when `tokensPath` is omitted.
 * First existing file or directory wins.
 */
export const DEFAULT_TOKEN_PATH_CANDIDATES = [
  "tokens.json",
  "tokens.json5",
  "tokens.jsonc",
  "tokens.yaml",
  "tokens.yml",
  "tokens.toml",
  "tokens.css",
  "design-tokens.json",
  "design-tokens.yaml",
  "design-tokens.yml",
  "tokens",
  "design-tokens",
  "src/tokens",
  "src/design-tokens",
  "packages/tokens",
  "style-dictionary.config.js",
  "style-dictionary.config.mjs",
  "style-dictionary.config.ts",
  "sd.config.js",
  "sd.config.mjs",
  "sd.config.ts"
] as const;

/** Glob appended when a tokens directory is resolved. */
export const TOKEN_DIRECTORY_GLOB = `**/*.{${EXT_GLOB}}`;

/** Theme-like basename patterns used to split multi-file sources into a record. */
export const THEME_BASENAME_PATTERN =
  /^(light|dark|dim|high-contrast|hc|default|base|theme)([._-].+)?$/i;

/** Path segment hints used when inferring `$type`. */
export const TYPE_PATH_HINTS: Record<string, string> = {
  color: "color",
  colours: "color",
  colors: "color",
  colour: "color",
  palette: "color",
  bg: "color",
  background: "color",
  foreground: "color",
  fg: "color",
  border: "color",
  fill: "color",
  stroke: "color",
  spacing: "dimension",
  space: "dimension",
  size: "dimension",
  sizes: "dimension",
  sizing: "dimension",
  gap: "dimension",
  radius: "dimension",
  radii: "dimension",
  rounded: "dimension",
  width: "dimension",
  height: "dimension",
  dimension: "dimension",
  dimensions: "dimension",
  duration: "duration",
  durations: "duration",
  time: "duration",
  delay: "duration",
  animation: "duration",
  motion: "duration",
  transition: "duration",
  font: "fontFamily",
  fonts: "fontFamily",
  fontfamily: "fontFamily",
  "font-family": "fontFamily",
  typeface: "fontFamily",
  fontweight: "fontWeight",
  "font-weight": "fontWeight",
  weight: "fontWeight",
  opacity: "number",
  opacities: "number",
  zindex: "number",
  "z-index": "number",
  lineheight: "number",
  "line-height": "number",
  letterspacing: "dimension",
  "letter-spacing": "dimension",
  shadow: "shadow",
  shadows: "shadow",
  elevation: "shadow",
  gradient: "gradient",
  gradients: "gradient",
  typography: "typography",
  text: "typography",
  cubicbezier: "cubicBezier",
  easing: "cubicBezier",
  ease: "cubicBezier"
};
