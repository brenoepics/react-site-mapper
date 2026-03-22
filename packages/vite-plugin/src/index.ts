import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

/**
 * Configuration for the Routeforge Vite plugin.
 */
export interface CrawlerPluginOptions {}

const ROUTEFORGE_PLUGIN_NAME = "vite-plugin-routeforge";

/**
 * Resolves the best available dev server URLs for logging and orchestration.
 */
export function resolveDevServerUrls(
  server: Pick<ViteDevServer, "httpServer" | "resolvedUrls">,
  resolvedConfig?: Pick<ResolvedConfig, "server">,
): string[] {
  if (server.resolvedUrls?.local && server.resolvedUrls.local.length > 0) {
    return [...server.resolvedUrls.local];
  }

  const address = server.httpServer?.address();

  if (!address || typeof address === "string") {
    return [];
  }

  const protocol = resolvedConfig?.server.https ? "https" : "http";
  const host = normalizeDevServerHost(address.address);

  return [`${protocol}://${host}:${address.port}`];
}

/**
 * Creates the Routeforge Vite plugin scaffold.
 */
export function crawlerPlugin(options: CrawlerPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;
  let devServer: ViteDevServer | undefined;

  return {
    name: ROUTEFORGE_PLUGIN_NAME,

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
      const onListening = () => {
        const urls = resolveDevServerUrls(server, resolvedConfig);

        if (urls.length === 0) {
          console.log("[routeforge] Dev server ready");
          return;
        }

        console.log(`[routeforge] Dev server ready: ${urls.join(", ")}`);
      };
      const onClose = () => {
        console.log("[routeforge] Dev server closed");
      };

      server.httpServer?.once("listening", onListening);
      server.httpServer?.once("close", onClose);

      return () => {
        server.httpServer?.off("listening", onListening);
        server.httpServer?.off("close", onClose);
        void devServer;
      };
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

function normalizeDevServerHost(host: string): string {
  if (host === "::" || host === "0.0.0.0") {
    return "localhost";
  }

  return host;
}
