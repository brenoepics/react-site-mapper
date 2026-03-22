import type { ProjectContext, RouteAdapter } from "@routeforge/core";

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

      if ("@tanstack/router" in dependencies) {
        console.warn("@tanstack/router support is not implemented yet.");
      }

      return false;
    } catch {
      return false;
    }
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
