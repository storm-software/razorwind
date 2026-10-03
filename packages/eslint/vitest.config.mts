import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const coreSrc = resolve(rootDir, "../core/src");
const tailwindSrc = resolve(rootDir, "../tailwindcss/src");
const tamaguiSrc = resolve(rootDir, "../tamagui/src");

export default defineConfig(() => ({
  root: rootDir,
  cacheDir: "../../node_modules/.vite/packages/eslint",
  resolve: {
    alias: {
      "@razorwind/tailwindcss/eslint-runtime": resolve(
        tailwindSrc,
        "eslint-runtime.ts"
      ),
      "@razorwind/tailwindcss/eslint": resolve(tailwindSrc, "eslint.ts"),
      "@razorwind/tailwindcss/generate": resolve(tailwindSrc, "generate.ts"),
      "@razorwind/tamagui/eslint-runtime": resolve(
        tamaguiSrc,
        "eslint-runtime.ts"
      ),
      "@razorwind/tamagui/eslint": resolve(tamaguiSrc, "eslint.ts"),
      "@razorwind/tamagui": resolve(tamaguiSrc, "index.ts"),
      "@razorwind/core/plugin": resolve(coreSrc, "plugin.ts"),
      "@razorwind/core/schema": resolve(coreSrc, "schema/index.ts"),
      "@razorwind/core/lib/fonts": resolve(coreSrc, "lib/fonts/index.ts"),
      "@razorwind/core/lib/tokens": resolve(coreSrc, "lib/tokens/index.ts"),
      "@razorwind/core/tokens": resolve(coreSrc, "lib/tokens/index.ts"),
      "@razorwind/core/utils": resolve(coreSrc, "utils/index.ts"),
      "@razorwind/core": resolve(coreSrc, "plugin.ts")
    }
  },
  test: {
    name: "eslint",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/eslint",
      provider: "v8" as const
    }
  }
}));
