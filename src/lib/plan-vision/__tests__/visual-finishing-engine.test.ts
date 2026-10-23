import { describe, it, expect } from "vitest";
import {
  validateVisualMedia,
  detectVisualSurfaces,
  applyCalibrationToSurfaces,
  calculateVisualFinishingEstimate,
  scaleSurfacesByReferenceObject,
  resolveMarketFinishingRates,
  MAX_VISUAL_MEDIA_BYTES,
} from "../visual-finishing-engine";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import type {
  VisualMediaInput,
  CalibrationData,
  FinishingOptions,
} from "../visual-finishing-types";

describe("Visual Finishing Engine - Layer A: Media Validation", () => {
  it("accepts valid image uploads under 25MB", () => {
    const res = validateVisualMedia({
      name: "room-wall.jpg",
      type: "image/jpeg",
      size: 4 * 1024 * 1024,
    });
    expect(res.ok).toBe(true);
  });

  it("accepts PNG and WebP files", () => {
    expect(
      validateVisualMedia({ name: "plan.png", type: "image/png", size: 1024 })
        .ok,
    ).toBe(true);
    expect(
      validateVisualMedia({ name: "snap.webp", type: "image/webp", size: 2048 })
        .ok,
    ).toBe(true);
  });

  it("rejects empty files", () => {
    const res = validateVisualMedia({
      name: "empty.jpg",
      type: "image/jpeg",
      size: 0,
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EMPTY");
  });

  it("rejects unsupported document or media types", () => {
    const res = validateVisualMedia({
      name: "doc.pdf",
      type: "application/pdf",
      size: 5000,
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects oversized images exceeding 25MB", () => {
    const res = validateVisualMedia({
      name: "giant.jpg",
      type: "image/jpeg",
      size: MAX_VISUAL_MEDIA_BYTES + 1024,
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("TOO_LARGE");
  });
});

describe("Visual Finishing Engine - Layer B: Surface Detection & Observation", () => {
  const dummyMedia: VisualMediaInput = {
    id: "media-1",
    fileName: "living-room.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024 * 1024,
    capturedAt: new Date().toISOString(),
    sourceType: "upload",
  };

  it("extracts candidate walls, ceiling and openings for painting", () => {
    const surfaces = detectVisualSurfaces(dummyMedia, "painting");
    expect(surfaces.length).toBeGreaterThanOrEqual(2);

    const primaryWall = surfaces.find((s) => s.id === "surf-wall-primary");
    expect(primaryWall).toBeDefined();
    expect(primaryWall?.category).toBe("wall");
    expect(primaryWall?.openings.length).toBeGreaterThan(0);
    expect(primaryWall?.confidence).toBeGreaterThan(0.7);

    // Honesty rule: observations start uncalibrated with no metric dimensions
    expect(primaryWall?.measurementStatus).toBe("incomplete");
    expect(primaryWall?.calibrationMethod).toBe("uncalibrated");
    expect(primaryWall?.grossAreaM2).toBeNull();
    expect(primaryWall?.netAreaM2).toBeNull();
  });

  it("extracts floor surfaces when activity is tiling or flooring", () => {
    const surfaces = detectVisualSurfaces(dummyMedia, "tiling");
    const floor = surfaces.find((s) => s.category === "floor");
    expect(floor).toBeDefined();
    expect(floor?.measurementStatus).toBe("incomplete");
  });
});

describe("Visual Finishing Engine - Layer C: Calibration & Real-World Dimensions", () => {
  const dummyMedia: VisualMediaInput = {
    id: "media-1",
    fileName: "living-room.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024 * 1024,
    capturedAt: new Date().toISOString(),
    sourceType: "upload",
  };

  it("converts observations into metric dimensions using user-supplied room dimensions", () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "painting");
    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 5.0,
      roomWidthM: 4.0,
      wallHeightM: 2.8,
      ceilingHeightM: 2.8,
      isCalibrated: true,
    };

    const { surfaces, warnings } = applyCalibrationToSurfaces(
      rawSurfaces,
      calib,
    );
    const wall1 = surfaces.find((s) => s.id === "surf-wall-primary");
    expect(wall1?.measurementStatus).toBe("user_confirmed");
    expect(wall1?.widthM).toBe(5.0);
    expect(wall1?.heightM).toBe(2.8);
    expect(wall1?.grossAreaM2).toBe(14.0); // 5.0 * 2.8

    // Deductions: door 0.9*2.1 = 1.89 m2, window 1.2*1.2 = 1.44 m2 -> total deduction 3.33 m2
    expect(wall1?.deductedOpeningAreaM2).toBeCloseTo(3.33, 2);
    expect(wall1?.netAreaM2).toBeCloseTo(10.67, 2);

    const ceiling = surfaces.find((s) => s.category === "ceiling");
    expect(ceiling?.netAreaM2).toBe(20.0); // 5.0 * 4.0
  });

  it("caps opening deductions if openings exceed wall gross area and warns user", () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "painting");
    const wall1 = rawSurfaces.find((s) => s.id === "surf-wall-primary")!;
    // Add massive opening
    wall1.openings.push({
      id: "huge-opening",
      type: "window",
      label: "Giant Glazing",
      confidence: 0.9,
      widthM: 10,
      heightM: 10,
      areaM2: 100,
      deduct: true,
    });

    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 2.0,
      roomWidthM: 2.0,
      wallHeightM: 2.0,
      ceilingHeightM: 2.0,
      isCalibrated: true,
    };

    const { surfaces, warnings } = applyCalibrationToSurfaces(
      rawSurfaces,
      calib,
    );
    const calibratedWall = surfaces.find((s) => s.id === "surf-wall-primary")!;
    expect(calibratedWall.netAreaM2).toBe(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("exceeds gross wall area");
  });
});

describe("Visual Finishing Engine - Layer E & F: Deterministic Estimation across All 32 Markets", () => {
  const dummyMedia: VisualMediaInput = {
    id: "media-1",
    fileName: "living-room.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024 * 1024,
    capturedAt: new Date().toISOString(),
    sourceType: "upload",
  };

  const getCalibratedSurfaces = () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "painting");
    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 6.0,
      roomWidthM: 4.0,
      wallHeightM: 3.0,
      ceilingHeightM: 3.0,
      isCalibrated: true,
    };
    return applyCalibrationToSurfaces(rawSurfaces, calib).surfaces;
  };

  it("calculates deterministic painting quantities for NG without unsupported default pricing", () => {
    const surfaces = getCalibratedSurfaces();
    const options: FinishingOptions = {
      activity: "painting",
      marketCode: "NG",
      currency: "NGN",
      currencySymbol: "₦",
      unitSystem: "metric",
      painting: {
        qualityName: "Premium Emulsion",
        coats: 2,
        includeCeiling: true,
        includePrimer: true,
      },
    };

    const res = calculateVisualFinishingEstimate(surfaces, options);
    expect(res.marketCode).toBe("NG");
    expect(res.materials.length).toBeGreaterThanOrEqual(2);

    const wallPaint = res.materials.find((m) => m.id === "mat-paint-wall")!;
    expect(wallPaint.quantity).toBeGreaterThan(0);
    expect(wallPaint.packageCount).toBeGreaterThan(0);
    expect(wallPaint.priceStatus).toBe("price_unavailable");
    expect(wallPaint.unitPrice).toBeNull();
    expect(wallPaint.totalCost).toBeNull();
    expect(res.isFullyPriced).toBe(false);
    expect(res.subtotalMaterialCost).toBeNull();
  });

  it("calculates exact quantities for unverified market CI (Côte d'Ivoire) without fabricating prices", () => {
    const surfaces = getCalibratedSurfaces();
    const options: FinishingOptions = {
      activity: "painting",
      marketCode: "CI",
      currency: "XOF",
      currencySymbol: "CFA",
      unitSystem: "metric",
      painting: {
        qualityName: "Standard Emulsion",
        coats: 2,
        includeCeiling: true,
        includePrimer: false,
      },
    };

    const res = calculateVisualFinishingEstimate(surfaces, options);
    expect(res.marketCode).toBe("CI");
    const wallPaint = res.materials.find((m) => m.id === "mat-paint-wall")!;
    // Quantities are exact
    expect(wallPaint.quantity).toBeGreaterThan(0);
    expect(wallPaint.packageCount).toBeGreaterThan(0);

    // Honesty rule: missing prices stay price_unavailable, NOT invented
    expect(wallPaint.priceStatus).toBe("price_unavailable");
    expect(wallPaint.unitPrice).toBeNull();
    expect(wallPaint.totalCost).toBeNull();
    expect(res.isFullyPriced).toBe(false);
    expect(res.subtotalMaterialCost).toBeNull();
    expect(
      res.assumptions.some((a) =>
        a.includes("No validated finishing price rows are available"),
      ),
    ).toBe(true);
  });

  it("accepts user-provided unit price in an unverified market", () => {
    const surfaces = getCalibratedSurfaces();
    const options: FinishingOptions = {
      activity: "painting",
      marketCode: "CI",
      currency: "XOF",
      currencySymbol: "CFA",
      unitSystem: "metric",
      painting: {
        qualityName: "Standard Emulsion",
        coats: 2,
        includeCeiling: false,
        includePrimer: false,
        userPricePerBucket: 25000,
      },
    };

    const res = calculateVisualFinishingEstimate(surfaces, options);
    const wallPaint = res.materials.find((m) => m.id === "mat-paint-wall")!;
    expect(wallPaint.priceStatus).toBe("user_provided");
    expect(wallPaint.unitPrice).toBe(25000);
    expect(wallPaint.totalCost).toBe(wallPaint.packageCount! * 25000);
    expect(res.isFullyPriced).toBe(true);
  });

  it("verifies all 32 markets in ALL_MARKET_CODES calculate reliably without crashing", () => {
    const surfaces = getCalibratedSurfaces();
    expect(ALL_MARKET_CODES.length).toBe(32);

    for (const code of ALL_MARKET_CODES) {
      const res = calculateVisualFinishingEstimate(surfaces, {
        activity: "painting",
        marketCode: code,
        currency: "",
        currencySymbol: "",
        unitSystem: "metric",
      });
      expect(res.marketCode).toBe(code);
      expect(res.materials.length).toBeGreaterThan(0);
      expect(res.totalNetAreaM2).toBeGreaterThan(0);
      expect(res.confidenceBreakdown.quantityEngine).toBe(1.0);
    }
  });

  it("calculates wall screeding putty & mix systems with verified FRELUX formulas", () => {
    const surfaces = getCalibratedSurfaces();
    const puttyRes = calculateVisualFinishingEstimate(surfaces, {
      activity: "screeding",
      marketCode: "NG",
      currency: "NGN",
      currencySymbol: "₦",
      unitSystem: "metric",
      screeding: { systemType: "putty", coats: 2 },
    });
    expect(puttyRes.materials.some((m) => m.id === "mat-screed-putty")).toBe(
      true,
    );

    const mixRes = calculateVisualFinishingEstimate(surfaces, {
      activity: "screeding",
      marketCode: "NG",
      currency: "NGN",
      currencySymbol: "₦",
      unitSystem: "metric",
      screeding: { systemType: "white_cement_paint", coats: 2 },
    });
    expect(mixRes.materials.some((m) => m.id === "mat-screed-paint")).toBe(
      true,
    );
    expect(mixRes.materials.some((m) => m.id === "mat-screed-cement")).toBe(
      true,
    );
  });

  it("calculates tile takeoff with boxes, adhesive, grout, and spacers", () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "tiling");
    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 5.0,
      roomWidthM: 4.0,
      wallHeightM: 2.8,
      ceilingHeightM: 2.8,
      isCalibrated: true,
    };
    const surfaces = applyCalibrationToSurfaces(rawSurfaces, calib).surfaces;

    const res = calculateVisualFinishingEstimate(surfaces, {
      activity: "tiling",
      marketCode: "US",
      currency: "USD",
      currencySymbol: "$",
      unitSystem: "metric",
      tiling: {
        surfaceType: "floor",
        method: "adhesive",
        tileWidthMm: 600,
        tileHeightMm: 600,
        tilesPerBox: 4,
        wastePct: 10,
      },
    });

    expect(res.materials.some((m) => m.id === "mat-tile-boxes")).toBe(true);
    expect(res.materials.some((m) => m.id === "mat-tile-adhesive")).toBe(true);
    expect(res.materials.some((m) => m.id === "mat-tile-grout")).toBe(true);
    expect(res.materials.some((m) => m.id === "mat-tile-spacers")).toBe(true);
  });

  it("calculates POP ceiling requirements and components", () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "pop_ceiling");
    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 6.0,
      roomWidthM: 5.0,
      wallHeightM: 2.8,
      ceilingHeightM: 2.8,
      isCalibrated: true,
    };
    const surfaces = applyCalibrationToSurfaces(rawSurfaces, calib).surfaces;

    const res = calculateVisualFinishingEstimate(surfaces, {
      activity: "pop_ceiling",
      marketCode: "NG",
      currency: "NGN",
      currencySymbol: "₦",
      unitSystem: "metric",
      popCeiling: {
        workflow: "nigeria",
        includeDecorative: true,
        wastePct: 10,
      },
    });

    expect(res.materials.some((m) => m.id === "mat-pop-plaster")).toBe(true);
    expect(res.materials.some((m) => m.id === "mat-pop-cement")).toBe(true);
    expect(res.materials.some((m) => m.id === "mat-pop-fibre")).toBe(true);
  });

  it("calculates flooring takeoff with underlay and skirting", () => {
    const rawSurfaces = detectVisualSurfaces(dummyMedia, "flooring");
    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: 5.0,
      roomWidthM: 4.0,
      wallHeightM: 2.8,
      ceilingHeightM: 2.8,
      isCalibrated: true,
    };
    const surfaces = applyCalibrationToSurfaces(rawSurfaces, calib).surfaces;

    const res = calculateVisualFinishingEstimate(surfaces, {
      activity: "flooring",
      marketCode: "GB",
      currency: "GBP",
      currencySymbol: "£",
      unitSystem: "metric",
      flooring: {
        flooringType: "laminate",
        includeUnderlay: true,
        includeAdhesive: false,
        wastePct: 10,
      },
    });

    expect(res.materials.some((m) => m.category === "flooring")).toBe(true);
  });
});

