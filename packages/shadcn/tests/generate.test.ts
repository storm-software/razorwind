/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 SPDX-License-Identifier: Apache-2.0

 ------------------------------------------------------------------- */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateRegistryJson, renderRegistryJson } from "../src/generate";

describe("shadcn registry dependency generation", () => {
  it("installs registered components through the registry while retaining external npm dependencies", async () => {
    const components = {
      button: {
        name: "@cyclone-ui/button",
        title: "Button",
        dependencies: {
          "@cyclone-ui/text": "workspace:*",
          "@external/runtime": "^1.0.0",
          "@cyclone-ui/helpers": "workspace:*",
          "@cyclone-ui-other/runtime": "^2.0.0"
        },
        devDependencies: {
          "@cyclone-ui/story-example": "workspace:*",
          vitest: "^4.0.0"
        },
        registryDependencies: { utils: "*" }
      },
      text: { name: "@cyclone-ui/text", title: "Text" },
      example: { name: "@cyclone-ui/story-example", title: "Example" }
    };
    const original = structuredClone(components);
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-shadcn-"));
    try {
      const documents = await generateRegistryJson(
        { tokens: {}, components, icons: {}, fonts: {} },
        { configFile: "registry.json", localDependencyScopes: ["@cyclone-ui"] },
        cwd
      );
      const document = JSON.parse(
        documents["registry.json"]?.chunks?.[0]?.content ?? "{}"
      );
      expect(
        document.items.find(
          (item: { name: string }) => item.name === "@cyclone-ui/button"
        )
      ).toMatchObject({
        dependencies: [
          "@external/runtime@^1.0.0",
          "@cyclone-ui-other/runtime@^2.0.0"
        ],
        devDependencies: ["vitest@^4.0.0"],
        registryDependencies: ["utils", "@cyclone-ui/text"]
      });
      const rendered = renderRegistryJson(components).items.find(
        item => item.name === "@cyclone-ui/button"
      );
      expect(rendered?.dependencies).toEqual([
        "@external/runtime@^1.0.0",
        "@cyclone-ui/helpers@workspace:*",
        "@cyclone-ui-other/runtime@^2.0.0"
      ]);
      expect(rendered?.registryDependencies).toEqual([
        "utils",
        "@cyclone-ui/text"
      ]);
      expect(components).toEqual(original);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("filters local scopes when rendering registry items directly", () => {
    const document = renderRegistryJson(
      {
        button: {
          name: "@cyclone-ui/button",
          title: "Button",
          dependencies: {
            "@cyclone-ui/state": "workspace:*",
            react: "^19.0.0"
          },
          devDependencies: {
            "@cyclone-ui/helpers": "workspace:*",
            vitest: "^4.0.0"
          }
        }
      },
      { localDependencyScopes: ["@cyclone-ui"] }
    );
    expect(document.items[0]?.dependencies).toEqual(["react@^19.0.0"]);
    expect(document.items[0]?.devDependencies).toEqual(["vitest@^4.0.0"]);
    expect(document.items[0]?.registryDependencies).toBeUndefined();
  });

  it("resolves catalog and workspace dependency specifiers", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-shadcn-"));

    try {
      await mkdir(join(cwd, "packages", "core"), { recursive: true });
      await writeFile(
        join(cwd, "pnpm-workspace.yaml"),
        `packages:\n  - packages/*\ncatalog:\n  react-dom: ^19.2.0\ncatalogs:\n  tooling:\n    vitest: ~4.1.11\n`
      );
      await writeFile(
        join(cwd, "packages", "core", "package.json"),
        JSON.stringify({ name: "@acme/core", version: "1.2.3" })
      );

      const documents = await generateRegistryJson(
        {
          tokens: {},
          components: {
            button: {
              name: "button",
              dependencies: {
                "@acme/core": "workspace:*",
                "react-dom": "catalog:"
              },
              devDependencies: { vitest: "catalog:tooling" },
              registryDependencies: { "react-dom": "catalog:" }
            }
          },
          icons: {},
          fonts: {}
        },
        { configFile: "registry.json" },
        cwd
      );
      const content = documents["registry.json"]?.chunks?.[0]?.content;
      const document = JSON.parse(content ?? "{}") as {
        items: Array<{
          dependencies?: string[];
          devDependencies?: string[];
          registryDependencies?: string[];
        }>;
      };

      expect(document.items[0]?.dependencies).toEqual([
        "@acme/core@1.2.3",
        "react-dom@^19.2.0"
      ]);
      expect(document.items[0]?.devDependencies).toEqual(["vitest@~4.1.11"]);
      expect(document.items[0]?.registryDependencies).toEqual([
        "react-dom@^19.2.0"
      ]);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
