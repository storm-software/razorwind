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

import type {
  ComponentRole,
  DesignSystemManifest,
  ManifestComponent
} from "../types";
import type { Node, Visitors } from "./ast";
import type { ResolvedSettings } from "./settings";

export interface ComponentIndex {
  byJsx: ReadonlyMap<string, ManifestComponent>;
  /** JSX names of the schema icons. */
  icons: ReadonlySet<string>;
  has: (...roles: ComponentRole[]) => boolean;
  /** `Button, IconButton` — JSX names of the components with a role. */
  names: (...roles: ComponentRole[]) => string;
  deprecated: () => ManifestComponent[];
}

export function createComponentIndex(
  manifest: DesignSystemManifest
): ComponentIndex {
  const byJsx = new Map<string, ManifestComponent>();
  for (const component of manifest.components) {
    for (const name of component.jsx) {
      byJsx.set(name, component);
    }
  }

  const withRoles = (roles: ComponentRole[]) =>
    manifest.components.filter(component =>
      component.roles.some(role => roles.includes(role))
    );

  return {
    byJsx,
    icons: new Set(manifest.icons),
    has: (...roles) => withRoles(roles).length > 0,
    names: (...roles) =>
      withRoles(roles)
        .map(component => component.jsx[0])
        .join(", "),
    deprecated: () =>
      manifest.components.filter(component => component.deprecated)
  };
}

interface Binding {
  imported: string;
  source: string;
  namespace: boolean;
}

/** A JSX element name resolved to the design-system name it refers to. */
export interface ResolvedElement {
  /** Name as written (`DSButton`, `DS.Button`). */
  local: string;
  /** Design-system export name (`Button`). */
  name: string;
}

export interface ComponentResolver {
  visitors: Visitors;
  /** True when an import source is a design-system module. */
  isDesignSystemModule: (source: string) => boolean;
  /** Resolve a JSX element name (or identifier) to its exported name. */
  resolve: (name: Node | undefined) => ResolvedElement | undefined;
}

/**
 * Track imports so JSX names resolve to the design-system export they
 * refer to (`import { Button as DSButton }`), honouring
 * `settings.componentModules` when set.
 */
export function createComponentResolver(
  settings: ResolvedSettings
): ComponentResolver {
  const bindings = new Map<string, Binding>();
  const modules = settings.componentModules;

  const isDesignSystemModule = (source: string) =>
    !modules ||
    modules.some(module =>
      module.endsWith("/")
        ? source.startsWith(module)
        : source === module || source.startsWith(`${module}/`)
    );

  const resolveIdentifier = (local: string): ResolvedElement | undefined => {
    if (!/^[A-Z]/.test(local)) {
      return undefined;
    }
    const binding = bindings.get(local);
    if (!binding) {
      return modules ? undefined : { local, name: local };
    }
    if (binding.namespace || !isDesignSystemModule(binding.source)) {
      return undefined;
    }

    return { local, name: binding.imported };
  };

  return {
    isDesignSystemModule,
    visitors: {
      ImportDeclaration(node) {
        const source = String((node.source as Node).value);
        for (const specifier of node.specifiers as Node[]) {
          const local = (specifier.local as Node).name as string;
          const imported =
            specifier.type === "ImportSpecifier"
              ? ((specifier.imported as Node).name ??
                (specifier.imported as Node).value)
              : local;
          bindings.set(local, {
            imported: String(imported),
            source,
            namespace: specifier.type === "ImportNamespaceSpecifier"
          });
        }
      }
    },
    resolve(name) {
      if (name?.type === "JSXIdentifier" || name?.type === "Identifier") {
        return resolveIdentifier(name.name as string);
      }
      if (name?.type === "JSXMemberExpression") {
        const object = name.object as Node;
        const property = name.property as Node;
        const binding =
          object.type === "JSXIdentifier"
            ? bindings.get(object.name as string)
            : undefined;
        if (binding?.namespace && isDesignSystemModule(binding.source)) {
          return {
            local: `${object.name as string}.${property.name as string}`,
            name: property.name as string
          };
        }
      }

      return undefined;
    }
  };
}
