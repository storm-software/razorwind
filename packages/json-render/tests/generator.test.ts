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

import { describe, expect, it } from "vitest";
import { z } from "zod";

function content(document: {
  chunks?: Array<{ content?: string }>;
}): string {
  return (document.chunks ?? []).map(chunk => chunk.content ?? "").join("");
}

const spec = {
  name: "acme",
  title: "Acme Design System",
  description: "Reusable Acme UI components.",
  tokens: {},
  icons: {},
  fonts: {},
  components: {
    button: {
      name: "Button",
      title: "Button",
      description: "Triggers an operation.",
      type: "ui" as const,
      usage: [
        {
          path: "usage/basic.tsx",
          content: '<Button label="Save" />',
          language: "tsx" as const
        }
      ]
    },
    card: {
      name: "Card",
      title: "Card",
      description: "Groups related content.",
      type: "component" as const
    }
  }
};

describe("json-render plugin", () => {
  it("provides a Razorwind generator plugin", async () => {
    const jsonRender = await import("../src/index");

    expect(jsonRender.default).toEqual(expect.any(Function));

    const plugin = jsonRender.default();
    expect(plugin.name).toBe("json-render:generate");
    expect(plugin.themeGeneration).toBe("combined");
    expect(plugin.generate).toEqual(expect.any(Function));
  });

  it("creates a catalog from extracted components and typed overrides", async () => {
    const jsonRender = await import("../src/index");

    expect(jsonRender.createJsonRenderCatalog).toEqual(expect.any(Function));

    const catalog = jsonRender.createJsonRenderCatalog(spec, {
      mapComponent: component =>
        component.name === "Button"
          ? {
              props: {
                label: { type: "string" },
                disabled: { type: "boolean", required: false }
              },
              slots: [],
              example: { label: "Save" }
            }
          : { slots: ["default"] },
      actions: {
        submit: {
          description: "Submit the current form.",
          params: { formId: { type: "string" } }
        }
      }
    });

    expect(catalog.componentNames).toEqual(["Button", "Card"]);
    expect(catalog.actionNames).toEqual(["submit"]);
    expect(catalog.data.components.Button!.description).toBe(
      "Triggers an operation."
    );
    expect(catalog.data.components.Card!.slots).toEqual(["default"]);
    expect(
      catalog.validate({
        root: "button",
        elements: {
          button: {
            type: "Button",
            props: { label: "Save" },
            children: []
          }
        }
      }).success
    ).toBe(true);
    expect(catalog.prompt()).toContain("Button");
    expect(catalog.prompt()).toContain("Submit the current form.");
  });

  it("generates an executable catalog and AI integration artifacts", async () => {
    const jsonRender = await import("../src/index");
    const plugin = jsonRender.default({
      outputPath: "generated/json-render",
      prompt: {
        customRules: ["Prefer Card for grouped content."]
      },
      mapComponent: component =>
        component.name === "Button"
          ? {
              props: {
                label: {
                  type: "string",
                  description: "Visible button label."
                },
                tone: {
                  type: "string",
                  enum: ["primary", "secondary"],
                  required: false
                }
              },
              example: { label: "Save", tone: "primary" }
            }
          : { slots: ["default"] },
      actions: {
        submit: {
          description: "Submit the current form.",
          params: { formId: { type: "string" } }
        }
      }
    });

    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents).sort()).toEqual([
      "generated/json-render/INSTALL.md",
      "generated/json-render/catalog.prompt.txt",
      "generated/json-render/catalog.schema.json",
      "generated/json-render/catalog.ts"
    ]);

    const schema = JSON.parse(
      content(documents["generated/json-render/catalog.schema.json"]!)
    ) as { properties?: Record<string, unknown> };
    expect(schema.properties).toHaveProperty("root");
    expect(schema.properties).toHaveProperty("elements");
    expect(
      z.fromJSONSchema(schema).safeParse({
        root: "button",
        elements: {
          button: {
            type: "Button",
            props: { label: { $state: "/label" }, tone: "primary" },
            children: [],
            on: {
              press: {
                action: "submit",
                params: { formId: { $state: "/formId" } },
                preventDefault: true,
                confirm: { title: "Save", message: "Save this profile?" },
                onSuccess: { set: { "/saved": true } }
              }
            }
          }
        },
        state: { label: "Save", formId: "profile" }
      }).success
    ).toBe(true);
    expect(
      z.fromJSONSchema(schema).safeParse({
        root: "button",
        elements: {
          button: {
            type: "Button",
            props: { label: "Save" },
            children: [],
            on: { press: { action: "submit" } }
          }
        }
      }).success
    ).toBe(false);

    const prompt = content(
      documents["generated/json-render/catalog.prompt.txt"]!
    );
    expect(prompt).toContain("Prefer Card for grouped content.");

    const source = content(documents["generated/json-render/catalog.ts"]!);
    expect(source).toContain('import { defineCatalog } from "@json-render/core"');
    expect(source).toContain('import { schema } from "@json-render/react/schema"');
    expect(source).toContain("export const catalog = defineCatalog(schema");
    expect(source).toContain(
      '"label": z.string().describe("Visible button label.")'
    );
    expect(source).toMatch(
      /"tone": z\.enum\(\["primary",\s*"secondary"\]\)\.optional\(\)/
    );
    expect(source).toContain("export default catalog");

    const install = content(documents["generated/json-render/INSTALL.md"]!);
    expect(install).toContain("@json-render/react");
    expect(install).toContain("catalog.prompt.txt");
    expect(install).toContain("catalog.schema.json");
  });

  it("rejects duplicate extracted component names", async () => {
    const { createJsonRenderCatalog } = await import("../src/index");

    expect(() =>
      createJsonRenderCatalog({
        ...spec,
        components: {
          first: { name: "Button", title: "First", type: "ui" },
          second: { name: "Button", title: "Second", type: "ui" }
        }
      })
    ).toThrow('Duplicate json-render component name "Button"');
  });

  it("maps each extracted component once per generation", async () => {
    const { generateJsonRender } = await import("../src/index");
    let calls = 0;

    generateJsonRender(spec, {
      mapComponent: () => {
        calls += 1;
        return {};
      }
    });

    expect(calls).toBe(2);
  });

  it("preserves reserved component names as own catalog properties", async () => {
    const { createJsonRenderCatalog, renderCatalogSource } = await import(
      "../src/index"
    );
    const reservedSpec = {
      ...spec,
      components: Object.fromEntries([
        ["reserved", { name: "__proto__", title: "Reserved", type: "ui" }]
      ])
    };

    const catalog = createJsonRenderCatalog(reservedSpec);

    expect(catalog.componentNames).toEqual(["__proto__"]);
    expect(Object.hasOwn(catalog.data.components, "__proto__")).toBe(true);
    expect(renderCatalogSource(reservedSpec)).toContain('"__proto__": {');
  });

  it("rejects examples that cannot be emitted as JSON", async () => {
    const { renderCatalogSource } = await import("../src/index");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() =>
      renderCatalogSource(spec, {
        mapComponent: component =>
          component.name === "Button" ? { example: cyclic as never } : {}
      })
    ).toThrow('Component "Button" example must be JSON-serializable');
  });

  it("rejects actions that shadow json-render built-ins", async () => {
    const { createJsonRenderCatalog } = await import("../src/index");

    expect(() =>
      createJsonRenderCatalog(spec, {
        actions: {
          setState: { description: "A conflicting action." }
        }
      })
    ).toThrow('Action name "setState" is reserved by json-render');
  });
});
