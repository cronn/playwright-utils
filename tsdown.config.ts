import { defineConfig } from "tsdown";

export default defineConfig((options, context) => ({
  platform: "node",
  format: ["esm"],
  dts: {
    sourcemap: !context.ci,
  },
  entry: ["src/index.ts"],
  outDir: "./dist",
  clean: true,
  deps: {
    neverBundle: true,
  },
  publint: true,
  attw: {
    profile: "esm-only",
  },
  ...options,
}));
