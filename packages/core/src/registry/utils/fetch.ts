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

import { fetchRequest } from "@stryke/http/fetch";
import { isURLString } from "@stryke/url/helpers";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { registryItemSchema } from "shadcn/schema";
import { z } from "zod";
import { REGISTRY_URL } from "./base-urls";
import { getRegistryHeadersFromContext } from "./context";

const registryCache = new Map<string, Promise<any>>();

export function clearRegistryCache() {
  registryCache.clear();
}

/**
 * Resolves a registry URL from a path or URL string.
 * Handles special cases like v0 registry URLs that need /json suffix.
 *
 * @param pathOrUrl - Either a relative path or a full URL
 * @returns The resolved registry URL
 */
export function resolveRegistryUrl(pathOrUrl: string) {
  if (isURLString(pathOrUrl)) {
    // If the url contains /chat/b/, we assume it's the v0 registry.
    // We need to add the /json suffix if it's missing.
    const url = new URL(pathOrUrl);
    if (url.pathname.match(/\/chat\/b\//) && !url.pathname.endsWith("/json")) {
      url.pathname = `${url.pathname}/json`;
    }

    return url.toString();
  }

  return `${REGISTRY_URL}/${pathOrUrl}`;
}

export async function fetchRegistry(
  paths: string[],
  options: { useCache?: boolean } = {}
) {
  options = {
    useCache: true,
    ...options
  };

  const results = await Promise.all(
    paths.map(async path => {
      const url = resolveRegistryUrl(path);

      // Check cache first if caching is enabled
      if (options.useCache && registryCache.has(url)) {
        return registryCache.get(url);
      }

      // Store the promise in the cache before awaiting if caching is enabled.
      const fetchPromise = (async () => {
        // Get headers from context for this URL.
        const headers = getRegistryHeadersFromContext(url);
        const requestHeaders: Record<string, string> = {
          Accept: "application/vnd.shadcn.v1+json, application/json;q=0.9",
          "User-Agent": "shadcn"
        };

        for (const [key, value] of Object.entries(headers)) {
          requestHeaders[key] = value;
        }

        const response = await fetchRequest(url, {
          headers: requestHeaders
        });

        if (!response.ok) {
          let messageFromServer;

          if (
            response.headers.get("content-type")?.includes("application/json")
          ) {
            const json = await response.json();
            const parsed = z
              .object({
                // RFC 7807.
                detail: z.string().optional(),
                title: z.string().optional(),
                // Standard error response.
                message: z.string().optional(),
                error: z.string().optional()
              })
              .safeParse(json);

            if (parsed.success) {
              // Prefer RFC 7807 detail field, then message field.
              messageFromServer = parsed.data.detail || parsed.data.message;

              if (parsed.data.error) {
                messageFromServer = `[${parsed.data.error}] ${messageFromServer}`;
              }
            }
          }

          if (response.status === 401) {
            throw new Error(`Unauthorized: ${messageFromServer}`);
          }

          if (response.status === 404) {
            throw new Error(`Not Found: ${messageFromServer}`);
          }

          if (response.status === 410) {
            throw new Error(`Gone: ${messageFromServer}`);
          }

          if (response.status === 403) {
            throw new Error(`Forbidden: ${messageFromServer}`);
          }

          throw new Error(`Fetch Error: ${messageFromServer}`);
        }

        return response.json();
      })();

      if (options.useCache) {
        registryCache.set(url, fetchPromise);
      }
      return fetchPromise;
    })
  );

  return results;
}

export async function fetchRegistryLocal(filePath: string) {
  try {
    // Handle tilde expansion for home directory
    let expandedPath = filePath;
    if (filePath.startsWith("~/")) {
      expandedPath = path.join(homedir(), filePath.slice(2));
    }

    const resolvedPath = path.resolve(expandedPath);
    const content = await fs.readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(content);

    try {
      return registryItemSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Parse Error: ${String(error)}`);
    }
  } catch (error) {
    // Check if this is a file not found error
    if (
      error instanceof Error &&
      (error.message.includes("ENOENT") ||
        error.message.includes("no such file"))
    ) {
      throw new Error(`Local File Error: ${error}`);
    }
    // Re-throw parse errors as-is
    if (error instanceof Error) {
      throw new TypeError(`Parse Error: ${error}`);
    }
    // For other errors (like JSON parse errors), throw as local file error
    throw new Error(`Local File Error: ${String(error)}`);
  }
}
