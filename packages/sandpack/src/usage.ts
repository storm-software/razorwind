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
  Component,
  Components,
  ComponentUsage
} from "@razorwind/core/schema";
import { isObject } from "@razorwind/core/utils";
import { titleCase } from "@stryke/string-format/title-case";
import type { SandpackFiles, SandpackUsage } from "./types";

function extensionFromLanguage(
  language: ComponentUsage["language"] | undefined,
  path: string
): string {
  if (language === "tsx" || language === "jsx") {
    return language;
  }
  if (language === "ts") {
    return "ts";
  }
  if (language === "js") {
    return "js";
  }
  if (language === "css") {
    return "css";
  }
  if (language === "html") {
    return "html";
  }
  if (language === "md" || language === "mdx") {
    return language;
  }

  const match = path.match(/\.([^.]+)$/);
  return match?.[1] ?? "js";
}

function appPathForUsage(usage: ComponentUsage): string {
  const ext = extensionFromLanguage(usage.language, usage.path);
  if (ext === "css") {
    return "/styles.css";
  }
  if (ext === "html") {
    return "/index.html";
  }
  if (ext === "tsx") {
    return "/App.tsx";
  }
  if (ext === "jsx" || ext === "js") {
    return "/App.js";
  }
  if (ext === "ts") {
    return "/App.ts";
  }
  return `/App.${ext}`;
}

function sandpackPathFromComponentFile(path: string, target?: string): string {
  const raw = (target ?? path).replaceAll("\\", "/");
  const withoutPlaceholders = raw
    .replace(/^@components\//, "/")
    .replace(/^@ui\//, "/")
    .replace(/^@lib\//, "/")
    .replace(/^@hooks\//, "/");
  const normalized = withoutPlaceholders.startsWith("/")
    ? withoutPlaceholders
    : `/${withoutPlaceholders.replace(/^\.\//, "")}`;
  return normalized;
}

/**
 * Build Sandpack `files` for a single component usage example.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export function usageToSandpackFiles(
  usage: ComponentUsage,
  component: Component
): SandpackFiles | undefined {
  const code = usage.content?.trim();
  if (!code) {
    return undefined;
  }

  const files: SandpackFiles = {
    [appPathForUsage(usage)]: {
      code,
      active: true
    }
  };

  for (const file of component.files ?? []) {
    if (!file.content?.trim()) {
      continue;
    }
    const sandpackPath = sandpackPathFromComponentFile(file.path, file.target);
    if (sandpackPath in files) {
      continue;
    }
    files[sandpackPath] = {
      code: file.content,
      readOnly: true,
      hidden: true
    };
  }

  return files;
}

function usageDemoName(component: Component, usage: ComponentUsage): string {
  const usageId =
    usage.name ??
    usage.path
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ??
    "default";
  return `${component.name}-${usageId}`;
}

/**
 * Derive Sandpack usage demos from extracted `schema.components[].usage`.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export function buildUsageFromComponents(
  components: Components,
  options: { template?: string } = {}
): SandpackUsage[] {
  if (!isObject(components)) {
    return [];
  }

  const template = options.template ?? "react";
  const demos: SandpackUsage[] = [];

  for (const component of Object.values(components)) {
    if (!component?.usage?.length) {
      continue;
    }

    for (const usage of component.usage) {
      const files = usageToSandpackFiles(usage, component);
      if (!files) {
        continue;
      }

      const name = usageDemoName(component, usage);
      demos.push({
        name,
        displayName: usage.title ?? titleCase(name),
        component: component.name,
        title: usage.title,
        description: usage.description,
        template,
        files,
        ...(component.dependencies
          ? { dependencies: component.dependencies }
          : {})
      });
    }
  }

  return demos;
}

/**
 * Title-case a usage name for display when `displayName` is omitted.
 */
export function usageDisplayName(usage: SandpackUsage): string {
  return usage.displayName ?? usage.title ?? titleCase(usage.name);
}
