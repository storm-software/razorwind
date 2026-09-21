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

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import type { Schema } from "@razorwind/core/schema";
import { z } from "zod";
import type {
  JsonRenderActionDefinition,
  JsonRenderComponentDefinition,
  JsonRenderPluginOptions,
  JsonRenderPropDefinition
} from "./types";

export interface ResolvedJsonRenderComponent extends JsonRenderComponentDefinition {
  name: string;
  description: string;
  slots: string[];
}

export interface ResolvedJsonRenderCatalog {
  components: ResolvedJsonRenderComponent[];
  actions: Record<string, JsonRenderActionDefinition>;
}

export const JSON_RENDER_BUILT_IN_ACTIONS = [
  "setState",
  "pushState",
  "removeState",
  "validateForm"
] as const;

function assertJsonValue(value: unknown, seen = new WeakSet<object>()): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError("Value is not JSON-serializable.");
  }
  if (seen.has(value)) {
    throw new TypeError("Cyclic value is not JSON-serializable.");
  }

  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach(item => assertJsonValue(item, seen));
  } else {
    Object.values(value).forEach(item => assertJsonValue(item, seen));
  }
  seen.delete(value);
}

function createPropSchema(definition: JsonRenderPropDefinition) {
  let prop: z.ZodType =
    definition.enum && definition.enum.length > 0
      ? z.enum(definition.enum as [string, ...string[]])
      : definition.type === "string"
        ? z.string()
        : definition.type === "number"
          ? z.number()
          : definition.type === "boolean"
            ? z.boolean()
            : z.unknown();

  if (definition.description) {
    prop = prop.describe(definition.description);
  }
  if (definition.nullable) {
    prop = prop.nullable();
  }
  if (definition.required === false) {
    prop = prop.optional();
  }

  return prop;
}

export function createPropsSchema(
  definitions?: Record<string, JsonRenderPropDefinition>
) {
  if (definitions === undefined) {
    return z.object({}).catchall(z.unknown());
  }

  return z.object(
    Object.fromEntries(
      Object.entries(definitions).map(([name, definition]) => [
        name,
        createPropSchema(definition)
      ])
    )
  );
}

export function resolveCatalogDefinitions(
  spec: Schema,
  options: JsonRenderPluginOptions = {}
): ResolvedJsonRenderCatalog {
  const components: ResolvedJsonRenderComponent[] = [];
  const componentNames = new Set<string>();

  for (const [key, component] of Object.entries(spec.components)) {
    const mapped = options.mapComponent?.(component, key);
    if (mapped === false) {
      continue;
    }

    const definition: JsonRenderComponentDefinition = mapped ?? {};
    const name = component.name || key;
    if (componentNames.has(name)) {
      throw new Error(`Duplicate json-render component name "${name}".`);
    }
    componentNames.add(name);
    if (definition.example) {
      try {
        assertJsonValue(definition.example);
      } catch {
        throw new TypeError(
          `Component "${name}" example must be JSON-serializable.`
        );
      }
    }

    components.push({
      ...definition,
      name,
      slots: definition.slots ?? [],
      description:
        definition.description ??
        component.description ??
        component.title ??
        component.name
    });
  }

  const actions = options.actions ?? {};
  for (const name of Object.keys(actions)) {
    if ((JSON_RENDER_BUILT_IN_ACTIONS as readonly string[]).includes(name)) {
      throw new Error(`Action name "${name}" is reserved by json-render.`);
    }
  }

  return { components, actions };
}

/** Create an executable json-render catalog from an extracted Razorwind schema. */
export function createCatalogFromDefinitions(
  definitions: ResolvedJsonRenderCatalog
) {
  const components = Object.fromEntries(
    definitions.components.map(definition => [
      definition.name,
      {
        props: createPropsSchema(definition.props),
        slots: definition.slots,
        description: definition.description,
        ...(definition.example ? { example: definition.example } : {})
      }
    ])
  );

  const actions = Object.fromEntries(
    Object.entries(definitions.actions).map(([name, action]) => [
      name,
      {
        params: createPropsSchema(action.params),
        description: action.description
      }
    ])
  );

  return defineCatalog(schema, { components, actions });
}

/** Create an executable json-render catalog from an extracted Razorwind schema. */
export function createJsonRenderCatalog(
  spec: Schema,
  options: JsonRenderPluginOptions = {}
) {
  return createCatalogFromDefinitions(resolveCatalogDefinitions(spec, options));
}