describe("Visual Finishing Engine - Phase 4: Reference Target Scaling & Market Rates", () => {
  it("scales candidate surfaces using a known reference target (A4 sheet)", () => {
    const rawSurfaces: VisualSurface[] = [
      {
        id: "surf-wall-test",
        category: "wall",
        name: "Test Wall",
        confidence: 0.9,
        bbox: { x: 0.1, y: 0.1, w: 0.8, h: 0.6 }, // 0.8w x 0.6h normalized
        measurementStatus: "incomplete",
        calibrationMethod: "uncalibrated",
        widthM: null,
        heightM: null,
        grossAreaM2: null,
        openings: [],
        deductedOpeningAreaM2: 0,
        netAreaM2: null,
        surfaceCondition: "painted_good",
        isPartiallyObscured: false,
        notes: [],
      },
    ];

    // Reference target: A4 sheet (0.297m height) occupying 0.05 normalized height in image
    const { surfaces, scaleFactorMPerBBox, warnings } =
      scaleSurfacesByReferenceObject(rawSurfaces, {
        realDimensionM: 0.297,
        bboxNormalizedLength: 0.05,
        targetName: "A4 Paper Sheet (Portrait)",
      });

    expect(warnings.length).toBe(0);
    expect(scaleFactorMPerBBox).toBeCloseTo(0.297 / 0.05, 1);
    expect(surfaces[0].measurementStatus).toBe("user_confirmed");
    expect(surfaces[0].calibrationMethod).toBe("reference_object");
    expect(surfaces[0].widthM).toBeGreaterThan(0);
    expect(surfaces[0].heightM).toBeGreaterThan(0);
    expect(surfaces[0].grossAreaM2).toBeGreaterThan(0);
  });

  it("handles async market rates resolution gracefully", async () => {
    const rates = await resolveMarketFinishingRates("NG");
    expect(rates.marketCode).toBe("NG");
    expect(rates.currency).toBe("NGN");
    expect(rates.currencySymbol).toBe("₦");
  });
});
