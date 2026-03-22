# Adapters

## What adapters do

Adapters tell Routeforge how to understand a project before the crawler runs.

They can:

- detect whether a project matches a framework
- extract static routes from source files
- enhance runtime crawling with framework-specific hooks

## Built-in adapters

### React

`@routeforge/adapter-react` currently supports:

- React Router detection through `react-router` and `react-router-dom`
- file-based route extraction from `pages/` and `src/pages/`
- React Router runtime enhancement for link and history capture

### Vue

`@routeforge/adapter-vue` currently supports:

- Vue + Vue Router detection through `vue` and `vue-router`
- static route extraction from `createRouter({ routes: [...] })` definitions

## Auto-detection order

The Vite plugin uses a default adapter registry and selects the first adapter whose `detect()` method returns `true`.

Today the default order is:

1. `ReactAdapter`
2. `VueAdapter`

You can add custom adapters ahead of the defaults with:

```ts
crawlerPlugin({
  adapters: [myCustomAdapter],
});
```

Or bypass detection completely with:

```ts
crawlerPlugin({
  adapter: myCustomAdapter,
});
```

## Static + runtime merge

When an adapter finds a route statically and the crawler later confirms it at runtime, Routeforge merges both entries and upgrades the route source to `hybrid`.

That merged route also keeps metadata such as:

- `meta.staticSources`
- `meta.staticFiles`
- `meta.runtimeSources`
