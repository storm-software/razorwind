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

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESIGN_SYSTEM_COMMANDS,
  renderSnapshotModule,
  selectCommands
} from "../src/commands";
import {
  extractSpec,
  loadDesignSystem,
  loadGuidelines,
  parseGuidelineMarkdown
} from "../src/load";
import { plugin, resolveDesignSystemTheme } from "../src/plugin";
import { spec } from "./fixtures";

interface FakeContext {
  options: { root: string };
  entryPath: string;
  inputs: any[];
  files: Record<string, string>;
  fs: { write: (path: string, data: string) => Promise<void> };
  debug: (message: string) => void;
  info: (message: string) => void;
  config: Record<string, unknown>;
}

function createContext(root = "/project"): FakeContext {
  const context: FakeContext = {
    options: { root },
    entryPath: "/project/.shell-shock/entry",
    inputs: [],
    files: {},
    fs: {
      write: async (path, data) => {
        context.files[path] = data;
      }
    },
    debug: () => {},
    info: () => {},
    config: {}
  };
  return context;
}

async function runHooks(plugins: any[], context: FakeContext) {
  const own = plugins.find(p => p.name === "razorwind/shell-shock");
  const config = await own.config.call(context);
  await own.configResolved.call(context);
  return config;
}

describe("plugin composition", () => {
  it("includes the theme and mcp child plugins by default", () => {
    const names = plugin({ spec }).map(p => p.name);
    expect(names).toContain("shell-shock/theme");
    expect(names).toContain("shell-shock/mcp");
    expect(names).toContain("razorwind/shell-shock");
  });

  it("drops child plugins when disabled", () => {
    const names = plugin({ spec, theme: false, mcp: false }).map(p => p.name);
    expect(names).toEqual(["razorwind/shell-shock"]);
  });

  it("forwards mcp options", () => {
    const mcp = plugin({
      spec,
      mcp: { command: "serve-mcp", excludeTags: ["Utility"] }
    }).find(p => p.name === "shell-shock/mcp") as any;
    const context = { debug: () => {} };
    expect(mcp.config.call(context)).toMatchObject({
      mcp: { command: { name: "serve-mcp" }, excludeTags: ["Utility"] }
    });
  });
});

describe("plugin hooks", () => {
  it("contributes the mapped theme and the design-system commands", async () => {
    const context = createContext();
    const config = await runHooks(plugin({ spec }), context);

    expect(config.theme.colors.text.heading.primary).toBe("#0066cc");

    const ids = context.inputs.map(input => input.id);
    expect(ids).toEqual(DESIGN_SYSTEM_COMMANDS.map(command => command.id));
    expect(context.inputs[0]).toMatchObject({
      name: "search-tokens",
      segments: ["search-tokens"],
      virtual: false,
      title: "Search Tokens",
      entry: {
        file: "/project/.shell-shock/entry/search-tokens/index.ts",
        input: { file: "/project/.shell-shock/entry/search-tokens/command.ts" }
      }
    });

    const snapshotModule =
      context.files["/project/.shell-shock/entry/razorwind/design-system.ts"];
    expect(snapshotModule).toContain("export const designSystem");
    expect(snapshotModule).toContain('acme-design-system');

    const search = context.files["/project/.shell-shock/entry/search-tokens/command.ts"];
    expect(search).toContain('from "@razorwind/shell-shock/runtime"');
    expect(search).toContain('from "../razorwind/design-system"');
    expect(search).toContain("includeMetadata?: boolean");
    expect(search).toContain("searchTokens(designSystem");
  });

  it("applies prefix, command selection and explicit theme overrides", async () => {
    const context = createContext();
    const config = await runHooks(
      plugin({
        spec,
        prefix: "ds",
        commands: ["plan", "guidelines"],
        theme: { colors: { text: { heading: "#123456" } } }
      }),
      context
    );

    expect(context.inputs.map(input => input.id)).toEqual(["ds-plan", "ds-guidelines"]);
    expect(config.theme.colors.text.heading).toBe("#123456");
    expect(config.theme.colors.text.body.primary).toBe("#e6edf3");
  });

  it("skips commands that already exist and honours theme: false", async () => {
    const context = createContext();
    context.inputs.push({ id: "plan" });
    const config = await runHooks(plugin({ spec, theme: false }), context);

    expect(config).toEqual({});
    expect(context.inputs.filter(input => input.id === "plan")).toHaveLength(1);
  });

  it("supports a custom mapTheme returning a palette or full config", () => {
    const palette = resolveDesignSystemTheme({ spec }, {
      mapTheme: () => ({ primary: "#abcdef" })
    });
    expect((palette.colors as any).text.heading.primary).toBe("#abcdef");

    const full = resolveDesignSystemTheme({ spec }, {
      mapTheme: () => ({ colors: "#000000", padding: 2 })
    });
    expect(full).toEqual({ colors: "#000000", padding: 2 });
  });
});

