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

/*
 * The `@razorwind/eslint` style rules that apply to stylesheets. Where a
 * message points at a replacement (`no-margin`, `use-visually-hidden`) it
 * names the schema's own components.
 */

import type {
  ComponentRole,
  CoreRuleId,
  DesignSystemManifest
} from "../../types";
import type { Declaration, StylelintRule } from "../postcss";
import { createRule, valueOffset } from "../postcss";
import {
  isEasingLiteral,
  isKeyword,
  isReference,
  parseDuration,
  PHYSICAL_PROPERTIES,
  PHYSICAL_VALUES,
  splitLayers,
  splitParts
} from "../values";

// ─── motion shorthand expansion ─────────────────────────────────────────────

const TRANSITION_DEFAULTS = {
  property: "all",
  duration: "0s",
  "timing-function": "ease",
  delay: "0s"
};

const ANIMATION_DEFAULTS = {
  name: "none",
  duration: "0s",
  "timing-function": "ease",
  delay: "0s",
  "iteration-count": "1",
  direction: "normal",
  "fill-mode": "none",
  "play-state": "running"
};

const ANIMATION_DIRECTIONS = new Set([
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse"
]);
const ANIMATION_FILL_MODES = new Set(["none", "forwards", "backwards", "both"]);
const ANIMATION_PLAY_STATES = new Set(["running", "paused"]);

/** Assign each part of a shorthand layer to its longhand suffix. */
function classifyLayer(
  layer: string,
  property: "transition" | "animation"
): Record<string, string> {
  const result: Record<string, string> = {};
  const set = (key: string, value: string) => {
    if (!(key in result)) {
      result[key] = value;
      return true;
    }
    return false;
  };

  for (const { text } of splitParts(layer)) {
    if (parseDuration(text) !== undefined) {
      if (!set("duration", text)) {
        set("delay", text);
      }
    } else if (isEasingLiteral(text)) {
      set("timing-function", text);
    } else if (property === "transition") {
      set("property", text);
    } else if (/^(?:\d+(?:\.\d+)?|infinite)$/.test(text)) {
      set("iteration-count", text);
    } else if (ANIMATION_DIRECTIONS.has(text) && !("direction" in result)) {
      set("direction", text);
    } else if (ANIMATION_FILL_MODES.has(text) && !("fill-mode" in result)) {
      set("fill-mode", text);
    } else if (ANIMATION_PLAY_STATES.has(text)) {
      set("play-state", text);
    } else {
      set("name", text);
    }
  }

  return result;
}

/**
 * `transition: opacity 200ms ease` → longhand `[property, value]` pairs, or
 * `undefined` when a part is a reference that cannot be classified.
 */
export function expandMotionShorthand(
  property: "transition" | "animation",
  value: string
): [string, string][] | undefined {
  if (splitParts(value).some(part => isReference(part.text))) {
    return undefined;
  }

  const defaults: Record<string, string> =
    property === "transition" ? TRANSITION_DEFAULTS : ANIMATION_DEFAULTS;
  const layers = splitLayers(value).map(layer =>
    classifyLayer(layer, property)
  );
  if (layers.length === 0) {
    return undefined;
  }

  const primary = property === "transition" ? "property" : "name";

  return Object.keys(defaults)
    .filter(key => key === primary || layers.some(layer => key in layer))
    .map(key => [
      `${property}-${key}`,
      layers.map(layer => layer[key] ?? defaults[key]!).join(", ")
    ]);
}

// ─── visually hidden detection ──────────────────────────────────────────────

const VISUALLY_HIDDEN: Readonly<Record<string, string>> = {
  width: "1px",
  height: "1px",
  padding: "0",
  position: "absolute",
  border: "0",
  clip: "rect(1px, 1px, 1px, 1px)",
  overflow: "hidden",
  "white-space": "nowrap"
};

/**
 * Likeness (0+) of a set of declarations to the visually hidden pattern;
 * above 0.8 is a hand-rolled visually hidden style.
 */
export function visuallyHiddenLikeness(
  entries: { key: string; value?: string }[]
): number {
  if (entries.length < 5) {
    return 0;
  }

  return (
    entries
      .filter(entry => entry.key in VISUALLY_HIDDEN)
      .reduce(
        (score, entry) =>
          score + (VISUALLY_HIDDEN[entry.key] === entry.value ? 1.5 : 0.75),
        0
      ) / entries.length
  );
}

