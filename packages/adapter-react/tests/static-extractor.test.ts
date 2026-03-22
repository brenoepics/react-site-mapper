import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test, vi } from "vite-plus/test";
import {
  extractPathsFromFile,
  extractPathsFromSourceFile,
  resolveNestedRoutes,
  scanSourceFiles,
  type RawRoute,
} from "../src";

describe("static route extractor", () => {
  test("extracts flat createBrowserRouter route paths", () => {
    const code = `
      import { createBrowserRouter } from "react-router-dom";

      export const router = createBrowserRouter([
        { path: "/", element: null },
        { path: "/users/:id", element: null },
        { path: "/settings", element: null },
      ]);
    `;

    expect(extractPathsFromFile(code)).toEqual(["/", "/users/:id", "/settings"]);
  });

  test("extracts nested createBrowserRouter route paths", () => {
    const code = `
      createBrowserRouter([
        {
          path: "/settings",
          children: [
            { path: "profile", element: null },
            { path: "security", element: null },
          ],
        },
      ]);
    `;

    expect(extractPathsFromFile(code)).toEqual([
      "/settings",
      "/settings/profile",
      "/settings/security",
    ]);
  });

  test("extracts children from layout routes and quoted object keys", () => {
    const code = `
      createBrowserRouter([
        {
          "children": [
            { "path": "dashboard", element: null },
          ],
        },
      ]);
    `;

    expect(extractPathsFromFile(code)).toEqual(["/dashboard"]);
  });

  test("ignores unsupported createBrowserRouter shapes", () => {
    const code = `
      createBrowserRouter({ path: "/ignored" });
    `;

    expect(extractPathsFromFile(code)).toEqual([]);
  });

  test("ignores unrelated function calls while traversing the AST", () => {
    const code = `
      otherRouter([{ path: "/ignored" }]);
    `;

    expect(extractPathsFromFile(code)).toEqual([]);
  });

  test("ignores object routes that do not declare a path or children", () => {
    const code = `
      createBrowserRouter([
        spreadRoute,
        { element: null },
        { 1: "/ignored" },
        { ...spreadRoute },
      ]);
    `;

    expect(extractPathsFromFile(code)).toEqual([]);
  });

  test("extracts JSX Route path attributes", () => {
    const code = `
      export function App() {
        return (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/users/:id" element={<User />} />
            <Route path="settings">
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        );
      }
    `;

    expect(extractPathsFromFile(code)).toEqual([
      "/",
      "/users/:id",
      "/settings",
      "/settings/profile",
    ]);
  });

  test("extracts JSX Route paths from layout routes and expression attributes", () => {
    const code = `
      export function App() {
        return (
          <Routes>
            <Route element={<Layout />}>
              <Route path={"profile"} element={<Profile />} />
            </Route>
          </Routes>
        );
      }
    `;

    expect(extractPathsFromFile(code)).toEqual(["/profile"]);
  });

  test("ignores non-literal JSX path expressions", () => {
    const code = `
      export function App() {
        return (
          <Routes>
            <Route path={routePath} element={<Page />} />
          </Routes>
        );
      }
    `;

    expect(extractPathsFromFile(code)).toEqual([]);
  });

  test("ignores JSX routes without a path or nested routes", () => {
    const code = `
      export function App() {
        return (
          <>
            <Route path="/ignored" />
            <Routes>
              <div />
              <Route element={<Layout />} />
            </Routes>
          </>
        );
      }
    `;

    expect(extractPathsFromFile(code)).toEqual([]);
  });

  test("returns an empty array for files with no routes", () => {
    expect(extractPathsFromFile("export const answer = 42;")).toEqual([]);
  });

  test("resolves nested relative routes into static Route objects", () => {
    const routes: RawRoute[] = [
      {
        path: "/settings",
        children: [{ path: "profile" }, { path: "security" }],
      },
    ];

    expect(resolveNestedRoutes(routes)).toEqual([
      { path: "/settings", source: "static" },
      { path: "/settings/profile", source: "static" },
      { path: "/settings/security", source: "static" },
    ]);
  });

  test("scans src files recursively and skips tests, dist, and node_modules", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "scan-project-"));

    try {
      await mkdir(join(rootDir, "src", "nested"), { recursive: true });
      await mkdir(join(rootDir, "src", "dist"), { recursive: true });
      await mkdir(join(rootDir, "src", "node_modules"), { recursive: true });
      await writeFile(join(rootDir, "src", "app.tsx"), "export const app = true;");
      await writeFile(join(rootDir, "src", "nested", "routes.jsx"), "export const routes = true;");
      await writeFile(join(rootDir, "src", "app.test.tsx"), "export const ignored = true;");
      await writeFile(join(rootDir, "src", "dist", "ignored.ts"), "export const ignored = true;");
      await writeFile(
        join(rootDir, "src", "node_modules", "ignored.ts"),
        "export const ignored = true;",
      );

      expect(scanSourceFiles(rootDir).sort()).toEqual(
        [join(rootDir, "src", "app.tsx"), join(rootDir, "src", "nested", "routes.jsx")].sort(),
      );
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("returns an empty list when src does not exist", () => {
    expect(scanSourceFiles(join(import.meta.dirname, "missing-src-project"))).toEqual([]);
  });

  test("reads and extracts paths from a source file on disk", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "file-extract-project-"));

    try {
      const filePath = join(rootDir, "routes.tsx");
      await writeFile(
        filePath,
        `createBrowserRouter([{ path: "/", element: null }, { path: "/users/:id", element: null }]);`,
      );

      expect(extractPathsFromSourceFile(filePath)).toEqual(["/", "/users/:id"]);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("logs and skips unparseable files when ReactAdapter extracts routes", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "unparseable-project-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await mkdir(join(rootDir, "src"), { recursive: true });
      await writeFile(join(rootDir, "src", "broken.tsx"), "<Routes><Route path=</Routes>");

      const { ReactAdapter } = await import("../src");
      const adapter = new ReactAdapter();
      const routes = await adapter.extractStaticRoutes?.({ rootDir, packageJson: {} });

      expect(routes).toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("Skipping unparseable route file:");
    } finally {
      warn.mockRestore();
      await rm(rootDir, { force: true, recursive: true });
    }
  });

  test("extracts static routes through the ReactAdapter project entrypoint", async () => {
    const rootDir = await mkdtemp(join(import.meta.dirname, "static-project-"));

    try {
      await mkdir(join(rootDir, "src"), { recursive: true });
      await writeFile(
        join(rootDir, "src", "routes.tsx"),
        `
          createBrowserRouter([
            { path: "/", element: null },
            {
              path: "/settings",
              children: [{ path: "profile", element: null }],
            },
          ]);
        `,
      );

      const { ReactAdapter } = await import("../src");
      const adapter = new ReactAdapter();

      await expect(adapter.extractStaticRoutes?.({ rootDir, packageJson: {} })).resolves.toEqual([
        { path: "/", source: "static" },
        { path: "/settings", source: "static" },
        { path: "/settings/profile", source: "static" },
      ]);
    } finally {
      await rm(rootDir, { force: true, recursive: true });
    }
  });
});
