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

import type { ExecutionContext } from "@power-plant/core";
import type { Config } from "@razorwind/core";
import { prepareSpec, resolveConfig } from "@razorwind/core";
import type { Schema } from "@razorwind/core/schema";
import { schema } from "@razorwind/core/schema";
import { joinPaths } from "@stryke/path/join";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type {
  DesignSystemSnapshot,
  GuidelineDocument
} from "./runtime/records";
import { createSnapshot, isSnapshot } from "./snapshot";
import type { DesignSystemSourceOptions } from "./types";

function resolvePath(path: string, root: string): string {
  return isAbsolute(path) ? path : joinPaths(root, path);
}

const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Parse a Markdown guideline file: optional YAML-ish front matter with
 * `title` and `keywords` (comma-separated or `[a, b]`), followed by the body.
 */
export function parseGuidelineMarkdown(
  fileName: string,
  markdown: string
): GuidelineDocument {
  const id = fileName.replace(/\.(?:md|mdx|markdown)$/i, "");
  let content = markdown;
  let title: string | undefined;
  const keywords = new Set<string>(
    id
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(word => word.toLowerCase())
  );

  const match = FRONT_MATTER_RE.exec(markdown);
  if (match?.[1] !== undefined) {
    content = markdown.slice(match[0].length);
    for (const line of match[1].split("\n")) {
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey?.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (!key || !value) {
        continue;
      }
      if (key === "title") {
        title = value.replaceAll(/^['"]|['"]$/g, "");
      } else if (key === "keywords" || key === "tags") {
        for (const keyword of value
          .replaceAll(/^\[|\]$/g, "")
          .split(",")
          .map(entry => entry.trim().replaceAll(/^['"]|['"]$/g, ""))
          .filter(Boolean)) {
          keywords.add(keyword);
        }
      }
    }
  }

  title ??= /^#{1,6}[ \t]+(\S.*)$/m.exec(content)?.[1]?.trim();
  if (title) {
    keywords.add(title.toLowerCase());
  }

  return { id, title, keywords: [...keywords], content: content.trim() };
}

/**
 * Load guideline documents from the `guidelines` option (inline list or a
 * directory of Markdown files).
 */
export async function loadGuidelines(
  guidelines: DesignSystemSourceOptions["guidelines"],
  root: string
): Promise<GuidelineDocument[]> {
  if (!guidelines) {
    return [];
  }
  if (Array.isArray(guidelines)) {
    return guidelines;
  }

  const directory = resolvePath(guidelines, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const docs: GuidelineDocument[] = [];

  for (const entry of entries
    .filter(
      entry => entry.isFile() && /\.(?:md|mdx|markdown)$/i.test(entry.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const markdown = await readFile(joinPaths(directory, entry.name), "utf8");
    docs.push(parseGuidelineMarkdown(entry.name, markdown));
  }

  return docs;
}

function parseSchema(value: unknown, source: string): Schema {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `@razorwind/shell-shock could not parse the design system in ${source}: ${parsed.error.message}`
    );
  }
  return parsed.data;
}

/**
 * Resolve the Razorwind config under `root` and extract the design system
 * (tokens, components, icons, fonts) exactly as `razorwind generate` would.
 */
export async function extractSpec(
  root: string,
  configFile?: string
): Promise<Schema> {
  const config = await resolveConfig(root, {
    configFile,
    mode: "production"
  });

  // `prepareSpec` refuses to run without plugins; extraction itself does not
  // need any, so register a placeholder when the consumer only uses the
  // config for its token / component / icon / font sources.
  if (config.plugins.length === 0) {
    config.plugins = [{ name: "shell-shock" }];
  }

  const context = {
    cwd: root,
    options: config
  } as unknown as ExecutionContext<Schema, Config, void>;

  return prepareSpec(context);
}

/**
 * Load the design system described by {@link DesignSystemSourceOptions} and
 * build the snapshot baked into the Shell Shock build.
 *
 * Relative `specFile`, `guidelines` and `root` paths resolve against
 * `defaultRoot` (the Shell Shock project root).
 */
export async function loadDesignSystem(
  options: DesignSystemSourceOptions,
  defaultRoot: string
): Promise<DesignSystemSnapshot> {
  const guidelines = await loadGuidelines(options.guidelines, defaultRoot);
  const snapshotOptions = {
    stripFileContents: options.stripFileContents,
    guidelines
  };

  if (options.spec) {
    return createSnapshot(options.spec, snapshotOptions);
  }

  if (options.specFile) {
    const file = resolvePath(options.specFile, defaultRoot);
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));

    if (isSnapshot(parsed)) {
      const snapshot = createSnapshot(
        parseSchema(parsed.spec, file),
        snapshotOptions
      );
      const merged = [...(parsed.guidelines ?? []), ...guidelines];
      if (merged.length > 0) {
        snapshot.guidelines = merged;
      }
      return snapshot;
    }

    return createSnapshot(parseSchema(parsed, file), snapshotOptions);
  }

  const root = options.root
    ? resolvePath(options.root, defaultRoot)
    : defaultRoot;

  return createSnapshot(
    await extractSpec(root, options.configFile),
    snapshotOptions
  );
}
