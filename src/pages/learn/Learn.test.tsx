import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), logAnalyticsEvent: vi.fn() }));

// ── Supabase mock: per-query PostgREST builder ────────────────────────
// Each `from(table)` returns a chainable, thenable builder. When awaited,
// it resolves to a result chosen from the recorded chain calls, so tests
// can assert exactly what the page asked for (filters, or-patterns,
// count queries).
type Call = { method: string; args: unknown[] };

const METHODS = [
  "select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
  "in", "is", "not", "or", "and", "order", "range", "limit", "single",
  "maybeSingle", "textSearch",
];

const mockCategories = [
  { id: "cat-1", slug: "guides", name: "Guides", parent_slug: null, is_active: true, sort_order: 1, description: "All guides" },
  { id: "cat-2", slug: "painting", name: "Painting", parent_slug: "guides", is_active: true, sort_order: 2, description: "Painting guides" },
];

function article(slug: string) {
  return {
    id: `art-${slug}`,
    slug,
    title: `Article ${slug}`,
    excerpt: `Excerpt for ${slug}`,
    content: "Body content",
    category_slug: "painting",
    status: "published",
    is_featured: false,
    reading_time_minutes: 5,
    published_at: "2026-08-28T09:22:05.000Z",
    cover_url: null,
    seo_title: `Article ${slug}`,
    seo_description: `Excerpt for ${slug}`,
  };
}

function makeBuilder(resultFor: (calls: Call[]) => unknown) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {
    then: (onFulfilled: (r: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resultFor(calls)).then(onFulfilled, onRejected),
  };
  for (const m of METHODS) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    });
  }
  return builder;
}

vi.mock("@/lib/supabase", () => {
  const supabase = {
    __orCalls: [] as string[],
    from: vi.fn((table: string) =>
      makeBuilder((calls) => {
        if (table === "learn_categories") {
          return { data: mockCategories, error: null };
        }
        if (table === "learn_articles") {
          const select = calls.find((c) => c.method === "select");
          const isCountQuery =
            select?.args[1] &&
            typeof select.args[1] === "object" &&
            (select.args[1] as Record<string, unknown>).count === "exact";
          if (isCountQuery) {
            return { data: null, error: null, count: supabase.__count };
          }
          const or = calls.find((c) => c.method === "or");
          if (or) {
            supabase.__orCalls.push(String(or.args[0]));
            return { data: [article("search-hit")], error: null };
          }
          const featured = calls.some((c) => c.method === "eq" && c.args[0] === "is_featured");
          if (featured) {
            return { data: [article("featured-1"), article("featured-2")], error: null };
          }
          return { data: [article("recent-1")], error: null };
        }
        return { data: null, error: null };
      })
    ),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    __count: 66 as number | null,
  };
  return { supabase };
});

import { supabase } from "@/lib/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  (supabase as unknown as { __count: number | null }).__count = 66;
  (supabase as unknown as { __orCalls: string[] }).__orCalls = [];
});

function orCalls(): string[] {
  return (supabase as unknown as { __orCalls: string[] }).__orCalls;
}

async function renderPage() {
  const Comp = (await import("@/pages/learn/Learn")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function renderReady() {
  const view = await renderPage();
  await waitFor(() => {
    expect(screen.getByText(/Expert Articles/i)).toBeInTheDocument();
  });
  return view;
}

describe("Learn", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the real published-article count from the DB in the hero", async () => {
    await renderReady();
    expect(await screen.findByText("66+ Expert Articles")).toBeInTheDocument();
  });

  it("falls back to the un-numbered hero label when the count query fails", async () => {
    (supabase as unknown as { __count: number | null }).__count = null;
    await renderReady();
    // No "66+" — only the bare label is rendered
    expect(screen.getByText("Expert Articles", { exact: true })).toBeInTheDocument();
  });

  it("sanitizes special characters out of the search query before hitting PostgREST", async () => {
    await renderReady();
    const input = screen.getByPlaceholderText("Search articles, guides, tutorials…");
    fireEvent.change(input, { target: { value: "50%(a,b)_paint" } });
    await waitFor(() => {
      expect(orCalls().length).toBeGreaterThan(0);
    });
    const pattern = orCalls()[0];
    // The or-filter template adds its own ilike wildcards (…ilike.%…%), so
    // assert on the user query itself: none of the injected characters may
    // survive — "50%(a,b)_paint" must become "50 a b  paint" (trimmed).
    const match = pattern.match(/title\.ilike\.%(.*)%,excerpt/);
    expect(match).not.toBeNull();
    const sanitizedQuery = (match as RegExpMatchArray)[1].trim();
    expect(sanitizedQuery).toBe("50  a b  paint");
    expect(sanitizedQuery).not.toMatch(/[%_(),()]/);
  });

  it("uses the singular 'topic' when a parent category has one child", async () => {
    await renderReady();
    expect(screen.getByText("1 topic", { exact: true })).toBeInTheDocument();
  });
});
