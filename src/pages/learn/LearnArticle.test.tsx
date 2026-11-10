import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

const useMarketMock = vi.fn();
vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: () => "NGN",
  useMarket: () => useMarketMock(),
}));

// Capture every AdSlot render so tests can assert policy-relevant props
// (ad blocks must never be hidden-labeled).
const adSlotRenders: Array<{ slotKey: string; hideLabel?: boolean }> = [];

// FAQs the page should receive for learn_article_faqs. Empty by default so the
// existing tests keep exercising an article with no FAQ block.
const faqFixture: Array<{
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}> = [];
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
  market: "NG",
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
    __marketFilters: [] as string[][],
    __eqMarketArgs: [] as string[],
    from: vi.fn((table: string) =>
      makeBuilder((calls) => {
        const isSingle = calls.some(
          (c) => c.method === "maybeSingle" || c.method === "single",
        );
        if (table === "learn_articles") {
          const marketIn = calls.find(
            (c) => c.method === "in" && c.args[0] === "market",
          );
          if (marketIn)
            supabase.__marketFilters.push(marketIn.args[1] as string[]);
          const marketEq = calls.find(
            (c) => c.method === "eq" && c.args[0] === "market",
          );
          if (marketEq) supabase.__eqMarketArgs.push(String(marketEq.args[1]));
        }
        if (table === "learn_articles" && isSingle) {
          return { data: article, error: null };
        }
        if (table === "learn_article_faqs")
          return { data: faqFixture, error: null };
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

import { supabase } from "@/lib/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  adSlotRenders.length = 0;
  (supabase as unknown as { __marketFilters: string[][] }).__marketFilters = [];
  (supabase as unknown as { __eqMarketArgs: string[] }).__eqMarketArgs = [];
  faqFixture.length = 0;
  useMarketMock.mockReturnValue({
    market: { countryName: "Nigeria" },
    marketCode: "NG",
  });
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
    // Monetag push is now a global overlay mounted once in Layout, not an
    // in-content slot, so it must not consume an article slot budget.
    expect(slotKeys).not.toContain("article_push_1");
    expect(slotKeys).toContain("learn_in_article");
    // No removed/jam-packed footer slots may come back.
    for (const banned of [
      "learn_article_native",
      "learn_article_native_2",
      "learn_article_native_3",
      "article_push_2",
      // Owner directive 2026-10-27: the AdSense-locked sticky bottom
      // anchor is the ONLY bottom-of-page slot; no page renders its own
      // bottom/footer slot anymore.
      "learn_article_bottom",
    ]) {
      expect(slotKeys).not.toContain(banned);
    }
    // Hard ceiling: 3 ad slots per article page (owner directive 2026-10-29:
    // three on long pages, two on short ones).
    expect(slotKeys.length).toBeLessThanOrEqual(3);
    expect(slotKeys.length).toBe(3);
    // The header area (right after the article image) has exactly one
    // ad slot, not two.
    expect(slotKeys[0]).toBe("learn_article_top");
    // In-content slots are interleaved in reading order.
    expect(slotKeys).toEqual([
      "learn_article_top",
      "learn_article_mid_2",
      "learn_in_article",
    ]);
  });
});

describe("LearnArticle market scoping", () => {
  beforeEach(() => {
    useMarketMock.mockReturnValue({
      market: { countryName: "United States" },
      marketCode: "US",
    });
  });

  it("scopes related and recent listings to the visitor's market plus GLOBAL", async () => {
    await renderArticle();
    await waitFor(() => {
      const filters = (supabase as unknown as { __marketFilters: string[][] })
        .__marketFilters;
      expect(filters.length).toBeGreaterThan(0);
      for (const codes of filters) {
        expect(codes).toEqual(["US", "GLOBAL"]);
      }
    });
  });

  it("keeps prev/next navigation inside the article's own market", async () => {
    await renderArticle();
    await waitFor(() => {
      expect(
        (supabase as unknown as { __eqMarketArgs: string[] }).__eqMarketArgs,
      ).toEqual(["NG", "NG"]);
    });
  });
});

describe("LearnArticle FAQ block", () => {
  // Six FAQs is the library standard. The visible accordion and the FAQPage
  // structured data are built from the same rows, so a mismatch between what a
  // visitor reads and what a crawler is told is the failure this guards.
  it("renders six questions and matching FAQPage structured data", async () => {
    for (let i = 1; i <= 6; i += 1) {
      faqFixture.push({
        question: `Question ${i} about this article?`,
        answer: `Answer ${i} restating what the article already says.`,
        sort_order: i,
        is_active: true,
      });
    }

    const { getByText, getAllByText } = await renderArticle();

    await waitFor(() => {
      expect(
        document.querySelectorAll("[data-faq-insert]").length,
      ).toBeGreaterThan(0);
    });
    // The questions live inside the article body now, not in a collapsed panel.
    expect(document.querySelector("#faqs")).toBeTruthy();
    expect(screen.queryByText("Frequently Asked Questions")).toBeNull();
    for (let i = 1; i <= 6; i += 1) {
      // The first three also appear in the in-article quick answers block, so
      // the question is expected more than once; what matters is that each one
      // is present and the full list still carries all six.
      expect(
        getAllByText(`Question ${i} about this article?`).length,
      ).toBeGreaterThanOrEqual(1);
    }
    expect(
      document.querySelectorAll("[data-faq-insert] dl dt").length,
    ).toBeGreaterThanOrEqual(6);

    const readJsonLdBlocks = () =>
      Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      )
        .map((node) => {
          try {
            return JSON.parse(node.textContent ?? "{}");
          } catch {
            return null;
          }
        })
        .flat()
        .filter(Boolean) as Array<Record<string, unknown>>;

    // The structured data is published in an effect after the rows render, so a
    // slower runner can read the page between the two. Waiting for the settled
    // block keeps the exact count assertion instead of weakening it.
    await waitFor(() => {
      const faqPage = readJsonLdBlocks().find(
        (block) => block["@type"] === "FAQPage",
      ) as { mainEntity?: Array<{ name: string }> } | undefined;
      expect(faqPage).toBeTruthy();
      expect(faqPage?.mainEntity).toHaveLength(6);
      expect(faqPage?.mainEntity?.map((q) => q.name)).toEqual(
        faqFixture.map((f) => f.question),
      );
    });
  });
});
