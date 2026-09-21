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

import type { Schema } from "@razorwind/core/schema";
import type { ResolvedJsonRenderCatalog } from "./catalog";
import {
  JSON_RENDER_BUILT_IN_ACTIONS,
  resolveCatalogDefinitions
} from "./catalog";
import type {
  JsonRenderPluginOptions,
  JsonRenderPropDefinition
} from "./types";

type JsonSchema = boolean | Record<string, unknown>;

function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[],
  strict: boolean
): JsonSchema {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: !strict
  };
}

function propExpressionSchemas(strict: boolean): JsonSchema[] {
  const unary = (name: string, value: JsonSchema) =>
    objectSchema({ [name]: value }, [name], strict);

  return [
    unary("$state", { type: "string" }),
    unary("$item", { type: "string" }),
    unary("$index", { const: true }),
    unary("$bindState", { type: "string" }),
    unary("$bindItem", { type: "string" }),
    objectSchema(
      { $cond: {}, $then: {}, $else: {} },
      ["$cond", "$then", "$else"],
      strict
    ),
    objectSchema(
      {
        $computed: { type: "string" },
        args: { type: "object", additionalProperties: true }
      },
      ["$computed"],
      strict
    ),
    unary("$template", { type: "string" })
  ];
}

function withExpressions(
  schema: JsonSchema,
  expressions: "action" | "prop" | false,
  strict: boolean
): JsonSchema {
  if (expressions === false || schema === true) {
    return schema;
  }

  const dynamic =
    expressions === "action"
      ? [objectSchema({ $state: { type: "string" } }, ["$state"], strict)]
      : propExpressionSchemas(strict);

  return { anyOf: [schema, ...dynamic] };
}

function propJsonSchema(
  definition: JsonRenderPropDefinition,
  expressions: "action" | "prop" | false,
  strict: boolean
): JsonSchema {
  let schema: Record<string, unknown> =
    definition.enum && definition.enum.length > 0
      ? { type: "string", enum: [...definition.enum] }
      : definition.type === "unknown"
        ? {}
        : { type: definition.type };

  if (definition.nullable) {
    schema = { anyOf: [schema, { type: "null" }] };
  }
  if (definition.description) {
    schema.description = definition.description;
  }

  return withExpressions(schema, expressions, strict);
}

function propsJsonSchema(
  definitions: Record<string, JsonRenderPropDefinition> | undefined,
  strict: boolean,
  expressions: "action" | "prop" | false = "prop"
): JsonSchema {
  if (definitions === undefined) {
    return { type: "object", additionalProperties: true };
  }

  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(definitions).map(([name, definition]) => [
        name,
        propJsonSchema(definition, expressions, strict)
      ])
    ),
    required: Object.entries(definitions)
      .filter(([, definition]) => definition.required !== false)
      .map(([name]) => name),
    additionalProperties: !strict
  };
}

function actionBindingJsonSchema(
  definitions: ResolvedJsonRenderCatalog,
  strict: boolean
): JsonSchema {
  const dynamicParams = {
    type: "object",
    additionalProperties: {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        objectSchema({ $state: { type: "string" } }, ["$state"], strict)
      ]
    }
  };
  const confirm = objectSchema(
    {
      title: { type: "string" },
      message: { type: "string" },
      confirmLabel: { type: "string" },
      cancelLabel: { type: "string" },
      variant: { enum: ["default", "danger"] }
    },
    ["title", "message"],
    strict
  );
  const chainedAction = objectSchema(
    { action: { type: "string" }, params: dynamicParams },
    ["action"],
    strict
  );
  const setHandler = objectSchema(
    { set: { type: "object", additionalProperties: true } },
    ["set"],
    strict
  );
  const onSuccess = {
    oneOf: [
      objectSchema({ navigate: { type: "string" } }, ["navigate"], strict),
      setHandler,
      chainedAction
    ]
  };
  const onError = { oneOf: [setHandler, chainedAction] };
  const bindingProperties = {
    confirm,
    onSuccess,
    onError,
    preventDefault: { type: "boolean" }
  };
  const variants: JsonSchema[] = [
    objectSchema(
      {
        action: { enum: JSON_RENDER_BUILT_IN_ACTIONS },
        params: dynamicParams,
        ...bindingProperties
      },
      ["action"],
      strict
    ),
    ...Object.entries(definitions.actions).map(([name, action]) =>
      objectSchema(
        {
          action: { const: name },
          params: propsJsonSchema(action.params, strict, "action"),
          ...bindingProperties
        },
        [
          "action",
          ...(action.params &&
          Object.values(action.params).some(prop => prop.required !== false)
            ? ["params"]
            : [])
        ],
        strict
      )
    )
  ];

  return { oneOf: variants };
}

/** Create a complete JSON Schema for json-render React specs. */
export function createJsonRenderJsonSchemaFromDefinitions(
  definitions: ResolvedJsonRenderCatalog,
  strict = true
): JsonSchema {
  const actionBinding = actionBindingJsonSchema(definitions, strict);
  const actionMap = {
    type: "object",
    additionalProperties: {
      anyOf: [
        actionBinding,
        { type: "array", items: actionBinding, minItems: 1 }
      ]
    }
  };
  const elementVariants = definitions.components.map(component => ({
    type: "object",
    properties: {
      type: { const: component.name },
      props: propsJsonSchema(component.props, strict),
      children: { type: "array", items: { type: "string" } },
      slots: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: { type: "string" }
        }
      },
      visible: {},
      repeat: {},
      on: actionMap,
      watch: actionMap
    },
    required: ["type", "props", "children"],
    additionalProperties: !strict
  }));

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      root: { type: "string" },
      elements: {
        type: "object",
        additionalProperties:
          elementVariants.length > 0 ? { oneOf: elementVariants } : false
      },
      state: { type: "object", additionalProperties: true }
    },
    required: ["root", "elements"],
    additionalProperties: !strict
  };
}

/** Create a catalog-aware JSON Schema from an extracted Razorwind schema. */
export function createJsonRenderJsonSchema(
  spec: Schema,
  options: JsonRenderPluginOptions = {}
): JsonSchema {
  return createJsonRenderJsonSchemaFromDefinitions(
    resolveCatalogDefinitions(spec, options),
    options.strict ?? true
  );
}
