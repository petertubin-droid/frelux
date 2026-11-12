import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Every route path declared under /admin in App.tsx, as full paths, including
 * nested ones (/admin/studio/role_management). Nested pages are reached through
 * their parent's <Outlet />, so a flat list of depth-1 paths would report live
 * links as dead. Opening tags are scanned brace-aware because their element
 * expressions contain <Foo /> and would otherwise look self-closing.
 */
function adminRoutePaths(appSource: string): string[] {
  const parentAt = appSource.indexOf('path="/admin"');
  if (parentAt === -1) throw new Error("the /admin route is gone");
  const startTag = appSource.lastIndexOf("<Route", parentAt);

  const stack: string[][] = [];
  const paths: string[] = [];
  let cursor = startTag;

  while (cursor < appSource.length) {
    const nextOpen = appSource.indexOf("<Route", cursor);
    const nextClose = appSource.indexOf("</Route>", cursor);
    if (nextClose === -1) break;

    if (nextOpen === -1 || nextClose < nextOpen) {
      stack.pop();
      if (stack.length === 0) break; // the /admin parent is closed
      cursor = nextClose + "</Route>".length;
      continue;
    }

    let index = nextOpen + "<Route".length;
    let braces = 0;
    let quote: string | null = null;
    for (; index < appSource.length; index++) {
      const char = appSource[index];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "{") braces += 1;
      else if (char === "}") braces -= 1;
      else if (char === ">" && braces === 0) break;
    }

    const openingTag = appSource.slice(nextOpen, index);
    const selfClosing = openingTag.trimEnd().endsWith("/");
    const declared = /path="([^"]+)"/.exec(openingTag)?.[1];
    const segments = declared ? declared.split("/").filter(Boolean) : [];

    if (declared) paths.push([...stack.flat(), ...segments].join("/"));
    if (!selfClosing) stack.push(segments);

    cursor = index + 1;
  }

  return paths;
}

function matches(declared: string, segments: string[]): boolean {
  const declaredSegments = declared.replace(/^\//, "").split("/");
  return (
    declaredSegments.length === segments.length &&
    declaredSegments.every(
      (segment, index) =>
        segment.startsWith(":") ||
        segment.startsWith("*") ||
        segment === segments[index],
    )
  );
}

describe("AdminLayout", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/admin/AdminLayout");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("every sidebar link points at a route under /admin", async () => {
    const { navModules } = await import("@/components/admin/AdminLayout");
    const appSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );
    const declared = adminRoutePaths(appSource);

    const resolves = (target: string) => {
      const segments = target.split("/").filter(Boolean);
      // The /admin index dashboard is a pathless route.
      if (segments.length === 1) return true;
      return declared.some((routePath) => matches(routePath, segments));
    };

    const targets = navModules
      .flatMap((module) => module.items.map((item) => item.to))
      .map((to) => to.split("?")[0]);

    // A sidebar entry with no route quietly lands the admin on the 404 page.
    expect(targets.filter((to) => !resolves(to))).toEqual([]);
  });

  it("links the admin pages that had no entry point", async () => {
    const { navModules } = await import("@/components/admin/AdminLayout");
    const targets = navModules.flatMap((m) => m.items.map((i) => i.to));
    for (const path of [
      "/admin/ad-manager",
      "/admin/price-index",
      "/admin/suppliers",
      "/admin/translations",
    ]) {
      expect(targets).toContain(path);
    }
  });

  it("guards every /admin route, including the standalone ones", async () => {
    const appSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );
    const guardStart = appSource.indexOf("<RequireAdmin>");
    const guardEnd = appSource.indexOf("</RequireAdmin>");

    const unguarded: string[] = [];
    for (const match of appSource.matchAll(/path="(\/admin[^"]*)"/g)) {
      const routePath = match[1];
      if (routePath === "/admin/login") continue; // the sign-in form itself
      if (routePath === "/admin" || routePath === "/admin/*") continue; // the guarded parent

      const elementAt = appSource.indexOf("element={", match.index);
      const element =
        elementAt === -1 ? "" : appSource.slice(elementAt, elementAt + 400);
      const insideGuard = match.index > guardStart && match.index < guardEnd;

      if (!insideGuard && !element.includes("RequireAdmin")) {
        unguarded.push(routePath);
      }
    }

    // An admin screen rendered outside the guard is readable by anyone.
    expect(unguarded).toEqual([]);
  });
});