describe("command selection", () => {
  it("selects all, a list, or a toggle record", () => {
    expect(selectCommands(undefined)).toHaveLength(DESIGN_SYSTEM_COMMANDS.length);
    expect(selectCommands(["list-icons"]).map(c => c.id)).toEqual(["list-icons"]);
    expect(selectCommands({ "list-icons": false }).map(c => c.id)).not.toContain(
      "list-icons"
    );
  });

  it("renders an evaluable snapshot module", () => {
    const source = renderSnapshotModule({ spec });
    const literal = /JSON\.parse\(("(?:[^"\\]|\\.)*")\)/.exec(source)?.[1];
    expect(literal).toBeDefined();
    expect(JSON.parse(JSON.parse(literal!)).spec.name).toBe("acme-design-system");
  });
});

describe("loading design systems", () => {
  it("parses guideline markdown with front matter", () => {
    const doc = parseGuidelineMarkdown(
      "empty-states.md",
      '---\ntitle: "Empty states"\nkeywords: [empty, zero data]\n---\n\n# Empty states\n\nBody.'
    );
    expect(doc).toEqual({
      id: "empty-states",
      title: "Empty states",
      keywords: ["empty", "states", "zero data", "empty states"],
      content: "# Empty states\n\nBody."
    });
  });

  it("loads guidelines from a directory and specs from JSON files", async () => {
    const root = await mkdtemp(join(tmpdir(), "razorwind-shell-shock-"));
    await mkdir(join(root, "guidelines"));
    await writeFile(join(root, "guidelines", "voice-tone.md"), "# Voice\n\nBe clear.");
    await writeFile(join(root, "design-system.json"), JSON.stringify({ spec }));
    await writeFile(join(root, "spec.json"), JSON.stringify(spec));

    const docs = await loadGuidelines("guidelines", root);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.keywords).toEqual(["voice", "tone"]);

    const fromSnapshot = await loadDesignSystem(
      { specFile: "design-system.json", guidelines: "guidelines" },
      root
    );
    expect(fromSnapshot.spec.name).toBe("acme-design-system");
    expect(fromSnapshot.guidelines).toHaveLength(1);

    const fromSpec = await loadDesignSystem({ specFile: "spec.json" }, root);
    expect(fromSpec.spec.components.button?.title).toBe("Button");

    await expect(
      loadDesignSystem({ specFile: "missing.json" }, root)
    ).rejects.toThrow();
  });

  it("extracts a design system from a razorwind.config.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "razorwind-shell-shock-config-"));
    await writeFile(
      join(root, "razorwind.config.json"),
      JSON.stringify({
        name: "config-ds",
        tokens: spec.tokens,
        components: spec.components
      })
    );

    const extracted = await extractSpec(root);
    expect(extracted.name).toBe("config-ds");
    expect(extracted.components.button?.title).toBe("Button");

    const snapshot = await loadDesignSystem({}, root);
    expect(snapshot.spec.name).toBe("config-ds");
  });
});
