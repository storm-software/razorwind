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

export const tokens = {
  color: {
    $type: "color",
    primary: {
      $value: "#0066cc",
      $description: "Primary brand color used for interactive elements."
    },
    secondary: { $value: "#8b5cf6" },
    text: {
      base: {
        $value: {
          colorSpace: "srgb",
          components: [0.9, 0.93, 0.95],
          hex: "#e6edf3"
        }
      },
      muted: { $value: "#8b949e", $description: "Muted text for captions." }
    },
    border: { $value: "#3d444d" },
    success: { $value: "#22c55e" },
    warning: { $value: "#f59e0b" },
    danger: { $value: "#ef4444" },
    info: { $value: "#38bdf8" },
    link: { $value: "#3fa6ff" }
  },
  space: {
    $type: "dimension",
    sm: { $value: "4px", $description: "Small spacing for compact UI." },
    md: { $value: "8px" },
    lg: { $value: "16px" }
  },
  font: {
    $type: "fontFamily",
    body: { $value: ["Inter", "sans-serif"] }
  }
} satisfies Tokens;

export const multiThemeTokens = {
  light: {
    color: {
      $type: "color",
      primary: { $value: "#1d4ed8" },
      text: { $value: "#111111" }
    }
  },
  dark: {
    color: {
      $type: "color",
      primary: { $value: "#60a5fa" },
      text: { $value: "#f5f5f5" }
    }
  }
} satisfies Record<string, Tokens>;

export const spec: Schema = {
  name: "acme-design-system",
  title: "Acme Design System",
  description: "The Acme design system for product UI.",
  homepage: "https://design.acme.test",
  tokens,
  components: {
    button: {
      name: "button",
      title: "Button",
      type: "ui",
      category: "form",
      description: "Triggers an action or event.",
      tags: ["action", "form", "cta"],
      related: ["icon-button"],
      files: [
        {
          path: "ui/button.tsx",
          type: "ui",
          content: "export const Button = () => null;"
        }
      ],
      usage: [
        {
          name: "primary",
          title: "Primary button",
          path: "usage/primary.tsx",
          language: "tsx",
          content: '<Button appearance="primary">Save</Button>'
        }
      ]
    },
    modal: {
      name: "modal",
      title: "Modal Dialog",
      type: "component",
      category: "overlay",
      description: "A dialog that renders above the page content.",
      tags: ["dialog", "overlay"]
    },
    "select-field": {
      name: "select-field",
      title: "Select",
      type: "ui",
      category: "form",
      description: "Choose one option from a list.",
      tags: ["form", "input", "dropdown"]
    }
  },
  icons: {
    search: {
      name: "search",
      title: "Search",
      category: "actions",
      tags: ["magnifier", "find"],
      aliases: ["magnifying-glass"],
      files: [{ path: "icons/search.svg", type: "svg", content: "<svg />" }]
    },
    folder: {
      name: "folder",
      title: "Folder",
      category: "objects",
      tags: ["directory", "files"]
    },
    "user-avatar": {
      name: "user-avatar",
      title: "User Avatar",
      category: "people",
      tags: ["person", "profile", "account"]
    }
  },
  fonts: {
    inter: {
      name: "inter",
      title: "Inter",
      source: "google",
      role: "body",
      fallbacks: ["system-ui", "sans-serif"],
      weights: [400, 700]
    },
    "jetbrains-mono": {
      name: "jetbrains-mono",
      title: "JetBrains Mono",
      source: "local",
      role: "mono",
      files: [
        { path: "fonts/jetbrains-mono.woff2", format: "woff2", weight: 400 }
      ]
    }
  }
};
