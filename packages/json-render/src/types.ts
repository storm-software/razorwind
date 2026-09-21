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

import type { PromptOptions } from "@json-render/core";
import type { Component } from "@razorwind/core/schema";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Primitive prop kinds that can be emitted as portable Zod source. */
export type JsonRenderPropType = "string" | "number" | "boolean" | "unknown";

/** Serializable prop schema used by generated json-render catalogs. */
export interface JsonRenderPropDefinition {
  type: JsonRenderPropType;
  /** Allowed string values. When present, this takes precedence over `type`. */
  enum?: readonly string[];
  /** Whether the property is required. Defaults to `true`. */
  required?: boolean;
  /** Whether the property accepts `null`. Defaults to `false`. */
  nullable?: boolean;
  /** Description preserved on the emitted Zod prop schema. */
  description?: string;
}

/** Portable component definition layered over extracted component metadata. */
export interface JsonRenderComponentDefinition {
  /** Prop schemas. Omit to accept arbitrary props for extracted-only metadata. */
  props?: Record<string, JsonRenderPropDefinition>;
  /** `default` represents ordinary children; other names become named slots. */
  slots?: string[];
  /** Overrides the extracted component description. */
  description?: string;
  /** Example props surfaced in json-render's generated prompt. */
  example?: JsonObject;
}

/** Portable action definition for inclusion in the generated catalog. */
export interface JsonRenderActionDefinition {
  description: string;
  /** Action parameter schema. Omit to accept arbitrary parameters. */
  params?: Record<string, JsonRenderPropDefinition>;
}

export interface JsonRenderPluginOptions {
  /** Output directory relative to the generation cwd. @defaultValue `"json-render"` */
  outputPath?: string;
  /** Customize, enrich, or omit an extracted component. */
  mapComponent?: (
    component: Component,
    key: string
  ) => JsonRenderComponentDefinition | false | undefined;
  /** Actions exposed to generated json-render specs. */
  actions?: Record<string, JsonRenderActionDefinition>;
  /** Options passed to `catalog.prompt()`. */
  prompt?: PromptOptions;
  /** Reject unknown fixed-shape fields in the generated JSON Schema. @defaultValue `true` */
  strict?: boolean;
  /** Override the generated INSTALL.md body. */
  installGuide?: string;
}
