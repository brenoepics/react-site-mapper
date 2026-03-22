---
layout: home

hero:
  name: "React Site Mapper"
  text: "Crawl-driven docs and outputs for React SPAs"
  tagline: Generate route inventories and sitemaps from real application routes discovered through adapters, static analysis, and runtime crawling.
  icon: "🗺️"
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: Plugin Guide
      link: /plugin

features:
  - title: Static + runtime discovery
    details: Combine framework-aware extraction with browser crawling to uncover routes that are not obvious from source code alone.
  - title: Framework adapters
    details: Auto-detect supported projects and preload static routes for React today, with Vue routing support now available in the adapter registry.
  - title: Output generation
    details: Turn normalized route data into `routes.json` and `sitemap.xml` through shared generator packages that can be reused outside the Vite plugin.
  - title: Built for monorepos
    details: Keep adapters, crawlers, plugins, and docs in one pnpm workspace with shared tooling.
---

> [!WARNING]
> This project is under heavy development and is not ready for production use.

React Site Mapper is an early-stage toolkit for React single-page applications that need accurate route maps and downstream outputs without manual maintenance.

The current workspace already includes:

- `@routeforge/vite-plugin` for Vite integration
- `@routeforge/crawler-puppeteer` for runtime crawling
- `@routeforge/adapter-react` and `@routeforge/adapter-vue` for framework detection and static extraction
- `@routeforge/generators` for shared `routes.json` and `sitemap.xml` output generation
