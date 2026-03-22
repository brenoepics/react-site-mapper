import { defineConfigWithTheme } from "vitepress";
import type { ThemeConfig } from "vitepress-carbon";
import baseConfig from "vitepress-carbon/config";

export default defineConfigWithTheme<ThemeConfig>({
  extends: baseConfig,
  title: "React Site Mapper",
  description:
    "Route discovery, crawl-driven sitemaps, LLM maps, and metadata pipelines for React SPAs.",
  srcDir: "src",
  base: process.env.NODE_ENV === "production" ? "/react-site-mapper/" : "/",

  themeConfig: {
    nav: [
      { text: "Overview", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Plugin", link: "/plugin" },
      { text: "Adapters", link: "/adapters" },
      { text: "Outputs", link: "/outputs" },
    ],

    search: {
      provider: "local",
    },

    sidebar: [
      {
        text: "Docs",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
          { text: "Plugin", link: "/plugin" },
          { text: "Adapters", link: "/adapters" },
          { text: "Outputs", link: "/outputs" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/brenoepics/react-site-mapper" }],
  },
});
