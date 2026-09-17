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

/** Escape content for a GitHub-flavored Markdown table cell. */
export function escapeTableCell(value: unknown): string {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll(/\r?\n/g, "<br>");
}

/** Wrap source content in a fence longer than any backtick run it contains. */
export function codeFence(content: string, language = ""): string {
  const longest = Math.max(
    0,
    ...[...content.matchAll(/`+/g)].map(match => match[0].length)
  );
  const fence = "`".repeat(Math.max(3, longest + 1));

  return `${fence}${language}\n${content}\n${fence}`;
}

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

/** Return an absolute HTTP(S) URL when the input is valid. */
export function validHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return parseHttpUrl(value)?.toString().replace(/\/$/, "");
}

/** Resolve a companion filename against an optional absolute HTTP(S) base. */
export function resolveResourceUrl(
  baseUrl: string | undefined,
  file: string
): string {
  if (baseUrl === undefined) {
    return file;
  }

  const parsed = parseHttpUrl(baseUrl);
  if (!parsed) {
    throw new Error("baseUrl must be an absolute HTTP(S) URL.");
  }

  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return new URL(file, parsed).toString();
}
