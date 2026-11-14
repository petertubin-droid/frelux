import type {
  PopCalcInput,
  PopCalcResult,
  PopMaterialResult,
  PopEstimateResult,
  TileCalcInput,
  TileCalcResult,
  Unit,
} from "@/types";
import type { DbPopMaterial, DbTileMaterial } from "@/types/database";

import { unitToMeters } from "@/lib/utils";

function toSqm(value: number, unit: Unit): number {
  return unitToMeters(value, unit);
}

// =========================================================
// POP Ceiling calculations
// =========================================================

export function calculatePopCeiling(
  input: PopCalcInput,
  materials: DbPopMaterial[],
  currency: string,
  currencySymbol: string,
): PopCalcResult {
  const lengthM = toSqm(input.roomLength, input.unit);
  const widthM = toSqm(input.roomWidth, input.unit);
  const ceilingArea = lengthM * widthM;

  const workers = Math.max(1, Math.floor(input.workers ?? 1));
  const days = Math.max(1, Math.floor(input.days ?? 1));
  const wastePct = Math.min(100, Math.max(0, input.wasteMargin));
  const wasteMultiplier = 1 + wastePct / 100;
  const adjustedArea = ceilingArea * wasteMultiplier;

  const materialResults: PopMaterialResult[] = [];
  const calcWarnings: string[] = [];
  let materialCost = 0;
  let equipmentCost = 0;

  const filtered = materials
    .filter((m) => m.workflow === input.workflow && m.is_active)
    .filter((m) => {
      if (m.category === "decorative" && !input.includeDecorative) return false;
      if (m.is_optional && !input.includeOptional) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const mat of filtered) {
    const coverage = Number(mat.coverage_rate);
    const pkgSize = Number(mat.package_size);
    const unitPrice = Number(mat.unit_price);
    if (mat.category === "labour") {
      // Labour not included, negotiated separately
    } else {
      const isPerDay = mat.quantity_basis === "per_day";
      const isPerWorker = mat.quantity_basis === "per_worker";
      const perWorkerRate = Number(mat.per_worker_rate ?? 0);
      const perDayRate = Number(mat.per_day_rate ?? 0);

      if (isPerDay) {
        // Hire, not consumption: days × hire units × the day rate. A part-day
        // is billed as a day, and hire is not rounded to packages, because two
        // tower sections are two day rates, not a pack.
        if (perDayRate <= 0) {
          calcWarnings.push(
            `Daily hire units are not configured for '${mat.name}'. Its quantity and cost are excluded from the total until it is configured.`,
          );
        }
        if (unitPrice <= 0) {
          calcWarnings.push(
            `Day rate is not configured for '${mat.name}'. Its cost is excluded from the total until it is configured.`,
          );
        }
        const hireQuantity =
          perDayRate > 0 && unitPrice > 0 ? days * perDayRate : 0;
        const hireCost = Math.round(hireQuantity * unitPrice * 100) / 100;
        equipmentCost += hireCost;
        materialResults.push({
          name: mat.name,
          category: mat.category,
          quantity: Math.round(hireQuantity * 100) / 100,
          unit: mat.package_unit,
          packagesNeeded: Math.round(hireQuantity * 100) / 100,
          cost: hireCost,
          isOptional: mat.is_optional,
        });
        continue;
      }
      if (isPerWorker) {
        if (perWorkerRate <= 0) {
          calcWarnings.push(
            `Per-worker rate is not configured for '${mat.name}'. Its quantity and cost are excluded from the total until it is configured.`,
          );
        }
      } else if (coverage > 0 && adjustedArea > 0) {
        // ok, configurable coverage present
      } else if (adjustedArea > 0) {
        calcWarnings.push(
          `Coverage rate is not configured for '${mat.name}'. Its quantity and cost are excluded from the total until it is configured.`,
        );
      }
      if (unitPrice > 0) {
        // ok, price configured
      } else {
        calcWarnings.push(
          `Unit price is not configured for '${mat.name}'. Its cost is excluded from the total until it is configured.`,
        );
      }
      // Crew equipment scales with the number of fitters; waste allowance is a
      // material loss on measured area, so it does not apply to a platform.
      const quantity = isPerWorker
        ? workers * perWorkerRate
        : coverage > 0
          ? adjustedArea / coverage
          : 0;
      const packagesNeeded =
        pkgSize > 0 ? ceilUnits(quantity / pkgSize) : ceilUnits(quantity);
      // A crew item is bought as whole boards plus, when the count ends in a
      // half, one board cut in two at the supplier's half price (₦13,000 for a
      // ₦25,000 sheet). Charging whole boards would overbill a one-worker job;
      // halving the price would charge ₦12,500 for a cut the shop prices at
      // ₦13,000. Without a configured half price it falls back to whole boards.
      const splitPrice = Number(mat.split_unit_price ?? 0);
      const wholeBoards = Math.floor(quantity + 1e-9);
      const hasHalf = quantity - wholeBoards > 1e-9;
      const cost =
        isPerWorker && splitPrice > 0
          ? wholeBoards * unitPrice + (hasHalf ? splitPrice : 0)
          : packagesNeeded * unitPrice;
      materialCost += cost;
      materialResults.push({
        name: mat.name,
        category: mat.category,
        // Report what was measured. Ceiling the displayed quantity to 0.1
        // inflated the figure (20.41 m² shown as 20.5 m²) even though the
        // package count already carried the rounding up.
        quantity: Math.round(quantity * 100) / 100,
        // A per-worker row is counted in whole boards, so that is what it
        // reports; area rows keep their coverage unit.
        unit: isPerWorker ? mat.package_unit : mat.coverage_unit,
        packagesNeeded,
        cost,
        isOptional: mat.is_optional,
      });
    }
  }

  const grandTotal = materialCost + equipmentCost; // Labour not included

  return {
    ceilingArea,
    materials: materialResults,
    materialCost,
    equipmentCost,
    labourCost: 0,
    wasteAmount: adjustedArea - ceilingArea,
    grandTotal,
    currency,
    currencySymbol,
    warnings: calcWarnings,
  };
}

export function calculatePopEstimate(
  input: PopCalcInput,
  materials: DbPopMaterial[],
  currency: string,
  currencySymbol: string,
): PopEstimateResult {
  return calculatePopCeiling(input, materials, currency, currencySymbol);
}

// =========================================================
// Pack arithmetic
// =========================================================

/**
 * Whole purchase units, with a tolerance so an exact quotient is not rounded
 * up. 4.2 m² at 1.4 m² per unit is 3.0000000000000004 in binary floating
 * point, and a plain Math.ceil orders a fourth unit for nothing.
 */
const CEIL_EPSILON = 1e-9;
function ceilUnits(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value - CEIL_EPSILON);
}

