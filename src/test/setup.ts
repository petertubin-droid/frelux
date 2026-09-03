import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Global mock for the Supabase client — prevents real network calls (ENOTFOUND
// errors on placeholder.supabase.co) when tests import components that transitively
// use supabase but don't mock it themselves.  Tests that need specific mock
// behaviour (paystack, storage, labour, supabase-monitor) override this with
// their own vi.mock('@/lib/supabase', ...) which takes precedence.
//
// We use importOriginal so the real pure-function exports (isSupabaseConfigured,
// getFunctionErrorMessage) are preserved — supabase.test.ts depends on them.
vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();

  const chainable = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        return vi.fn().mockReturnValue(
          new Proxy(
            {},
            {
              get: (_t2, p2) => {
                if (p2 === "then")
                  return (resolve: (v: unknown) => void) =>
                    resolve({ data: null, error: null, count: 0 });
                return vi.fn().mockReturnValue(
                  new Proxy(
                    {},
                    {
                      get: (_t3, p3) => {
                        if (p3 === "then")
                          return (resolve: (v: unknown) => void) =>
                            resolve({ data: null, error: null, count: 0 });
                        return vi.fn();
                      },
                    },
                  ),
                );
              },
            },
          ),
        );
      },
    },
  );

  return {
    ...actual,
    supabase: {
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnValue(chainable),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      storage: { from: vi.fn() },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }),
    },
  };
});

// Global mock for the LAZY Supabase client. Same rationale as above, but for
// code paths that use getSupab() from '@/lib/supabase-lazy': without env vars
// (test env), the real client creation throws validateSupabaseUrl errors that
// surface as 11 unhandled rejections across the suite. We preserve the real
// pure-function exports (isSupabaseConfigured, getFunctionErrorMessage) and
// only stub getSupabase() to resolve a minimal no-op client.
vi.mock("@/lib/supabase-lazy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase-lazy")>();
  // Infinitely deep chainable proxy: any property access returns a function
  // that returns the same proxy, so chains of ANY depth (.from().select().eq()
  // .order().limit()...) work. Awaiting any link resolves { data: null }.
  const lazyChainable = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then")
          return (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: null, count: 0 });
        return vi.fn().mockReturnValue(lazyChainable);
      },
    },
  );
  return {
    ...actual,
    getSupabase: vi.fn().mockResolvedValue({
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnValue(lazyChainable),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }),
    }),
  };
});

// Mock IntersectionObserver (not available in happy-dom)
class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageStore = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) =>
      localStorageStore.set(key, value),
    ),
    removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
    clear: vi.fn(() => localStorageStore.clear()),
    key: vi.fn((i: number) => Array.from(localStorageStore.keys())[i] ?? null),
    get length() {
      return localStorageStore.size;
    },
  },
});

// Suppress console.error for expected error cases (can be overridden per-test)
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress known noise from React/testing-library
  if (typeof args[0] === "string" && args[0].includes("not wrapped in act"))
    return;
  originalError.call(console, ...args);
};
