// =========================================================
// ADMIN INTELLIGENCE DASHBOARD TESTS
//
// The dashboard's honesty contract:
//   * external prices are OBSERVED MARKET PRICES — the
//     subtitle states they never auto-change configured
//     calculator prices, and the price section keeps the
//     three price kinds distinct
//   * tiles aggregate from real crawl runs (pages, new/
//     changed facts, errors), not marketing copy
//   * an empty dashboard claims nothing: "No source has
//     been claimed crawled"
//   * a load failure surfaces the error instead of zeros
//   * refresh re-reads all four seams
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/learning/web-intelligence/intel-client", () => ({
  listSources: vi.fn(),
  listCrawlRuns: vi.fn(),
  listPriceObservations: vi.fn(),
  listExtractedProducts: vi.fn(),
}));

import {
  listSources,
  listCrawlRuns,
  listPriceObservations,
  listExtractedProducts,
} from "@/lib/learning/web-intelligence/intel-client";
import AdminIntelligenceDashboard from "@/pages/admin/AdminIntelligenceDashboard";

const SOURCES = [
  {
    enabled: true,
    reliability: "TRUSTED",
    last_crawl: "2026-09-17T10:00:00Z",
    next_crawl: "2026-09-18T10:00:00Z",
  },
  { enabled: true, reliability: "MEDIUM", last_crawl: null, next_crawl: null },
  {
    enabled: false,
    reliability: "TRUSTED",
    last_crawl: null,
    next_crawl: null,
  },
];
const RUNS = [
  {
    id: "run-0001",
    status: "completed",
    started_at: "2026-09-17T10:00:00Z",
    pages_processed: 12,
    pages_attempted: 15,
    pages_rejected: 2,
    pages_unchanged: 1,
    new_facts: 8,
    changed_facts: 3,
    candidates_generated: 5,
    knowledge_promoted: 2,
    errors: ["timeout on page 3"],
    failure_reason: null,
  },
  {
    id: "run-0002",
    status: "failed",
    started_at: "2026-09-16T10:00:00Z",
    pages_processed: 0,
    pages_attempted: 4,
    pages_rejected: 4,
    pages_unchanged: 0,
    new_facts: 2,
    changed_facts: 0,
    candidates_generated: 1,
    knowledge_promoted: 0,
    errors: [],
    failure_reason: "robots.txt denied",
  },
];
const OBS = [
  {
    product_name: "Cement 50kg",
    price: 9500,
    currency: "NGN",
    country: "NG",
    region: "Lagos",
    retrieved_at: "2026-09-17T10:00:00Z",
    source_reliability: "TRUSTED",
  },
  {
    product_name: "Cement 50kg",
    price: 9000,
    currency: "NGN",
    country: "NG",
    region: "Abuja",
    retrieved_at: "2026-09-17T11:00:00Z",
    source_reliability: "TRUSTED",
  },
];
const PRODUCTS = [
  {
    product_name: "Cement 50kg",
    price: 9500,
    currency: "NGN",
    url: "https://example.com/cement",
    uncertain_fields: ["price"],
    confidence: 0.8,
    verification_status: "PENDING",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listSources).mockResolvedValue(SOURCES as never);
  vi.mocked(listCrawlRuns).mockResolvedValue(RUNS as never);
  vi.mocked(listPriceObservations).mockResolvedValue(OBS as never);
  vi.mocked(listExtractedProducts).mockResolvedValue(PRODUCTS as never);
});

function tileValue(label: string): string {
  const labels = screen.getAllByText(label);
  for (const l of labels) {
    const v = l.nextElementSibling?.textContent;
    if (v != null) return v;
  }
  return "<missing tile>";
}

describe("AdminIntelligenceDashboard", () => {
  it("states the price-registry separation: observed prices never auto-change configured calculator prices", async () => {
    render(<AdminIntelligenceDashboard />);
    expect(
      await screen.findByText(
        /never automatically change FRELUX configured calculator prices/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /distinct from FRELUX CONFIGURED PRICES and VERIFIED ACTUAL PROJECT PRICES/i,
      ),
    ).toBeTruthy();
  });

  it("aggregates tiles from real crawl runs, not marketing copy", async () => {
    render(<AdminIntelligenceDashboard />);
    expect(await screen.findByText("Registered sources")).toBeTruthy();
    expect(tileValue("Registered sources")).toBe("3");
    expect(tileValue("Pages scanned")).toBe("12"); // 12+0 processed
    expect(tileValue("New information")).toBe("10"); // 8+2
    expect(tileValue("Learning candidates")).toBe("6"); // 5+1
    expect(tileValue("Knowledge promoted (via review)")).toBe("2");
    expect(tileValue("Crawl errors")).toBe("1"); // run-0001's timeout
    expect(tileValue("Active")).toBe("2");
    expect(tileValue("Disabled")).toBe("1");
  });

  it("crawl history shows per-run honesty: failure reasons and error lists, never a cleaned-up fiction", async () => {
    render(<AdminIntelligenceDashboard />);
    await screen.findByText("Crawl history");
    expect(screen.getByText("robots.txt denied")).toBeTruthy();
    expect(screen.getByText(/timeout on page 3/)).toBeTruthy();
    expect(screen.getAllByText(/rejected/).length).toBeGreaterThan(0);
  });

  it("extracted products surface their uncertainty instead of hiding it", async () => {
    render(<AdminIntelligenceDashboard />);
    await screen.findByText(/Extracted products \(1\)/);
    expect(screen.getByText(/uncertain: price/)).toBeTruthy();
    expect(screen.getByText(/verification PENDING/)).toBeTruthy();
    expect(screen.getByText("https://example.com/cement")).toBeTruthy();
  });

  it("observed prices are reported per region with medians", async () => {
    render(<AdminIntelligenceDashboard />);
    expect(await screen.findByText("LAGOS")).toBeTruthy();
    expect(screen.getByText("ABUJA")).toBeTruthy();
    expect(screen.getAllByText(/median/i).length).toBeGreaterThan(0); // overall + per-region
  });

  it("an empty dashboard claims nothing crawled", async () => {
    vi.mocked(listSources).mockResolvedValue([] as never);
    vi.mocked(listCrawlRuns).mockResolvedValue([] as never);
    vi.mocked(listPriceObservations).mockResolvedValue([] as never);
    vi.mocked(listExtractedProducts).mockResolvedValue([] as never);
    render(<AdminIntelligenceDashboard />);
    expect(
      await screen.findByText(/No source has been claimed crawled/i),
    ).toBeTruthy();
    expect(screen.getByText(/No products extracted yet/i)).toBeTruthy();
    expect(screen.getByText("never")).toBeTruthy(); // last crawl tile
  });

  it("a load failure surfaces the error instead of silent zeros", async () => {
    vi.mocked(listSources).mockRejectedValue(
      new Error("intel tables unreachable"),
    );
    render(<AdminIntelligenceDashboard />);
    expect(await screen.findByText("intel tables unreachable")).toBeTruthy();
  });

  it("refresh re-reads all four seams", async () => {
    render(<AdminIntelligenceDashboard />);
    await screen.findByText("Registered sources");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(listSources).toHaveBeenCalledTimes(2);
      expect(listCrawlRuns).toHaveBeenCalledTimes(2);
      expect(listPriceObservations).toHaveBeenCalledTimes(2);
      expect(listExtractedProducts).toHaveBeenCalledTimes(2);
    });
  });
});
