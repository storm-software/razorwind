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
    id: "SyncGeneratorSchema",
    title: "Sync Generator",
    description:
      "A type definition for the Razorwind - Sync generator's options",
    required: []
  },
  mode: {
    $schema: {
      title: "Mode",
      type: "string",
      description: "The mode to use when running Razorwind generate",
      enum: ["development", "production"]
    },
    $default: "production"
  },
  outOfSyncMessage: {
    $schema: {
      title: "Out of Sync Message",
      type: "string",
      description:
        "The message to display when Razorwind generated files are out of sync"
    },
    $default:
      "Razorwind generated files are out of sync. Run `nx sync` to regenerate."
  }
});
