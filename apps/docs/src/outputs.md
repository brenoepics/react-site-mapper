# Outputs

React Site Mapper turns discovered application routes into artifacts that other systems can consume.

## Current outputs

- `routes.json` for route inventories, QA checks, and downstream automation
- `sitemap.xml` for search engine submission

## Shared generators

Both outputs are now implemented in `@routeforge/generators`:

- `RoutesJsonGenerator`
- `SitemapXmlGenerator`

The Vite plugin selects generators through the same container-based orchestration path used for crawlers and adapters, so generator selection can be customized later through plugins.

## Where files are written

During `vite build`, Routeforge writes generated files into the resolved Vite `build.outDir`.

Common examples:

- `dist/routes.json`
- `dist/sitemap.xml`

## Why crawl-driven outputs

Single-page applications often hide route behavior behind client-side navigation, async rendering, and runtime state. Static route lists alone are not always enough.

This project aims to combine:

- static route extraction
- runtime route discovery
- route metadata merging
- generator-friendly normalized outputs

## Dynamic routes in sitemap output

When Routeforge only knows a template such as `/users/:id`, the sitemap generator skips it unless concrete runtime examples exist in `meta.examples`.

That means runtime crawling improves sitemap quality by turning templates into concrete URLs like:

- `/users/1`
- `/users/2`

## Planned outputs

- LLM-friendly content maps for indexing and retrieval workflows
- metadata inputs for titles, descriptions, canonicals, and other SEO tags
