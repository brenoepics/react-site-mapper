import {
  Container,
  PluginManager,
  type CrawlOptions,
  type CrawlResult,
  type Crawler,
  type Plugin,
  registerConfig,
  registerCrawler,
  resolveCrawler,
} from "@routeforge/core";
import { PuppeteerCrawler } from "@routeforge/crawler-puppeteer";

/**
 * Configuration for the Routeforge Vite plugin.
 */
export interface CrawlerPluginOptions {
  /**
   * Disables all plugin side effects when set to `false`.
   */
  enabled?: boolean;
  /**
   * Base URL used for build-time crawling.
   */
  baseUrl?: string;
  /**
   * Crawl configuration passed to the active crawler.
   */
  crawl?: CrawlOptions;
  /**
   * Optional crawler override used instead of the default Puppeteer crawler.
   */
  crawler?: Crawler;
  /**
   * Optional Routeforge plugins to initialize before crawling.
   */
  plugins?: Plugin[];
}

/**
 * Creates a fully configured crawl and returns the resulting routes.
 */
export async function runCrawl(
  startUrl: string,
  options: CrawlerPluginOptions = {},
): Promise<CrawlResult> {
  const container = new Container();
  const pluginManager = new PluginManager();
  const crawler = options.crawler ?? new PuppeteerCrawler();

  registerConfig(container, {
    baseUrl: options.baseUrl,
    crawl: options.crawl,
  });
  registerCrawler(container, crawler);

  for (const plugin of options.plugins ?? []) {
    pluginManager.use(plugin);
  }

  pluginManager.setupAll({
    container,
    config: {
      baseUrl: options.baseUrl,
      crawl: options.crawl,
    },
  });

  return resolveCrawler(container).crawl(startUrl, options.crawl ?? {});
}
