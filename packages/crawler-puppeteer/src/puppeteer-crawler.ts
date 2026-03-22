import puppeteer, { type Browser, type Page } from "puppeteer";
import {
  DEFAULT_CRAWL_MAX_DEPTH,
  type Crawler,
  type CrawlOptions,
  type CrawlError,
  type CrawlResult,
  type Route,
} from "@routeforge/core";
import { DEFAULT_MAX_PAGES, isSameOrigin, normalizeUrl, toPathname } from "./utils";

type BrowserLauncher = {
  launch(options: { headless: boolean }): Promise<Browser>;
};

/**
 * Crawls a page with Puppeteer and extracts same-origin anchor routes.
 */
export class PuppeteerCrawler implements Crawler {
  constructor(private readonly browserLauncher: BrowserLauncher = puppeteer) {}

  /**
   * Launches a browser, visits pages breadth-first, and extracts same-origin links.
   */
  async crawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
    const startedAt = Date.now();
    const normalizedStartUrl = normalizeUrl(startUrl);
    const errors: CrawlError[] = [];
    const visited = new Set<string>();
    const routes = new Map<string, Route>();
    const queue: Array<{ url: string; depth: number }> = [{ url: normalizedStartUrl, depth: 0 }];
    const maxDepth = options.maxDepth ?? DEFAULT_CRAWL_MAX_DEPTH;
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    let browser: Browser | undefined;

    try {
      browser = await this.browserLauncher.launch({ headless: true });
      const page = await browser.newPage();

      while (queue.length > 0) {
        const { url, depth } = queue.shift()!;

        if (visited.has(url)) {
          continue;
        }

        if (depth > maxDepth) {
          continue;
        }

        if (visited.size >= maxPages) {
          break;
        }

        visited.add(url);

        const links = await this.extractLinks(page, url, errors);

        if (!links) {
          continue;
        }

        routes.set(toPathname(url), { path: toPathname(url), source: "runtime" });

        for (const link of links) {
          if (!isSameOrigin(link, normalizedStartUrl)) {
            continue;
          }

          const normalizedLink = normalizeUrl(link);

          if (visited.has(normalizedLink)) {
            continue;
          }

          queue.push({ url: normalizedLink, depth: depth + 1 });
        }
      }

      return {
        routes: [...routes.values()],
        errors: errors.length > 0 ? errors : undefined,
        durationMs: Date.now() - startedAt,
      };
    } finally {
      await browser?.close();
    }
  }

  private async extractLinks(
    page: Page,
    startUrl: string,
    errors: CrawlError[],
  ): Promise<string[] | undefined> {
    try {
      await page.goto(startUrl, { waitUntil: "networkidle2" });
    } catch (error) {
      errors.push({
        url: startUrl,
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }

    /* c8 ignore start -- executed in the browser context during crawling */
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map((anchor) => anchor.href)
        .filter((href) => href.startsWith("http"));
    });
    /* c8 ignore stop */
  }
}
