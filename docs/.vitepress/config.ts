import { defineConfig } from "vitepress";
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: "en-US",
  title: "Playwright Utils",
  description: "Utilities for writing tests with Playwright.",
  base: "/playwright-utils/",
  srcDir: "src",
  cleanUrls: true,
  lastUpdated: true,

  markdown: {
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },
  vite: {
    plugins: [groupIconVitePlugin()],
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
    ],

    sidebar: [
      { text: "Getting Started", link: "/getting-started" },
      { text: "Configuration", link: "/configuration" },
      { text: "File Handling", link: "/file-handling" },
      { text: "Utility Types", link: "/utility-types" },
      {
        text: "API Testing",
        items: [{ text: "Fetch Adapter", link: "/api/fetch-adapter" }],
      },
      {
        text: "Snapshot Testing",
        items: [{ text: "Normalizers", link: "/snapshots/normalizers" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/cronn/playwright-utils" },
    ],

    editLink: {
      pattern:
        "https://github.com/cronn/playwright-utils/edit/main/docs/src/:path",
      text: "Edit this page on GitHub",
    },
  },
});
