// =========================================================
// FRELUX Build-to-Roof Construction Cost Estimator
// Calculation Engine — Phase 30 (Audited & Corrected)
//
// SITE → FOUNDATION → GROUND FLOOR → WALLS → STRUCTURAL FRAME → ROOF → READY FOR FINISHING
//
// All formulas are transparent and testable.
// Every quantity shows: inputs, formula, base qty, wastage, final qty.
// Nigerian construction units: bags, m³, pcs, tonnes, linear meters.
//
// AUDIT FIXES APPLIED:
// 1. Foundation concrete depth is now configurable (footing_thickness input)
// 2. Roofing sheet coverage varies by roofing_material type
// 3. DPM membrane uses dpm_per_m2 price (not dpc_per_meter)
// 4. Timber slope length includes overhang
// 5. Hardcore filling has material cost (hardcore_per_m3)
// 6. Added site clearing, setting out, backfilling, compaction
// 7. Stirrup link length includes hook length (10×bar_diameter)
// 8. Foundation blockwork height includes mortar joints
// 9. Removed redundant slab/beam if-else (unified formula)
// 10. Roof area quantity line shows 0% wastage (wastage is on sheets only)
// 11. Sand filling added to ground floor (under DPM)
// 12. Compaction labour added for hardcore/filling
// =========================================================

import type {
  BuildToRoofInput,
  BuildToRoofResult,
  StageResult,
  QuantityLine,
  MaterialLine,
  LabourLine,
  ConsolidatedMaterial,
  ConfidenceLevel,
  StructuralMemberInput,
  RoofingMaterial,
} from '@/types/build-to-roof';

// ── Constants ──

// Cement: 1 bag = 50kg, density ~1440 kg/m³ → 0.0347 m³ per bag
export const CEMENT_VOLUME_PER_BAG = 0.0347; // m³

// Dry-to-wet concrete volume ratio (1.54 — standard)
export const DRY_WET_RATIO = 1.54;

// Dry-to-wet mortar volume ratio (1.33 — standard)
export const MORTAR_DRY_WET_RATIO = 1.33;

// Mortar joint thickness (m) — used for course height calculations
export const MORTAR_JOINT_THICKNESS = 0.025; // 25mm

// Standard hook length for stirrups = 10 × bar_diameter
export const STIRRUP_HOOK_MULTIPLIER = 10;

// Roofing sheet coverage by material type (m² per sheet)
export const SHEET_COVERAGE: Record<RoofingMaterial, number> = {
  long_span_aluminium: 1.5,   // 0.5m width × 3.0m length
  stone_coated: 0.53,         // ~0.42m × 1.27m per panel
  gi_sheet: 1.52,              // 0.83m × 1.83m per sheet
  shingle: 0.93,               // ~0.93m × 1.0m per strip
  custom: 1.5,                 // fallback
};

// Roofing screws per sheet (approximate)
export const SCREWS_PER_SHEET = 10;

// Purlin rows per roof slope
export const PURLIN_ROWS_PER_SLOPE = 4;

// Rafter spacing (m)
export const RAFTER_SPACING = 0.9;

// Foundation blockwork courses below DPC
export const FOUNDATION_COURSES = 4;

// Feet to meters conversion
export const M_PER_FT = 0.3048;

// 1 trip of sand/granite = ~3.5 m³ (standard 5-tonne tipper truck in Nigeria)
export const M3_PER_TRIP = 3.5;

// ── Helpers ──

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Convert feet to meters
function ftToM(ft: number): number {
  return ft * M_PER_FT;
}

// Convert m³ to trips (Nigerian construction unit)
function m3ToTrips(m3: number): number {
  return m3 / M3_PER_TRIP;
}

function applyWastage(baseQty: number, wastagePercent: number): number {
  return baseQty * (1 + wastagePercent / 100);
}

function qtyLine(
  label: string,
  formula: string,
  inputs: Record<string, number>,
  baseQty: number,
  unit: string,
  wastagePercent: number
): QuantityLine {
  return {
    label,
    formula,
    inputs,
    base_quantity: round(baseQty),
    unit,
    wastage_percent: wastagePercent,
    final_quantity: round(applyWastage(baseQty, wastagePercent)),
  };
}

function matLine(
  label: string,
  unit: string,
  baseQty: number,
  wastagePercent: number,
  unitPrice: number,
  priceSource: string
): MaterialLine {
  const finalQty = applyWastage(baseQty, wastagePercent);
  return {
    label,
    unit,
    base_quantity: round(baseQty),
    wastage_percent: wastagePercent,
    final_quantity: round(finalQty),
    unit_price: unitPrice,
    total_cost: round(finalQty * unitPrice),
    price_source: priceSource,
  };
}

function labLine(label: string, unit: string, qty: number, rate: number): LabourLine {
  return {
    label,
    unit,
    quantity: round(qty),
    rate: round(rate),
    total_cost: round(qty * rate),
  };
}

// ── Concrete mix → material breakdown ──

/**
 * Convert wet concrete volume (m³) into cement (bags), sand (m³), granite (m³)
 * using a mix ratio like 1:2:4 (cement:sand:granite by volume).
 *
 * Formula:
 *   dryVolume = wetVolume × 1.54
 *   totalParts = cement + sand + aggregate
 *   cementVol = dryVolume × (cement / totalParts)
 *   sandVol   = dryVolume × (sand / totalParts)
 *   graniteVol    = dryVolume × (aggregate / totalParts)
 *   cementBags = cementVol / 0.0347
 *
 * Verification: cementVol + sandVol + graniteVol = dryVolume (mass balance holds)
 */
export function concreteToMaterials(
  wetVolumeM3: number,
  mixCement: number,
  mixSand: number,
  mixGranite: number
): { cement_bags: number; sand_m3: number; granite_m3: number } {
  if (wetVolumeM3 <= 0) return { cement_bags: 0, sand_m3: 0, granite_m3: 0 };
  const dryVolume = wetVolumeM3 * DRY_WET_RATIO;
  const totalParts = mixCement + mixSand + mixGranite;
  if (totalParts <= 0) return { cement_bags: 0, sand_m3: 0, granite_m3: 0 };

  const cementVol = dryVolume * (mixCement / totalParts);
  const sandVol = dryVolume * (mixSand / totalParts);
  const graniteVol = dryVolume * (mixGranite / totalParts);

  return {
    cement_bags: cementVol / CEMENT_VOLUME_PER_BAG,
    sand_m3: sandVol,
    granite_m3: graniteVol,
  };
}