/** `IconButton` / `Box, Stack or Inline` for a message. */
function componentNames(
  manifest: DesignSystemManifest,
  role: ComponentRole
): string {
  const names = manifest.components
    .filter(component => component.roles.includes(role))
    .map(component => component.jsx[0]!);
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

function propertyRange(decl: Declaration) {
  return { index: 0, endIndex: decl.prop.length };
}

/**
 * Build the stylesheet style rules for a schema-derived manifest.
 */
export function createStyleRules(
  manifest: DesignSystemManifest
): Partial<Record<CoreRuleId, StylelintRule>> {
  const ruleName = (id: CoreRuleId) => `${manifest.prefix}/${id}`;
  const primitives = componentNames(manifest, "primitive");
  const visuallyHidden = componentNames(manifest, "visually-hidden");

  return {
    "no-margin": createRule({
      ruleName: ruleName("no-margin"),
      description: "Disallow using the margin CSS property",
      messages: {
        noMargin: `margin breaks the component model. Control layout from the parent with ${
          primitives ? `${primitives} or ` : ""
        }gap in a flex or grid container`
      },
      run: () => (root, report) => {
        root.walkDecls(decl => {
          if (decl.prop.toLowerCase().startsWith("margin")) {
            report({
              node: decl,
              messageId: "noMargin",
              ...propertyRange(decl)
            });
          }
        });
      }
    }),

    "no-physical-properties": createRule({
      ruleName: ruleName("no-physical-properties"),
      description:
        "Disallow physical properties and values; use logical properties that follow the reading direction",
      messages: {
        noPhysicalProperties:
          "Physical property {{physical}} does not follow the reading direction. Use {{logical}}",
        noPhysicalValues:
          '{{property}}: "{{physical}}" does not follow the reading direction. Use "{{logical}}"'
      },
      fixable: true,
      run: () => (root, report) => {
        root.walkDecls(decl => {
          const property = decl.prop.toLowerCase();
          const logical = PHYSICAL_PROPERTIES[property];
          if (logical) {
            report({
              node: decl,
              messageId: "noPhysicalProperties",
              data: { physical: decl.prop, logical },
              ...propertyRange(decl),
              fix: () => {
                decl.prop = logical;
              }
            });
          }

          const physical = decl.value.trim().toLowerCase();
          const logicalValue = PHYSICAL_VALUES[property]?.[physical];
          const offset = valueOffset(decl);
          if (logicalValue) {
            const start = decl.value.length - decl.value.trimStart().length;
            report({
              node: decl,
              messageId: "noPhysicalValues",
              data: { property: decl.prop, physical, logical: logicalValue },
              ...(offset === undefined
                ? {}
                : {
                    index: offset + start,
                    endIndex: offset + start + physical.length
                  }),
              fix: () => {
                decl.value = logicalValue;
              }
            });
          }
        });
      }
    }),

    "expand-motion-shorthand": createRule({
      ruleName: ruleName("expand-motion-shorthand"),
      description:
        "Expands transition and animation shorthands so each value can use a motion token",
      messages: {
        expandShorthand:
          "Expand the {{property}} shorthand into longhand properties so durations and easings can use motion tokens"
      },
      fixable: true,
      run: () => (root, report) => {
        root.walkDecls(decl => {
          const property = decl.prop.toLowerCase();
          if (
            (property !== "transition" && property !== "animation") ||
            isKeyword(decl.value.trim())
          ) {
            return;
          }
          const longhands = expandMotionShorthand(property, decl.value);
          if (!longhands) {
            return;
          }

          report({
            node: decl,
            messageId: "expandShorthand",
            data: { property },
            ...propertyRange(decl),
            fix: () => {
              for (const [prop, value] of longhands) {
                decl.cloneBefore({ prop, value });
              }
              decl.remove();
            }
          });
        });
      }
    }),

    "use-visually-hidden": createRule({
      ruleName: ruleName("use-visually-hidden"),
      description:
        "Enforce usage of the design system's visually hidden component over hand-rolled styles",
      messages: {
        useVisuallyHidden: `Use ${visuallyHidden || "the visually hidden component"} instead of hand-rolled visually hidden styles`
      },
      run: () => (root, report) => {
        root.walkRules(rule => {
          const entries = rule.nodes
            .filter((node): node is Declaration => node.type === "decl")
            .map(decl => ({
              key: decl.prop.toLowerCase(),
              value: decl.value.trim()
            }));
          if (visuallyHiddenLikeness(entries) > 0.8) {
            report({
              node: rule,
              messageId: "useVisuallyHidden",
              index: 0,
              endIndex: rule.selector.length
            });
          }
        });
      }
    })
  };
}
