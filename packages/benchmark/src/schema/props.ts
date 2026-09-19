/*
 * Adapted from open-design-system-bench by Christoph Hellmuth.
 * Source: https://github.com/christophhdesign/open-design-system-bench
 * Revision: e258a12dff8d483746e9a9ebfa655fa827301e13
 * License: MIT (see ../NOTICE in the published package).
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { withCompilerOptions } from "react-docgen-typescript";
import ts from "typescript";
import type { ComponentPropMap } from "../types";

export interface EmbeddedComponentFile {
  path: string;
  content?: string;
}

function safeFileName(path: string, index: number): string {
  const extension = extname(path).toLowerCase();
  const supported = [".ts", ".tsx", ".js", ".jsx"].includes(extension)
    ? extension
    : ".tsx";
  const stem = basename(path, extname(path)).replaceAll(/[^a-zA-Z0-9_-]/g, "-");
  return `${String(index).padStart(3, "0")}-${stem || "component"}${supported}`;
}

export async function extractComponentProps(
  files: EmbeddedComponentFile[] | undefined
): Promise<ComponentPropMap | null> {
  const sources = (files ?? []).filter(
    (file): file is EmbeddedComponentFile & { content: string } =>
      typeof file.content === "string" && file.content.trim().length > 0
  );
  if (sources.length === 0) return null;

  const directory = await mkdtemp(join(tmpdir(), "razorwind-benchmark-props-"));
  try {
    await mkdir(directory, { recursive: true });
    const paths = await Promise.all(
      sources.map(async (file, index) => {
        const path = join(directory, safeFileName(file.path, index));
        await writeFile(path, file.content, "utf8");
        return path;
      })
    );

    const parser = withCompilerOptions(
      {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        esModuleInterop: true,
        skipLibCheck: true
      },
      {
        shouldExtractLiteralValuesFromEnum: true,
        shouldRemoveUndefinedFromOptional: true,
        shouldSortUnions: true
      }
    );
    const documents = parser.parse(paths);
    const props: ComponentPropMap = {};
    for (const document of documents) {
      for (const [name, prop] of Object.entries(document.props)) {
        props[name] = {
          required: prop.required,
          type: prop.type.raw ?? prop.type.name
        };
      }
    }
    return Object.keys(props).length > 0 ? props : null;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
