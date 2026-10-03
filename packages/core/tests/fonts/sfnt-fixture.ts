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

export interface SfntFixture {
  family: string;
  typographicFamily?: string;
  weight?: number;
  fsSelection?: number;
  italicAngle?: number;
  wght?: [number, number];
}

function nameTable(records: [nameId: number, value: string][]): Buffer {
  const strings = records.map(([, value]) => Buffer.from(value, "utf16le"));
  for (const string of strings) {
    string.swap16();
  }

  const header = Buffer.alloc(6 + records.length * 12);
  header.writeUInt16BE(records.length, 2);
  header.writeUInt16BE(header.length, 4);

  let offset = 0;
  records.forEach(([nameId], index) => {
    const record = 6 + index * 12;
    header.writeUInt16BE(3, record);
    header.writeUInt16BE(1, record + 2);
    header.writeUInt16BE(0x0409, record + 4);
    header.writeUInt16BE(nameId, record + 6);
    header.writeUInt16BE(strings[index]!.length, record + 8);
    header.writeUInt16BE(offset, record + 10);
    offset += strings[index]!.length;
  });

  return Buffer.concat([header, ...strings]);
}

/** Build a minimal TrueType file holding only the tables the reader uses. */
export function buildSfnt(fixture: SfntFixture): Buffer {
  const os2 = Buffer.alloc(78);
  os2.writeUInt16BE(fixture.weight ?? 400, 4);
  os2.writeUInt16BE(fixture.fsSelection ?? 0x40, 62);

  const post = Buffer.alloc(32);
  post.writeUInt32BE(0x00030000, 0);
  post.writeInt32BE(Math.round((fixture.italicAngle ?? 0) * 65_536), 4);

  const tables: [string, Buffer][] = [
    [
      "name",
      nameTable([
        [1, fixture.family],
        ...(fixture.typographicFamily
          ? [[16, fixture.typographicFamily] as [number, string]]
          : [])
      ])
    ],
    ["OS/2", os2],
    ["post", post]
  ];

  if (fixture.wght) {
    const fvar = Buffer.alloc(16 + 20);
    fvar.writeUInt16BE(1, 0);
    fvar.writeUInt16BE(16, 4);
    fvar.writeUInt16BE(2, 6);
    fvar.writeUInt16BE(1, 8);
    fvar.writeUInt16BE(20, 10);
    fvar.write("wght", 16, "latin1");
    fvar.writeInt32BE(fixture.wght[0] * 65_536, 20);
    fvar.writeInt32BE(fixture.wght[0] * 65_536, 24);
    fvar.writeInt32BE(fixture.wght[1] * 65_536, 28);
    tables.push(["fvar", fvar]);
  }

  const directory = Buffer.alloc(12 + tables.length * 16);
  directory.writeUInt32BE(0x00010000, 0);
  directory.writeUInt16BE(tables.length, 4);

  let offset = directory.length;
  tables.forEach(([tag, data], index) => {
    const record = 12 + index * 16;
    directory.write(tag, record, "latin1");
    directory.writeUInt32BE(offset, record + 8);
    directory.writeUInt32BE(data.length, record + 12);
    offset += data.length;
  });

  return Buffer.concat([directory, ...tables.map(([, data]) => data)]);
}
