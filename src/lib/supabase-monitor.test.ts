import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: any = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: any) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue(createChainable()),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isSupabaseConfigured: false,
}));

const { monitoredQuery, monitoredInvoke, monitoredAuth } =
  await import("./supabase-monitor");

describe("supabase-monitor (supabase not configured)", () => {
  it("monitoredQuery passes through data", async () => {
    const result = await monitoredQuery(
      Promise.resolve({ data: [], error: null }),
    );
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("monitoredQuery captures errors", async () => {
    const result = await monitoredQuery(
      Promise.resolve({ data: null, error: { message: "test error" } }),
    );
    expect(result.error).toBeTruthy();
  });

  it("monitoredInvoke calls fn and returns result", async () => {
    const fn = vi.fn().mockResolvedValue({ data: "hello", error: null });
    const result = await monitoredInvoke(fn);
    expect(result.data).toBe("hello");
    expect(result.error).toBeNull();
  });

  it("monitoredInvoke captures errors", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "fail" } });
    const result = await monitoredInvoke(fn);
    expect(result.error).toBeTruthy();
  });

  it("monitoredAuth calls fn and returns result", async () => {
    const fn = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
    const result = await monitoredAuth(fn);
    expect(result.error).toBeNull();
  });

  it("monitoredAuth captures auth errors", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "auth fail" } });
    const result = await monitoredAuth(fn);
    expect(result.error).toBeTruthy();
  });
});
