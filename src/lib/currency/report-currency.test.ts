import { describe, expect, it, vi } from "vitest";
import { buildCopyText } from "@/lib/results/copy-results";
import { autoDisplayForReport } from "./quote-display";
import type { RateTable } from "./engine";

const table: RateTable = {
  source: "database",
  fetchedAt: "2026-10-30T17:20:14Z",
  quotes: [
    {
      base: "USD",
      quote: "NGN",
      rate: 1346.223823,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
  ],
};

const totals = [
  { label: "Materials", value: "$1,000" },
  { label: "Grand total", value: "$2,500", strong: true },
];

describe("copied result text", () => {
  const block = {
    title: "Tiling estimate",
    lines: [] as Array<{ label: string; value: string }>,
    total: "Grand total: $2,500",
    conversion: {
      amount: "₦3,365,559.56",
      currency: "NGN",
      rateLine: "1 USD = 1,346.22 NGN as of 30 Oct 2026 17:20 UTC",
      note: "Converted for comparison. This is not the local price of materials.",
    },
  };

  it("keeps the original total and adds the converted one", () => {
    const text = buildCopyText(block);
    expect(text).toContain("Grand total: $2,500");
    expect(text).toContain("Also in NGN: ₦3,365,559.56");
  });

  it("carries the rate and its timestamp into the pasted text", () => {
    const text = buildCopyText(block);
    expect(text).toContain("1 USD = 1,346.22 NGN as of 30 Oct 2026 17:20 UTC");
  });

  it("says the converted figure is not a local price", () => {
    expect(buildCopyText(block)).toContain("not the local price of materials");
  });

  it("leaves the text untouched when there is nothing to convert", () => {
    const text = buildCopyText({
      title: "Tiling estimate",
      lines: [],
      total: "Grand total: $2,500",
    });
    expect(text).not.toContain("Also in");
    expect(text).toContain("Grand total: $2,500");
  });

  it("uses no em dashes", () => {
    expect(buildCopyText(block)).not.toContain("—");
  });
});

describe("report display with an explicit table", () => {
  it("converts the strong total into the requested currency", () => {
    const display = autoDisplayForReport(totals, {
      table,
      from: "USD",
      to: "NGN",
    })!;
    expect(display.totals.find((t) => t.strong)?.value).toBe("₦3,365,559.56");
    expect(display.rateLine).toContain("UTC");
  });

  it("declines when both currencies are the same", () => {
    expect(
      autoDisplayForReport(totals, { table, from: "USD", to: "USD" }),
    ).toBeNull();
  });

  it("declines when no rate table is available", () => {
    expect(
      autoDisplayForReport(totals, { table: null, from: "USD", to: "NGN" }),
    ).toBeNull();
  });

  it("declines when a total cannot be read as money", () => {
    expect(
      autoDisplayForReport(
        [{ label: "Grand total", value: "pending", strong: true }],
        {
          table,
          from: "USD",
          to: "NGN",
        },
      ),
    ).toBeNull();
  });
});

describe("document studio import", () => {
  it("stages no conversion note when no rate is cached", async () => {
    vi.resetModules();
    const staged: Array<Record<string, unknown>> = [];
    vi.doMock("@/lib/document-studio", () => ({
      stageStudioImport: (payload: Record<string, unknown>) =>
        staged.push(payload),
    }));
    const { exportQuoteToDocumentStudio } =
      await import("@/lib/estimation/quote-export");
    exportQuoteToDocumentStudio(
      {
        title: "Tiling estimate",
        subtitle: "Generated 30 Oct 2026",
        metaRows: [],
        lines: [
          {
            label: "Tile adhesive",
            quantity: "10",
            unit: "bag",
            unit_price: "12.00",
          },
        ],
        totals,
      },
      "USD",
    );
    expect(staged).toHaveLength(1);
    expect(String(staged[0].notes)).not.toContain("Also in");
    vi.doUnmock("@/lib/document-studio");
  });
});

describe("money parsing", () => {
  it("reads grouped thousands as thousands, not as a fraction", async () => {
    const { parseMoneyText } = await import("./quote-display");
    expect(parseMoneyText("$1,000")).toBe(1000);
    expect(parseMoneyText("$2,500")).toBe(2500);
    expect(parseMoneyText("₦3,365,559.56")).toBe(3365559.56);
    expect(parseMoneyText("1,234,567")).toBe(1234567);
  });

  it("still reads decimal-comma money", async () => {
    const { parseMoneyText } = await import("./quote-display");
    expect(parseMoneyText("€1.234,50")).toBe(1234.5);
    expect(parseMoneyText("12,50 €")).toBe(12.5);
  });

  it("reads a plain number", async () => {
    const { parseMoneyText } = await import("./quote-display");
    expect(parseMoneyText("2500")).toBe(2500);
    expect(parseMoneyText("2500.75")).toBe(2500.75);
  });
});
