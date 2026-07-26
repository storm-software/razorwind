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
import shadcn, {
  registryItemToComponent,
  registryItemsToComponents,
  toDependencyRecord
} from "../src/index";
import { createRegistryConfig } from "../src/registry/config";

describe("shadcn plugin", () => {
  it("exposes extract / validate / generate hooks", () => {
    expect(shadcn.name).toBe("razorwind-shadcn");
    expect(typeof shadcn.extract).toBe("function");
    expect(typeof shadcn.validate).toBe("function");
    expect(typeof shadcn.generate).toBe("function");
  });

  it("fills schema.components from registry when missing", async () => {
    const spec = await shadcn.extract(
      { tokens: {}, components: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [shadcn],
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

    expect(spec.components).toBeDefined();
    expect(typeof spec.components).toBe("object");
  });

  it("leaves existing components untouched", async () => {
    const components = {
      button: {
        name: "button",
        title: "Button",
        type: "ui" as const
      }
    };

    const spec = await shadcn.extract(
      { tokens: {}, components },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [shadcn],
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

    expect(spec.components).toBe(components);
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
      files: [{ path: "ui/button.tsx", type: "registry:ui", content: "export {}" }]
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
      files: [
        { path: "ui/button.tsx", type: "ui", content: "export {}" }
      ]
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
