import { describe, expect, it } from "vitest";
import {
  tokenSchema,
  tokensSchema
} from "../../src/schema/tokens";

describe("tokensSchema (DTCG format)", () => {
  it("parses a nested DTCG document", () => {
    const result = tokensSchema.safeParse({
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      colors: {
        $type: "color",
        blue: {
          $value: {
            colorSpace: "srgb",
            components: [0, 0.4, 0.8],
            hex: "#0066cc"
          }
        },
        primary: { $value: "{colors.blue}" }
      },
      spacing: {
        $type: "dimension",
        $root: { $value: { value: 16, unit: "px" } },
        small: { $value: { value: 8, unit: "px" } }
      },
      shadow: {
        $type: "shadow",
        $value: {
          color: {
            colorSpace: "srgb",
            components: [0, 0, 0],
            alpha: 0.5,
            hex: "#000000"
          },
          offsetX: { value: 0.5, unit: "rem" },
          offsetY: { value: 0.5, unit: "rem" },
          blur: { value: 1.5, unit: "rem" },
          spread: { value: 0, unit: "rem" }
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid dimension units", () => {
    const result = tokenSchema.safeParse({
      $type: "dimension",
      $value: { value: 1, unit: "em" }
    });

    expect(result.success).toBe(false);
  });

  it("rejects tokens with both $value and $ref", () => {
    const result = tokenSchema.safeParse({
      $value: 1,
      $ref: "#/x"
    });

    expect(result.success).toBe(false);
  });
});
