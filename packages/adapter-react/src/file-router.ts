import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ProjectContext, Route } from "@routeforge/core";

const FILE_EXTENSIONS_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const FILE_BASED_PLUGIN = "vite-plugin-pages";
const PAGES_DIRECTORIES = ["pages", join("src", "pages")];

/**
 * Detects file-based React routing via directory conventions or vite-plugin-pages.
 */
export function detectFileBasedRouting(ctx: ProjectContext): boolean {
  try {
    const dependencies = getDependencies(ctx.packageJson);

    if (FILE_BASED_PLUGIN in dependencies) {
      return true;
    }

    return getPagesRoots(ctx.rootDir).length > 0;
  } catch {
    return false;
  }
}

/**
 * Converts a file within a pages directory into a route template.
 */
export function filePathToRoute(filePath: string, pagesRoot: string): string {
  const relativeFilePath = relative(pagesRoot, filePath);
  const withoutExtension = relativeFilePath.replace(FILE_EXTENSIONS_PATTERN, "");
  const normalized = withoutExtension.split(sep).join("/");
  const route = normalized
    .replace(/\[\.\.\.(\w+)\]/g, "*")
    .replace(/\[(\w+)\]/g, ":$1")
    .replace(/\/index$/g, "")
    .replace(/^index$/g, "");

  return route ? `/${route}` : "/";
}

/**
 * Extracts static routes from file-based pages directories.
 */
export async function extractFileBasedRoutes(ctx: ProjectContext): Promise<Route[]> {
  try {
    const routes = new Map<string, Route>();

    for (const pagesRoot of getPagesRoots(ctx.rootDir)) {
      for (const filePath of collectPageFiles(pagesRoot)) {
        const routePath = filePathToRoute(filePath, pagesRoot);
        routes.set(routePath, { path: routePath, source: "static" });
      }
    }

    return [...routes.values()].sort(compareRoutes);
  } catch {
    return [];
  }
}

function compareRoutes(left: Route, right: Route): number {
  return getRouteSortKey(left.path).localeCompare(getRouteSortKey(right.path));
}

function getRouteSortKey(path: string): string {
  if (path === "/") {
    return "0:/";
  }

  if (path === "/*") {
    return "2:/*";
  }

  return `1:${path}`;
}

function getPagesRoots(rootDir: string): string[] {
  return PAGES_DIRECTORIES.map((directory) => join(rootDir, directory)).filter((directory) => {
    try {
      return readdirSync(directory).length >= 0;
    } catch {
      return false;
    }
  });
}

function collectPageFiles(directory: string): string[] {
  const pageFiles: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (shouldIgnoreEntry(entry.name)) {
      continue;
    }

    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      pageFiles.push(...collectPageFiles(entryPath));
      continue;
    }

    if (FILE_EXTENSIONS_PATTERN.test(entry.name)) {
      pageFiles.push(entryPath);
    }
  }

  return pageFiles;
}

function shouldIgnoreEntry(name: string): boolean {
  return (
    name === "__tests__" ||
    name.startsWith(".") ||
    name.startsWith("_") ||
    name === "_app.tsx" ||
    name === "_document.tsx" ||
    name === "_error.tsx"
  );
}

function getDependencies(packageJson: Record<string, unknown>): Record<string, string> {
  const dependencies = isDependencyMap(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isDependencyMap(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};

  return {
    ...dependencies,
    ...devDependencies,
  };
}

function isDependencyMap(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}
