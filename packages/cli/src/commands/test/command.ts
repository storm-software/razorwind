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

import type { CommandMetadata } from "@shell-shock/core";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const metadata = {
  title: "Test",
  description:
    "Runs accessibility (a11y) tests against HTML files, directories of HTML files, or URLs using axe-core.",
  icon: "♿"
} satisfies CommandMetadata;

export interface TestOptions {
  /**
   * The axe-core rule tags to run (for example "wcag2a", "wcag2aa", or "best-practice"). Runs all rules if not specified.
   *
   * @remarks
   * See https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#axe-core-tags for the full list of available tags.
   */
  tags?: string[];
}

async function resolveTargets(target: string): Promise<string[]> {
  if (/^https?:\/\//.test(target)) {
    return [target];
  }

  const path = resolve(target);
  if ((await stat(path)).isFile()) {
    return [path];
  }

  return (await readdir(path, { recursive: true }))
    .filter(file => file.endsWith(".html") && !file.includes("node_modules"))
    .map(file => join(path, file));
}

async function audit(target: string, tags?: string[]) {
  // ponytail: jsdom has no layout engine or page scripts, so color-contrast results come back "incomplete" and client-rendered pages are tested pre-render; swap in a headless browser if that matters
  const dom = target.startsWith("http")
    ? await JSDOM.fromURL(target, { runScripts: "outside-only" })
    : new JSDOM(await readFile(target, "utf8"), {
        url: pathToFileURL(target).href,
        runScripts: "outside-only"
      });

  try {
    dom.window.eval(axe.source);
    const results: axe.AxeResults = await (
      dom.window as unknown as { axe: typeof axe }
    ).axe.run(
      dom.window.document,
      tags?.length ? { runOnly: { type: "tag", values: tags } } : {}
    );

    return results.violations;
  } finally {
    dom.window.close();
  }
}

/**
 * Runs accessibility (a11y) tests against the provided targets using axe-core.
 *
 * @param options - The options for the accessibility tests.
 * @param targets - HTML files, directories containing HTML files, or http(s) URLs to test.
 * @returns A promise that resolves when all targets have been tested. The process exit code is set to 1 if any violations are found.
 */
async function handler(options: TestOptions = {}, ...targets: string[]) {
  if (targets.length === 0) {
    throw new Error(
      "No targets provided. Pass one or more HTML files, directories, or URLs to test."
    );
  }

  const files = (await Promise.all(targets.map(resolveTargets))).flat();
  if (files.length === 0) {
    throw new Error(`No HTML files found in: ${targets.join(", ")}`);
  }

  let total = 0;
  for (const file of files) {
    const violations = await audit(file, options.tags);
    total += violations.length;

    console.log(
      `${violations.length ? "✖" : "✔"} ${file} (${violations.length} violation(s))`
    );
    for (const violation of violations) {
      console.log(
        `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help} - ${violation.helpUrl}`
      );
      for (const node of violation.nodes) {
        console.log(`    ${node.target.join(" ")}`);
      }
    }
  }

  console.log(
    `\n${total} accessibility violation(s) found across ${files.length} file(s).`
  );
  if (total > 0) {
    process.exitCode = 1;
  }
}

export default handler;
