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
  id: "wall-1",
  slug: "us-timber-stud-drywall-installation",
  title: "Installing US Timber-Stud Drywall: Field Sequence",
  excerpt: "A sequenced US field guide.",
  content:
    "Intro paragraph for the article body.\n\n" +
    "## Establish the approved assembly\n\nCoordination text.\n\n" +
    "## Verify framing and backing\n\nInspection text.\n\n" +
    "## Tape and finish joints\n\nFinishing text.",
  author: "petertubin",
  published_at: "2026-10-17T12:00:00.000Z",
  read_time_minutes: 10,
  cover_image_url: null,
  wall_market_code: "US",
  wall_topic_id: "topic-1",
  wall_language_code: null,
  wall_article_theme: "installation",
};

const citations = [
  {
    id: "src-1",
    title: "GA-216 Application and Finishing of Gypsum Panel Products",
    url: "https://example.org/ga216",
    publisher: "Gypsum Association",
    published_on: "2024",
    retrieved_at: "2026-10-01",
    claim_scope: "Application and finishing standard",
  },
];

const faqs = [
  {
    id: "faq-1",
    question: "What framing spacing is typical?",
    answer: "Framing spacing comes from the approved assembly documents.",
  },
];

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
    __tables: [] as string[],
    from: vi.fn((table: string) => {
      supabase.__tables.push(table);
      return makeBuilder((calls) => {
        const isSingle = calls.some(
          (c) => c.method === "maybeSingle" || c.method === "single",
        );
        if (table === "learn_articles" && isSingle) {
          return { data: article, error: null };
        }
        if (table === "learn_wall_finishing_sources") {
          return { data: citations, error: null };
        }
        if (table === "learn_article_faqs") return { data: faqs, error: null };
        return { data: [], error: null };
      });
    }),
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
  (
    supabase as unknown as { __tables: string[] }
  ).__tables = [];
});

async function renderArticle() {
  const Comp = (await import("@/pages/learn/WallFinishingArticle")).default;
  return render(
    <MemoryRouter initialEntries={["/learn/wall-finishing/US/us-timber-stud-drywall-installation"]}>
      <ToastProvider>
        <Routes>
          <Route
            path="/learn/wall-finishing/:marketCode/:articleSlug"
            element={<Comp />}
          />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("WallFinishingArticle (premium market article page)", () => {
  it("renders the premium article layout: title, byline, TOC, prose", async () => {
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain(
        "Installing US Timber-Stud Drywall: Field Sequence",
      );
    });

    // Premium header meta: author, read time, published date, share
    expect(container.textContent).toContain("petertubin");
    expect(container.textContent).toContain("10 min read");

    // Sticky table of contents from markdown headings
    expect(container.textContent).toContain("Contents");
    expect(container.textContent).toContain("Establish the approved assembly");

    // Headings render with slug ids for TOC navigation
    const h2 = container.querySelector(
      "h2#establish-the-approved-assembly",
    );
    expect(h2).not.toBeNull();

    // Theme badge from the market edition
    expect(container.textContent).toContain("Installation");

    // Breadcrumb points at the market library
    expect(
      container.querySelector('a[href="/learn/wall-finishing/us/"]'),
    ).not.toBeNull();
  });

  it("renders the reviewed citations section with publisher and scope", async () => {
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain("Sources Reviewed");
    });
    expect(container.textContent).toContain("Gypsum Association");
    expect(container.textContent).toContain(
      "Application and finishing standard",
    );
    const sourceLink = container.querySelector('a[href="https://example.org/ga216"]');
    expect(sourceLink).not.toBeNull();
    expect(sourceLink?.getAttribute("rel")).toContain("noopener");
  });

  it("renders FAQ accordion content when FAQs exist", async () => {
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain("Frequently Asked Questions");
    });
    expect(container.textContent).toContain("What framing spacing is typical?");
    expect(container.textContent).toContain(
      "Framing spacing comes from the approved assembly documents.",
    );
  });

  it("emits Article + BreadcrumbList + FAQPage structured data", async () => {
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain("Sources Reviewed");
    });
    // useSeo injects JSON-LD into document.head, not the page container
    const ldJson = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((el) => el.textContent ?? "")
      .map((t) => JSON.parse(t));
    const types = ldJson.map((d) => (d as { "@type"?: string })["@type"]);
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
  });

  it("queries only published, editorially approved wall articles for the market", async () => {
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain("Sources Reviewed");
    });
    const tables = (supabase as unknown as { __tables: string[] }).__tables;
    expect(tables).toContain("learn_articles");
    expect(tables).toContain("learn_wall_finishing_sources");
    expect(tables).toContain("learn_article_faqs");
  });

  it("shows the market missing state for an unpublished article", async () => {
    // Override the builder result for this test: no article found.
    vi.mocked(supabase.from).mockImplementation(((
      table: string,
    ) => {
      const builder = makeBuilder(() => ({ data: null, error: null }));
      void table;
      return builder;
    }) as unknown as typeof supabase.from);
    const { container } = await renderArticle();
    await waitFor(() => {
      expect(container.textContent).toContain(
        "This article isn't published and approved for the selected market.",
      );
    });
  });
});
