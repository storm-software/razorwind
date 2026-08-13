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

import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import { flattenTokens, resolveTokenSets } from "../src/flatten";
import { formatTokenValue } from "../src/format";
import {
  generateNotepadPlusPlusTheme,
  normalizeThemes,
  renderInstallMd,
  renderNotepadPlusPlusTheme,
  toNppColor
} from "../src/generate";
import npp, { type NotepadPlusPlusTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    bg: {
      $value: {
        colorSpace: "srgb",
        components: [0.157, 0.165, 0.212],
        hex: "#282a36"
      }
    },
    fg: {
      $value: "#f8f8f2"
    },
    comment: {
      $value: "#7c8eb2"
    },
    string: {
      $value: "#f1fa8c"
    },
    keyword: {
      $value: "#ff79c6"
    },
    function: {
      $value: "#50fa7b"
    },
    selection: {
      $value: "#44475a"
    },
    caret: {
      $value: "#8be9fd"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      bg: { $value: "#ffffff" },
      fg: { $value: "#111111" },
      comment: { $value: "#6a737d" },
      string: { $value: "#032f62" },
      keyword: { $value: "#d73a49" },
      function: { $value: "#6f42c1" },
      selection: { $value: "#c8e1ff" },
      caret: { $value: "#005cc5" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {}, fonts: {},
  tokens
} as Schema;

function mapDraculaTheme(): NotepadPlusPlusTheme {
  return {
    name: "dracula",
    displayName: "Dracula",
    description: "A dark theme style based on the Dracula Theme color palette.",
    author: "Dracula Theme",
    license: "MIT",
    globalStyles: [
      {
        name: "Default Style",
        styleID: 32,
        fgColor: "#f8f8f2",
        bgColor: "#282a36",
        fontStyle: 0
      },
      {
        name: "Caret colour",
        styleID: 2069,
        fgColor: "#8be9fd"
      },
      {
        name: "Selected text colour",
        styleID: 0,
        fgColor: "#f8f8f2",
        bgColor: "#44475a"
      }
    ],
    lexerStyles: [
      {
        name: "xml",
        desc: "XML",
        wordsStyles: [
          {
            name: "DEFAULT",
            styleID: 0,
            fgColor: "#f8f8f2",
            bgColor: "#282a36",
            colorStyle: 0
          },
          {
            name: "COMMENT",
            styleID: 9,
            fgColor: "#7c8eb2",
            bgColor: "#282a36",
            colorStyle: 1
          },
          {
            name: "STRING",
            styleID: 6,
            fgColor: "#f1fa8c",
            bgColor: "#282a36",
            colorStyle: 1
          }
        ]
      },
      {
        name: "cpp",
        desc: "C++",
        wordsStyles: [
          {
            name: "INSTRUCTION WORD",
            styleID: 5,
            fgColor: "#ff79c6",
            bgColor: "#282a36",
            fontStyle: 1,
            colorStyle: 1,
            keywordClass: "instre1"
          },
          {
            name: "FUNCTION",
            styleID: 6,
            fgColor: "#50fa7b",
            bgColor: "#282a36",
            colorStyle: 1,
            keywordClass: "instre2"
          }
        ]
      }
    ]
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.157, 0.165, 0.212],
          hex: "#282a36"
        },
        "color"
      )
    ).toBe("#282a36");
  });
});

