# Routeflux

> [!WARNING]
> This project is under active development and not yet ready for production use.

Routeflux is a toolkit for discovering routes from modern web frameworks and generating crawl-driven outputs like sitemaps, LLM-friendly content maps, and SEO metadata artifacts.

## Features

- **Framework Adapters** - Pluggable adapters for React and Vue to extract routes from file-based and runtime routing
- **Runtime Crawling** - Puppeteer-based crawler that navigates your app to collect dynamic route metadata
- **Static Analysis** - Extract routes from framework conventions (Next.js pages, Vue Router files, etc.)
- **Output Generation** - Generate sitemaps, JSON content maps, and other SEO/LLM-friendly artifacts
- **Vite Integration** - Seamless integration via official Vite plugin

## Packages

### Core

| Package           | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `@routeflux/core` | Shared types, contracts, route merging, and service container |

### Adapters

| Package                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `@routeflux/adapter-react` | React route adapter (file-based + runtime) |
| `@routeflux/adapter-vue`   | Vue route adapter                          |

### Infrastructure

| Package                        | Description                             |
| ------------------------------ | --------------------------------------- |
| `@routeflux/crawler-puppeteer` | Puppeteer-based runtime crawler         |
| `@routeflux/vite-plugin`       | Vite plugin for development integration |

### Generators

| Package                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `@routeflux/generators` | Shared output generators for crawl results |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the demo website
pnpm dev

# Run type checks and linting
pnpm check

# Run all tests
pnpm run test -r

# Build all packages
pnpm run build -r

# Full validation
pnpm ready
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Routeflux Core                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Container  │  │   Merging   │  │  Type Definitions   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────────┐
│ React Adapter │    │  Vue Adapter  │    │ Puppeteer Crawler │
└───────────────┘    └───────────────┘    └───────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                   ┌───────────────────────┐
                   │     Generators        │
                   │  sitemap.xml, JSON,   │
                   │  LLM content maps     │
                   └───────────────────────┘
```

## License

MIT
