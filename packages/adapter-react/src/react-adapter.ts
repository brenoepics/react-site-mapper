import type { ProjectContext, Route, RouteAdapter } from "@routeforge/core";
import { detectFileBasedRouting, extractFileBasedRoutes } from "./file-router";
import { extractPathsFromSourceFile, scanSourceFiles } from "./static-extractor";

/**
 * React adapter detection for React Router-based projects.
 */
export class ReactAdapter implements RouteAdapter {
  name = "react";

  /**
   * Detects React projects that use React Router.
   */
  detect(project: ProjectContext): boolean {
    try {
      const dependencies = getDependencies(project.packageJson);

      if (!("react" in dependencies)) {
        return false;
      }

      if ("react-router" in dependencies || "react-router-dom" in dependencies) {
        return true;
      }

      if (detectFileBasedRouting(project)) {
        return true;
      }

      if ("@tanstack/router" in dependencies) {
        console.warn("@tanstack/router support is not implemented yet.");
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Extracts statically declared React Router paths from project source files.
   */
  async extractStaticRoutes(project: ProjectContext): Promise<Route[]> {
    const routes = new Map<string, Route>();

    for (const route of await extractFileBasedRoutes(project)) {
      routes.set(route.path, route);
    }

    for (const filePath of scanSourceFiles(project.rootDir)) {
      try {
        for (const path of extractPathsFromSourceFile(filePath)) {
          routes.set(path, { path, source: "static" });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Skipping unparseable route file: ${filePath} (${message})`);
      }
    }

    return [...routes.values()];
  }
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