/** Mass of the default 50 kg cement bag, kg. */
const CEMENT_BAG_KG = 50;
const CEMENT_BULK_DENSITY_KG_M3 = 1440;
const CEMENT_BAG_VOLUME_M3 = CEMENT_BAG_KG / CEMENT_BULK_DENSITY_KG_M3;
/** Dry-to-wet mortar ratio, the same 1.33 the masonry engines use. */
const MORTAR_DRY_FACTOR = 1.33;
/** Default tile adhesive bag, kg. */
const DEFAULT_ADHESIVE_BAG_KG = 20;

// =========================================================
// Tile calculations
// =========================================================

export function calculateTile(
  input: TileCalcInput,
  _materials: DbTileMaterial[],
  currency: string,
  currencySymbol: string,
): TileCalcResult {
  // Identical surfaces (e.g. 3 bedrooms with the same floor size) are
  // bought as one project: the area scales, boxes round once on the total.
  const surfaceCount = Math.max(1, Math.round(input.quantity ?? 1));
  let surfaceArea: number;

  if (input.surfaceType === "wall") {
    const lengthM = toSqm(input.length, input.unit);
    const heightM = toSqm(input.height, input.unit);
    surfaceArea = lengthM * heightM * surfaceCount;
  } else {
    const lengthM = toSqm(input.length, input.unit);
    const widthM = toSqm(input.width, input.unit);
    surfaceArea = lengthM * widthM * surfaceCount;
  }

  const unitAreaM2 = toSqm(1, input.unit) ** 2;
  const requestedOpeningArea =
    input.surfaceType === "wall" && Number.isFinite(input.openingArea)
      ? Math.max(0, input.openingArea ?? 0) * unitAreaM2
      : 0;
  const openingArea = Math.min(surfaceArea, requestedOpeningArea);
  const netSurfaceArea = Math.max(0, surfaceArea - openingArea);
  const wastePct = Math.min(100, Math.max(0, input.wasteMargin));
  const wasteMultiplier = 1 + wastePct / 100;
  const adjustedArea = netSurfaceArea * wasteMultiplier;

  // --- Tiles (always calculated) ---
  const tileAreaM2 = (input.tileWidthMm / 1000) * (input.tileHeightMm / 1000);
  const tilesNeeded = tileAreaM2 > 0 ? ceilUnits(adjustedArea / tileAreaM2) : 0;
  const boxesNeeded =
    input.tilesPerBox > 0
      ? ceilUnits(tilesNeeded / input.tilesPerBox)
      : tilesNeeded;
  const tileCost = boxesNeeded * input.tilePricePerBox;

  // --- Adhesive (only when method === 'adhesive') ---
  // Audit fix F6: a configured coverage rate wins; otherwise a trowel-notch
  // bed-thickness table (deterministic mid-values of published ranges) is
  // used when the notch size is provided.
  const NOTCH_KG_PER_M2: Record<number, number> = {
    4: 2.75, // thin bed (2.5-3.0 kg/m2)
    6: 4.25, // standard bed (4.0-4.5 kg/m2)
    10: 6.75, // large-format floor (6.0-7.5 kg/m2)
    12: 7.25, // large-format floor (7.0-7.5 kg/m2)
  };
  // Adhesive is priced per BAG. The coverage-rate branch already returns bags
  // (m² divided by m² per bag); the notch table returns KILOGRAMS, so it must
  // be divided by the bag mass before it can be priced. The old code ceiling'd
  // kilograms and charged them as bags, so a 12 m² floor on a 6 mm notch was
  // billed 51 bags for 51 kg.
  let adhesiveNeeded = 0;
  let adhesiveMassKg: number | undefined;
  let adhesiveCost = 0;
  if (input.method === "adhesive") {
    if (input.adhesiveCoverageRate > 0) {
      adhesiveNeeded = ceilUnits(adjustedArea / input.adhesiveCoverageRate);
    } else {
      const notch = input.adhesiveNotchMm ?? 0;
      const kgPerM2 = NOTCH_KG_PER_M2[notch];
      if (kgPerM2 !== undefined) {
        const bagKg =
          input.adhesiveBagKg !== undefined && input.adhesiveBagKg > 0
            ? input.adhesiveBagKg
            : DEFAULT_ADHESIVE_BAG_KG;
        adhesiveMassKg = adjustedArea * kgPerM2;
        adhesiveNeeded = ceilUnits(adhesiveMassKg / bagKg);
      }
    }
    adhesiveCost = adhesiveNeeded * input.adhesivePricePerBag;
  }

  // --- Mortar bed: one volume drives both cement and sand ---
  // Sand was already costed from the bed volume, but cement came from a
  // separate m²-per-bag rate, so a 50 mm bed used twice the sand and exactly
  // the same cement as a 25 mm bed. When the bed thickness and the sand unit
  // are both known, both materials now come from the same mix volume.
  const bedMm =
    input.bedThicknessMm && input.bedThicknessMm > 0 ? input.bedThicknessMm : 0;
  const sandUnitM3 =
    input.sandUnitCubicMetres && input.sandUnitCubicMetres > 0
      ? input.sandUnitCubicMetres
      : 0;
  const bedVolumeMode =
    input.method === "traditional" && bedMm > 0 && sandUnitM3 > 0;
  let bedVolumeM3 = 0;
  let bedDryM3 = 0;
  let cementVolumeM3 = 0;
  if (bedVolumeMode) {
    bedVolumeM3 = adjustedArea * (bedMm / 1000);
    // 1:4 cement:sand by volume, cement is one of five parts, and the dry
    // volume is 1.33 times the laid volume.
    bedDryM3 = bedVolumeM3 * MORTAR_DRY_FACTOR;
    cementVolumeM3 = bedDryM3 / 5;
  }

  // --- Cement (only when method === 'traditional') ---
  let cementNeeded = 0;
  let cementCost = 0;
  if (input.method === "traditional") {
    const bagsRequired = bedVolumeMode
      ? ceilUnits(cementVolumeM3 / CEMENT_BAG_VOLUME_M3)
      : input.cementCoverageRate > 0
        ? ceilUnits(adjustedArea / input.cementCoverageRate)
        : 0;
    // cementCoverageRate is m² per BAG, so dividing its result by a package
    // size again divided bags by bags. A package size now means bags per pack,
    // and whole packs are bought.
    const cementPkgSize =
      input.cementPackageSize > 1 ? input.cementPackageSize : 1;
    const packs =
      cementPkgSize > 1 ? ceilUnits(bagsRequired / cementPkgSize) : null;
    cementNeeded = packs !== null ? packs * cementPkgSize : bagsRequired;
    cementCost = cementNeeded * input.cementPricePerBag;
  }

  // --- Sharp sand (only when method === 'traditional') ---
  // Sand is not sold in bags in most markets: it arrives by the trip, the bulk
  // bag or the cubic metre and is measured on site by wheelbarrow or head pan.
  // The bed volume is the deterministic quantity (area x bed depth, sand being
  // four fifths of a 1:4 mortar bed by volume), and the purchase unit only
  // decides how that volume is counted and priced.
  let sandNeeded = 0;
  let sandCost = 0;
  let sandVolumeM3 = 0;
  if (input.method === "traditional") {
    const unitM3 =
      input.sandUnitCubicMetres && input.sandUnitCubicMetres > 0
        ? input.sandUnitCubicMetres
        : 0;
    const bedMm =
      input.bedThicknessMm && input.bedThicknessMm > 0
        ? input.bedThicknessMm
        : 0;
    if (unitM3 > 0 && bedMm > 0) {
      // Loose sand for a laid volume: four fifths of the dry mix. Without the
      // 1.33 dry factor the order was about a quarter short of the masonry
      // engines for the same mortar.
      sandVolumeM3 = (bedDryM3 * 4) / 5;
      sandNeeded = ceilUnits(sandVolumeM3 / unitM3);
      sandCost = sandNeeded * input.sandPricePerBag;
    } else {
      const sandQty =
        input.sandCoverageRate > 0 ? adjustedArea / input.sandCoverageRate : 0;
      const sandPkgSize = input.sandPackageSize > 0 ? input.sandPackageSize : 1;
      sandNeeded = ceilUnits(sandQty / sandPkgSize);
      sandCost = sandNeeded * input.sandPricePerBag;
    }
  }

  // --- Grout (always needed) ---
  // Audit fix: rigorous joint-volume grout formula (ISO 13007 / ANSI A118).
  // Theoretical grout kg/m² = ((L+W)/(L*W)) * thickness * joint * SG / 1000
  // with L,W in metres, thickness/joint in mm, SG ~ 1.8 kg/dm³.
  // Total grout needed = adjustedArea * baseGroutKgPerM2 (single waste allowance).
  const thickness = input.tileThicknessMm ?? 0;
  const joint = input.jointWidthMm ?? 0;
  const sg =
    input.groutSpecificGravity && input.groutSpecificGravity > 0
      ? input.groutSpecificGravity
      : 1.8;
  let groutNeeded = 0;
  if (thickness > 0 && joint > 0 && tileAreaM2 > 0) {
    const Lm = input.tileWidthMm / 1000;
    const Wm = input.tileHeightMm / 1000;
    const baseGroutKgPerM2 =
      (((Lm + Wm) / (Lm * Wm)) * thickness * joint * sg) / 1000;
    groutNeeded = adjustedArea * baseGroutKgPerM2;
  } else if (input.groutCoverageRate > 0) {
    groutNeeded = adjustedArea / input.groutCoverageRate;
  }
  const groutCost = ceilUnits(groutNeeded) * input.groutPricePerKg;

  // --- Tile spacers (always needed) ---
  const spacerQty =
    input.spacerCoverageRate > 0 ? adjustedArea / input.spacerCoverageRate : 0;
  const spacerPkgSize =
    input.spacerPackageSize > 0 ? input.spacerPackageSize : 1;
  const spacerNeeded = ceilUnits(spacerQty / spacerPkgSize);
  const spacerCost = spacerNeeded * input.spacerPricePerPack;

  const tileWarnings: string[] = [];
  if (surfaceArea > 0 && tileAreaM2 <= 0) {
    tileWarnings.push(
      "Tile dimensions are invalid (zero tile area). Tile count and cost cannot be calculated.",
    );
  }
  if (input.surfaceType === "wall" && requestedOpeningArea > surfaceArea) {
    tileWarnings.push(
      "Opening deductions exceed the measured gross wall area; deductions were capped at the gross area. Correct the opening area before relying on this takeoff.",
    );
  }
  if (input.surfaceType !== "wall" && (input.openingArea ?? 0) > 0) {
    tileWarnings.push(
      "Opening deductions were ignored because the selected surface is not a wall.",
    );
  }
  if (surfaceArea > 0) {
    if (
      input.method === "adhesive" &&
      input.adhesiveCoverageRate <= 0 &&
      NOTCH_KG_PER_M2[input.adhesiveNotchMm ?? 0] === undefined
    ) {
      tileWarnings.push(
        "Adhesive coverage rate is not configured. Adhesive cost is excluded from the total until it is configured.",
      );
    }
    if (
      input.method === "traditional" &&
      input.cementCoverageRate <= 0 &&
      !bedVolumeMode
    ) {
      tileWarnings.push(
        "Cement coverage rate is not configured. Cement cost is excluded from the total until it is configured, or until a bed thickness and sand unit are supplied so the bed volume can size it.",
      );
    }
    if (input.method === "traditional" && input.sandCoverageRate <= 0) {
      tileWarnings.push(
        "Sand coverage rate is not configured. Sand cost is excluded from the total until it is configured.",
      );
    }
    if (
      input.groutCoverageRate <= 0 &&
      !((input.tileThicknessMm ?? 0) > 0 && (input.jointWidthMm ?? 0) > 0)
    ) {
      tileWarnings.push(
        "Grout coverage rate is not configured and tile thickness/joint width were not provided. Grout cost is excluded from the total until one is configured.",
      );
    }
  }

  const materialCost =
    tileCost + adhesiveCost + cementCost + sandCost + groutCost + spacerCost;
  const labourCost = 0; // Labour not included, negotiated separately
  const grandTotal = materialCost;

  return {
    surfaceArea,
    openingArea,
    netSurfaceArea,
    tileArea: tileAreaM2,
    tilesNeeded,
    boxesNeeded,
    tileCost,
    method: input.method,
    adhesiveNeeded,
    adhesiveMassKg,
    bedVolumeM3: bedVolumeMode ? bedVolumeM3 : undefined,
    adhesiveCost,
    cementNeeded,
    cementCost,
    sandNeeded,
    sandCost,
    sandVolumeM3,
    groutNeeded: Math.ceil(groutNeeded),
    groutCost,
    spacerNeeded,
    spacerCost,
    wasteAmount: adjustedArea - netSurfaceArea,
    materialCost,
    labourCost,
    grandTotal,
    currency,
    currencySymbol,
    warnings: tileWarnings,
  };
}