// ── Mortar mix → material breakdown ──

/**
 * Convert wet mortar volume (m³) into cement (bags) and sand (m³)
 * using a mix ratio like 1:6 (cement:sand by volume).
 *
 * Formula:
 *   dryVolume = wetVolume × 1.33
 *   totalParts = cement + sand
 *   cementVol = dryVolume × (cement / totalParts)
 *   sandVol   = dryVolume × (sand / totalParts)
 *   cementBags = cementVol / 0.0347
 */
export function mortarToMaterials(
  mortarVolumeM3: number,
  mixCement: number,
  mixSand: number
): { cement_bags: number; sand_m3: number } {
  if (mortarVolumeM3 <= 0) return { cement_bags: 0, sand_m3: 0 };
  const dryVolume = mortarVolumeM3 * MORTAR_DRY_WET_RATIO;
  const totalParts = mixCement + mixSand;
  if (totalParts <= 0) return { cement_bags: 0, sand_m3: 0 };

  const cementVol = dryVolume * (mixCement / totalParts);
  const sandVol = dryVolume * (mixSand / totalParts);

  return {
    cement_bags: cementVol / CEMENT_VOLUME_PER_BAG,
    sand_m3: sandVol,
  };
}

// ── Block calculation ──

/**
 * Calculate blocks per m² based on block face dimensions.
 * blocks_per_m² = 1 / (blockLength_m × blockHeight_m)
 *
 * Note: This is the face area including mortar joints.
 * In practice, the effective course height includes mortar,
 * so blocks per m² is slightly less than theoretical.
 * We use the block face dimension as-is (standard industry approach).
 */
export function blocksPerM2(blockLengthInches: number, blockHeightInches: number): number {
  // Convert inches to meters: 1 inch = 0.0254 m
  const blockFaceArea = (blockLengthInches * 0.0254) * (blockHeightInches * 0.0254); // m²
  if (blockFaceArea <= 0) return 0;
  return 1 / blockFaceArea;
}

// ── Roof geometry ──

/**
 * Calculate roof surface area from building footprint + pitch + overhang.
 *
 * For gable roof:
 *   Two sloped sides, each covering half the width.
 *   slope_length = (width/2 + overhang) / cos(pitch)
 *   roof_area = 2 × (length + 2×overhang) × slope_length
 *            = (length + 2×overhang) × (width + 2×overhang) / cos(pitch)
 *            = footprint / cos(pitch)  [mathematically equivalent]
 *
 * For hip roof:
 *   All 4 sides slope. footprint / cos(pitch) is a standard approximation.
 *
 * For mono-pitch:
 *   Single slope. footprint / cos(pitch) is correct.
 *
 * For flat roof:
 *   roof_area = footprint (no pitch)
 */
export function calculateRoofArea(
  buildingLength: number,
  buildingWidth: number,
  pitchDegrees: number,
  overhang: number,
  roofType: string
): number {
  const footprint = (buildingLength + 2 * overhang) * (buildingWidth + 2 * overhang);

  if (roofType === 'flat') {
    return footprint;
  }

  const pitchRad = (pitchDegrees * Math.PI) / 180;

  // Guard against pitch = 90° (vertical) which would give infinity
  if (Math.abs(pitchDegrees - 90) < 0.01) {
    return footprint; // vertical pitch = wall, not roof
  }

  const slopeFactor = 1 / Math.cos(pitchRad);
  return footprint * slopeFactor;
}

// ── Roofing sheets ──

/**
 * Calculate number of roofing sheets needed.
 * Coverage varies by roofing material type.
 */
export function roofingSheetsCount(roofAreaM2: number, sheetCoverageM2: number): number {
  if (sheetCoverageM2 <= 0) return 0;
  return Math.ceil(roofAreaM2 / sheetCoverageM2);
}

/**
 * Get sheet coverage based on roofing material type.
 */
export function getSheetCoverage(material: RoofingMaterial): number {
  return SHEET_COVERAGE[material] ?? SHEET_COVERAGE.custom;
}

// ── Ridge length ──

export function calculateRidgeLength(
  buildingLength: number,
  buildingWidth: number,
  roofType: string
): number {
  switch (roofType) {
    case 'gable':
      return buildingLength; // one ridge along the length
    case 'hip': {
      // Hip has a ridge of approximately (length - width)
      return Math.max(0, buildingLength - buildingWidth);
    }
    case 'mono_pitch':
      return 0; // no ridge
    case 'flat':
      return 0;
    default:
      return buildingLength;
  }
}

// ── Hip length (for hip roofs) ──

export function calculateHipLength(
  buildingLength: number,
  buildingWidth: number,
  pitchDegrees: number
): number {
  const pitchRad = (pitchDegrees * Math.PI) / 180;
  const halfWidth = buildingWidth / 2;
  // Each hip runs from corner to ridge end point
  const hipSlope = halfWidth / Math.cos(pitchRad);
  // 4 hips in a standard hip roof (one from each corner)
  return 4 * hipSlope;
}

// ── Fascia length ──

export function calculateFasciaLength(
  buildingLength: number,
  buildingWidth: number,
  overhang: number
): number {
  return 2 * (buildingLength + 2 * overhang) + 2 * (buildingWidth + 2 * overhang);
}

// ── Timber estimation (rafters + purlins) ──

/**
 * Estimate timber for roof structure.
 * For gable/hip: rafters at ~900mm spacing, purlins along the slope.
 * Rafter length includes overhang extension.
 *
 * FIX: slope_length now includes overhang in the rafter length.
 */
