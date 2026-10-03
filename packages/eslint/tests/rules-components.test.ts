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

import { describe, expect, it } from "vitest";
import { lintRule } from "./fixture";

describe("no-html-* rules", () => {
  it("names the schema replacement", () => {
    expect(lintRule("no-html-button", `<button>Hi</button>`)[0]?.message).toBe(
      "This <button> should be replaced with a design system component: Button"
    );
    expect(lintRule("no-html-heading", `<h2>Title</h2>`)[0]?.message).toBe(
      "This <h2> should be replaced with a design system component: Heading"
    );
    expect(lintRule("no-html-button", `const B = styled.button({});`)).toHaveLength(1);
  });

  it("matches <input> by type", () => {
    expect(
      lintRule(
        "no-html-text-input",
        `<><input /><input type="email" /><input type="checkbox" /><input type={t} /></>`
      )
    ).toHaveLength(2);
    expect(lintRule("no-html-checkbox", `<input type="checkbox" />`)).toHaveLength(1);
  });
});

describe("use-primitives-text", () => {
  it("reports text-only paragraphs and spans", () => {
    expect(
      lintRule(
        "use-primitives-text",
        `<><p>Hello</p><span>Hi {"there"}</span><span><b>x</b></span></>`
      ).map(message => message.message)
    ).toEqual([
      "This <p> holds text. Use the design system text component: Text",
      "This <span> holds text. Use the design system text component: Text"
    ]);
  });
});

describe("prefer-primitives", () => {
  it("reports styled host elements", () => {
    expect(
      lintRule(
        "prefer-primitives",
        `<><div style={{ display: "flex" }} /><div /></>; const S = styled.section({});`
      ).map(message => message.message)
    ).toEqual([
      "This styled <div> may be replaceable with a design system primitive: Stack",
      "This styled <section> may be replaceable with a design system primitive: Stack"
    ]);
  });
});

describe("no-unsafe-style-overrides", () => {
  const rule = "no-unsafe-style-overrides";

  it("reports style props on design system components", () => {
    expect(
      lintRule(rule, `<><Button style={{}} css={x} className="a" /><Other style={{}} /></>`)
        .map(message => message.message)
    ).toEqual([
      "The style prop overrides Button's styles, which breaks when its internals change. Use its props and variants instead",
      "The css prop overrides Button's styles, which breaks when its internals change. Use its props and variants instead"
    ]);
  });

  it("reports styled() wrappers but not Tamagui styled configs", () => {
    expect(
      lintRule(rule, `const A = styled(Button)({ color: "red" }); const B = styled(Button, { color: "red" });`)
    ).toHaveLength(1);
  });

  it("resolves aliased imports and honours componentModules", () => {
    const code = `
      import { Button as DSButton } from "@acme/ui/button";
      import { Card } from "other";
      const a = <><DSButton style={{}} /><Card style={{}} /></>;
    `;
    expect(lintRule(rule, code)).toHaveLength(2);
    expect(lintRule(rule, code, { componentModules: ["@acme/ui"] })).toHaveLength(1);
  });
});

describe("icon-label", () => {
  it("requires a label or decorative marker on schema icons", () => {
    expect(
      lintRule(
        "icon-label",
        `<><ArrowRightIcon /><ArrowRightIcon label="Next" /><ChevronRightIcon aria-hidden /><ChevronRightIcon {...props} /></>`
      ).map(message => message.message)
    ).toEqual([
      '<ArrowRightIcon> needs a label describing the icon, or aria-hidden / label="" when it is decorative'
    ]);
  });
});

describe("no-empty-icon-button-label", () => {
  it("reports empty and missing labels", () => {
    expect(
      lintRule(
        "no-empty-icon-button-label",
        `<><IconButton label="" /><IconButton icon={x} /><IconButton label="Close" /></>`
      ).map(message => message.messageId)
    ).toEqual(["emptyLabel", "missingLabel"]);
  });
});

describe("input rules", () => {
  it("reports placeholders on text inputs", () => {
    expect(
      lintRule(
        "no-placeholder",
        `<><Input placeholder="Email" /><input placeholder="x" /><input type="checkbox" placeholder="x" /></>`
      )
    ).toHaveLength(2);
  });

  it("reports statically disabled or read-only inputs", () => {
    expect(
      lintRule(
        "no-readonly-or-disabled-inputs",
        `<><Input disabled /><input readOnly={true} /><input disabled={busy} /><Button disabled /></>`
      ).map(message => message.message)
    ).toEqual([
      "disabled makes <Input> non-interactive, which is hard to perceive and explain. Prefer validation messages or plain text",
      "readOnly makes <input> non-interactive, which is hard to perceive and explain. Prefer validation messages or plain text"
    ]);
  });
});

describe("no-deprecated-imports", () => {
  it("reports deprecated components with their replacement", () => {
    expect(
      lintRule("no-deprecated-imports", `import { OldCard, Card } from "@acme/ui";`)[0]
        ?.message
    ).toBe("OldCard is deprecated. Use Card instead.");
    expect(
      lintRule(
        "no-deprecated-imports",
        `import * as DS from "@acme/ui"; const a = <DS.OldCard />;`
      )
    ).toHaveLength(1);
  });
});

describe("no-banned-imports", () => {
  it("reports configured modules in every import form", () => {
    const options = { bannedImports: { lodash: "use lodash-es" } };
    const messages = lintRule(
      "no-banned-imports",
      `import get from "lodash/get";
       import es from "lodash-es";
       const a = require("lodash");
       const b = import("lodash");`,
      options
    );

    expect(messages.map(message => message.message)).toEqual([
      '"lodash/get" is banned: use lodash-es',
      '"lodash" is banned: use lodash-es',
      '"lodash" is banned: use lodash-es'
    ]);
    expect(lintRule("no-banned-imports", `import get from "lodash";`)).toEqual([]);
  });
});
