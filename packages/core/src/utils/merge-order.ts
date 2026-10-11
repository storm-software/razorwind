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


/**
 * Merge several name sequences into a single ranking that preserves the order
 * in which names were first encountered. A name not seen before is placed
 * right after the preceding name of its own sequence, so names shared between
 * sequences keep the same relative order everywhere they appear.
 *
 * @example
 * mergeOrder([["a", "c"], ["b", "c", "a"]]) // Map { "b" => 0, "a" => 1, "c" => 2 }
 */
export function mergeOrder(sequences: string[][]): Map<string, number> {
  const merged: string[] = [];

  for (const sequence of sequences) {
    let previous = -1;
    for (const name of sequence) {
      const index = merged.indexOf(name);
      if (index === -1) {
        merged.splice(++previous, 0, name);
      } else {
        previous = index;
      }
    }
  }

  return new Map(merged.map((name, index) => [name, index]));
}
