/**
 * Default maximum pages to visit when no explicit limit is provided.
 */
export const DEFAULT_MAX_PAGES = 100;

/**
 * Normalizes a URL for crawl deduplication.
 *
 * Query strings and hash fragments are removed, the pathname is lowercased,
 * and trailing slashes are removed for non-root paths.
 */
export function normalizeUrl(url: string): string {
  const normalized = new URL(url);

  normalized.hash = "";
  normalized.search = "";
  normalized.pathname = normalizePathname(normalized.pathname);

  return normalized.toString();
}

/**
 * Returns `true` when two URLs share the same origin.
 */
export function isSameOrigin(url: string, base: string): boolean {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

/**
 * Converts a normalized absolute URL into a route pathname.
 */
export function toPathname(url: string): string {
  return new URL(url).pathname;
}

function normalizePathname(pathname: string): string {
  const lowercasedPath = pathname.toLowerCase();

  if (lowercasedPath === "/") {
    return "/";
  }

  return lowercasedPath.endsWith("/") ? lowercasedPath.slice(0, -1) : lowercasedPath;
}
