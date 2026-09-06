import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
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

// ── Supabase mock ──────────────────────────────────────────────────────
type Call = { method: string; args: unknown[] };
const METHODS = [
  "select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
  "in", "is", "not", "or", "and", "order", "range", "limit", "single",
  "maybeSingle", "textSearch",
];

const article = {
  id: "art-1",
  slug: "test-article",
  title: "Test Article",
  excerpt: "Excerpt",
  content:
    "Intro paragraph with enough words to render. " +
    "## Heading\n\nBody text under the heading with detail.",
  category_slug: "painting-guides",
  status: "published",
  is_featured: false,
  reading_time_minutes: 5,
  published_at: "2026-08-28T09:22:05.000Z",
  cover_url: null,
  seo_title: "Test Article",
  seo_description: "Excerpt",
  keywords: "screeding",
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
        if (table === "learn_articles" && isSingle) {
          return { data: article, error: null };
        }
        if (table === "learn_article_faqs") return { data: [], error: null };
        if (table === "learn_article_inserts") return { data: [], error: null };
        if (table === "learn_categories") {
          return {
            data: [{ id: "cat-1", slug: "painting-guides", name: "Painting Guides", is_active: true, sort_order: 1 }],
            error: null,
          };
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
});

async function renderArticle() {
  const Comp = (await import("@/pages/learn/LearnArticle")).default;
  return render(
    <MemoryRouter initialEntries={["/learn/test-article"]}>
      <ToastProvider>
        <Routes>
          <Route path="/learn/:articleSlug" element={<Comp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("LearnArticle", () => {
  it("renders without crashing", async () => {
    const { container } = await renderArticle();
    expect(container.innerHTML).not.toBe("");
  });

  it("renders its ad slots with visible labels (no hideLabel)", async () => {
    await renderArticle();
    await waitFor(() => {
      expect(adSlotRenders.length).toBeGreaterThan(0);
    });
    // Ad network / Better Ads compliance: every ad block on the page
    // must be clearly labeled — hideLabel must never be set.
    for (const slot of adSlotRenders) {
      expect(slot.hideLabel).toBeFalsy();
    }
    const slotKeys = adSlotRenders.map((s) => s.slotKey);
    expect(slotKeys).toContain("learn_article_top");
    expect(slotKeys).toContain("learn_article_native");
  });
});
