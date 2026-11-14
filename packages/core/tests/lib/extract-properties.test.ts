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
import { extractProperties } from "../../src/lib/meta/extract-properties";
import { propertiesSchema } from "../../src/schema";

const source = `
export interface ButtonProps extends Base {
  /**
   * The button size.
   * @default "md"
   */
  size?: "sm" | "md";
  "aria-label": string;
  /** @deprecated Use \`onPress\`. */
  onClick?(event: MouseEvent): void;
}

type ItemProps = Omit<Base, "id"> & {
  /** Item value. */
  value: string;
};

interface InternalProps { hidden: boolean }

export { ItemProps as ButtonItemProps };
export type ButtonVariant = { primary: boolean };
`;

describe("extractProperties", () => {
  it("extracts exported *Props declarations with JSDoc", () => {
    const properties = extractProperties([
      { path: "Button.tsx", content: source },
      { path: "Button.js", content: source }
    ]);

    expect(properties).toEqual({
      ButtonProps: [
        {
          name: "size",
          type: '"sm" | "md"',
          required: false,
          description: "The button size.",
          default: '"md"'
        },
        { name: "aria-label", type: "string", required: true },
        {
          name: "onClick",
          type: "(event: MouseEvent) => void",
          required: false,
          deprecated: true
        }
      ],
      ButtonItemProps: [
        {
          name: "value",
          type: "string",
          required: true,
          description: "Item value."
        }
      ]
    });
    expect(propertiesSchema.safeParse(properties).success).toBe(true);
  });
});
