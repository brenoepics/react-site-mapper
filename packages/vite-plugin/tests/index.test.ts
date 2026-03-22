import { describe, expect, expectTypeOf, test, vi } from "vite-plus/test";
import { defineConfig, type Plugin } from "vite";
import crawlerPlugin, {
  type CrawlerPluginOptions,
  crawlerPlugin as namedCrawlerPlugin,
} from "../src";

describe("crawlerPlugin", () => {
  test("returns a valid Vite plugin object with the expected shape", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const plugin = crawlerPlugin();
      const runtimePlugin = plugin as Plugin & {
        apply?: string;
        buildEnd?: (error?: Error | string) => void;
        buildStart?: () => void;
        closeBundle?: () => void;
        configResolved?: (config: unknown) => void;
        configureServer?: (server: unknown) => void;
      };

      expect(runtimePlugin.name).toBe("vite-plugin-routeforge");
      expect(runtimePlugin.apply).toBe("build");
      expect(typeof runtimePlugin.buildStart).toBe("function");
      expect(typeof runtimePlugin.buildEnd).toBe("function");
      expect(typeof runtimePlugin.configResolved).toBe("function");
      expect(typeof runtimePlugin.configureServer).toBe("function");
      expect(typeof runtimePlugin.closeBundle).toBe("function");

      runtimePlugin.buildStart?.();
      runtimePlugin.configResolved?.({ command: "build" });
      expect(runtimePlugin.configureServer?.({})).toBeUndefined();
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
});
