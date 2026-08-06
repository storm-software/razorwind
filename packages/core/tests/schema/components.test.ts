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
import {
  componentSchema,
  componentUsageSchema,
  schema
} from "../../src/schema";

describe("componentUsageSchema", () => {
  it("accepts usage examples with optional metadata", () => {
    const result = componentUsageSchema.safeParse({
      path: "usage/default.tsx",
      name: "default",
      title: "Default",
      description: "Basic button usage",
      language: "tsx",
      content: "<Button>Click</Button>"
    });

    expect(result.success).toBe(true);
  });

  it("accepts path-only usage entries", () => {
    const result = componentUsageSchema.safeParse({
      path: "usage/with-icon.tsx"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid languages", () => {
    const result = componentUsageSchema.safeParse({
      path: "usage/default.tsx",
      language: "bin"
    });

    expect(result.success).toBe(false);
  });
});

describe("componentSchema usage", () => {
  it("accepts components with usage examples", () => {
    const result = componentSchema.safeParse({
      name: "button",
      title: "Button",
      type: "ui",
      usage: [
        {
          path: "usage/default.tsx",
          content: 'export default function Default() { return <Button /> }'
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("includes usage on the root schema", () => {
    const result = schema.safeParse({
      tokens: {},
      icons: {},
      components: {
        button: {
          name: "button",
          title: "Button",
          usage: [{ path: "usage/default.tsx", name: "default" }]
        }
      }
    });

    expect(result.success).toBe(true);
  });
});
