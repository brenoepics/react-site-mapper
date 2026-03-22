import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

/**
 * Configuration for the Routeforge Vite plugin.
 */
export interface CrawlerPluginOptions {}

/**
 * Creates the Routeforge Vite plugin scaffold.
 */
export function crawlerPlugin(options: CrawlerPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;
  let devServer: ViteDevServer | undefined;

  return {
    name: "vite-plugin-routeforge",
    apply: "build",

    buildStart() {
      void options;
      console.log("[routeforge] Plugin initialized");
    },

    configResolved(config) {
      resolvedConfig = config;
      void resolvedConfig;
    },

    configureServer(server) {
      devServer = server;
      void devServer;
    },

    buildEnd() {
      console.log("[routeforge] Build complete");
    },

    closeBundle() {
      void resolvedConfig;
      void devServer;
    },
  };
}

export default crawlerPlugin;
