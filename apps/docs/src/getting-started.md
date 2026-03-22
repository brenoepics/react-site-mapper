# Getting Started

## Current status

> [!WARNING]
> React Site Mapper is under heavy development.
> Do not use it in production yet.

The repository is evolving into a toolkit for frontend applications that need crawl-driven outputs instead of hand-maintained route metadata.

## Install the Vite plugin

Add the Routeforge Vite plugin to your app workspace:

```bash
pnpm add -D @routeforge/vite-plugin
```

Then register it in your Vite config:

```ts
import { defineConfig } from "vite";
import { crawlerPlugin } from "@routeforge/vite-plugin";

export default defineConfig({
  plugins: [
    crawlerPlugin({
      baseUrl: "https://example.com",
      output: ["routes.json", "sitemap.xml"],
    }),
  ],
});
```

## What happens in dev and build

- `vite dev` starts the dev server and Routeforge automatically triggers a crawl once the server is ready
- `vite build` runs a crawl in `closeBundle()` after build output is written
- static routes are loaded from the detected adapter before runtime crawling begins
- matching static and runtime routes are merged into `source: "hybrid"`

## Output location

- `routes.json` and `sitemap.xml` are written into Vite's resolved `build.outDir`
- if `output` is omitted, Routeforge currently writes `routes.json` by default
- `sitemap.xml` requires a valid `baseUrl` or `server.origin`

## Local development

```bash
vp install
vp run docs#dev
```

Open the local VitePress server and edit files in `apps/docs/src`.

## Workspace commands

```bash
vp check
vp run check -r
vp run test -r
vp run build -r
```

## Project direction

- discover static and runtime routes in frontend apps
- crawl pages with browser automation when needed
- merge route data into reusable artifacts for SEO and AI ingestion
- publish outputs that can plug into CI and deployment pipelines
