// =========================================================
// Wall finishing report export tests — PDF (printable HTML)
// and Excel workbook rows built from a verified engine
// result. Every displayed number must come from the result.
// =========================================================

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { WallFinProjectSpec, WallSpec } from "@/types/wallfinishing";
import { estimateWallFinishingProject } from "../index";
import type { WallFinResolutionContext } from "../index";
import { getAssembly } from "../assemblies";
import {
  buildWallFinReportHtml,
  buildWallFinSummaryRows,
  buildWallFinLayerRows,
  buildWallFinQcRows,
  exportWallFinExcel,
  exportWallFinPdf,
} from "../report-export";
import { QC_STATUS_LABELS } from "../checklists";
import { downloadExcel } from "@/lib/export-utils";

vi.mock("@/lib/export-utils", () => ({
  downloadExcel: vi.fn(),
}));

function testWall(partial?: Partial<WallSpec>): WallSpec {
  return {
    id: "w1",
    label: "Living room wall A",
    lengthM: 4,
    heightM: 3,
    surface: "interior",
    wallSystemId: "ng-sandcrete-block",
    assemblyId: "ng-interior-block-paint",
    openings: [],
    excludedAreaM2: 0,
    ...partial,
  };
}

function priceContext(
  prices: Record<string, number>,
  labour: Record<string, number> = {},
  currency = "NGN",
): WallFinResolutionContext {
  return {
    currency,
    resolvePrice: (role) => ({
      materialName: `${role}-material`,
      unitPrice: prices[role] ?? null,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: "NG",
      priceSource: "test",
      scanSource: null,
      priceDate: "2026-10-06",
      isManualPrice: false,
      unpriced: prices[role] === undefined,
    }),
    resolveLabour: (task) =>
      labour[task] === undefined
        ? null
        : {
            taskKey: task,
            method: "per-m2",
            rate: labour[task],
            currency,
            outputPerWorkerDay: null,
            sourceReference: "test",
            effectiveDate: "2026-10-06",
            isEstimate: true,
          },
  };
}

function fixtureSpec(
  name = "Lagos wall finishing estimate",
): WallFinProjectSpec {
  return {
    name,
    countryCode: "NG",
    region: "Lagos",
    buildingType: "residential",
    rooms: [
      {
        id: "r1",
        name: "Living room",
        lengthM: 4,
        widthM: 4,
        heightM: 3,
        isWetArea: false,
        walls: [testWall()],
      },
    ],
    extraCosts: [],
    contingencyPercent: 10,
  };
}

const PRICES = {
  "concrete-mix": 9000,
  sand: 8000,
  sandpaper: 50,
  primer: 600,
  "interior-paint": 850,
};
const LABOUR = {
  wallfin_rendering: 1500,
  wallfin_putty: 600,
  wallfin_sanding: 200,
  wallfin_priming: 300,
  wallfin_painting: 700,
};

describe("wall finishing report export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds summary rows straight from the result", async () => {
    const spec = fixtureSpec();
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const rows = buildWallFinSummaryRows(spec, result);
    const labels = rows.map((r) => r.label);
    expect(labels).toContain("Materials");
    expect(labels).toContain("Labour");
    expect(labels).toContain("Total (estimate)");
    const total = rows.find((r) => r.label === "Total (estimate)")!;
    expect(total.value).toContain(
      result.cost.total.toLocaleString("en-GB", { maximumFractionDigits: 2 }),
    );
    expect(total.value).toContain("NGN");
    const area = rows.find((r) => r.label === "Total finishing area")!;
    expect(area.value).toContain("12"); // 4 m × 3 m
  });

  it("builds one layer row per layer with material and currency", async () => {
    const spec = fixtureSpec();
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const rows = buildWallFinLayerRows(result);
    expect(getAssembly("ng-interior-block-paint")).toBeTruthy();
    expect(rows.length).toBe(result.rooms[0].walls[0].layers.length);
    result.rooms[0].walls[0].layers.forEach((layer, i) => {
      const row = rows[i];
      expect(row.layer).toBe(layer.layerName);
      expect(row.material).toBe(layer.materialName);
    });
    for (const row of rows) {
      expect(row.room).toBe("Living room");
      expect(row.wall).toBe("Living room wall A");
      expect(row.currency).toBe("NGN");
      expect(Number.isFinite(row.quantity)).toBe(true);
      expect(row.unit.length).toBeGreaterThan(0);
    }
  });

  it("builds quality-control rows with readable statuses", async () => {
    const spec = fixtureSpec();
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const rows = buildWallFinQcRows(result);
    expect(rows.length).toBeGreaterThan(0);
    const validStatuses = Object.values(QC_STATUS_LABELS);
    for (const row of rows) {
      expect(validStatuses).toContain(row.status);
      expect(row.item.length).toBeGreaterThan(0);
      expect(row.layer.length).toBeGreaterThan(0);
    }
  });

  it("renders the printable HTML with walls, layers, QC and totals", async () => {
    const spec = fixtureSpec("Villa lobby");
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const html = buildWallFinReportHtml(spec, result);
    expect(html).toContain("Villa lobby");
    expect(html).toContain("Living room wall A");
    expect(html).toContain("Quality checklist");
    expect(html).toContain("Total (estimate)");
    expect(html).toContain("NGN");
    // layer names from the assembly appear
    for (const layer of result.rooms[0].walls[0].layers) {
      expect(html).toContain(layer.layerName);
    }
    // every checklist item is rendered
    const firstLayer = result.rooms[0].walls[0].checklists[0];
    for (const item of firstLayer.items) {
      expect(html).toContain(item.label);
      expect(html).toContain(QC_STATUS_LABELS[item.status]);
    }
  });

  it("escapes HTML in project names and warnings", async () => {
    const spec = fixtureSpec('<script>alert("x")</script>');
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const html = buildWallFinReportHtml(spec, result);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("exportWallFinPdf writes the report to the print window", async () => {
    const spec = fixtureSpec();
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    const writes: string[] = [];
    const fakeWin = {
      document: {
        open: vi.fn(),
        write: vi.fn((h: string) => writes.push(h)),
        close: vi.fn(),
      },
      onload: null as null | (() => void),
      print: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(fakeWin as unknown as Window);
    exportWallFinPdf(spec, result);
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(fakeWin.document.write).toHaveBeenCalled();
    expect(writes[0]).toContain("Living room wall A");
    // onload triggers the print dialog
    fakeWin.onload?.();
    expect(fakeWin.print).toHaveBeenCalled();
  });

  it("exportWallFinExcel sends summary, layers and QC sheets", async () => {
    const spec = fixtureSpec();
    const result = await estimateWallFinishingProject(
      spec,
      priceContext(PRICES, LABOUR),
    );
    exportWallFinExcel(spec, result);
    expect(downloadExcel).toHaveBeenCalledTimes(1);
    const [filename, sheets] = vi.mocked(downloadExcel).mock
      .calls[0] as unknown as [
      string,
      {
        name: string;
        rows: Record<string, unknown>[];
        columns: { header: string }[];
      }[],
    ];
    expect(filename).toContain("wall-finishing-estimate");
    const names = sheets.map((s) => s.name);
    expect(names).toEqual(["Summary", "Layers", "Quality control"]);
    expect(sheets[0].rows.length).toBeGreaterThan(5);
    expect(sheets[1].rows.length).toBe(result.rooms[0].walls[0].layers.length);
    expect(sheets[2].rows.length).toBeGreaterThan(0);
  });
});
