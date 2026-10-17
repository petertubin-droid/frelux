import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

function article(slug: string) {
  return {
    id: `art-${slug}`,
    slug,
    title: `Article ${slug}`,
    excerpt: `Excerpt for ${slug}`,
    content: "Body content",
    category_slug: "painting-guides",
    status: "published",
    is_featured: false,
    read_time_minutes: 6,
    published_at: "2026-08-28T09:22:05.000Z",
    cover_image_url: null,
  };
}

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
    __orCalls: [] as string[],
    __marketFilters: [] as string[][],
    from: vi.fn((table: string) =>
      makeBuilder((calls) => {
        if (table === "learn_articles") {
          const select = calls.find((c) => c.method === "select");
          const isCountQuery =
            select?.args[1] &&
            typeof select.args[1] === "object" &&
            (select.args[1] as Record<string, unknown>).count === "exact";
          const marketIn = calls.find(
            (c) => c.method === "in" && c.args[0] === "market",
          );
          if (marketIn) {
            supabase.__marketFilters.push(marketIn.args[1] as string[]);
            const codes = marketIn.args[1] as string[];
            if (!codes.includes("NG")) {
              if (isCountQuery) return { data: null, error: null, count: 0 };
              return { data: [], error: null };
            }
          }
          if (isCountQuery) {
            return { data: null, error: null, count: supabase.__count };
          }
          const or = calls.find((c) => c.method === "or");
          if (or) {
            supabase.__orCalls.push(String(or.args[0]));
            return { data: [article("search-hit")], error: null };
          }
          return { data: [article("one"), article("two")], error: null };
        }
        return { data: null, error: null };
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
    __count: 45 as number | null,
  };
  return { supabase };
});

import { supabase } from "@/lib/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  (supabase as unknown as { __count: number | null }).__count = 45;
  (supabase as unknown as { __orCalls: string[] }).__orCalls = [];
  (supabase as unknown as { __marketFilters: string[][] }).__marketFilters =
    [];
  useMarketMock.mockReturnValue({
    market: { countryName: "Nigeria" },
    marketCode: "NG",
  });
});

async function renderPage() {
  const Comp = (await import("@/pages/learn/LearnLibrary")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("LearnLibrary", () => {
  it("renders the paginated library with the real total count", async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText("45 guides, page 1 of 3")).toBeInTheDocument();
    });
    expect(screen.getByText("Article one")).toBeInTheDocument();
    expect(screen.getByText("Article two")).toBeInTheDocument();
  });

  it("sanitizes special characters out of the search query before hitting PostgREST", async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText("45 guides, page 1 of 3")).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText(/search the library/i);
    fireEvent.change(input, { target: { value: "50% (milk), bag_in" } });
    await waitFor(() => {
      expect(
        (supabase as unknown as { __orCalls: string[] }).__orCalls,
      ).toEqual([
        "title.ilike.%50   milk   bag in%,excerpt.ilike.%50   milk   bag in%",
      ]);
    });
  });
});

describe("LearnLibrary market scoping", () => {
  beforeEach(() => {
    useMarketMock.mockReturnValue({
      market: { countryName: "United States" },
      marketCode: "US",
    });
    (supabase as unknown as { __marketFilters: string[][] }).__marketFilters =
      [];
  });

  it("scopes the library listing and count to the visitor's market plus GLOBAL", async () => {
    await renderPage();
    await waitFor(() => {
      expect(
        (supabase as unknown as { __marketFilters: string[][] })
          .__marketFilters.length,
      ).toBeGreaterThan(0);
    });
    const filters = (
      supabase as unknown as { __marketFilters: string[][] }
    ).__marketFilters;
    for (const codes of filters) {
      expect(codes).toEqual(["US", "GLOBAL"]);
    }
  });

  it("shows the market coming-soon state instead of the Nigerian library", async () => {
    await renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("The United States library is being written"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Article one")).not.toBeInTheDocument();
  });
});
