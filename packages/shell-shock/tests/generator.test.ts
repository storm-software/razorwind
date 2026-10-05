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

import type { Config } from "@razorwind/core";
import { describe, expect, it } from "vitest";
import { generateShellShockTheme, renderInstallMd } from "../src/generate";
import shellShock, { inferPalette } from "../src/index";
import { createSnapshot, isSnapshot } from "../src/snapshot";
import { spec } from "./fixtures";

function content(doc: { chunks: Array<{ content: string }> } | undefined) {
  return doc?.chunks.map(chunk => chunk.content).join("") ?? "";
}

describe("generateShellShockTheme", () => {
  it("writes theme JSON, the snapshot and INSTALL.md", () => {
    const documents = generateShellShockTheme(spec, {
      mapTheme: s => ({ ...inferPalette(s), name: "Acme" })
    });

    expect(Object.keys(documents).toSorted()).toEqual([
      "shell-shock/INSTALL.md",
      "shell-shock/acme.theme.json",
      "shell-shock/design-system.json"
    ]);

    const theme = JSON.parse(content(documents["shell-shock/acme.theme.json"]));
    expect(theme.$theme).toBe("acme");
    expect(theme.colors.text.heading.primary).toBe("#0066cc");

    const snapshot = JSON.parse(content(documents["shell-shock/design-system.json"]));
    expect(isSnapshot(snapshot)).toBe(true);
    expect(snapshot.spec.components.button.files[0].content).toBeUndefined();
    expect(snapshot.spec.components.button.usage[0].content).toContain("<Button");

    const install = content(documents["shell-shock/INSTALL.md"]);
    expect(install).toContain("# Installing the Acme Design System Shell Shock theme");
    expect(install).toContain("`acme.theme.json`");
    expect(install).toContain("`design-system.json`");
    expect(install).toContain('specFile: "./design-system.json"');
    expect(install).toContain("search-tokens");
  });

  it("supports multiple themes, custom output path and no snapshot", () => {
    const documents = generateShellShockTheme(spec, {
      outputPath: "cli",
      snapshot: false,
      mapTheme: () => ({
        light: { primary: "#000000" },
        dark: { primary: "#ffffff" }
      })
    });

    expect(Object.keys(documents).toSorted()).toEqual([
      "cli/INSTALL.md",
      "cli/dark.theme.json",
      "cli/light.theme.json"
    ]);
    expect(content(documents["cli/INSTALL.md"])).toContain('root: "."');
  });

  it("de-duplicates colliding theme file names", () => {
    const documents = generateShellShockTheme(spec, {
      snapshot: false,
      mapTheme: () => [{ primary: "#000", name: "Same" }, { primary: "#fff", name: "same" }]
    });
    expect(Object.keys(documents)).toContain("shell-shock/same-2.theme.json");
  });

  it("uses a custom install guide verbatim", () => {
    expect(renderInstallMd(spec, [], { mapTheme: () => ({ primary: "#000" }), installGuide: "custom" })).toBe(
      "custom\n"
    );
  });

  it("keeps file contents in the snapshot on request", () => {
    const snapshot = createSnapshot(spec, { stripFileContents: false });
    expect(snapshot.spec.components.button?.files?.[0]?.content).toContain("Button");
    expect(snapshot.guidelines).toBeUndefined();
  });

  it("requires mapTheme", () => {
    expect(() => generateShellShockTheme(spec, {} as any)).toThrow(/requires options.mapTheme/);
    expect(() => generateShellShockTheme(spec, { mapTheme: () => [] })).toThrow(/returned no themes/);
  });
});

describe("default plugin", () => {
  it("exposes a generate hook named shell-shock", async () => {
    const plugin = shellShock({ mapTheme: s => inferPalette(s) });
    expect(plugin.name).toBe("shell-shock");

    const documents = await plugin.generate!(spec, {} as Config);
    expect(Object.keys(documents)).toContain("shell-shock/INSTALL.md");
  });

  it("throws without options", async () => {
    const plugin = shellShock();
    await expect(plugin.generate!(spec, {} as Config)).rejects.toThrow(/requires options/);
  });
});
