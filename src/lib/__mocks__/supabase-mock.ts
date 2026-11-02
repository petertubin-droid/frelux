/**
 * Shared Supabase mock factory for test files.
 * Creates a chainable mock that returns empty results by default.
 * Usage: vi.mock('@/lib/supabase', () => ({ supabase: createSupabaseMock(), isSupabaseConfigured: false }))
 */
export function createSupabaseMock() {
  const chainable = () => {
    const proxy: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void, _reject?: (v: unknown) => void) =>
        Promise.resolve({ data: null, error: null, count: 0 }).then(resolve),
    };
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(target: Record<string, unknown>, prop: string) {
        if (prop === "then") return target.then;
        if (prop in target) return target[prop];
        // Any method returns the proxy again for chaining
        target[prop] = (..._args: unknown[]) => proxy;
        return target[prop];
      },
    };
    return new Proxy(proxy, handler);
  };

  return {
    from: vi.fn().mockReturnValue(chainable()),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({
            data: { publicUrl: "https://example.com/file.png" },
          }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

import { vi } from "vitest";
