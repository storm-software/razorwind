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

/** Options for the Razorwind llms.txt documentation generator. */
export interface LlmsPluginOptions {
  /** Absolute HTTP(S) base URL for generated local font asset references. */
  fontAssetBaseUrl?: string;

  /** Directory relative to the generation cwd. Defaults to the cwd. */
  outputPath?: string;
  /** Design-system title. Overrides the schema title and name. */
  title?: string;
  /** Short blockquote summary. Overrides the schema description. */
  summary?: string;
  /** Markdown placed after the summary and before link sections. */
  details?: string;
  /** Deployment URL used to make companion links absolute. */
  baseUrl?: string;
}

/** Options shared by the companion document renderers. */
export interface LlmsRenderOptions {
  /** Absolute HTTP(S) base URL for rendered local font asset references. */
  fontAssetBaseUrl?: string;

  /**
   * Absolute directory the documents are written to. Absolute schema file
   * paths are rendered relative to it.
   */
  rootDir?: string;
}

/** The six rendered llms.txt documents before generator wrapping. */
export interface LlmsDocumentSet {
  index: string;
  tokens: string;
  components: string;
  icons: string;
  fonts: string;
  guidelines: string;
}
