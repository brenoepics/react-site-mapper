import { EventEmitter } from "node:events";
import { describe, expect, expectTypeOf, test, vi } from "vite-plus/test";
import { defineConfig, type Plugin } from "vite";
import crawlerPlugin, {
  type CrawlerPluginOptions,
  crawlerPlugin as namedCrawlerPlugin,
  resolveDevServerUrls,
} from "../src";

describe("crawlerPlugin", () => {
  test("returns a valid Vite plugin object with the expected shape", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const plugin = crawlerPlugin();
      const runtimePlugin = plugin as Plugin & {
        buildEnd?: (error?: Error | string) => void;
        buildStart?: () => void;
        closeBundle?: () => void;
        configResolved?: (config: unknown) => void;
        configureServer?: (server: unknown) => (() => void) | void;
      };

      expect(runtimePlugin.name).toBe("vite-plugin-routeforge");
      expect(runtimePlugin.apply).toBeUndefined();
      expect(typeof runtimePlugin.buildStart).toBe("function");
      expect(typeof runtimePlugin.buildEnd).toBe("function");
      expect(typeof runtimePlugin.configResolved).toBe("function");
      expect(typeof runtimePlugin.configureServer).toBe("function");
      expect(typeof runtimePlugin.closeBundle).toBe("function");

      runtimePlugin.buildStart?.();
      runtimePlugin.configResolved?.({ command: "build" });
      expect(runtimePlugin.configureServer?.({})).toBeTypeOf("function");
      runtimePlugin.buildEnd?.("ok");
      expect(runtimePlugin.closeBundle?.()).toBeUndefined();

      expect(log).toHaveBeenNthCalledWith(1, "[routeforge] Plugin initialized");
      expect(log).toHaveBeenNthCalledWith(2, "[routeforge] Build complete");
    } finally {
      log.mockRestore();
    }
  });

  test("supports named and default exports in a Vite config", () => {
    const options: CrawlerPluginOptions = {};
    const plugin = namedCrawlerPlugin(options);
    const defaultPlugin = crawlerPlugin(options);
    const config = defineConfig({
      plugins: [plugin, defaultPlugin],
    });
    const plugins = (config.plugins ?? []) as Plugin[];

    expectTypeOf(plugin).toEqualTypeOf<Plugin>();
    expect(plugins).toHaveLength(2);
    expect(plugins[0]?.name).toBe("vite-plugin-routeforge");
    expect(plugins[1]?.name).toBe("vite-plugin-routeforge");
    expect(defaultPlugin).toBeTypeOf("object");
  });

  test("resolves dev server URLs from resolved local URLs first", () => {
    expect(
      resolveDevServerUrls({
        httpServer: null,
        resolvedUrls: { local: ["http://127.0.0.1:5173"], network: [] } as never,
      }),
    ).toEqual(["http://127.0.0.1:5173"]);
  });

  test("falls back to the http server address when resolved URLs are unavailable", () => {
    const httpServer = {
      address() {
        return { address: "0.0.0.0", port: 4173 };
      },
    } as { address(): { address: string; port: number } };

    expect(
      resolveDevServerUrls({ httpServer: httpServer as never, resolvedUrls: null }, {
        server: { https: false },
      } as never),
    ).toEqual(["http://localhost:4173"]);
  });

  test("preserves explicit hosts when resolving fallback dev server URLs", () => {
    const httpServer = {
      address() {
        return { address: "127.0.0.1", port: 5173 };
      },
    } as { address(): { address: string; port: number } };

    expect(
      resolveDevServerUrls({ httpServer: httpServer as never, resolvedUrls: null }, {
        server: { https: true },
      } as never),
    ).toEqual(["https://127.0.0.1:5173"]);
  });

  test("returns an empty list for unsupported dev server address values", () => {
    expect(
      resolveDevServerUrls({
        httpServer: {
          address() {
            return "pipe";
          },
        } as never,
        resolvedUrls: null,
      }),
    ).toEqual([]);
  });

  test("logs when the dev server starts and stops", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const plugin = crawlerPlugin() as Plugin & {
      configResolved?: (config: unknown) => void;
      configureServer?: (server: unknown) => (() => void) | void;
    };
    const httpServer = new EventEmitter() as EventEmitter & {
      address(): { address: string; port: number } | null;
      off(event: string, listener: (...args: never[]) => void): typeof httpServer;
      once(event: string, listener: (...args: never[]) => void): typeof httpServer;
    };
    const server = {
      httpServer,
      resolvedUrls: undefined,
    };

    httpServer.address = () => ({ address: "::", port: 5173 });
    plugin.configResolved?.({ server: { https: true } });

    try {
      const cleanup = plugin.configureServer?.(server);

      httpServer.emit("listening");
      httpServer.emit("close");
      cleanup?.();

      expect(log).toHaveBeenNthCalledWith(
        1,
        "[routeforge] Dev server ready: https://localhost:5173",
      );
      expect(log).toHaveBeenNthCalledWith(2, "[routeforge] Dev server closed");
    } finally {
      log.mockRestore();
    }
  });

  test("logs a generic ready message when no server URLs are available", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const plugin = crawlerPlugin() as Plugin & {
      configureServer?: (server: unknown) => (() => void) | void;
    };
    const httpServer = new EventEmitter() as EventEmitter & {
      address(): null;
      off(event: string, listener: (...args: never[]) => void): typeof httpServer;
      once(event: string, listener: (...args: never[]) => void): typeof httpServer;
    };

    httpServer.address = () => null;

    try {
      plugin.configureServer?.({ httpServer, resolvedUrls: undefined });
      httpServer.emit("listening");

      expect(log).toHaveBeenCalledWith("[routeforge] Dev server ready");
    } finally {
      log.mockRestore();
    }
  });

  test("gracefully handles dev servers without an http server", () => {
    const plugin = crawlerPlugin() as Plugin & {
      configureServer?: (server: unknown) => (() => void) | void;
    };

    expect(plugin.configureServer?.({ httpServer: null, resolvedUrls: null })).toBeTypeOf(
      "function",
    );
  });
});
