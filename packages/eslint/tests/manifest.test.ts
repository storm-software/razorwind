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
import {
  buildManifest,
  kebabCase,
  pascalCase,
  resolveCategory
} from "../src/manifest";
import { manifest, spec } from "./fixture";

const token = (path: string) => manifest.tokens.find(item => item.path === path);

describe("naming", () => {
  it("kebab-cases like Style Dictionary's name/kebab transform", () => {
    expect(kebabCase(" acme font size md")).toBe("acme-font-size-md");
    expect(kebabCase("acme fontSize DEFAULT")).toBe("acme-font-size-default");
    expect(kebabCase("acme blue500 2xl")).toBe("acme-blue500-2xl");
  });

  it("pascal-cases component names", () => {
    expect(pascalCase("icon-button")).toBe("IconButton");
    expect(pascalCase("Visually Hidden")).toBe("VisuallyHidden");
  });
});

describe("resolveCategory", () => {
  it("classifies by $type, then by path", () => {
    expect(resolveCategory("border.color", "color")).toBe("color");
    expect(resolveCategory("motion.fast", "duration")).toBe("duration");
    expect(resolveCategory("ease.standard", "cubicBezier")).toBe("easing");
    expect(resolveCategory("font.size.md", "dimension")).toBe("fontSize");
    expect(resolveCategory("font.line-height.tight", "number")).toBe(
      "lineHeight"
    );
    expect(resolveCategory("border.width.thin", "dimension")).toBe(
      "borderWidth"
    );
  });

  it("falls back to the Tamagui category for scale paths", () => {
    expect(resolveCategory("space.4", "dimension")).toBe("space");
    expect(resolveCategory("radius.lg", "dimension")).toBe("radius");
    expect(resolveCategory("size.4", "dimension")).toBe("size");
    expect(resolveCategory("misc.thing", "string")).toBeUndefined();
  });
});

describe("buildManifest", () => {
  it("derives CSS variables from the schema name", () => {
    expect(manifest.cssVarPrefix).toBe("acme");
    expect(token("font.size.md")?.cssVar).toBe("--acme-font-size-md");
    expect(manifest.themes).toEqual(["light", "dark"]);
  });

  it("resolves aliases to the primary theme's value", () => {
    expect(token("color.primary")).toMatchObject({
      value: "#0066cc",
      alias: true,
      category: "color"
    });
    expect(token("color.text")?.value).toBe("#1a1a1a");
    expect(token("space.4")?.value).toBe("16px");
  });

  it("records deprecations and replacements", () => {
    expect(token("color.legacy")).toMatchObject({
      deprecated: "Use {color.primary} instead.",
      replacement: "color.primary"
    });
    expect(token("color.retired")?.deprecated).toBe(true);
    expect(token("color.retired")?.replacement).toBeUndefined();
  });

  it("inherits $deprecated from groups", () => {
    const deprecated = buildManifest({
      ...spec,
      tokens: {
        color: {
          $type: "color",
          old: { $deprecated: true, a: { $value: "#000" } },
          kept: { $value: "#fff" }
        }
      }
    } as unknown as Schema);

    expect(
      deprecated.tokens.find(item => item.path === "color.old.a")?.deprecated
    ).toBe(true);
    expect(
      deprecated.tokens.find(item => item.path === "color.kept")?.deprecated
    ).toBeUndefined();
  });

  it("infers component roles, JSX names and deprecations", () => {
    const component = (name: string) =>
      manifest.components.find(item => item.name === name);

    expect(component("icon-button")).toMatchObject({
      jsx: ["IconButton"],
      roles: ["icon-button"]
    });
    expect(component("input")?.roles).toEqual(["text-input"]);
    expect(component("stack")?.roles).toEqual(["primitive"]);
    expect(component("old-card")).toMatchObject({
      deprecated: true,
      replacements: ["Card"]
    });
  });

  it("uses the unscoped package name for JSX names and roles", () => {
    const scoped = buildManifest({
      ...spec,
      components: {
        "@cyclone-ui/select-field": {
          name: "@cyclone-ui/select-field",
          title: "@cyclone-ui/select-field"
        },
        "@cyclone-ui/button": {
          name: "@cyclone-ui/button",
          title: "@cyclone-ui/button"
        }
      }
    } as unknown as Schema);

    expect(scoped.components).toEqual([
      {
        name: "@cyclone-ui/button",
        jsx: ["Button"],
        roles: ["button"]
      },
      {
        name: "@cyclone-ui/select-field",
        jsx: ["SelectField"],
        roles: []
      }
    ]);
  });

  it("names icons and fonts", () => {
    expect(manifest.icons).toEqual(["ArrowRightIcon", "ChevronRightIcon"]);
    expect(manifest.fonts).toEqual([{ family: "Inter", role: "sans" }]);
  });

  it("embeds the Tailwind and Tamagui guardrail themes", () => {
    expect(manifest.tailwind?.namespaces.color).toContain("primary");
    expect(manifest.tamagui?.tokens.space).toEqual(["1", "2", "4"]);
    expect(buildManifest(spec).tamagui).toBeUndefined();
    expect(buildManifest(spec, { tailwind: false }).tailwind).toBeUndefined();
  });

  it("honours cssVarPrefix overrides", () => {
    const unprefixed = buildManifest(spec, { cssVarPrefix: false });
    expect(unprefixed.cssVarPrefix).toBeUndefined();
    expect(
      unprefixed.tokens.find(item => item.path === "space.4")?.cssVar
    ).toBe("--space-4");

    const custom = buildManifest(spec, { cssVarPrefix: "ds" });
    expect(custom.tokens.find(item => item.path === "space.4")?.cssVar).toBe(
      "--ds-space-4"
    );
  });
});
