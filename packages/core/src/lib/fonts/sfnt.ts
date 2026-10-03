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

import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import type { FontFile } from "../../schema/fonts";

export interface SfntMetadata {
  /** Typographic family (`name` ID 16), falling back to the family (ID 1). */
  family?: string;
  /** `OS/2.usWeightClass`, or a `"min max"` range for a variable `wght` axis. */
  weight?: number | string;
  style?: FontFile["style"];
}

const SFNT_VERSIONS = new Set([0x00010000, 0x4f54544f, 0x74727565]); // 1.0, OTTO, true

const NAME_ID_TYPOGRAPHIC_FAMILY = 16;
const NAME_ID_FAMILY = 1;
const PLATFORM_MAC = 1;
const PLATFORM_WINDOWS = 3;
const LANGUAGE_EN_US = 0x0409;

const FS_SELECTION_ITALIC = 1 << 0;
const FS_SELECTION_OBLIQUE = 1 << 9;

interface TableRecord {
  offset: number;
  length: number;
}

function readTables(data: Buffer): Map<string, TableRecord> | undefined {
  if (data.length < 12 || !SFNT_VERSIONS.has(data.readUInt32BE(0))) {
    return undefined;
  }

  const numTables = data.readUInt16BE(4);
  const tables = new Map<string, TableRecord>();
  for (let index = 0; index < numTables; index++) {
    const record = 12 + index * 16;
    if (record + 16 > data.length) {
      return undefined;
    }

    const offset = data.readUInt32BE(record + 8);
    const length = data.readUInt32BE(record + 12);
    if (offset + length <= data.length) {
      tables.set(data.toString("latin1", record, record + 4), {
        offset,
        length
      });
    }
  }

  return tables;
}

function decodeUtf16Be(bytes: Buffer): string {
  const swapped = Buffer.from(bytes);
  swapped.swap16();

  return swapped.toString("utf16le");
}

function readFamilyName(data: Buffer, table: TableRecord): string | undefined {
  if (table.length < 6) {
    return undefined;
  }

  const count = data.readUInt16BE(table.offset + 2);
  const storage = table.offset + data.readUInt16BE(table.offset + 4);
  const candidates: { rank: number; value: string }[] = [];

  for (let index = 0; index < count; index++) {
    const record = table.offset + 6 + index * 12;
    if (record + 12 > table.offset + table.length) {
      break;
    }

    const platformId = data.readUInt16BE(record);
    const encodingId = data.readUInt16BE(record + 2);
    const languageId = data.readUInt16BE(record + 4);
    const nameId = data.readUInt16BE(record + 6);
    const length = data.readUInt16BE(record + 8);
    const start = storage + data.readUInt16BE(record + 10);
    if (
      (nameId !== NAME_ID_TYPOGRAPHIC_FAMILY && nameId !== NAME_ID_FAMILY) ||
      start + length > data.length
    ) {
      continue;
    }

    const bytes = data.subarray(start, start + length);
    let value: string | undefined;
    let rank = nameId === NAME_ID_TYPOGRAPHIC_FAMILY ? 0 : 10;
    if (platformId === PLATFORM_WINDOWS && length % 2 === 0) {
      value = decodeUtf16Be(bytes);
      rank += languageId === LANGUAGE_EN_US ? 0 : 1;
    } else if (platformId === PLATFORM_MAC && encodingId === 0) {
      value = bytes.toString("latin1");
      rank += 2;
    }

    if (value?.trim()) {
      candidates.push({ rank, value: value.trim() });
    }
  }

  return candidates.toSorted((a, b) => a.rank - b.rank)[0]?.value;
}

function readWeightAxis(data: Buffer, table: TableRecord): string | undefined {
  if (table.length < 16) {
    return undefined;
  }

  const axesOffset = table.offset + data.readUInt16BE(table.offset + 4);
  const axisCount = data.readUInt16BE(table.offset + 8);
  const axisSize = data.readUInt16BE(table.offset + 10);

  for (let index = 0; index < axisCount; index++) {
    const axis = axesOffset + index * axisSize;
    if (axis + 16 > table.offset + table.length) {
      break;
    }

    if (data.toString("latin1", axis, axis + 4) === "wght") {
      const min = Math.round(data.readInt32BE(axis + 4) / 65_536);
      const max = Math.round(data.readInt32BE(axis + 12) / 65_536);

      return min === max ? String(min) : `${min} ${max}`;
    }
  }

  return undefined;
}

/**
 * Read family, weight, and style from an uncompressed OpenType / TrueType
 * file. Returns `undefined` for other containers (WOFF, WOFF2, collections)
 * or unreadable files, so callers can fall back to filename inference.
 */
export async function readSfntMetadata(
  path: string
): Promise<SfntMetadata | undefined> {
  let data: Buffer;
  try {
    data = await readFile(path);
  } catch {
    return undefined;
  }

  const tables = readTables(data);
  if (!tables) {
    return undefined;
  }

  const metadata: SfntMetadata = {};

  const name = tables.get("name");
  const family = name ? readFamilyName(data, name) : undefined;
  if (family) {
    metadata.family = family;
  }

  const os2 = tables.get("OS/2");
  if (os2 && os2.length >= 64) {
    const weight = data.readUInt16BE(os2.offset + 4);
    if (weight > 0) {
      metadata.weight = weight;
    }

    const fsSelection = data.readUInt16BE(os2.offset + 62);
    metadata.style =
      fsSelection & FS_SELECTION_OBLIQUE
        ? "oblique"
        : fsSelection & FS_SELECTION_ITALIC
          ? "italic"
          : "normal";
  }

  // Instances outside the RIBBI style-link group often clear the fsSelection
  // italic bit, but keep the slant in `post.italicAngle`.
  const post = tables.get("post");
  if (
    metadata.style !== "oblique" &&
    post &&
    post.length >= 8 &&
    data.readInt32BE(post.offset + 4) !== 0
  ) {
    metadata.style = "italic";
  }

  const fvar = tables.get("fvar");
  const range = fvar ? readWeightAxis(data, fvar) : undefined;
  if (range) {
    metadata.weight = range;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