describe("toNppColor", () => {
  it("strips # and uppercases hex", () => {
    expect(toNppColor("#282a36")).toBe("282A36");
    expect(toNppColor("f8f8f2")).toBe("F8F8F2");
  });

  it("rejects invalid colors", () => {
    expect(() => toNppColor("red")).toThrow(/Invalid Notepad\+\+ color/);
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.bg",
        "color.fg",
        "color.comment",
        "color.keyword"
      ])
    );
    expect(flat.find(token => token.path === "color.bg")?.cssValue).toBe(
      "#282a36"
    );
  });

  it("splits multi-theme records", () => {
    const sets = resolveTokenSets(multiThemeTokens);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("normalizeThemes", () => {
  it("accepts a single theme, array, or record", () => {
    const single = mapDraculaTheme();
    expect(normalizeThemes(single)).toHaveLength(1);
    expect(
      normalizeThemes([single, { ...single, name: "alucard" }])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "alucard" }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name", () => {
    expect(() =>
      normalizeThemes([
        { globalStyles: [] } as unknown as NotepadPlusPlusTheme
      ])
    ).toThrow(/must be a NotepadPlusPlusTheme/);
  });
});

describe("renderNotepadPlusPlusTheme", () => {
  it("writes Notepad++ XML with lexer and global styles", () => {
    const body = renderNotepadPlusPlusTheme(mapDraculaTheme());
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
    expect(body).toContain("<NotepadPlus>");
    expect(body).toContain('<LexerType name="xml" desc="XML" ext="">');
    expect(body).toContain(
      '<WordsStyle name="DEFAULT" styleID="0" fgColor="F8F8F2" bgColor="282A36"'
    );
    expect(body).toContain(
      '<WordsStyle name="COMMENT" styleID="9" fgColor="7C8EB2" bgColor="282A36"'
    );
    expect(body).toContain('<WidgetStyle name="Default Style" styleID="32"');
    expect(body).toContain('fgColor="8BE9FD"');
    expect(body).toContain("</NotepadPlus>");
  });

  it("honors xml override", () => {
    const body = renderNotepadPlusPlusTheme({
      name: "custom",
      xml: '<?xml version="1.0" encoding="UTF-8" ?><NotepadPlus></NotepadPlus>'
    });
    expect(body).toBe(
      '<?xml version="1.0" encoding="UTF-8" ?><NotepadPlus></NotepadPlus>\n'
    );
  });

  it("requires theme content", () => {
    expect(() =>
      renderNotepadPlusPlusTheme({ name: "empty" })
    ).toThrow(/must include lexerStyles/);
  });
});

describe("renderInstallMd", () => {
  it("documents Notepad++ copy + Style Configurator steps", () => {
    const md = renderInstallMd({
      themes: [
        {
          name: "dracula",
          displayName: "Dracula",
          fileName: "dracula.xml"
        }
      ]
    });
    expect(md).toContain("Dracula");
    expect(md).toContain("dracula.xml");
    expect(md).toContain("%AppData%\\Notepad++\\themes");
    expect(md).toContain("Style Configurator");
    expect(md).toContain("draculatheme.com/notepad-plus-plus");
  });
});

describe("notepad-plus-plus plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = npp({ mapTheme: mapDraculaTheme });
    expect(plugin.name).toBe("notepad-plus-plus");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = npp();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateNotepadPlusPlusTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates theme XML files and INSTALL.md", async () => {
    const plugin = npp({
      outputPath: "out/npp",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme",
          globalStyles: [
            {
              name: "Default Style",
              styleID: 32,
              fgColor: color("color.fg"),
              bgColor: color("color.bg")
            }
          ],
          lexerStyles: [
            {
              name: "xml",
              desc: "XML",
              wordsStyles: [
                {
                  name: "COMMENT",
                  styleID: 9,
                  fgColor: color("color.comment"),
                  bgColor: color("color.bg"),
                  colorStyle: 1
                }
              ]
            }
          ]
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual(["out/npp/INSTALL.md", "out/npp/demo-theme.xml"]);

    const theme = documents["out/npp/demo-theme.xml"]!.chunks![0]!.content;
    expect(theme).toContain('fgColor="F8F8F2"');
    expect(theme).toContain('bgColor="282A36"');
    expect(theme).toContain('fgColor="7C8EB2"');

    const install = documents["out/npp/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("demo-theme.xml");
    expect(install).toContain("Style Configurator");
  });

  it("generateNotepadPlusPlusTheme mirrors plugin generate output", () => {
    const documents = generateNotepadPlusPlusTheme(spec, {
      mapTheme: mapDraculaTheme
    });

    expect(documents["notepad-plus-plus-themes/dracula.xml"]).toBeDefined();
    expect(documents["notepad-plus-plus-themes/INSTALL.md"]).toBeDefined();
    const theme =
      documents["notepad-plus-plus-themes/dracula.xml"]!.chunks![0]!.content;
    expect(theme).toContain("Dracula");
    expect(theme).toContain("<LexerType name=\"cpp\"");
  });

  it("fills fontName from spec.fonts when styles omit it", () => {
    const documents = generateNotepadPlusPlusTheme(
      {
        ...spec,
        fonts: {
          inter: {
            name: "inter",
            title: "Inter",
            source: "google",
            family: "Inter",
            role: "sans"
          }
        }
      },
      { mapTheme: mapDraculaTheme }
    );

    const theme =
      documents["notepad-plus-plus-themes/dracula.xml"]!.chunks![0]!.content;
    expect(theme).toContain('fontName="Inter"');
  });

  it("emits one file per mapped theme", () => {
    const documents = generateNotepadPlusPlusTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const color = (path: string) =>
              flat.find(token => token.path === path)?.cssValue ?? "#000000";
            return {
              name: `demo-${set.id}`,
              globalStyles: [
                {
                  name: "Default Style",
                  styleID: 32,
                  fgColor: color("color.fg"),
                  bgColor: color("color.bg")
                }
              ]
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "notepad-plus-plus-themes/INSTALL.md",
      "notepad-plus-plus-themes/demo-dark.xml",
      "notepad-plus-plus-themes/demo-light.xml"
    ]);
  });

  it("uses installGuide override when provided", () => {
    const documents = generateNotepadPlusPlusTheme(spec, {
      mapTheme: mapDraculaTheme,
      installGuide: "# Custom install\n"
    });
    expect(
      documents["notepad-plus-plus-themes/INSTALL.md"]!.chunks![0]!.content
    ).toBe("# Custom install\n");
  });
});
