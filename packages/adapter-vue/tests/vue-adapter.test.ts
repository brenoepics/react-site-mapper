import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vite-plus/test";
import * as staticExtractor from "../src/static-extractor";
import {
  extractPathsFromFile,
  extractPathsFromSourceFile,
  resolveNestedRoutes,
  scanSourceFiles,
  VueAdapter,
} from "../src";

describe("VueAdapter", () => {
  test("detects vue-router projects", () => {
    const adapter = new VueAdapter();

    expect(
      adapter.detect({
        rootDir: "/workspace/app",
        packageJson: {
          dependencies: {
            vue: "^3.0.0",
            "vue-router": "^4.0.0",
          },
        },
      }),
    ).toBe(true);
    expect(
      adapter.detect({
        rootDir: "/workspace/app",
        packageJson: {
          dependencies: {
            vue: "^3.0.0",
          },
        },
      }),
    ).toBe(false);
    expect(
      adapter.detect({
        rootDir: "/workspace/app",
        packageJson: {
          dependencies: ["vue"],
          devDependencies: "invalid",
        } as unknown as Record<string, unknown>,
      }),
    ).toBe(false);
    expect(
      adapter.detect({
        rootDir: "/workspace/app",
        packageJson: {
          devDependencies: {
            vue: "^3.0.0",
            "vue-router": "^4.0.0",
          },
        },
      }),
    ).toBe(true);
  });

  test("extracts flat and nested Vue Router paths", () => {
    const code = `
      createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: Home },
          {
            path: '/settings',
            children: [{ path: 'profile', component: Profile }],
          },
        ],
      })
    `;

    expect(extractPathsFromFile(code)).toEqual(["/", "/settings", "/settings/profile"]);
  });

  test("extracts quoted keys and child-only layout routes", () => {
    const code = `
      createRouter({
        "routes": [
          {
            "children": [{ "path": "dashboard" }],
          },
          {
            path: '/admin',
            children: [{ path: 'users' }],
          },
        ],
      })
    `;

    expect(extractPathsFromFile(code)).toEqual(["/dashboard", "/admin", "/admin/users"]);
  });

  test("returns an empty list for unrelated or unsupported source shapes", () => {
    expect(extractPathsFromFile("createRouter([])")).toEqual([]);
    expect(extractPathsFromFile("otherRouter({ routes: [{ path: '/ignored' }] })")).toEqual([]);
    expect(extractPathsFromFile("export const value = 1")).toEqual([]);
    expect(
      extractPathsFromFile(
        `createRouter({ ...routerConfig, routes: [spreadRoute, { ...spreadRoute }, { 1: '/ignored' }, { component: Home }] })`,
      ),
    ).toEqual([]);
  });

  test("resolves nested routes directly", () => {
    expect(
      resolveNestedRoutes([{ children: [{ path: "dashboard" }] }, { path: "/reports/" }]),
    ).toEqual([
      { path: "/dashboard", source: "static" },
      { path: "/reports", source: "static" },
    ]);
  });

  test("scans source files and extracts Vue routes from disk", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "vue-adapter-"));
    const adapter = new VueAdapter();

    try {
      await mkdir(join(rootDir, "src"), { recursive: true });
      await mkdir(join(rootDir, "src", "nested"), { recursive: true });
      await writeFile(
        join(rootDir, "src", "router.ts"),
        `createRouter({ routes: [{ path: '/blog' }, { path: '/blog/:slug' }] })`,
      );
      await writeFile(
        join(rootDir, "src", "nested", "child.ts"),
        `createRouter({ routes: [{ path: '/nested' }] })`,
      );
      await mkdir(join(rootDir, "src", "dist"), { recursive: true });
      await mkdir(join(rootDir, "src", "node_modules"), { recursive: true });
      await writeFile(join(rootDir, "src", "router.test.ts"), "ignored");
      await writeFile(join(rootDir, "src", "dist", "ignored.ts"), "ignored");
      await writeFile(join(rootDir, "src", "node_modules", "ignored.ts"), "ignored");

      expect(scanSourceFiles(rootDir).sort()).toEqual(
        [join(rootDir, "src", "nested", "child.ts"), join(rootDir, "src", "router.ts")].sort(),
      );
      expect(extractPathsFromSourceFile(join(rootDir, "src", "router.ts"))).toEqual([
        "/blog",
        "/blog/:slug",
      ]);
      await expect(adapter.extractStaticRoutes({ rootDir, packageJson: {} })).resolves.toEqual([
        {
          path: "/blog",
          source: "static",
          meta: {
            staticFiles: [join(rootDir, "src", "router.ts")],
            staticSources: ["vue-router-ast"],
          },
        },
        {
          path: "/blog/:slug",
          source: "static",
          meta: {
            staticFiles: [join(rootDir, "src", "router.ts")],
            staticSources: ["vue-router-ast"],
          },
        },
        {
          path: "/nested",
          source: "static",
          meta: {
            staticFiles: [join(rootDir, "src", "nested", "child.ts")],
            staticSources: ["vue-router-ast"],
          },
        },
      ]);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("returns an empty list when src is missing", () => {
    expect(scanSourceFiles("/missing/project")).toEqual([]);
  });

  test("warns and skips unparseable Vue route files", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "vue-adapter-broken-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = new VueAdapter();

    try {
      await mkdir(join(rootDir, "src"), { recursive: true });
      await writeFile(join(rootDir, "src", "router.ts"), "createRouter({ routes: [");

      await expect(adapter.extractStaticRoutes({ rootDir, packageJson: {} })).resolves.toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("normalizes non-Error extraction failures into warning messages", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "vue-adapter-plain-failure-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = new VueAdapter();

    try {
      await mkdir(join(rootDir, "src"), { recursive: true });
      await writeFile(join(rootDir, "src", "router.ts"), "createRouter({ routes: [] })");

      const extract = vi
        .spyOn(staticExtractor, "extractPathsFromSourceFile")
        .mockImplementation(() => {
          throw "plain failure";
        });

      try {
        await expect(adapter.extractStaticRoutes({ rootDir, packageJson: {} })).resolves.toEqual(
          [],
        );
        expect(warn).toHaveBeenCalledWith(
          `Skipping unparseable Vue route file: ${join(rootDir, "src", "router.ts")} (plain failure)`,
        );
      } finally {
        extract.mockRestore();
      }
    } finally {
      warn.mockRestore();
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("returns false when dependency access throws unexpectedly", () => {
    const adapter = new VueAdapter();
    const packageJson = {
      get dependencies() {
        throw new Error("boom");
      },
    } as Record<string, unknown>;

    expect(adapter.detect({ rootDir: "/workspace/app", packageJson })).toBe(false);
  });
});
