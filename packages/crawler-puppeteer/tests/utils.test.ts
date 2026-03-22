import { describe, expect, test } from "vite-plus/test";
import { isSameOrigin, normalizeUrl, toPathname } from "../src";

describe("crawler utilities", () => {
  test("normalizes trailing slashes, query strings, hashes, and path casing", () => {
    expect(normalizeUrl("https://Example.com/About/?ref=nav#team")).toBe(
      "https://example.com/about",
    );
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
    expect(normalizeUrl("https://example.com/docs/Getting-Started/")).toBe(
      "https://example.com/docs/getting-started",
    );
  });

  test("detects same-origin URLs and rejects invalid or external ones", () => {
    expect(isSameOrigin("https://example.com/about", "https://example.com/start")).toBe(true);
    expect(isSameOrigin("https://example.com:443/about", "https://example.com/start")).toBe(true);
    expect(isSameOrigin("https://docs.example.com/about", "https://example.com/start")).toBe(false);
    expect(isSameOrigin("not-a-url", "https://example.com/start")).toBe(false);
  });

  test("extracts normalized pathnames from absolute URLs", () => {
    expect(toPathname("https://example.com/")).toBe("/");
    expect(toPathname("https://example.com/docs/getting-started")).toBe("/docs/getting-started");
  });
});
