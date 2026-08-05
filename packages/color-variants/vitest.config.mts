import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const coreSrc = resolve(rootDir, "../core/src");

export default defineConfig(() => ({
  root: rootDir,
  cacheDir: "../../node_modules/.vite/packages/color-variants",
  resolve: {
    alias: {
      "@razorwind/core/plugin": resolve(coreSrc, "plugin.ts"),
      "@razorwind/core/schema": resolve(coreSrc, "schema/index.ts"),
      "@razorwind/core/lib/tokens": resolve(coreSrc, "lib/tokens/index.ts"),
      "@razorwind/core/tokens": resolve(coreSrc, "lib/tokens/index.ts"),
      "@razorwind/core/utils": resolve(coreSrc, "utils/index.ts"),
      "@razorwind/core": resolve(coreSrc, "plugin.ts")
    }
  },
  test: {
    name: "color-variants",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/color-variants",
      provider: "v8" as const
    }
  }
}));
