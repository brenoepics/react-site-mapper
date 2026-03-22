import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectContext } from "./types";

/**
 * Reads project metadata from a root directory and returns a safe project context.
 */
export function readProjectContext(rootDir: string): ProjectContext {
  const packageJsonPath = join(rootDir, "package.json");

  try {
    const packageJsonContent = readFileSync(packageJsonPath, "utf8");
    const parsedPackageJson = JSON.parse(packageJsonContent);

    if (!isPlainObject(parsedPackageJson)) {
      return { rootDir, packageJson: {} };
    }

    return {
      rootDir,
      packageJson: parsedPackageJson,
    };
  } catch {
    return {
      rootDir,
      packageJson: {},
    };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
