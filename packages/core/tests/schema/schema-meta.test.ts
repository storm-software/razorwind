/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

    10| Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { describe, expect, it } from "vitest";
import {
  schemaMetaFromConfig,
  schemaMetaFromPackageJson
} from "../../src/lib/meta";
import { schema } from "../../src/schema";
import { resolveSchemaIdentity } from "../../src/utils/schema-identity";

describe("schema metadata fields", () => {
  it("accepts optional identity fields on the root schema", () => {
    const result = schema.safeParse({
      name: "@acme/design-system",
      title: "Acme Design System",
      repository: "https://github.com/acme/design-system",
      homepage: "https://acme.example",
      description: "Tokens and components for Acme",
      logo: "assets/logo.svg",
      tokens: {},
      icons: {},
      components: {},
      fonts: {}
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Acme Design System");
      expect(result.data.logo).toBe("assets/logo.svg");
    }
  });

  it("still accepts schemas without identity fields", () => {
    const result = schema.safeParse({
      tokens: {},
      icons: {},
      components: {},
      fonts: {}
    });

    expect(result.success).toBe(true);
  });
});

describe("schemaMetaFromPackageJson", () => {
  it("maps npm fields and razorwind overlays", () => {
    const meta = schemaMetaFromPackageJson({
      name: "@acme/ds",
      description: "from npm",
      homepage: "https://npm.example",
      repository: { type: "git", url: "https://github.com/acme/ds.git" },
      razorwind: {
        title: "Acme DS",
        description: "from razorwind",
        logo: "logo.png"
      }
    });

    expect(meta).toEqual({
      name: "@acme/ds",
      title: "Acme DS",
      description: "from razorwind",
      homepage: "https://npm.example",
      repository: "https://github.com/acme/ds.git",
      logo: "logo.png"
    });
  });
});

describe("schemaMetaFromConfig", () => {
  it("copies configured identity fields including logo", () => {
    expect(
      schemaMetaFromConfig({
        name: "configured",
        title: "Configured",
        logo: "brand.svg",
        plugins: []
      })
    ).toEqual({
      name: "configured",
      title: "Configured",
      logo: "brand.svg"
    });
  });
});

describe("resolveSchemaIdentity", () => {
  it("prefers overrides, then Schema, then title-cased name", () => {
    expect(
      resolveSchemaIdentity(
        {
          name: "@org/my-ds",
          description: "schema desc",
          homepage: "https://schema.example"
        },
        { displayName: "Override Title", icon: "icon.png" }
      )
    ).toEqual({
      name: "@org/my-ds",
      title: "Override Title",
      description: "schema desc",
      homepage: "https://schema.example",
      logo: "icon.png"
    });
  });

  it("title-cases the unscoped package name when title is missing", () => {
    expect(resolveSchemaIdentity({ name: "@acme/cool-kit" }).title).toBe(
      "Cool Kit"
    );
  });
});
