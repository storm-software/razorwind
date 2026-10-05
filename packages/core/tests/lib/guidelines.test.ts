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

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadGuidelines, parseGuideline } from "../../src/lib/guidelines";
import { escapeMdx } from "../../src/utils/escape-mdx";
import {
  groupGuidelines,
  renderGuidelineBody
} from "../../src/utils/group-guidelines";

describe("parseGuideline", () => {
  it("moves name / version to top-level fields and keeps the rest in data", () => {
    expect(
      parseGuideline(
        "buttons",
        "---\nname: Button Usage\nversion: 2\ntags: [cta]\nowner: design\n---\n\n# Buttons\n"
      )
    ).toEqual({
      name: "Button Usage",
      version: "2",
      content: "# Buttons",
      data: { tags: ["cta"], owner: "design" }
    });
  });

  it("title-cases the id when frontmatter has no name", () => {
    expect(parseGuideline("empty-states", "Body.")).toEqual({
      name: "Empty States",
      content: "Body."
    });
  });
});

describe("loadGuidelines", () => {
  it("keys guidelines by file name and nests sub-directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-guidelines-"));
    await mkdir(join(dir, "components"));
    await writeFile(join(dir, "voice.md"), "Be direct.");
    await writeFile(join(dir, "notes.txt"), "ignored");
    await writeFile(join(dir, "components", "buttons.mdx"), "One primary.");

    const guidelines = await loadGuidelines({
      cwd: dir,
      options: { guidelinesPath: "." }
    } as Parameters<typeof loadGuidelines>[0]);

    expect(guidelines).toEqual({
      voice: { name: "Voice", content: "Be direct." },
      components: { buttons: { name: "Buttons", content: "One primary." } }
    });
    expect(
      groupGuidelines(guidelines).map(group => [
        group.title,
        group.guidelines.map(entry => entry.path)
      ])
    ).toEqual([
      ["", ["voice"]],
      ["Components", ["components/buttons"]]
    ]);
  });
});

describe("renderGuidelineBody", () => {
  it("drops a duplicate leading title and demotes headings outside fences", () => {
    expect(
      renderGuidelineBody(
        {
          name: "Voice",
          content: "# Voice\n\n## Tone\n\n```md\n# literal\n```"
        },
        1
      )
    ).toBe("### Tone\n\n```md\n# literal\n```");
  });
});

describe("escapeMdx", () => {
  it("escapes braces and tags outside fenced and inline code", () => {
    expect(
      escapeMdx("Use {token} or <br> but `{ok}`.\n```tsx\n<Button />\n```")
    ).toBe("Use \\{token\\} or \\<br> but `{ok}`.\n```tsx\n<Button />\n```");
  });
});
