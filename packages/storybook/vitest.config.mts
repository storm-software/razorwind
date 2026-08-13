import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const coreSrc = resolve(__dirname, "../core/src");

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/storybook",
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
  resolve: {
    alias: {
      "@razorwind/core/plugin": resolve(coreSrc, "plugin.ts"),
      "@razorwind/core/schema": resolve(coreSrc, "schema/index.ts"),
      "@razorwind/core/lib/fonts": resolve(coreSrc, "lib/fonts/index.ts"),
      "@razorwind/core/tokens": resolve(coreSrc, "lib/tokens/index.ts"),
      "@razorwind/core/utils": resolve(coreSrc, "utils/index.ts"),
      "@razorwind/core": resolve(coreSrc, "plugin.ts")
    }
  },
  test: {
    name: "storybook",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/storybook",
      provider: "v8" as const
    }
  }
}));
