import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminLayout", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/admin/AdminLayout");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("every sidebar link points at a route that exists", async () => {
    const { navModules } = await import("@/components/admin/AdminLayout");
    const appSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );

    // Paths declared in App.tsx, as segment lists. Params (:toolSlug) act as
    // wildcards, and nested admin routes are declared relative to /admin.
    const declaredSegments = [...appSource.matchAll(/path="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((declared) => declared !== "*")
      .map((declared) => declared.replace(/^\//, "").split("/"));

    const resolves = (target: string) => {
      const segments = target
        .replace(/^\/admin\/?/, "")
        .split("/")
        .filter(Boolean);
      if (segments.length === 0) return true; // the /admin index dashboard
      return declaredSegments.some(
        (declared) =>
          declared.length === segments.length &&
          declared.every(
            (segment, index) =>
              segment.startsWith(":") || segment === segments[index],
          ),
      );
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
});
