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

import type { GeneratorFunctionResult } from "@power-plant/core";
import { definePlugin } from "@razorwind/core/plugin";
import type { Schema } from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import { join } from "node:path";
import type { ResolvedJsonRenderCatalog } from "./catalog";
import {
  createCatalogFromDefinitions,
  resolveCatalogDefinitions
} from "./catalog";
import { createJsonRenderJsonSchemaFromDefinitions } from "./json-schema";
import type {
  JsonRenderPluginOptions,
  JsonRenderPropDefinition
} from "./types";

const DEFAULT_OUTPUT_PATH = "json-render";

function propertyName(name: string): string {
  return JSON.stringify(name);
}

function renderPropSchema(definition: JsonRenderPropDefinition): string {
  let source =
    definition.enum && definition.enum.length > 0
      ? `z.enum(${JSON.stringify(definition.enum)})`
      : `z.${definition.type}()`;

  if (definition.description) {
    source += `.describe(${JSON.stringify(definition.description)})`;
  }
  if (definition.nullable) {
    source += ".nullable()";
  }
  if (definition.required === false) {
    source += ".optional()";
  }

  return source;
}

function renderPropsSchema(
  definitions?: Record<string, JsonRenderPropDefinition>
): string {
  if (definitions === undefined) {
    return "z.object({}).catchall(z.unknown())";
  }

  const properties = Object.entries(definitions)
    .map(
      ([name, definition]) =>
        `        ${propertyName(name)}: ${renderPropSchema(definition)}`
    )
    .join(",\n");

  return properties ? `z.object({\n${properties}\n      })` : "z.object({})";
}

function renderResolvedCatalogSource(
  definitions: ResolvedJsonRenderCatalog
): string {
  const components = definitions.components
    .map(component => {
      const example = component.example
        ? `,\n      example: ${JSON.stringify(component.example, null, 2)
            .split("\n")
            .join("\n      ")}`
        : "";

      return `    ${propertyName(component.name)}: {
      props: ${renderPropsSchema(component.props)},
      slots: ${JSON.stringify(component.slots)},
      description: ${JSON.stringify(component.description)}${example}
    }`;
    })
    .join(",\n");
  const actions = Object.entries(definitions.actions)
    .map(
      ([name, action]) => `    ${propertyName(name)}: {
      params: ${renderPropsSchema(action.params)},
      description: ${JSON.stringify(action.description)}
    }`
    )
    .join(",\n");

  return `import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
${components}
  },
  actions: {
${actions}
  }
});

export default catalog;
`;
}

/** Render a standalone TypeScript catalog compatible with @json-render/react. */
export function renderCatalogSource(
  spec: Schema,
  options: JsonRenderPluginOptions = {}
): string {
  return renderResolvedCatalogSource(resolveCatalogDefinitions(spec, options));
}

function renderInstallGuide(): string {
  return `# Install the generated json-render catalog

Install the json-render runtime and Zod:

\`\`\`sh
pnpm add @json-render/core @json-render/react zod
\`\`\`

Import \`catalog.ts\` in the application and pair it with a component registry from \`@json-render/react\`. Use \`catalog.prompt.txt\` as the model system prompt, or supply \`catalog.schema.json\` to a provider that supports structured outputs.
`;
}

/** Generate the executable catalog, prompt, JSON Schema, and install guide. */
export function generateJsonRender(
  spec: Schema,
  options: JsonRenderPluginOptions = {}
): GeneratorFunctionResult<Schema, JsonRenderPluginOptions> {
  const outputPath = options.outputPath?.trim() || DEFAULT_OUTPUT_PATH;
  const definitions = resolveCatalogDefinitions(spec, options);
  const catalog = createCatalogFromDefinitions(definitions);
  const artifacts = [
    ["catalog.ts", renderResolvedCatalogSource(definitions), "typescript"],
    [
      "catalog.schema.json",
      `${JSON.stringify(
        createJsonRenderJsonSchemaFromDefinitions(
          definitions,
          options.strict ?? true
        ),
        null,
        2
      )}\n`,
      "json"
    ],
    ["catalog.prompt.txt", `${catalog.prompt(options.prompt)}\n`, "text"],
    ["INSTALL.md", options.installGuide ?? renderInstallGuide(), "markdown"]
  ] as const;

  return Object.fromEntries(
    artifacts.map(([file, contents, language]) => {
      const path = join(outputPath, file);

      return [
        path,
        createDocument<Schema, JsonRenderPluginOptions>(
          path,
          contents,
          { name: "json-render:generate" },
          false,
          language
        )
      ];
    })
  );
}

export default definePlugin((options?: JsonRenderPluginOptions) => ({
  name: "json-render:generate",
  themeGeneration: "combined",
  generate: async spec => generateJsonRender(spec, options ?? {})
}));
