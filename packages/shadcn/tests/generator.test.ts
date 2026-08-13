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
import { describe, expect, it } from "vitest";
import extract, {
  registryItemToComponent,
  registryItemsToComponents,
  toDependencyRecord
} from "../src/extract";
import { createRegistryConfig } from "../src/registry/config";
import generate, {
  componentToRegistryItem,
  fromDependencyRecord,
  generateRegistryJson,
  renderRegistryJson
} from "../src/generate";

const components = {
  button: {
    name: "button",
    title: "Button",
    type: "ui" as const,
    category: "primitives",
    tags: ["primitives"],
    description: "A button.",
    dependencies: { "@radix-ui/react-slot": "*" },
    registryDependencies: { utils: "*" },
    files: [
      { path: "ui/button.tsx", type: "ui" as const, content: "export {}" }
    ]
  },
  card: {
    name: "card",
    title: "Card",
    type: "component" as const
  }
} satisfies Schema["components"];

const spec = {
  tokens: {},
  components,
  icons: {}, fonts: {}
} as Schema;

describe("shadcn extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract({});
    expect(plugin.name).toBe("shadcn:extract");
    expect(typeof plugin.extract).toBe("function");
  });

  it("fills schema.components from registry when missing", async () => {
    const plugin = extract({ configFile: process.cwd() });
    const result = await plugin.extract!(
      { tokens: {}, components: {}, icons: {}, fonts: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [plugin],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(result.components).toBeDefined();
    expect(typeof result.components).toBe("object");
  });

  it("leaves existing components untouched", async () => {
    const plugin = extract({});
    const existing = {
      button: {
        name: "button",
        title: "Button",
        type: "ui" as const
      }
    };

    const result = await plugin.extract!(
      { tokens: {}, components: existing, icons: {}, fonts: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [plugin],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(result.components).toBe(existing);
  });

  it("createRegistryConfig returns defaults", () => {
    const registry = createRegistryConfig({
      resolvedPaths: { cwd: "/tmp/project" }
    });
    expect(registry.resolvedPaths.cwd).toBe("/tmp/project");
  });

  it("maps registry items into components", () => {
    expect(toDependencyRecord(["button", "lodash@4.17.21"])).toEqual({
      button: "*",
      lodash: "4.17.21"
    });

    const component = registryItemToComponent({
      name: "button",
      type: "registry:ui",
      title: "Button",
      description: "A button.",
      dependencies: ["@radix-ui/react-slot"],
      registryDependencies: ["utils"],
      categories: ["primitives"],
      files: [
        { path: "ui/button.tsx", type: "registry:ui", content: "export {}" }
      ]
    });

    expect(component).toEqual({
      name: "button",
      title: "Button",
      type: "ui",
      category: "primitives",
      tags: ["primitives"],
      description: "A button.",
      dependencies: { "@radix-ui/react-slot": "*" },
      registryDependencies: { utils: "*" },
      files: [{ path: "ui/button.tsx", type: "ui", content: "export {}" }]
    });

    expect(
      registryItemsToComponents([
        { name: "button", type: "registry:ui", title: "Button" },
        { name: "card", type: "registry:component" }
      ])
    ).toEqual({
      button: {
        name: "button",
        title: "Button",
        type: "ui"
      },
      card: {
        name: "card",
        title: "card",
        type: "component"
      }
    });
  });
});

describe("shadcn generate plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = generate({ configFile: "out/registry.json" });
    expect(plugin.name).toBe("shadcn:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("maps components into registry items", () => {
    expect(fromDependencyRecord({ button: "*", lodash: "4.17.21" })).toEqual([
      "button",
      "lodash@4.17.21"
    ]);

    expect(componentToRegistryItem(components.button)).toEqual({
      name: "button",
      type: "registry:ui",
      title: "Button",
      description: "A button.",
      categories: ["primitives"],
      dependencies: ["@radix-ui/react-slot"],
      registryDependencies: ["utils"],
      files: [
        { path: "ui/button.tsx", type: "registry:ui", content: "export {}" }
      ]
    });
  });

  it("renders a registry.json document", () => {
    const document = renderRegistryJson(components, {
      name: "acme",
      homepage: "https://acme.com"
    });

    expect(document.$schema).toBe(
      "https://ui.shadcn.com/schema/registry.json"
    );
    expect(document.name).toBe("acme");
    expect(document.homepage).toBe("https://acme.com");
    expect(document.items.map(item => item.name)).toEqual(["button", "card"]);
  });

  it("generates registry.json from schema components", async () => {
    const plugin = generate({
      configFile: "out/registry.json",
      name: "acme"
    });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual([
      "out/registry.json",
      "out/INSTALL.md"
    ]);
    const content = documents["out/registry.json"]?.chunks?.[0]?.content;
    expect(content).toContain(`"name": "acme"`);
    expect(content).toContain(`"type": "registry:ui"`);
    expect(content).toContain(`"name": "button"`);
  });

  it("generateRegistryJson mirrors the plugin generate output", async () => {
    const documents = await generateRegistryJson(spec, {
      configFile: "registry.json",
      homepage: "https://acme.com"
    });

    const content = documents["registry.json"]?.chunks?.[0]?.content;
    expect(content).toContain(`"homepage": "https://acme.com"`);
    expect(content).toContain(`"name": "card"`);
    expect(documents["INSTALL.md"]).toBeDefined();
  });

  it("returns empty when schema has no components", async () => {
    const documents = await generateRegistryJson(
      { tokens: {}, components: {}, icons: {}, fonts: {} },
      { configFile: "registry.json" }
    );
    expect(documents).toEqual({});
  });
});
