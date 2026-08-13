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

import { existsSync } from "@stryke/fs/exists";
import { copyFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Fonts } from "../../schema/fonts";

/**
 * Copy local font files into `destDir`. Google Fonts entries are skipped.
 *
 * @returns Destination paths that were written.
 */
export async function copyFontFiles(
  fonts: Fonts | undefined,
  destDir: string
): Promise<string[]> {
  if (!fonts) {
    return [];
  }

  const written: string[] = [];

  for (const font of Object.values(fonts)) {
    if (font.source !== "local") {
      continue;
    }

    await mkdir(destDir, { recursive: true });

    for (const file of font.files) {
      if (!file.path || !existsSync(file.path)) {
        continue;
      }

      const dest = join(destDir, basename(file.path));
      await copyFile(file.path, dest);
      written.push(dest);
    }
  }

  return written;
}
