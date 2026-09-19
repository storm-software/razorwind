import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import { adaptSchema, renderComponentDeclarations } from "../src/schema";

const schema = {
  name: "@acme/ui",
  components: {
    button: {
      name: "button",
      title: "Button",
      files: [
        {
          path: "Button.tsx",
          content:
            "export interface ButtonProps { tone: 'primary' | 'danger'; disabled?: boolean }\nexport function Button(_: ButtonProps) { return null }"
        }
      ]
    },
    card: { name: "card", title: "Card" }
  },
  icons: {},
  fonts: {},
  tokens: {
    light: {
      color: { primary: { $type: "color", $value: "#0055cc" } }
    },
    dark: {
      color: { primary: { $type: "color", $value: "#66aaff" } }
    }
  }
} satisfies Schema;

describe("Schema ground truth", () => {
  it("derives exports, props, and theme-qualified token paths", async () => {
    const groundTruth = await adaptSchema(schema, {});

    expect(groundTruth.packageName).toBe("@acme/ui");
    expect(groundTruth.components.Button?.props).toEqual({
      tone: { required: true, type: '"primary" | "danger"' },
      disabled: { required: false, type: "boolean" }
    });
    expect(groundTruth.components.Card?.props).toBeNull();
    expect(groundTruth.tokens.map(token => token.path)).toEqual([
      "dark.color.primary",
      "light.color.primary"
    ]);
  });

  it("renders strict known props and permissive unknown props", async () => {
    const declarations = renderComponentDeclarations(
      await adaptSchema(schema, {})
    );

    expect(declarations).toContain('declare module "@acme/ui"');
    expect(declarations).toContain("export interface ButtonProps");
    expect(declarations).toContain('tone: "primary" | "danger";');
    expect(declarations).toContain("disabled?: boolean;");
    expect(declarations).toContain(
      "export type CardProps = Record<string, unknown>;"
    );
  });

  it("uses an explicit package name when the Schema has none", async () => {
    const groundTruth = await adaptSchema(
      { ...schema, name: undefined },
      { packageName: "@custom/components" }
    );

    expect(groundTruth.packageName).toBe("@custom/components");
  });
});
