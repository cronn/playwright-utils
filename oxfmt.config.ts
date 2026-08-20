import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    ".idea",
    // tests
    "__snapshots__",
    // VitePress
    "docs/.vitepress/cache",
    "docs/.vitepress/dist",
  ],
  sortImports: {
    groups: [
      ["type-import", "value-builtin", "value-external"],
      ["type-internal", "value-internal"],
      ["type-parent", "value-parent"],
      ["type-sibling", "value-sibling", "type-index", "value-index"],
      "unknown",
    ],
  },
  sortPackageJson: {
    sortScripts: true,
  },
});
