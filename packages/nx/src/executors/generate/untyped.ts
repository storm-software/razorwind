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

import { defineUntypedSchema } from "untyped";

export default defineUntypedSchema({
  $schema: {
    id: "GenerateExecutorSchema",
    title: "Generate Executor",
    description:
      "A type definition for the Powerlines - Generate executor schema",
    required: ["configFile", "mode"],
    properties: {
      configFile: {
        type: "string",
        description: "The path to the configuration file"
      },
      mode: {
        type: "string",
        description: "The mode to use",
        default: "production",
        enum: ["development", "production"]
      },
      componentsPath: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } }
        ],
        tsType: "string | string[]",
        description:
          "The path to a directory containing component directories or files, or an array of paths"
      },
      tokensPath: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } }
        ],
        tsType: "string | string[]",
        description: "The path to the tokens.json file, or an array of paths"
      },
      verbose: {
        type: "boolean",
        description:
          "Enable Style Dictionary verbose logging (`log.verbosity: \"verbose\"`)",
        default: false
      }
    },
    additionalProperties: false
  }
});
