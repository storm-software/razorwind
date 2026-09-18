import { plugin as tsdown } from "@powerlines/plugin-tsdown";
import { defineConfig } from "powerlines/config";

export default defineConfig({
  input: ["src/index.ts", "src/extract.ts", "src/generate.ts"],
  platform: "node",
  output: {
    format: ["cjs", "esm"]
  },
  resolve: {
    skipNodeModulesBundle: true
  },
  plugins: [tsdown()]
});
