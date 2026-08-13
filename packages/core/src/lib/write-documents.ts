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

import type { GeneratedDocument } from "@power-plant/core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

/**
 * Persist generator documents to disk.
 *
 * Power Plant's default `@power-plant/unstorage-output` is not always
 * resolvable from Razorwind, so the generator writes files itself.
 *
 * @param documents - Documents keyed by output path.
 * @param cwd - Directory used to resolve relative document paths.
 * @returns Absolute paths that were written.
 */
export async function writeGeneratedDocuments(
  documents: Record<string, GeneratedDocument> | undefined,
  cwd: string
): Promise<string[]> {
  const written: string[] = [];

  for (const [key, document] of Object.entries(documents ?? {})) {
    const relativePath = document?.path || key;
    if (!relativePath) {
      continue;
    }

    const filePath = isAbsolute(relativePath)
      ? relativePath
      : resolve(cwd, relativePath);
    const content = (document?.chunks ?? [])
      .map(chunk => chunk.content ?? "")
      .join("");

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
    written.push(filePath);
  }

  return written;
}
