import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

// Capture every AdSlot render so tests can assert policy-relevant props
// (ad blocks must never be hidden-labeled).
const adSlotRenders: Array<{ slotKey: string; hideLabel?: boolean }> = [];
vi.mock("@/components/ui/AdSlot", () => ({
  default: ({ slotKey, hideLabel }: { slotKey: string; hideLabel?: boolean }) => {
    adSlotRenders.push({ slotKey, hideLabel });
    return <div data-testid={`adslot-${slotKey}`} />;
  },
}));

// ── Supabase mock: per-query PostgREST builder ────────────────────────
// Result selection is driven by the recorded chain calls, so the tests can
// also verify HOW the page queries (parent vs child category fetches).
type Call = { method: string; args: unknown[] };
const METHODS = [
  "select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
  "in", "is", "not", "or", "and", "order", "range", "limit", "single",
  "maybeSingle", "textSearch",
];

const state = {
  category: null as Record<string, unknown> | null,
  subcategories: [] as Array<Record<string, unknown>>,
  leafArticles: [] as Array<Record<string, unknown>>,
  childArticles: [] as Array<Record<string, unknown>>,
};

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
    from: vi.fn((table: string) =>
      makeBuilder((calls) => {
        const isSingle = calls.some((c) => c.method === "maybeSingle" || c.method === "single");
        if (table === "learn_categories") {
          if (isSingle) return { data: state.category, error: null };
          // Subcategory fetch: eq("parent_slug", slug)
          return { data: state.subcategories, error: null };
        }
        if (table === "learn_articles") {
          // Child-articles fetch for parent categories uses .in()
          const usesIn = calls.some((c) => c.method === "in" && c.args[0] === "category_slug");
          if (usesIn) return { data: state.childArticles, error: null };
          return { data: state.leafArticles, error: null };
        }
        return { data: [], error: null };
      })
    ),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
  return { supabase };
});

beforeEach(() => {
  vi.clearAllMocks();
  adSlotRenders.length = 0;
  state.category = {
    id: "cat-1",
    slug: "screeding",
    name: "Screeding",
    description: "Everything about screeding floors.",
    icon: null,
    parent_slug: null,
    is_active: true,
    sort_order: 1,
  };
  state.subcategories = [];
  state.leafArticles = [];
  state.childArticles = [];
});

function article(slug: string, categorySlug = "screeding") {
  return {
    id: `art-${slug}`,
    slug,
    title: `Article ${slug}`,
    excerpt: `Excerpt for ${slug}`,
    content: "Body content",
    category_slug: categorySlug,
    status: "published",
    is_featured: false,
    reading_time_minutes: 5,
    published_at: "2026-08-28T09:22:05.000Z",
    cover_image_url: null,
  };
}

async function renderCategory(slug = "screeding") {
  const Comp = (await import("@/pages/learn/LearnCategory")).default;
  return render(
    <MemoryRouter initialEntries={[`/learn/category/${slug}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/learn/category/:categorySlug" element={<Comp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("LearnCategory", () => {
  it("renders without crashing", async () => {
    const { container } = await renderCategory();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the category name, description, and its published articles", async () => {
    state.leafArticles = [article("screed-leveling"), article("screed-mixing")];
    await renderCategory();
    expect((await screen.findAllByText("Screeding")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Everything about screeding floors.").length).toBeGreaterThan(0);
    expect(screen.getByText("Article screed-leveling")).toBeInTheDocument();
    expect(screen.getByText("Article screed-mixing")).toBeInTheDocument();
    // plural form
    expect(screen.getByText("2 articles", { exact: true })).toBeInTheDocument();
    // article cards link to the article routes
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/learn/screed-leveling");
    expect(links).toContain("/learn/screed-mixing");
  });

  it("uses the singular 'article' for a category with one article", async () => {
    state.leafArticles = [article("screed-leveling")];
    await renderCategory();
    await waitFor(() => {
      expect(screen.getByText("1 article", { exact: true })).toBeInTheDocument();
    });
    expect(screen.queryByText("1 articles")).not.toBeInTheDocument();
  });

  it("shows a not-found page for an unknown category slug", async () => {
    state.category = null;
    await renderCategory("does-not-exist");
    await waitFor(() => {
      expect(screen.getByText("Category not found")).toBeInTheDocument();
    });
    expect(
      screen.getByText("This category doesn't exist or has been removed."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Learn" })).toHaveAttribute(
      "href",
      "/learn",
    );
  });

  it("renders a parent category with its subcategories and child articles", async () => {
    state.category = {
      id: "cat-p", slug: "painting", name: "Painting", description: "All painting guides.",
      icon: null, parent_slug: null, is_active: true, sort_order: 1,
    };
    state.subcategories = [
      { id: "cat-2", slug: "interior-painting", name: "Interior Painting", description: "Indoors", icon: null, parent_slug: "painting", is_active: true, sort_order: 1 },
      { id: "cat-3", slug: "exterior-painting", name: "Exterior Painting", description: "Outdoors", icon: null, parent_slug: "painting", is_active: true, sort_order: 2 },
    ];
    state.childArticles = [
      article("choosing-paint", "interior-painting"),
      article("primer-basics", "exterior-painting"),
    ];
    await renderCategory("painting");

    // Subcategory section with topic count
    expect(await screen.findByText("Topics within Painting")).toBeInTheDocument();
    expect(screen.getByText("2 topics", { exact: true })).toBeInTheDocument();
    // Subcategory cards link to their own category routes
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/learn/category/interior-painting");
    expect(links).toContain("/learn/category/exterior-painting");
    // Child articles (fetched via the .in() query) are listed under "All Articles"
    expect(screen.getByText("All Articles")).toBeInTheDocument();
    expect(screen.getByText("Article choosing-paint")).toBeInTheDocument();
    expect(screen.getByText("Article primer-basics")).toBeInTheDocument();
    // Child articles show their own category slug as the kicker label
    expect(screen.getByText("interior painting")).toBeInTheDocument();
    expect(screen.getByText("exterior painting")).toBeInTheDocument();
  });

  it("renders its ad slots with visible labels (no hideLabel)", async () => {
    state.leafArticles = [article("screed-leveling")];
    await renderCategory();
    await waitFor(() => {
      expect(adSlotRenders.length).toBeGreaterThan(0);
    });
    // Ad network / Better Ads compliance: every ad block on the page
    // must be clearly labeled — hideLabel must never be set.
    for (const slot of adSlotRenders) {
      expect(slot.hideLabel).toBeFalsy();
    }
    const slotKeys = adSlotRenders.map((s) => s.slotKey);
    expect(slotKeys).toContain("learn_category_mid");
    expect(slotKeys).toContain("learn_category_native");
    expect(slotKeys).toContain("learn_category_bottom");
  });
});
