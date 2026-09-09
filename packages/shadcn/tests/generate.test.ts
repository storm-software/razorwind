/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 SPDX-License-Identifier: Apache-2.0

 ------------------------------------------------------------------- */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateRegistryJson } from "../src/generate";

describe("shadcn registry dependency generation", () => {
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
