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
      {
        text: "API Testing",
        items: [{ text: "fetchAdapter", link: "/api/fetch-adapter" }],
      },
      {
        text: "File Snapshots",
        items: [{ text: "Normalizers", link: "/normalizers" }],
      },
      {
        text: "Reference",
        items: [{ text: "Types", link: "/types" }],
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
