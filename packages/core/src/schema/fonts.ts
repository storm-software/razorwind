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

import { z } from "zod";

export const fontRoleSchema = z.enum([
  "sans",
  "serif",
  "mono",
  "display",
  "heading",
  "body",
  "code"
]);

export type FontRole = z.infer<typeof fontRoleSchema>;

export const fontDisplaySchema = z.enum([
  "auto",
  "block",
  "swap",
  "fallback",
  "optional"
]);

export type FontDisplay = z.infer<typeof fontDisplaySchema>;

export const fontFileFormatSchema = z.enum([
  "woff2",
  "woff",
  "truetype",
  "opentype",
  "svg"
]);

export type FontFileFormat = z.infer<typeof fontFileFormatSchema>;

export const fontFileSchema = z.object({
  path: z.string(),
  format: fontFileFormatSchema.optional(),
  weight: z.union([z.number(), z.string()]).optional(),
  style: z.enum(["normal", "italic", "oblique"]).optional(),
  unicodeRange: z.string().optional()
});

export type FontFile = z.infer<typeof fontFileSchema>;

const fontBaseSchema = z.object({
  name: z.string(),
  title: z.string(),
  family: z
    .string()
    .optional()
    .describe("CSS font-family name. Defaults to title or name."),
  role: fontRoleSchema.optional(),
  fallbacks: z.array(z.string()).optional(),
  display: fontDisplaySchema.optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const googleFontSchema = fontBaseSchema.extend({
  source: z.literal("google"),
  weights: z.array(z.union([z.number(), z.string()])).optional(),
  styles: z.array(z.enum(["normal", "italic"])).optional(),
  subsets: z.array(z.string()).optional(),
  variable: z.boolean().optional()
});

export type GoogleFont = z.infer<typeof googleFontSchema>;

export const localFontSchema = fontBaseSchema.extend({
  source: z.literal("local"),
  files: z.array(fontFileSchema).min(1)
});

export type LocalFont = z.infer<typeof localFontSchema>;

export const fontSchema = z.discriminatedUnion("source", [
  googleFontSchema,
  localFontSchema
]);

export type Font = z.infer<typeof fontSchema>;

export const fontsSchema = z.record(z.string(), fontSchema);

export type Fonts = z.infer<typeof fontsSchema>;
