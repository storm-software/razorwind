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

import type { Schema } from "@razorwind/core/schema";
import type {
  DesignSystemSnapshot,
  GuidelineDocument
} from "./runtime/records";

export interface CreateSnapshotOptions {
  /**
   * Omit component / icon `files[].content` to keep the snapshot small.
   *
   * @defaultValue true
   */
  stripFileContents?: boolean;
  /** Extra guideline documents to bundle. */
  guidelines?: GuidelineDocument[];
}

function stripContents<T extends { files?: Array<{ content?: string }> }>(
  entries: Record<string, T>
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [
      key,
      entry.files
        ? {
            ...entry,
            files: entry.files.map(({ content: _content, ...file }) => file)
          }
        : entry
    ])
  );
}

/**
 * Build the JSON-serializable {@link DesignSystemSnapshot} baked into a
 * Shell Shock build (and written as `design-system.json`).
 */
export function createSnapshot(
  spec: Schema,
  options: CreateSnapshotOptions = {}
): DesignSystemSnapshot {
  const strip = options.stripFileContents !== false;

  const snapshot: DesignSystemSnapshot = {
    spec: {
      ...spec,
      components: strip
        ? stripContents(spec.components ?? {})
        : (spec.components ?? {}),
      icons: strip ? stripContents(spec.icons ?? {}) : (spec.icons ?? {}),
      fonts: spec.fonts ?? {}
    }
  };

  if (options.guidelines && options.guidelines.length > 0) {
    snapshot.guidelines = options.guidelines;
  }

  return snapshot;
}

/**
 * True when a parsed JSON document is a {@link DesignSystemSnapshot} rather
 * than a bare {@link Schema}.
 */
export function isSnapshot(value: unknown): value is DesignSystemSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "spec" in value &&
    typeof (value as DesignSystemSnapshot).spec === "object"
  );
}
