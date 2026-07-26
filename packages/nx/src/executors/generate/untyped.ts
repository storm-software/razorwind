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
        description: "The path to the configuration file",
        default: "{projectRoot}/razorwind.config.ts"
      },
      mode: {
        type: "string",
        description: "The mode to use",
        default: "production",
        enum: ["development", "production"]
      },
      registryPath: {
        type: "string",
        description: "The path to the registry.json file"
      },
      tokensPath: {
        type: "string",
        description: "The path to the tokens.json file"
      }
    },
    additionalProperties: false
  }
});
