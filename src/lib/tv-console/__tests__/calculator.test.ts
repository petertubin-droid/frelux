import { describe, expect, it } from "vitest";
import {
  calculateConsoleEstimate,
  dimensionsFromTemplate,
  hingesPerDoor,
  type ConsoleDimensions,
} from "../calculator";
import { TV_CONSOLE_TEMPLATES } from "../templates";

/**
 * A fixed configuration, stated here rather than taken from a preset, so these
 * assertions pin the engine's arithmetic and cannot drift when a preset's own
 * layout changes.
 */
const base = (): ConsoleDimensions => ({
  widthMm: 1800,
  heightMm: 400,
  depthMm: 350,
  panelThicknessMm: 18,
  backPanelThicknessMm: 6,
  shelfCount: 2,
  dividerCount: 0,
  drawerCount: 0,
  drawerFrontHeightMm: 200,
  doorCount: 0,
  doorRevealMm: 2,
  sheetWidthMm: 1220,
  sheetLengthMm: 2440,
  wastePercent: 10,
});
const line = (
  result: ReturnType<typeof calculateConsoleEstimate>,
  part: string,
) => result.panelSchedule.find((entry) => entry.part === part);

describe("TV console calculator", () => {
  it("provides twenty editable presets with positive dimensions", () => {
    expect(TV_CONSOLE_TEMPLATES).toHaveLength(20);
    expect(new Set(TV_CONSOLE_TEMPLATES.map((t) => t.id)).size).toBe(20);
    for (const template of TV_CONSOLE_TEMPLATES) {
      expect(template.widthMm).toBeGreaterThan(0);
      expect(template.heightMm).toBeGreaterThan(0);
      expect(template.depthMm).toBeGreaterThan(0);
      // A preset carries a layout, not a photograph: its picture is drawn.
      expect(template.layout.shelves).toBeGreaterThanOrEqual(0);
      expect(template.layout.dividers).toBeGreaterThanOrEqual(0);
      expect(template.layout.thicknessMm).toBeGreaterThan(0);
    }
  });

  it("describes media walls with the panelling and screen they need", () => {
    const walls = TV_CONSOLE_TEMPLATES.filter(
      (t) => t.wallTreatment && t.wallTreatment !== "none",
    );
    // The exclusive family: stone, marble, fluted and slatted panelling.
    expect(walls.length).toBeGreaterThanOrEqual(7);
    for (const template of walls) {
      expect(template.wallPanelHeightMm).toBeGreaterThan(0);
      expect(template.tvInches).toBeGreaterThan(0);
    }
    // Every preset draws a screen, because it is a TV console.
    for (const template of TV_CONSOLE_TEMPLATES) {
      expect(template.tvInches).toBeGreaterThanOrEqual(32);
      expect(template.tvInches).toBeLessThanOrEqual(100);
    }
    // Distinct treatments, not twenty variations of one idea.
    expect(
      new Set(TV_CONSOLE_TEMPLATES.map((t) => t.wallTreatment ?? "none")).size,
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(TV_CONSOLE_TEMPLATES.map((t) => t.mounting ?? "floating")).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it("prices wall panelling by the square metre it actually clads", () => {
    const priced = calculateConsoleEstimate(
      {
        ...base(),
        wallPanelHeightMm: 1600,
        wallPanelWidthMm: 2400,
        wallPanelRatePerM2: 18000,
      },
      "NGN",
    );
    const panelling = priced.costLines.find((l) => l.key === "wall-panelling")!;
    // 2.4 m x 1.6 m = 3.84 m2 at 18,000 per m2.
    expect(panelling.quantity).toBeCloseTo(3.84, 3);
    expect(panelling.amount).toBeCloseTo(69120, 2);
  });

  it("leaves panelling and LED unpriced rather than free when no rate is given", () => {
    const result = calculateConsoleEstimate(
      { ...base(), wallPanelHeightMm: 1600, ledProfileMetres: 2.6 },
      "NGN",
    );
    const panelling = result.costLines.find((l) => l.key === "wall-panelling")!;
    const led = result.costLines.find((l) => l.key === "led-profile")!;
    expect(panelling.quantity).toBeCloseTo(2.88, 3);
    expect(panelling.amount).toBeNull();
    expect(led.quantity).toBeCloseTo(2.6, 3);
    expect(led.amount).toBeNull();
    // And they are named in the unpriced list, so the total cannot hide them.
    expect(result.totals.unpricedLines).toContain(
      "Wall panelling (fluted, slatted or stone face)",
    );
    expect(result.totals.unpricedLines).toContain("LED profile and driver");
  });

  it("raises no panelling line for a plain unit", () => {
    const plain = calculateConsoleEstimate(base(), "NGN");
    const panelling = plain.costLines.find((l) => l.key === "wall-panelling")!;
    expect(panelling.quantity).toBe(0);
    expect(plain.totals.unpricedLines).not.toContain(
      "Wall panelling (fluted, slatted or stone face)",
    );
  });

  it("carries a preset's panelling into the estimate", () => {
    const preset = TV_CONSOLE_TEMPLATES.find(
      (t) => t.id === "marble-gold-flanks",
    )!;
    const mapped = dimensionsFromTemplate(preset);
    expect(mapped.wallPanelHeightMm).toBe(preset.wallPanelHeightMm);
    expect(mapped.ledProfileMetres).toBe(preset.ledProfileMetres);
    expect(mapped.wallPanelWidthMm).toBe(preset.widthMm);
  });

  it("carries a preset's own carcass and layout into the estimate", () => {
    const preset = TV_CONSOLE_TEMPLATES.find(
      (t) => t.id === "charcoal-floating",
    )!;
    const mapped = dimensionsFromTemplate(preset);
    expect(mapped.panelThicknessMm).toBe(preset.layout.thicknessMm);
    expect(mapped.backPanelThicknessMm).toBe(preset.layout.backThicknessMm);
    expect(mapped.shelfCount).toBe(preset.layout.shelves);
    expect(mapped.dividerCount).toBe(preset.layout.dividers);
    expect(mapped.drawerCount).toBe(preset.layout.drawers);
    expect(mapped.doorCount).toBe(preset.layout.doors);
    expect(mapped.doorRevealMm).toBe(preset.layout.revealMm);
    // The drawer bank the preset advertises must reach the hardware and slides.
    const result = calculateConsoleEstimate(mapped);
    expect(result.hardware.drawerSlidePairs).toBe(preset.layout.drawers);
  });

  it("deducts the back thickness so the finished unit matches the entered depth", () => {
    const withBack = calculateConsoleEstimate(base());
    expect(withBack.carcassDepthMm).toBe(344);
    expect(line(withBack, "Side panels")?.heightMm).toBe(344);

    const withoutBack = calculateConsoleEstimate({
      ...base(),
      backPanelThicknessMm: 0,
    });
    expect(withoutBack.carcassDepthMm).toBe(350);
    expect(line(withoutBack, "Back panel")).toBeUndefined();
    expect(withoutBack.backSheets.physicalSheets).toBe(0);
  });

  it("sums the panel schedule exactly, splitting carcass and back material", () => {
    const result = calculateConsoleEstimate(base(), " USD ");
    const carcass =
      2 * 400 * 344 + 2 * (1800 - 36) * 344 + 2 * (1800 - 36) * 344;
    expect(result.carcassAreaM2).toBeCloseTo(carcass / 1_000_000, 10);
    expect(result.currency).toBe("USD");
    expect(line(result, "Back panel")?.material).toBe("back");
    expect(line(result, "Side panels")?.material).toBe("carcass");
  });

  it("does not count the shelf and divider intersection twice", () => {
    const result = calculateConsoleEstimate({
      ...base(),
      dividerCount: 1,
      shelfCount: 2,
    });
    const shelfWidth = 1800 - 2 * 18 - 18;
    expect(line(result, "Internal shelves")?.widthMm).toBe(shelfWidth);
    // Divider height loses the two shelf thicknesses it is interrupted by.
    // Length runs along the panel width; depth sits against the carcass depth.
    expect(line(result, "Vertical dividers")?.widthMm).toBe(
      400 - 2 * 18 - 2 * 18,
    );
    expect(line(result, "Vertical dividers")?.heightMm).toBe(344);
  });

  it("packs parts into lanes and reports more boards than plain area division", () => {
    const result = calculateConsoleEstimate({ ...base(), wastePercent: 0 });
    // Four 1,764 mm parts cannot share a 2,440 mm lane, so they need four lanes.
    expect(result.carcassSheets.physicalSheets).toBe(2);
    expect(result.carcassSheets.areaOnlySheets).toBe(1);
    expect(result.carcassSheets.sheetsWithAllowance).toBe(2);
    expect(result.backSheets.sheetsWithAllowance).toBe(1);
  });

  it("adds the workshop allowance on top of the packed count", () => {
    const result = calculateConsoleEstimate({ ...base(), wastePercent: 10 });
    expect(result.carcassSheets.physicalSheets).toBe(2);
    expect(result.carcassSheets.sheetsWithAllowance).toBe(3);
  });

  it("reports panels longer than the board instead of counting them", () => {
    const result = calculateConsoleEstimate({ ...base(), widthMm: 2600 });
    expect(result.carcassSheets.oversizedParts).toContainEqual({
      part: "Top and bottom panels",
      lengthMm: 2564,
    });
    expect(result.backSheets.oversizedParts).toContainEqual({
      part: "Back panel",
      lengthMm: 2600,
    });
  });

  it("uses full overlay door geometry with the reveal between doors only", () => {
    const result = calculateConsoleEstimate({
      ...base(),
      doorCount: 2,
      doorRevealMm: 2,
    });
    const doors = line(result, "Overlay doors");
    expect(doors?.widthMm).toBe(899);
    expect(doors?.heightMm).toBe(400);
    expect(doors?.areaM2).toBeCloseTo((2 * 899 * 400) / 1_000_000, 10);
    expect(result.hardware.hinges).toBe(4);
    expect(result.hardware.handles).toBe(2);
    expect(hingesPerDoor(400)).toBe(2);
    expect(hingesPerDoor(1400)).toBe(3);
    expect(hingesPerDoor(2000)).toBe(4);
    expect(hingesPerDoor(2400)).toBe(5);
  });

  it("models drawer boxes to slide clearance and takes bottoms from back material", () => {
    const result = calculateConsoleEstimate({
      ...base(),
      drawerCount: 1,
      drawerFrontHeightMm: 200,
    });
    expect(line(result, "Drawer box sides")?.widthMm).toBe(344 - 18 - 15);
    expect(line(result, "Drawer box sides")?.count).toBe(2);
    expect(line(result, "Drawer box fronts and backs")?.widthMm).toBe(
      1800 - 36 - 26,
    );
    expect(line(result, "Drawer bottoms")?.material).toBe("back");
    expect(result.hardware.drawerSlidePairs).toBe(1);
    expect(result.hardware.handles).toBe(1);
  });

  it("counts edge banding from the stated banded edges with a trimming allowance", () => {
    const result = calculateConsoleEstimate(base());
    const mm = 2 * 2 * (400 + 344) + 2 * 1764 + 2 * 1764;
    expect(result.edgeBandingMetres).toBeCloseTo(
      Number(((mm / 1000) * 1.1).toFixed(2)),
      6,
    );
  });

  it("reports the clear opening between shelves", () => {
    const result = calculateConsoleEstimate(base());
    expect(result.clearOpeningHeightMm).toBeCloseTo((400 - 36 - 2 * 18) / 3, 1);
  });

  it("prices every line from the entered rates and taxes only the priced subtotal", () => {
    const result = calculateConsoleEstimate({
      ...base(),
      wastePercent: 10,
      sheetPrice: 50_000,
      backSheetPrice: 20_000,
      edgeBandingPricePerMetre: 300,
      shelfSupportPriceEach: 200,
      workshopRatePerM2: 9_000,
      finishingRatePerM2: 7_000,
      installationPrice: 25_000,
      transportPrice: 15_000,
      taxPercent: 7.5,
    });
    const carcass = result.costLines.find((l) => l.key === "carcass_sheets")!;
    const workshop = result.costLines.find((l) => l.key === "workshop")!;
    expect(carcass.quantity).toBe(3);
    expect(carcass.amount).toBe(150_000);
    // Quantity and amount always agree: the displayed metres square drive the money.
    expect(workshop.amount).toBe(
      Number((workshop.quantity * 9_000).toFixed(2)),
    );
    expect(result.totals.subtotal).toBe(
      Number((result.totals.subtotal as number).toFixed(2)),
    );
    expect(result.totals.tax).toBeCloseTo(
      ((result.totals.subtotal as number) * 7.5) / 100,
      2,
    );
    expect(result.totals.total).toBeCloseTo(
      (result.totals.subtotal as number) + (result.totals.tax as number),
      2,
    );
  });

  it("leaves unpriced lines out of the total instead of treating them as zero", () => {
    const result = calculateConsoleEstimate({ ...base(), sheetPrice: 50_000 });
    expect(result.totals.subtotal).toBe(150_000);
    expect(result.totals.unpricedLines).toContain("Edge banding");
    expect(result.totals.unpricedLines).toContain(
      "Installation and wall fixing",
    );
    expect(result.totals.tax).toBeNull();
  });

  it("does not invent a price when nothing is entered, while accepting an explicit zero", () => {
    expect(calculateConsoleEstimate(base()).totals.subtotal).toBeNull();
    expect(
      calculateConsoleEstimate({ ...base(), sheetPrice: 0 }).totals.subtotal,
    ).toBe(0);
  });

  it("rejects configurations that physically cannot be built", () => {
    expect(() =>
      calculateConsoleEstimate({ ...base(), shelfCount: 22 }),
    ).toThrow(/Shelf thickness/);
    expect(() =>
      calculateConsoleEstimate({ ...base(), backPanelThicknessMm: 300 }),
    ).toThrow();
    expect(() =>
      calculateConsoleEstimate({
        ...base(),
        depthMm: 120,
        backPanelThicknessMm: 40,
      }),
    ).toThrow(/depth/i);
    expect(() =>
      calculateConsoleEstimate({
        ...base(),
        drawerCount: 3,
        drawerFrontHeightMm: 200,
      }),
    ).toThrow(/taller than the cabinet/);
  });

  it.each([
    { widthMm: 0 },
    { widthMm: 30, panelThicknessMm: 18 },
    { shelfCount: -1 },
    { shelfCount: 1.2 },
    { dividerCount: 31 },
    { doorCount: -1 },
    { doorRevealMm: 30 },
    { wastePercent: 101 },
    { sheetPrice: -1 },
    { sheetLengthMm: 12_000 },
    { backPanelThicknessMm: -1 },
    { drawerCount: 31 },
  ])("rejects invalid parameters: %o", (patch) => {
    expect(() => calculateConsoleEstimate({ ...base(), ...patch })).toThrow();
  });
});
