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

import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadComponents } from "../../src/lib/components/load";

const tempDirs: string[] = [];

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "razorwind-components-"));
  tempDirs.push(root);
  return root;
}

function contextFor(cwd: string, componentsPath: string) {
  return {
    cwd,
    options: { componentsPath }
  } as Parameters<typeof loadComponents>[0];
}

describe("loadComponents usage", () => {
  afterEach(async () => {
    // Best-effort cleanup is unnecessary for tmp; keep list bounded.
    tempDirs.length = 0;
  });

  it("discovers source entries without bundling installed dependencies or build outputs", async () => {
    const root = await createFixture();
    const componentDir = join(root, "button");
    const manifest = JSON.stringify({
      name: "button",
      dependencies: { react: "^19.0.0" },
      devDependencies: { vitest: "^4.0.0" }
    });
    for (const directory of [
      "src",
      "dist",
      "node_modules/react",
      "node_modules/vitest",
      "usage"
    ]) {
      await mkdir(join(componentDir, directory), { recursive: true });
      await writeFile(
        join(componentDir, directory, "index.ts"),
        'export * from "./Button";\n'
      );
    }
    await writeFile(
      join(componentDir, "src", "Button.tsx"),
      "export const Button = () => null;\n"
    );
    await mkdir(join(root, "linked"));
    await writeFile(join(root, "linked", "index.ts"), "export {};\n");
    await symlink(join(root, "linked"), join(componentDir, "linked"), "dir");
    await writeFile(join(componentDir, "package.json"), manifest);

    const components = await loadComponents(contextFor(root, "."));

    expect(components.button?.files?.map(file => file.path)).toEqual([
      join(componentDir, "src", "Button.tsx")
    ]);
    expect(components.button?.devDependencies).toEqual({ vitest: "^4.0.0" });
    expect(await readFile(join(componentDir, "package.json"), "utf8")).toBe(
      manifest
    );
  });

  it("follows component imports transitively without copying the entry barrel or unrelated sources", async () => {
    const root = await createFixture();
    const directory = join(root, "collapsible");
    await mkdir(join(directory, "src", "helpers"), { recursive: true });
    const sources = {
      "index.ts": 'export * from "./Collapsible";\n',
      "Collapsible.tsx":
        'import { value } from "./get-value.js"; import type { Props } from "./types"; import "react"; export const Collapsible = () => value;\n',
      "get-value.ts": 'export { value } from "./helpers";\n',
      "helpers/index.ts": 'export { value } from "./value";\n',
      "helpers/value.ts": 'import "../get-value"; export const value = true;\n',
      "types.ts": "export interface Props {}\n",
      "unused.ts": "export const unused = true;\n",
      "Collapsible.test.tsx": 'import "./Collapsible";\n'
    };
    for (const [name, content] of Object.entries(sources)) {
      await writeFile(join(directory, "src", name), content);
    }
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name: "collapsible" })
    );
    const components = await loadComponents(contextFor(root, "."));
    expect(components.collapsible?.files?.map(file => file.path)).toEqual(
      [
        "Collapsible.tsx",
        "get-value.ts",
        "helpers/index.ts",
        "helpers/value.ts",
        "types.ts"
      ]
        .map(name => join(directory, "src", name))
        .sort((a, b) => a.localeCompare(b))
    );
    expect(
      components.collapsible?.files?.find(file =>
        file.path.endsWith("get-value.ts")
      )?.content
    ).toBe(sources["get-value.ts"]);
  });

  it("keeps explicitly declared file lists unchanged", async () => {
    const root = await createFixture();
    const directory = join(root, "explicit");
    await mkdir(directory);
    await writeFile(
      join(directory, "component.json"),
      JSON.stringify({
        name: "explicit",
        files: [{ path: "index.ts", type: "file", target: "custom.ts" }]
      })
    );
    await writeFile(
      join(directory, "index.ts"),
      'export * from "./Implementation";\n'
    );
    await writeFile(
      join(directory, "Implementation.tsx"),
      "export const Implementation = () => null;\n"
    );
    const components = await loadComponents(contextFor(root, "."));
    expect(components.explicit?.files).toEqual([
      {
        path: join(directory, "index.ts"),
        type: "file",
        target: "custom.ts",
        content: 'export * from "./Implementation";\n'
      }
    ]);
  });

  it("discovers components without barrels and includes lazy imports and assets", async () => {
    const root = await createFixture();
    const directory = join(root, "standalone");
    await mkdir(directory);
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name: "standalone" })
    );
    await writeFile(
      join(directory, "Standalone.tsx"),
      'import "./styles.css"; export const load = () => import("./lazy"); // import "./unused"\n'
    );
    await writeFile(join(directory, "lazy.ts"), "export const value = true;\n");
    await writeFile(
      join(directory, "styles.css"),
      ".standalone { display: block; }\n"
    );
    await writeFile(
      join(directory, "unused.ts"),
      "export const unused = true;\n"
    );
    const components = await loadComponents(contextFor(root, "."));
    expect(components.standalone?.files?.map(file => file.path)).toEqual(
      ["lazy.ts", "Standalone.tsx", "styles.css"]
        .map(name => join(directory, name))
        .sort((a, b) => a.localeCompare(b))
    );
  });

  it("discovers usage files under usage/", async () => {
    const root = await createFixture();
    const componentDir = join(root, "button");
    await mkdir(join(componentDir, "usage"), { recursive: true });
    await writeFile(
      join(componentDir, "component.json"),
      JSON.stringify({
        name: "button",
        title: "Button",
        type: "ui"
      }),
      "utf8"
    );
    await writeFile(
      join(componentDir, "usage", "default.tsx"),
      "export default function Default() {\n  return <Button>Click</Button>;\n}\n",
      "utf8"
    );
    await writeFile(
      join(componentDir, "usage", "with-icon.tsx"),
      "export default function WithIcon() {\n  return <Button><Icon /></Button>;\n}\n",
      "utf8"
    );

    const components = await loadComponents(contextFor(root, "."));
    const button = components.button;

    expect(button).toBeDefined();
    expect(button?.usage).toHaveLength(2);
    expect(button?.usage?.[0]?.name).toBe("default");
    expect(button?.usage?.[0]?.language).toBe("tsx");
    expect(button?.usage?.[0]?.content).toContain("<Button>Click</Button>");
    expect(button?.usage?.[1]?.name).toBe("with-icon");
  });

  it("resolves declared usage paths from component.json", async () => {
    const root = await createFixture();
    const componentDir = join(root, "card");
    await mkdir(join(componentDir, "examples"), { recursive: true });
    await writeFile(
      join(componentDir, "examples", "basic.tsx"),
      "export const Basic = () => <Card />;\n",
      "utf8"
    );
    await writeFile(
      join(componentDir, "component.json"),
      JSON.stringify({
        name: "card",
        title: "Card",
        type: "component",
        usage: [
          {
            path: "examples/basic.tsx",
            title: "Basic Card",
            description: "Minimal card"
          }
        ]
      }),
      "utf8"
    );

    const components = await loadComponents(contextFor(root, "."));
    const card = components.card;

    expect(card?.usage).toHaveLength(1);
    expect(card?.usage?.[0]?.name).toBe("basic");
    expect(card?.usage?.[0]?.title).toBe("Basic Card");
    expect(card?.usage?.[0]?.description).toBe("Minimal card");
    expect(card?.usage?.[0]?.content).toContain("<Card />");
  });

  it("accepts string usage paths in metadata", async () => {
    const root = await createFixture();
    const componentDir = join(root, "input");
    await mkdir(join(componentDir, "usage"), { recursive: true });
    await writeFile(
      join(componentDir, "usage", "default.tsx"),
      "export default () => <Input />;\n",
      "utf8"
    );
    await writeFile(
      join(componentDir, "component.json"),
      JSON.stringify({
        name: "input",
        title: "Input",
        usage: ["usage/default.tsx"]
      }),
      "utf8"
    );

    const components = await loadComponents(contextFor(root, "."));

    expect(components.input?.usage?.[0]?.name).toBe("default");
    expect(components.input?.usage?.[0]?.content).toContain("<Input />");
  });
});