export function estimateTimberMeters(
  roofAreaM2: number,
  buildingLength: number,
  buildingWidth: number,
  pitchDegrees: number,
  overhang: number,
  roofType: string
): number {
  if (roofType === 'flat') {
    return Math.ceil(roofAreaM2 * 2); // minimal timber for flat roof
  }

  const pitchRad = (pitchDegrees * Math.PI) / 180;
  // FIX: slope length now includes overhang
  const slopeLength = (buildingWidth / 2 + overhang) / Math.cos(pitchRad);

  // Rafters: spaced at 0.9m, each rafter length = slopeLength
  const rafterCount = Math.ceil(buildingLength / RAFTER_SPACING) + 1;
  const rafterTotalM = rafterCount * 2 * slopeLength; // both sides

  // Purlins: rows per slope, each running the length of the building
  const purlinTotalM = PURLIN_ROWS_PER_SLOPE * 2 * buildingLength;

  return round(rafterTotalM + purlinTotalM);
}

// ── Reinforcement estimation (from engineer's schedule) ──

/**
 * Calculate reinforcement steel weight for a structural member.
 *
 * Main bars: count × length × quantity × weight_per_m
 * Links/stirrups: links_per_m × member_length × quantity × link_length × weight_per_m
 *
 * FIX: link length now includes hook length (10 × link_diameter per hook, 2 hooks per link)
 *
 * Steel weight per meter: kg/m = d² / 162  [where d is in mm]
 * This formula derives from: weight = π × d²/4 × 7850 kg/m³ / 10⁶ = d²/162.3 ≈ d²/162
 */
export function estimateReinforcementKg(member: StructuralMemberInput): number {
  if (!member.bar_diameter_mm || !member.bar_count_main) return 0;

  // Main bars
  const mainBarWeightPerM = Math.pow(member.bar_diameter_mm, 2) / 162;
  const mainBarLength = member.bar_length_main ?? member.length;
  const mainBarsTotal = member.bar_count_main * mainBarLength * member.quantity;
  const mainBarsKg = mainBarsTotal * mainBarWeightPerM;

  // Links/stirrups
  let linksKg = 0;
  if (member.link_diameter_mm && member.bar_count_links) {
    const linkWeightPerM = Math.pow(member.link_diameter_mm, 2) / 162;
    const cover = (member.cover_mm ?? 25) / 1000; // convert mm to m

    // FIX: link length includes hook length
    // Link body: 2 × (width - 2×cover + depth - 2×cover) = 2 × (width + depth - 4×cover)
    const linkBodyLength = 2 * (member.width + member.depth - 4 * cover);
    // Hook length: 2 hooks × 10 × bar_diameter
    const hookLength = 2 * STIRRUP_HOOK_MULTIPLIER * (member.link_diameter_mm / 1000);
    const linkTotalLength = linkBodyLength + hookLength;

    const linksTotal = member.bar_count_links * member.length * member.quantity;
    linksKg = linksTotal * linkTotalLength * linkWeightPerM;
  }

  return round(mainBarsKg + linksKg);
}

// ── Stage A: Site & Foundation ──

