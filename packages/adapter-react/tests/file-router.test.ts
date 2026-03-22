import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { detectFileBasedRouting, extractFileBasedRoutes, filePathToRoute } from "../src";

describe("file-based router", () => {
  test("converts dynamic segments from [id] to :id", () => {
    expect(filePathToRoute("/app/pages/users/[id].tsx", "/app/pages")).toBe("/users/:id");
  });

  test("converts catch-all segments from [...slug] to *", () => {
    expect(filePathToRoute("/app/pages/[...slug].tsx", "/app/pages")).toBe("/*");
    expect(filePathToRoute("/app/pages/docs/[...slug].tsx", "/app/pages")).toBe("/docs/*");
  });

  test("normalizes index files to root-aware route paths", () => {
    expect(filePathToRoute("/app/pages/index.tsx", "/app/pages")).toBe("/");
    expect(filePathToRoute("/app/pages/users/index.tsx", "/app/pages")).toBe("/users");
  });

  test("detects file-based routing from pages directories or vite-plugin-pages", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "file-routing-project-"));

    try {
      await mkdir(join(rootDir, "src", "pages"), { recursive: true });

      expect(detectFileBasedRouting({ rootDir, packageJson: {} })).toBe(true);
      expect(
        detectFileBasedRouting({
          rootDir: join(rootDir, "missing"),
          packageJson: { dependencies: { "vite-plugin-pages": "^0.32.0" } },
        }),
      ).toBe(true);
      expect(
        detectFileBasedRouting({
          rootDir: join(rootDir, "missing-dev"),
          packageJson: { devDependencies: { "vite-plugin-pages": "^0.32.0" } },
        }),
      ).toBe(true);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("returns false from detection on unexpected input", () => {
    const context = {
      get packageJson() {
        throw new Error("boom");
      },
      rootDir: "/workspace/app",
    } as unknown as Parameters<typeof detectFileBasedRouting>[0];

    expect(detectFileBasedRouting(context)).toBe(false);
  });

  test("returns empty routes when no pages directory exists", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "no-pages-project-"));

    try {
      await expect(extractFileBasedRoutes({ rootDir, packageJson: {} })).resolves.toEqual([]);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("returns empty routes on unexpected file extraction input", async () => {
    const context = {
      packageJson: {},
      get rootDir() {
        throw new Error("boom");
      },
    } as unknown as Parameters<typeof extractFileBasedRoutes>[0];

    await expect(extractFileBasedRoutes(context)).resolves.toEqual([]);
  });

  test("extracts file-based routes and ignores underscored, dotted, and test entries", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "pages-project-"));

    try {
      await mkdir(join(rootDir, "src", "pages", "users"), { recursive: true });
      await mkdir(join(rootDir, "src", "pages", "__tests__"), { recursive: true });
      await writeFile(join(rootDir, "src", "pages", "index.tsx"), "export default null;");
      await writeFile(join(rootDir, "src", "pages", "about.tsx"), "export default null;");
      await writeFile(join(rootDir, "src", "pages", "users", "[id].tsx"), "export default null;");
      await writeFile(join(rootDir, "src", "pages", "[...slug].tsx"), "export default null;");
      await writeFile(join(rootDir, "src", "pages", "README.md"), "ignored");
      await writeFile(join(rootDir, "src", "pages", "_app.tsx"), "export default null;");
      await writeFile(join(rootDir, "src", "pages", ".hidden.tsx"), "export default null;");
      await writeFile(
        join(rootDir, "src", "pages", "__tests__", "ignored.tsx"),
        "export default null;",
      );

      await expect(extractFileBasedRoutes({ rootDir, packageJson: {} })).resolves.toEqual([
        { path: "/", source: "static" },
        { path: "/about", source: "static" },
        { path: "/users/:id", source: "static" },
        { path: "/*", source: "static" },
      ]);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });
});
