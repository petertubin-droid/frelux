import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCurrencySettings", () => {
  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/admin/AdminCurrencySettings");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });
});

describe("AdminCurrencySettings routing (DUP-09 follow-up)", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

  it("is wired into the admin routes at /admin/currency", () => {
    const src = read("src/App.tsx");
    expect(src).toContain('import("@/pages/admin/AdminCurrencySettings")');
    expect(src).toMatch(/path="currency"/);
    expect(src).toMatch(/element=\{<AdminCurrencySettings \/>\}/);
  });

  it("matches the existing sidebar nav entry", () => {
    const nav = read("src/components/admin/AdminLayout.tsx");
    // The nav already pointed at /admin/currency; the route now resolves.
    expect(nav).toContain('"/admin/currency"');
  });
});