function calcSiteAndFoundation(input: BuildToRoofInput): StageResult {
  const quantities: QuantityLine[] = [];
  const materials: MaterialLine[] = [];
  const labour: LabourLine[] = [];

  const perimeter = 2 * (input.building_length + input.building_width);
  const footprintArea = input.building_length * input.building_width;

  // 1. Site clearing & setting out (allowance-based)
  quantities.push(
    qtyLine('Site clearing & setting out', 'Allowance — general labour days',
      { days: input.labour.general_labour_days },
      input.labour.general_labour_days, 'days', 0)
  );
  labour.push(labLine('Site clearing & setting out', 'days', input.labour.general_labour_days, input.labour.general_labour_per_day));

  // 2. Excavation volume
  const excavationVol = perimeter * input.foundation_width * input.foundation_depth;
  quantities.push(
    qtyLine('Excavation volume', 'Perimeter × Foundation width × Trench depth',
      { perimeter, foundation_width: input.foundation_width, foundation_depth: input.foundation_depth },
      excavationVol, 'm³', 0)
  );
  labour.push(labLine('Excavation labour', 'm³', excavationVol, input.labour.excavation_per_m3));

  // 3. Blinding concrete
  const blindingVol = footprintArea * input.blinding_thickness;
  quantities.push(
    qtyLine('Blinding concrete volume', 'Footprint area × Blinding thickness',
      { footprint_area: footprintArea, blinding_thickness: input.blinding_thickness },
      blindingVol, 'm³', input.wastage.cement)
  );
  const blindingMats = concreteToMaterials(blindingVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_granite);
  materials.push(matLine('Cement (blinding)', 'bags', blindingMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (blinding)', 'm³', blindingMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (blinding)', 'm³', blindingMats.granite_m3, input.wastage.granite, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Blinding labour', 'm³', blindingVol, input.labour.blinding_per_m3));

  // 4. Foundation concrete (strip footing) — FIX: uses configurable footing_thickness
  const foundationConcreteVol = perimeter * input.foundation_width * input.footing_thickness;
  quantities.push(
    qtyLine('Foundation concrete volume', 'Perimeter × Foundation width × Footing thickness',
      { perimeter, foundation_width: input.foundation_width, footing_thickness: input.footing_thickness },
      foundationConcreteVol, 'm³', input.wastage.cement)
  );
  const foundMats = concreteToMaterials(foundationConcreteVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_granite);
  materials.push(matLine('Cement (foundation)', 'bags', foundMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (foundation)', 'm³', foundMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (foundation)', 'm³', foundMats.granite_m3, input.wastage.granite, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Concrete labour', 'm³', foundationConcreteVol, input.labour.concrete_per_m3));

  // 5. Hardcore filling — FIX: now has material cost
  const hardcoreVol = footprintArea * input.hardcore_thickness;
  quantities.push(
    qtyLine('Hardcore filling volume', 'Footprint area × Hardcore thickness',
      { footprint_area: footprintArea, hardcore_thickness: input.hardcore_thickness },
      hardcoreVol, 'm³', input.wastage.hardcore)
  );
  materials.push(matLine('Hardcore stone', 'm³', hardcoreVol, input.wastage.hardcore, input.prices.hardcore_per_m3, input.prices.price_source));
  labour.push(labLine('Hardcore labour', 'm³', hardcoreVol, input.labour.hardcore_per_m3));

  // 6. Compaction of hardcore — FIX: added compaction labour
  quantities.push(
    qtyLine('Compaction volume', 'Hardcore volume (same as filling)',
      { hardcore_volume: hardcoreVol },
      hardcoreVol, 'm³', 0)
  );
  labour.push(labLine('Compaction labour', 'm³', hardcoreVol, input.labour.compaction_per_m3));

  // 7. Sand filling (over hardcore, below DPC)
  const sandFillVol = footprintArea * 0.05; // 50mm sand blinding over hardcore
  quantities.push(
    qtyLine('Sand filling volume', 'Footprint area × 0.05 (50mm)',
      { footprint_area: footprintArea, thickness: 0.05 },
      sandFillVol, 'm³', input.wastage.sand)
  );
  materials.push(matLine('Sand (filling)', 'm³', sandFillVol, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  labour.push(labLine('Sand filling labour', 'm³', sandFillVol, input.labour.sand_filling_per_m3));

  // 8. Backfilling — FIX: added backfilling (excavated soil returned into trench)
  const backfillVol = Math.max(0, excavationVol - foundationConcreteVol - blindingVol);
  if (backfillVol > 0) {
    quantities.push(
      qtyLine('Backfilling volume', 'Excavation vol − (Foundation concrete + Blinding)',
        { excavation: excavationVol, foundation_concrete: foundationConcreteVol, blinding: blindingVol },
        backfillVol, 'm³', 0)
    );
    labour.push(labLine('Backfilling labour', 'm³', backfillVol, input.labour.backfilling_per_m3));
  }

  // 9. DPC
  if (input.dpc_length > 0) {
    const dpcLength = perimeter + input.internal_wall_length;
    quantities.push(
      qtyLine('DPC length', 'Perimeter + Internal walls',
        { perimeter, internal_walls: input.internal_wall_length },
        dpcLength, 'm', 0)
    );
    materials.push(matLine('DPC roll', 'm', dpcLength, 0, input.prices.dpc_per_meter, input.prices.price_source));
  }

  // 10. Foundation blockwork (up to DPC) — FIX: includes mortar joints in height
  const courseHeight = (input.block_height * 0.0254) + MORTAR_JOINT_THICKNESS; // block (inches→m) + mortar joint
  const foundationBlockHeight = courseHeight * FOUNDATION_COURSES;
  const foundationWallArea = perimeter * foundationBlockHeight;
  const blocksPerM2Val = blocksPerM2(input.block_length, input.block_height);
  const foundationBlocks = foundationWallArea * blocksPerM2Val;
  quantities.push(
    qtyLine('Foundation blocks', 'Foundation wall area × Blocks per m²',
      { wall_area: foundationWallArea, blocks_per_m2: blocksPerM2Val, courses: FOUNDATION_COURSES, course_height: courseHeight },
      foundationBlocks, 'pcs', input.wastage.blocks)
  );
  materials.push(matLine('Blocks (foundation)', 'pcs', foundationBlocks, input.wastage.blocks, input.prices.block_per_piece, input.prices.price_source));

  // Mortar for foundation blockwork
  const foundationMortarVol = foundationWallArea * 0.03;
  const foundMortarMats = mortarToMaterials(foundationMortarVol, input.mortar_mix_cement, input.mortar_mix_sand);
  materials.push(matLine('Cement (foundation mortar)', 'bags', foundMortarMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (foundation mortar)', 'm³', foundMortarMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  labour.push(labLine('Blockwork labour (foundation)', 'blocks', foundationBlocks, input.labour.blockwork_per_block));

  const materialsTotal = materials.reduce((s, m) => s + m.total_cost, 0);
  const labourTotal = labour.reduce((s, l) => s + l.total_cost, 0);

  return {
    stage: 'site_preparation',
    stage_label: 'Site & Foundation',
    quantities,
    materials,
    labour,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    stage_total: round(materialsTotal + labourTotal),
  };
}

// ── Stage B: Ground Floor ──

function calcGroundFloor(input: BuildToRoofInput): StageResult {
  const quantities: QuantityLine[] = [];
  const materials: MaterialLine[] = [];
  const labour: LabourLine[] = [];

  const footprintArea = input.building_length * input.building_width;

  // FIX: Sand blinding/filling under ground floor slab (spec requires it)
  const gfSandFillVol = footprintArea * 0.05; // 50mm
  quantities.push(
    qtyLine('Sand filling (under slab)', 'Footprint area × 0.05 (50mm)',
      { footprint_area: footprintArea, thickness: 0.05 },
      gfSandFillVol, 'm³', input.wastage.sand)
  );
  materials.push(matLine('Sand (ground floor filling)', 'm³', gfSandFillVol, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  labour.push(labLine('Sand filling labour (ground floor)', 'm³', gfSandFillVol, input.labour.sand_filling_per_m3));

  // Oversite concrete (ground floor slab)
  const slabThickness = 0.1; // 100mm — standard Nigerian construction
  const slabVol = footprintArea * slabThickness;
  quantities.push(
    qtyLine('Ground floor concrete volume', 'Footprint area × Slab thickness (100mm)',
      { footprint_area: footprintArea, slab_thickness: slabThickness },
      slabVol, 'm³', input.wastage.cement)
  );

  const slabMats = concreteToMaterials(slabVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_granite);
  materials.push(matLine('Cement (ground floor)', 'bags', slabMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (ground floor)', 'm³', slabMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (ground floor)', 'm³', slabMats.granite_m3, input.wastage.granite, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Concrete labour (ground floor)', 'm³', slabVol, input.labour.concrete_per_m3));

  // DPM under slab — FIX: uses dpm_per_m2 (not dpc_per_meter)
  if (input.dpc_length > 0) {
    materials.push(matLine('DPM membrane', 'm²', footprintArea, 5, input.prices.dpm_per_m2, input.prices.price_source));
  }

  const materialsTotal = materials.reduce((s, m) => s + m.total_cost, 0);
  const labourTotal = labour.reduce((s, l) => s + l.total_cost, 0);

  return {
    stage: 'ground_floor',
    stage_label: 'Ground Floor',
    quantities,
    materials,
    labour,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    stage_total: round(materialsTotal + labourTotal),
  };
}

// ── Stage C: Wall Construction ──

function calcWalls(input: BuildToRoofInput): StageResult {
  const quantities: QuantityLine[] = [];
  const materials: MaterialLine[] = [];
  const labour: LabourLine[] = [];

  const perimeter = 2 * (input.building_length + input.building_width);
  const wallHeight = input.floor_to_floor_height * input.number_of_floors;

  // External wall area
  const externalGrossArea = perimeter * wallHeight;
  // Internal wall area
  const internalGrossArea = input.internal_wall_length * wallHeight;

  // Opening deductions
  const openingArea = input.openings.reduce((sum, o) => sum + o.width * o.height * o.count, 0);

  const netWallArea = Math.max(0, externalGrossArea + internalGrossArea - openingArea);

  quantities.push(
    qtyLine('External wall gross area', 'Perimeter × Wall height × Floors',
      { perimeter, wall_height: wallHeight, floors: input.number_of_floors },
      externalGrossArea, 'm²', 0)
  );
  quantities.push(
    qtyLine('Internal wall gross area', 'Internal wall length × Wall height × Floors',
      { internal_length: input.internal_wall_length, wall_height: wallHeight },
      internalGrossArea, 'm²', 0)
  );
  quantities.push(
    qtyLine('Opening deductions', 'Σ (door width × height × count) + Σ (window width × height × count)',
      { opening_area: openingArea },
      -openingArea, 'm²', 0)
  );
  quantities.push(
    qtyLine('Net wall area', 'External + Internal − Openings',
      { external: externalGrossArea, internal: internalGrossArea, openings: openingArea },
      netWallArea, 'm²', 0)
  );

  // Blocks
  const blocksM2 = blocksPerM2(input.block_length, input.block_height);
  const totalBlocks = netWallArea * blocksM2;
  quantities.push(
    qtyLine('Blocks required', 'Net wall area × Blocks per m²',
      { net_area: netWallArea, blocks_per_m2: blocksM2 },
      totalBlocks, 'pcs', input.wastage.blocks)
  );
  materials.push(matLine('Blocks (walls)', 'pcs', totalBlocks, input.wastage.blocks, input.prices.block_per_piece, input.prices.price_source));

  // Mortar — ~0.03 m³ mortar per m² of wall (for 9-inch / 225mm blocks)
  const mortarVol = netWallArea * 0.03;
  const mortarMats = mortarToMaterials(mortarVol, input.mortar_mix_cement, input.mortar_mix_sand);
  materials.push(matLine('Cement (wall mortar)', 'bags', mortarMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (wall mortar)', 'm³', mortarMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));

  // Labour
  labour.push(labLine('Blockwork labour', 'blocks', totalBlocks, input.labour.blockwork_per_block));

  const materialsTotal = materials.reduce((s, m) => s + m.total_cost, 0);
  const labourTotal = labour.reduce((s, l) => s + l.total_cost, 0);

  return {
    stage: 'walls',
    stage_label: 'Wall Construction',
    quantities,
    materials,
    labour,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    stage_total: round(materialsTotal + labourTotal),
  };
}

// ── Stage D: Structural Frame ──

function calcStructuralFrame(input: BuildToRoofInput): StageResult {
  const quantities: QuantityLine[] = [];
  const materials: MaterialLine[] = [];
  const labour: LabourLine[] = [];

  if (input.structural_members.length === 0) {
    return {
      stage: 'structural_frame',
      stage_label: 'Structural Frame',
      quantities,
      materials,
      labour,
      materials_total: 0,
      labour_total: 0,
      stage_total: 0,
    };
  }

  let totalConcreteVol = 0;
  let totalReinforcementKg = 0;
  let totalFormworkArea = 0;

  for (const member of input.structural_members) {
    // FIX: removed redundant if/else — all member types use the same volume formula
    // vol = length × width × depth × quantity
    const vol = member.length * member.width * member.depth * member.quantity;
    totalConcreteVol += vol;

    // Formwork area (sides + soffit for beams, sides for columns, soffit for slabs)
    let formwork: number;
    if (member.type === 'column') {
      // Column: 4 sides (perimeter × height)
      formwork = member.length * 2 * (member.width + member.depth) * member.quantity;
    } else if (member.type === 'slab') {
      // Slab: soffit only (bottom face)
      formwork = member.length * member.width * member.quantity;
    } else {
      // Beams, lintels, ring beams: sides + soffit
      formwork = member.length * 2 * (member.width + member.depth) * member.quantity;
    }
    totalFormworkArea += formwork;

    // Reinforcement
    const rebarKg = estimateReinforcementKg(member);
    totalReinforcementKg += rebarKg;

    quantities.push(
      qtyLine(`${member.label} — concrete`, `${member.length} × ${member.width} × ${member.depth} × ${member.quantity}`,
        { length: member.length, width: member.width, depth: member.depth, quantity: member.quantity },
        vol, 'm³', input.wastage.cement)
    );
  }

  // Concrete materials
  const concreteMats = concreteToMaterials(totalConcreteVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_granite);
  materials.push(matLine('Cement (structural)', 'bags', concreteMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (structural)', 'm³', concreteMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (structural)', 'm³', concreteMats.granite_m3, input.wastage.granite, input.prices.granite_per_m3, input.prices.price_source));

  // Reinforcement
  const rebarTonnes = totalReinforcementKg / 1000;
  materials.push(matLine('Reinforcement steel', 'tonnes', rebarTonnes, input.wastage.reinforcement, input.prices.reinforcement_per_tonne, input.prices.price_source));

  // Binding wire (~2% of steel weight)
  const bindingWireKg = totalReinforcementKg * 0.02;
  materials.push(matLine('Binding wire', 'kg', bindingWireKg, 0, input.prices.binding_wire_per_kg, input.prices.price_source));

  // Formwork
  materials.push(matLine('Formwork', 'm²', totalFormworkArea, 10, input.prices.formwork_per_m2, input.prices.price_source));

  // Labour
  labour.push(labLine('Concrete labour (structural)', 'm³', totalConcreteVol, input.labour.concrete_per_m3));
  labour.push(labLine('Reinforcement labour', 'tonnes', rebarTonnes, input.labour.reinforcement_per_tonne));
  labour.push(labLine('Formwork labour', 'm²', totalFormworkArea, input.labour.formwork_per_m2));

  const materialsTotal = materials.reduce((s, m) => s + m.total_cost, 0);
  const labourTotal = labour.reduce((s, l) => s + l.total_cost, 0);

  return {
    stage: 'structural_frame',
    stage_label: 'Structural Frame',
    quantities,
    materials,
    labour,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    stage_total: round(materialsTotal + labourTotal),
  };
}

// ── Stage E: Roofing ──

function calcRoofing(input: BuildToRoofInput): StageResult {
  const quantities: QuantityLine[] = [];
  const materials: MaterialLine[] = [];
  const labour: LabourLine[] = [];

  const roofArea = calculateRoofArea(
    input.building_length,
    input.building_width,
    input.roof_pitch_degrees,
    input.roof_overhang,
    input.roof_type
  );

  // FIX: roof area quantity shows 0% wastage (wastage is on sheets, not on area)
  quantities.push(
    qtyLine('Roof surface area', '(L + 2×overhang) × (W + 2×overhang) / cos(pitch)',
      { length: input.building_length, width: input.building_width, pitch: input.roof_pitch_degrees, overhang: input.roof_overhang },
      roofArea, 'm²', 0)
  );

  // FIX: sheet coverage varies by roofing material
  const sheetCoverage = getSheetCoverage(input.roofing_material);
  const sheetCount = roofingSheetsCount(roofArea, sheetCoverage);
  quantities.push(
    qtyLine('Roofing sheets', `ceil(Roof area / ${sheetCoverage}m² per sheet) — ${input.roofing_material}`,
      { roof_area: roofArea, coverage: sheetCoverage, material: input.roofing_material as unknown as number },
      sheetCount, 'pcs', input.wastage.roofing_sheets)
  );
  materials.push(matLine('Roofing sheets', 'pcs', sheetCount, input.wastage.roofing_sheets, input.prices.roofing_sheet_per_piece, input.prices.price_source));

  // Ridge caps
  const ridgeLength = calculateRidgeLength(input.building_length, input.building_width, input.roof_type);
  quantities.push(
    qtyLine('Ridge cap length', 'Depends on roof type',
      { roof_type: input.roof_type as unknown as number, length: input.building_length, width: input.building_width },
      ridgeLength, 'm', 0)
  );
  if (ridgeLength > 0) {
    materials.push(matLine('Ridge caps', 'm', ridgeLength, 5, input.prices.ridge_cap_per_meter, input.prices.price_source));
  }

  // Hip accessories (for hip roofs)
  if (input.roof_type === 'hip') {
    const hipLength = calculateHipLength(input.building_length, input.building_width, input.roof_pitch_degrees);
    quantities.push(
      qtyLine('Hip accessory length', '4 × (width/2) / cos(pitch)',
        { width: input.building_width, pitch: input.roof_pitch_degrees },
        hipLength, 'm', 0)
    );
    materials.push(matLine('Hip accessories', 'm', hipLength, 5, input.prices.ridge_cap_per_meter, input.prices.price_source));
  }

  // Timber — FIX: passes overhang to estimateTimberMeters
  const timberM = estimateTimberMeters(roofArea, input.building_length, input.building_width, input.roof_pitch_degrees, input.roof_overhang, input.roof_type);
  quantities.push(
    qtyLine('Timber (rafters + purlins)', 'Rafters (spacing 0.9m) + purlins (4 rows/slope)',
      { roof_area: roofArea },
      timberM, 'm', input.wastage.timber)
  );
  materials.push(matLine('Timber', 'm', timberM, input.wastage.timber, input.prices.timber_per_m, input.prices.price_source));

  // Roofing screws (10 per sheet)
  const screwCount = sheetCount * SCREWS_PER_SHEET;
  materials.push(matLine('Roofing screws', 'pcs', screwCount, 5, input.prices.roofing_screws_per_piece, input.prices.price_source));

  // Fascia
  const fasciaLength = calculateFasciaLength(input.building_length, input.building_width, input.roof_overhang);
  quantities.push(
    qtyLine('Fascia length', '2×(L + 2×overhang) + 2×(W + 2×overhang)',
      { length: input.building_length, width: input.building_width, overhang: input.roof_overhang },
      fasciaLength, 'm', 0)
  );
  materials.push(matLine('Fascia board', 'm', fasciaLength, 5, input.prices.fascia_per_meter, input.prices.price_source));

  // Labour
  labour.push(labLine('Roofing labour', 'm²', roofArea, input.labour.roofing_per_m2));

  const materialsTotal = materials.reduce((s, m) => s + m.total_cost, 0);
  const labourTotal = labour.reduce((s, l) => s + l.total_cost, 0);

  return {
    stage: 'roofing',
    stage_label: 'Roofing',
    quantities,
    materials,
    labour,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    stage_total: round(materialsTotal + labourTotal),
  };
}

// ── Consolidated shopping list ──

function consolidateMaterials(stages: StageResult[]): ConsolidatedMaterial[] {
  const map = new Map<string, ConsolidatedMaterial>();

  for (const stage of stages) {
    for (const mat of stage.materials) {
      const key = mat.label;
      const existing = map.get(key);
      if (existing) {
        existing.total_quantity += mat.final_quantity;
        existing.total_cost += mat.total_cost;
        if (!existing.stages.includes(stage.stage_label)) {
          existing.stages.push(stage.stage_label);
        }
      } else {
        map.set(key, {
          label: mat.label,
          unit: mat.unit,
          total_quantity: round(mat.final_quantity),
          unit_price: mat.unit_price,
          total_cost: round(mat.total_cost),
          stages: [stage.stage_label],
        });
      }
    }
  }

  // Consolidate cement, sand, granite, hardcore into single entries
  const consolidated: ConsolidatedMaterial[] = [];

  const consolidate = (filter: (label: string) => boolean, outLabel: string, unit: string) => {
    const matching = [...map.values()].filter(m => filter(m.label));
    if (matching.length === 0) return;
    const total = matching.reduce((s, m) => s + m.total_quantity, 0);
    const cost = matching.reduce((s, m) => s + m.total_cost, 0);
    const stagesSet = new Set<string>();
    matching.forEach(m => m.stages.forEach(s => stagesSet.add(s)));
    consolidated.push({
      label: outLabel,
      unit,
      total_quantity: round(total),
      unit_price: 0,
      total_cost: round(cost),
      stages: [...stagesSet],
    });
  };

  consolidate(l => l.toLowerCase().includes('cement'), 'Cement', 'bags');
  consolidate(l => l.toLowerCase().includes('sand'), 'Sharp Sand', 'm³');
  consolidate(l => l.toLowerCase().includes('granite'), 'Granite', 'm³');
  consolidate(l => l.toLowerCase().includes('hardcore'), 'Hardcore Stone', 'm³');

  // Add non-consolidated items
  for (const [key, val] of map) {
    const lower = key.toLowerCase();
    if (!lower.includes('cement') &&
        !lower.includes('sand') &&
        !lower.includes('granite') &&
        !lower.includes('hardcore')) {
      consolidated.push(val);
    }
  }

  return consolidated;
}

// ── Confidence assessment ──

function assessConfidence(input: BuildToRoofInput): { level: ConfidenceLevel; reason: string } {
  const hasDrawing = !!input.drawing_analysis?.confirmed.building_length;
  const hasStructural = input.has_engineer_schedule && input.structural_members.length > 0;
  const hasDimensions = input.building_length > 0 && input.building_width > 0;

  if (hasDrawing && hasStructural) {
    return {
      level: 'high',
      reason: 'Dimensioned drawings and engineer-supplied structural schedule provided. Quantities derived from confirmed dimensions and verified structural inputs.',
    };
  }

  if (hasDimensions && (input.internal_wall_length > 0 || hasDrawing)) {
    if (!hasStructural) {
      return {
        level: 'moderate',
        reason: 'Architectural dimensions available but structural engineering schedule missing. Structural concrete quantities are preliminary — not a structural design.',
      };
    }
    return {
      level: 'moderate',
      reason: 'Some construction information is missing. Quantities for missing items are based on standard assumptions.',
    };
  }

  return {
    level: 'preliminary',
    reason: 'Only basic building dimensions provided. Estimate is preliminary and should not be used for procurement without detailed drawings and structural schedules.',
  };
}

// ── Main calculation ──

export function calculateBuildToRoof(input: BuildToRoofInput): BuildToRoofResult {
  // Convert ft inputs to meters if measurement_unit is ft
  const input_m: BuildToRoofInput = input.measurement_unit === 'ft'
    ? {
        ...input,
        building_length: ftToM(input.building_length),
        building_width: ftToM(input.building_width),
        floor_to_floor_height: ftToM(input.floor_to_floor_height),
        wall_thickness: ftToM(input.wall_thickness),
        internal_wall_length: ftToM(input.internal_wall_length),
        internal_wall_thickness: ftToM(input.internal_wall_thickness),
        foundation_depth: ftToM(input.foundation_depth),
        foundation_width: ftToM(input.foundation_width),
        footing_thickness: ftToM(input.footing_thickness),
        blinding_thickness: ftToM(input.blinding_thickness),
        hardcore_thickness: ftToM(input.hardcore_thickness),
        dpc_length: ftToM(input.dpc_length),
        roof_overhang: ftToM(input.roof_overhang),
        openings: input.openings.map(o => ({
          ...o,
          width: ftToM(o.width),
          height: ftToM(o.height),
        })),
        structural_members: input.structural_members.map(m => ({
          ...m,
          length: ftToM(m.length),
          width: ftToM(m.width),
          depth: ftToM(m.depth),
        })),
      }
    : input;

  const stages: StageResult[] = [];

  stages.push(calcSiteAndFoundation(input_m));
  stages.push(calcGroundFloor(input_m));
  stages.push(calcWalls(input_m));
  stages.push(calcStructuralFrame(input_m));
  stages.push(calcRoofing(input_m));

  const shoppingList = consolidateMaterials(stages);

  const materialsTotal = stages.reduce((s, stage) => s + stage.materials_total, 0);
  
  // Task-based labour total from stages
  const taskLabourTotal = stages.reduce((s, stage) => s + stage.labour_total, 0);
  
  // Role-based labour total (daily/contract rates)
  const roleLabourTotal =
    (input.labour.bricklayer_per_day * input.labour.bricklayer_days) +
    (input.labour.foreman_per_day * input.labour.foreman_days) +
    (input.labour.supervisor_per_day * input.labour.supervisor_days) +
    (input.labour.carpenter_per_day * input.labour.carpenter_days) +
    (input.labour.concrete_labourer_per_day * input.labour.concrete_labourer_days) +
    (input.labour.contractor_fee_type === 'contract'
      ? input.labour.contractor_fee
      : input.labour.contractor_fee * input.labour.contractor_days);
  
  const labourTotal = taskLabourTotal + roleLabourTotal;

  // Wastage allowance = difference between final quantities and base quantities
  const wastageAllowance = stages.reduce((sum, stage) => {
    return sum + stage.materials.reduce((s, m) => {
      const base = m.base_quantity * m.unit_price;
      return s + Math.max(0, m.total_cost - base);
    }, 0);
  }, 0);

  const contingency = (materialsTotal + labourTotal) * (input.contingency_percent / 100);
  const grandTotal = materialsTotal + labourTotal + contingency;

  const confidence = assessConfidence(input);

  // Assumptions & limitations
  const assumptions: string[] = [
    `Concrete mix ratio: ${input.concrete_mix_cement}:${input.concrete_mix_sand}:${input.concrete_mix_granite} (cement:sand:granite)`,
    `Mortar mix ratio: ${input.mortar_mix_cement}:${input.mortar_mix_sand} (cement:sand)`,
    `Block size: ${input.block_length}" × ${input.block_height}" × ${input.block_width}" (inches)`,
    `Foundation type: ${input.foundation_type}`,
    `Footing thickness: ${input.footing_thickness}m`,
    `Roof type: ${input.roof_type} at ${input.roof_pitch_degrees}° pitch with ${input.roofing_material.replace(/_/g, ' ')} sheets`,
    `Wall height: ${input.floor_to_floor_height}m per floor, ${input.number_of_floors} floor(s)`,
    `Blinding thickness: ${input.blinding_thickness}m`,
    `Hardcore thickness: ${input.hardcore_thickness}m`,
    `Foundation blockwork: ${FOUNDATION_COURSES} courses (including mortar joints)`,
    `Dry/wet concrete ratio: ${DRY_WET_RATIO}`,
    `Dry/wet mortar ratio: ${MORTAR_DRY_WET_RATIO}`,
    `Prices as of: ${input.prices.price_date} (${input.prices.price_source})`,
  ];

  const limitations: string[] = [
    'This estimate stops at the Build-to-Roof stage. It does NOT include plastering, painting, screeding, tiling, POP/ceiling finishing, doors, windows, plumbing, electrical, or other finishing works.',
    'Doors and windows are used only as wall opening deductions. Their purchase and installation costs are NOT included.',
    'Structural member sizes (columns, beams, slabs, reinforcement) must be verified by a qualified structural engineer. This tool does NOT design or certify structural adequacy.',
    'Roofing sheet count is based on standard sheet dimensions for the selected material type. Actual sheet sizes may vary by manufacturer.',
    'Mortar volume is estimated at 0.03 m³ per m² of wall — this is a standard industry approximation for 9-inch (225mm) blockwork.',
    'Sand filling thickness under ground floor slab is assumed at 50mm.',
  ];

  const missingInfo: string[] = [];
  if (!input.has_engineer_schedule) {
    missingInfo.push('Engineer-supplied structural schedule — structural concrete quantities are preliminary estimates based on architectural dimensions only.');
  }
  if (input.internal_wall_length <= 0) {
    missingInfo.push('Internal wall layout — internal partition walls not specified. Wall quantities may be understated.');
  }
  if (!input.drawing_analysis) {
    missingInfo.push('Architectural drawing — no drawing uploaded. Dimensions are user-entered and should be verified against actual plans.');
  }
  if (input.openings.length === 0) {
    missingInfo.push('Door/window openings not specified — wall quantities include the full gross area with no deductions.');
  }

  return {
    project_name: input.project_name || 'Untitled Project',
    location: input.location || 'Not specified',
    building_type: input.building_type,
    number_of_floors: input.number_of_floors,
    total_floor_area: round(input.building_length * input.building_width * input.number_of_floors),
    construction_stage: 'SITE → FOUNDATION → GROUND FLOOR → WALLS → STRUCTURAL FRAME → ROOF → READY FOR FINISHING',
    confidence: confidence.level,
    confidence_reason: confidence.reason,
    stages,
    shopping_list: shoppingList,
    materials_total: round(materialsTotal),
    labour_total: round(labourTotal),
    wastage_allowance: round(wastageAllowance),
    contingency: round(contingency),
    grand_total: round(grandTotal),
    assumptions,
    limitations,
    missing_info: missingInfo,
    price_date: input.prices.price_date,
    price_source: input.prices.price_source,
  };
}

// ── Default price/labour/wastage configs (Nigerian market defaults) ──

export const DEFAULT_PRICES = {
  cement_per_bag: 9500,
  block_per_piece: 350,
  sand_per_m3: 45000,
  sand_per_trip: 157500, // 45000 × 3.5 m³ per trip
  granite_per_m3: 95000,
  granite_per_trip: 332500, // 95000 × 3.5 m³ per trip
  hardcore_per_m3: 35000,
  reinforcement_per_tonne: 1200000,
  binding_wire_per_kg: 2500,
  timber_per_m: 2500,
  roofing_sheet_per_piece: 8500,
  ridge_cap_per_meter: 3500,
  roofing_screws_per_piece: 150,
  fascia_per_meter: 2500,
  dpc_per_meter: 800,
  dpm_per_m2: 1200,
  formwork_per_m2: 4500,
  price_date: new Date().toISOString().split('T')[0],
  price_source: 'Default (Nigerian market estimate — please update)',
};

export const DEFAULT_LABOUR = {
  excavation_per_m3: 3500,
  blockwork_per_block: 150,
  concrete_per_m3: 25000,
  reinforcement_per_tonne: 150000,
  formwork_per_m2: 5000,
  roofing_per_m2: 5000,
  blinding_per_m3: 8000,
  hardcore_per_m3: 6000,
  sand_filling_per_m3: 5000,
  compaction_per_m3: 3000,
  backfilling_per_m3: 2500,
  general_labour_per_day: 10000,
  general_labour_days: 5,
  // Nigerian construction role-based daily rates
  bricklayer_per_day: 8000,
  bricklayer_days: 20,
  contractor_fee: 500000,
  contractor_fee_type: 'contract',
  contractor_days: 30,
  supervisor_per_day: 10000,
  supervisor_days: 30,
  foreman_per_day: 7000,
  foreman_days: 25,
  carpenter_per_day: 8000,
  carpenter_days: 15,
  concrete_labourer_per_day: 6000,
  concrete_labourer_days: 15,
};

export const DEFAULT_WASTAGE = {
  blocks: 5,
  cement: 5,
  sand: 10,
  granite: 10,
  reinforcement: 3,
  timber: 10,
  roofing_sheets: 5,
  hardcore: 5,
};

export const CALCULATOR_TYPE = 'build_to_roof';
