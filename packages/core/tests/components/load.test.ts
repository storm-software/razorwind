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

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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
      'export default function Default() {\n  return <Button>Click</Button>;\n}\n',
      "utf8"
    );
    await writeFile(
      join(componentDir, "usage", "with-icon.tsx"),
      'export default function WithIcon() {\n  return <Button><Icon /></Button>;\n}\n',
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
    await mkdir(componentDir, { recursive: true });
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
