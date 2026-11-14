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

import type { AttachedComment, Span, TSSignature, TSType } from "yuku-parser";
import { parse } from "yuku-parser";
import type { Properties, Property } from "../../schema/components";

/** Only TypeScript sources can declare prop types. */
const TYPESCRIPT_FILE = /\.[cm]?tsx?$/;
const PROPS_NAME = /Props$/;

type JsDoc = Pick<Property, "description" | "default" | "deprecated">;

function parseJsDoc(comments: AttachedComment[] | undefined): JsDoc {
  const doc = comments?.findLast(
    comment =>
      comment.type === "Block" &&
      comment.position === "before" &&
      comment.value.startsWith("*")
  );
  if (!doc) {
    return {};
  }

  const text = doc.value
    .split("\n")
    .map(line => line.replace(/^\s*\*+\s?/, ""))
    .join("\n")
    .trim();

  const result: JsDoc = {};
  for (const part of text.split(/^(?=@)/m)) {
    const tag = /^@(\w+)\s*([\s\S]*)/.exec(part);
    if (!tag) {
      if (part.trim()) result.description = part.trim();
    } else if (tag[1] === "default" || tag[1] === "defaultValue") {
      result.default = tag[2]?.trim();
    } else if (tag[1] === "deprecated") {
      result.deprecated = true;
    }
  }

  return result;
}

// ponytail: syntactic only, so referenced types (`extends Base`,
// `Omit<Base, "x">`, `GetProps<typeof X>`) contribute nothing. Resolving
// inherited props needs the TypeScript type checker.
function membersOf(type: TSType): TSSignature[] {
  switch (type.type) {
    case "TSTypeLiteral":
      return type.members;
    case "TSIntersectionType":
      return type.types.flatMap(membersOf);
    case "TSParenthesizedType":
      return membersOf(type.typeAnnotation);
    default:
      return [];
  }
}

function toProperty(member: TSSignature, source: string): Property | undefined {
  if (
    (member.type !== "TSPropertySignature" &&
      member.type !== "TSMethodSignature") ||
    member.computed
  ) {
    return undefined;
  }

  const { key } = member;
  const name =
    key.type === "Identifier"
      ? key.name
      : key.type === "Literal"
        ? String(key.value)
        : undefined;
  if (!name) {
    return undefined;
  }

  const text = (node: Span | null | undefined) =>
    node ? source.slice(node.start, node.end) : undefined;

  let type: string;
  if (member.type === "TSPropertySignature") {
    type = text(member.typeAnnotation?.typeAnnotation) ?? "any";
  } else if (member.kind === "method") {
    const parameters = source
      .slice(key.end, member.returnType?.start ?? member.end)
      .replace(/^\s*\?/, "")
      .replace(/[;,]\s*$/, "")
      .trim();
    type = `${parameters} => ${text(member.returnType?.typeAnnotation) ?? "void"}`;
  } else {
    return undefined;
  }

  return {
    name,
    type,
    required: !member.optional,
    ...parseJsDoc(member.comments)
  };
}

/**
 * Extract the properties declared by exported `*Props` interfaces and type
 * aliases in TypeScript source files.
 *
 * Parsing is syntactic (via `yuku-parser`): each property's `type` is its
 * annotation as written, and `description` / `default` / `deprecated` come
 * from its JSDoc comment (`@default` or `@defaultValue`, `@deprecated`).
 */
export function extractProperties(
  files: { path: string; content?: string }[]
): Properties {
  const properties: Properties = {};

  for (const file of files) {
    if (!file.content || !TYPESCRIPT_FILE.test(file.path)) {
      continue;
    }

    const source = file.content;
    const { program } = parse(source, {
      path: file.path,
      attachComments: true
    });

    const declarations = new Map<string, TSSignature[]>();
    // exported name -> local name
    const exported = new Map<string, string>();

    for (const statement of program.body) {
      const isExport = statement.type === "ExportNamedDeclaration";
      const declaration = isExport ? statement.declaration : statement;

      if (isExport && !statement.source) {
        for (const specifier of statement.specifiers) {
          if (
            specifier.local.type === "Identifier" &&
            specifier.exported.type === "Identifier"
          ) {
            exported.set(specifier.exported.name, specifier.local.name);
          }
        }
      }

      let name: string | undefined;
      if (declaration?.type === "TSInterfaceDeclaration") {
        name = declaration.id.name;
        declarations.set(name, declaration.body.body);
      } else if (declaration?.type === "TSTypeAliasDeclaration") {
        name = declaration.id.name;
        declarations.set(name, membersOf(declaration.typeAnnotation));
      }

      if (isExport && name) {
        exported.set(name, name);
      }
    }

    for (const [exportedName, localName] of exported) {
      const members = declarations.get(localName);
      if (!PROPS_NAME.test(exportedName) || !members) {
        continue;
      }

      const extracted = members
        .map(member => toProperty(member, source))
        .filter((property): property is Property => Boolean(property));
      if (extracted.length > 0) {
        properties[exportedName] = extracted;
      }
    }
  }

  return properties;
}
