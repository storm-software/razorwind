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

/**
 * Escape plain markdown so it compiles as MDX: `{`, `}` and `<` are
 * backslash-escaped outside fenced code blocks and inline code spans, so
 * MDX does not parse them as expressions or JSX.
 *
 * @remarks
 * Raw HTML in the markdown (e.g. `<br>`) is rendered as literal text rather
 * than failing the MDX compile.
 */
export function escapeMdx(markdown: string): string {
  let fence: string | undefined;

  return markdown
    .split("\n")
    .map(line => {
      const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (marker?.[0] === fence[0] && marker.length >= fence.length) {
          fence = undefined;
        }
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }

      return line.replace(/(`+)[\s\S]*?\1|[{}<]/g, (match, ticks?: string) =>
        ticks ? match : `\\${match}`
      );
    })
    .join("\n");
}
