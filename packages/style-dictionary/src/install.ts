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
 * Build Style Dictionary INSTALL.md for generated platform files.
 *
 * @see https://styledictionary.com/
 */
export function renderInstallMd(options: { files: string[] }): string {
  const fileList = options.files.map(file => `- \`${file}\``).join("\n");
  const primary = options.files[0] ?? "build/output.css";

  return `# Configuring Theme CSS

The following instructions will guide you through configuring your application to use the generated theme CSS files.

## Files

${fileList}

## Setup

1. Import or copy generated files into your app.

CSS example:

\`\`\`ts
import "./${primary}";
\`\`\`

SCSS example:

\`\`\`scss
@import "${primary}";
\`\`\`

2. Reference token variables from the generated file names above (e.g. CSS custom properties or SCSS variables).

3. Re-run \`razorwind generate\` when tokens change.

## Regeneration

Re-run the following command to regenerate the theme CSS files:

\`\`\`bash
razorwind generate
\`\`\`

The generated theme output files are considered build artifacts - adjust tokens or Razorwind configuration to change the output files **(do not manually edit generated files)**.
`;
}
