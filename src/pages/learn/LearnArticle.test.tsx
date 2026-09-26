import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}));

// Capture every AdSlot render so tests can assert policy-relevant props
// (ad blocks must never be hidden-labeled).
const adSlotRenders: Array<{ slotKey: string; hideLabel?: boolean }> = [];
vi.mock("@/components/ui/AdSlot", () => ({
  default: ({
    slotKey,
    hideLabel,
  }: {
    slotKey: string;
    hideLabel?: boolean;
  }) => {
    adSlotRenders.push({ slotKey, hideLabel });
    return <div data-testid={`adslot-${slotKey}`} />;
  },
}));

// ── Supabase mock ──────────────────────────────────────────────────────
type Call = { method: string; args: unknown[] };
const METHODS = [
  "select",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "is",
  "not",
  "or",
  "and",
  "order",
  "range",
  "limit",
  "single",
  "maybeSingle",
  "textSearch",
];

const article = {
  id: "art-1",
  slug: "test-article",
  title: "Test Article",
  excerpt: "Excerpt",
  content:
    "Intro paragraph with enough words to render.\n\n" +
    "## Section One\n\nBody text under the first heading with detail.\n\n" +
    "## Section Two\n\nBody text under the second heading with detail.\n\n" +
    "## Section Three\n\nBody text under the third heading with detail.\n\n" +
    "## Section Four\n\nBody text under the fourth heading with detail.\n\n" +
    "## Section Five\n\nBody text under the fifth heading with detail.",
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
    then: (
      onFulfilled: (r: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resultFor(calls)).then(onFulfilled, onRejected),
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
        const isSingle = calls.some(
          (c) => c.method === "maybeSingle" || c.method === "single",
        );
        if (table === "learn_articles" && isSingle) {
          return { data: article, error: null };
        }
        if (table === "learn_article_faqs") return { data: [], error: null };
        if (table === "learn_article_inserts") return { data: [], error: null };
        if (table === "learn_categories") {
          return {
            data: [
              {
                id: "cat-1",
                slug: "painting-guides",
                name: "Painting Guides",
                is_active: true,
                sort_order: 1,
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      }),
    ),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
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
  beforeEach(() => {
    adSlotRenders.length = 0;
  });

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
    // must be clearly labeled, hideLabel must never be set.
    for (const slot of adSlotRenders) {
      expect(slot.hideLabel).toBeFalsy();
    }
    // React re-renders the page (article loads, then faqs/inserts) so the
    // render-capture mock fires per render pass; dedupe to the set of
    // slots the page actually mounts.
    const slotKeys = [...new Set(adSlotRenders.map((s) => s.slotKey))];
    expect(slotKeys).toContain("learn_article_top");
    // Ad layout policy (max 5 per article page): exactly one slot after
    // the cover image, three in-content between sections, one at the
    // bottom - and never a cluster at the article footer.
    expect(slotKeys.filter((k) => k === "learn_article_top")).toHaveLength(1);
    expect(slotKeys).toContain("learn_article_mid_2");
    expect(slotKeys).toContain("article_push_1");
    expect(slotKeys).toContain("learn_in_article");
    expect(slotKeys).toContain("learn_article_bottom");
    // No removed/jam-packed footer slots may come back.
    for (const banned of [
      "learn_article_native",
      "learn_article_native_2",
      "learn_article_native_3",
      "article_push_2",
    ]) {
      expect(slotKeys).not.toContain(banned);
    }
    // Hard ceiling: 5 ad slots per article page.
    expect(slotKeys.length).toBeLessThanOrEqual(5);
    expect(slotKeys.length).toBe(5);
    // The header area (right after the article image) has exactly one
    // ad slot, not two.
    expect(slotKeys[0]).toBe("learn_article_top");
    // In-content slots are interleaved: they must appear between the
    // top slot and the bottom slot, in reading order.
    expect(slotKeys).toEqual([
      "learn_article_top",
      "learn_article_mid_2",
      "article_push_1",
      "learn_in_article",
      "learn_article_bottom",
    ]);
  });
});
