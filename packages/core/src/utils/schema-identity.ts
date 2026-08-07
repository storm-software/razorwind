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

import type { Schema } from "../schema";
import { titleCase } from "./title-case";

/** Design-system identity resolved for generated artifacts. */
export interface SchemaIdentity {
  name?: string;
  title?: string;
  description?: string;
  repository?: string;
  homepage?: string;
  logo?: string;
}

/**
 * Plugin / call-site overrides. `displayName` aliases `title`; `icon` aliases
 * `logo` (VS Code / Cursor extension field names).
 */
export interface SchemaIdentityOverrides {
  name?: string;
  title?: string;
  displayName?: string;
  description?: string;
  repository?: string;
  homepage?: string;
  logo?: string;
  icon?: string;
}

function unscopedName(name: string): string {
  const slash = name.lastIndexOf("/");
  return slash >= 0 ? name.slice(slash + 1) : name;
}

/**
 * Resolve design-system identity for generators.
 *
 * Precedence: plugin overrides → {@link Schema} fields → title-cased name.
 */
export function resolveSchemaIdentity(
  spec: Pick<
    Schema,
    "name" | "title" | "description" | "repository" | "homepage" | "logo"
  >,
  overrides: SchemaIdentityOverrides = {}
): SchemaIdentity {
  const name = overrides.name ?? spec.name;
  const title =
    overrides.displayName ??
    overrides.title ??
    spec.title ??
    (name ? titleCase(unscopedName(name)) : undefined);
  const description = overrides.description ?? spec.description;
  const repository = overrides.repository ?? spec.repository;
  const homepage = overrides.homepage ?? spec.homepage;
  const logo = overrides.icon ?? overrides.logo ?? spec.logo;

  return {
    ...(name ? { name } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(repository ? { repository } : {}),
    ...(homepage ? { homepage } : {}),
    ...(logo ? { logo } : {})
  };
}
