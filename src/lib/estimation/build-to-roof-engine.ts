// =========================================================
// FRELUX Build-to-Roof Construction Cost Estimator
// Calculation Engine — Phase 30
//
// SITE → FOUNDATION → GROUND FLOOR → WALLS → STRUCTURAL FRAME → ROOF → READY FOR FINISHING
//
// All formulas are transparent and testable.
// Every quantity shows: inputs, formula, base qty, wastage, final qty.
// Nigerian construction units: bags, m³, pcs, tonnes, linear meters.
// =========================================================

import type {
  BuildToRoofInput,
  BuildToRoofResult,
  StageResult,
  QuantityLine,
  MaterialLine,
  LabourLine,
  ConsolidatedMaterial,
  ConstructionStage,
  ConfidenceLevel,
  StructuralMemberInput,
} from '@/types/build-to-roof';

// ── Constants ──

// Cement: 1 bag = 50kg, density ~1440 kg/m³ → 0.0347 m³ per bag
export const CEMENT_VOLUME_PER_BAG = 0.0347; // m³

// Dry-to-wet concrete volume ratio (1.54 — standard)
export const DRY_WET_RATIO = 1.54;

// Block face area for blocks-per-m² calculation
// blocks_per_m² = 1 / (block_length_m × block_height_m)

// Mortar: approximately 0.03 m³ per m² of wall (for 225mm blocks)
// This is a simplified industry estimate

// Reinforcement steel: 1 tonne = 1000 kg

// ── Helpers ──

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
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
 * Convert concrete volume (m³) into cement (bags), sand (m³), aggregate (m³)
 * using a mix ratio like 1:2:4 (cement:sand:aggregate by volume).
 *
 * Formula:
 *   dryVolume = wetVolume × 1.54
 *   totalParts = cement + sand + aggregate
 *   cementVol = dryVolume × (cement / totalParts)
 *   sandVol   = dryVolume × (sand / totalParts)
 *   aggVol    = dryVolume × (aggregate / totalParts)
 *   cementBags = cementVol / 0.0347
 */
export function concreteToMaterials(
  wetVolumeM3: number,
  mixCement: number,
  mixSand: number,
  mixAggregate: number
): { cement_bags: number; sand_m3: number; aggregate_m3: number } {
  if (wetVolumeM3 <= 0) return { cement_bags: 0, sand_m3: 0, aggregate_m3: 0 };
  const dryVolume = wetVolumeM3 * DRY_WET_RATIO;
  const totalParts = mixCement + mixSand + mixAggregate;
  if (totalParts <= 0) return { cement_bags: 0, sand_m3: 0, aggregate_m3: 0 };

  const cementVol = dryVolume * (mixCement / totalParts);
  const sandVol = dryVolume * (mixSand / totalParts);
  const aggVol = dryVolume * (mixAggregate / totalParts);

  return {
    cement_bags: cementVol / CEMENT_VOLUME_PER_BAG,
    sand_m3: sandVol,
    aggregate_m3: aggVol,
  };
}

// ── Mortar mix → material breakdown ──

/**
 * Convert mortar volume (m³) into cement (bags) and sand (m³)
 * using a mix ratio like 1:6 (cement:sand by volume).
 */
export function mortarToMaterials(
  mortarVolumeM3: number,
  mixCement: number,
  mixSand: number
): { cement_bags: number; sand_m3: number } {
  if (mortarVolumeM3 <= 0) return { cement_bags: 0, sand_m3: 0 };
  const dryVolume = mortarVolumeM3 * 1.33; // dry mortar ratio
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

export function blocksPerM2(blockLengthMm: number, blockHeightMm: number): number {
  const blockFaceArea = (blockLengthMm / 1000) * (blockHeightMm / 1000); // m²
  if (blockFaceArea <= 0) return 0;
  return 1 / blockFaceArea;
}

// ── Roof geometry ──

/**
 * Calculate roof surface area from building footprint + pitch + overhang.
 *
 * For gable roof:
 *   roofSlope = 1 / cos(pitch)
 *   footprint = (length + 2×overhang) × (width + 2×overhang)
 *   roofArea = footprint × roofSlope (simplified for gable)
 *
 * For hip roof:
 *   roofArea ≈ footprint × (1 / cos(pitch)) (similar but covers all 4 sides)
 *
 * For mono-pitch:
 *   roofArea = footprint × (1 / cos(pitch))
 *
 * For flat roof:
 *   roofArea = footprint
 */
export function calculateRoofArea(
  buildingLength: number,
  buildingWidth: number,
  pitchDegrees: number,
  overhang: number,
  roofType: string
): number {
  const footprint = (buildingLength + 2 * overhang) * (buildingWidth + 2 * overhang);
  const pitchRad = (pitchDegrees * Math.PI) / 180;

  switch (roofType) {
    case 'flat':
      return footprint;
    case 'gable':
    case 'hip':
    case 'mono_pitch':
    case 'custom':
    default: {
      const slopeFactor = 1 / Math.cos(pitchRad);
      return footprint * slopeFactor;
    }
  }
}

// ── Roofing sheets ──

export function roofingSheetsCount(roofAreaM2: number, sheetCoverageM2: number): number {
  if (sheetCoverageM2 <= 0) return 0;
  return Math.ceil(roofAreaM2 / sheetCoverageM2);
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
  // 4 hips in a standard hip roof (2 at each end)
  // But actually 4 hips total (one from each corner)
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
 * Returns total linear meters of timber.
 */
export function estimateTimberMeters(
  roofAreaM2: number,
  buildingLength: number,
  buildingWidth: number,
  pitchDegrees: number,
  roofType: string
): number {
  const pitchRad = (pitchDegrees * Math.PI) / 180;
  const slopeLength = buildingWidth / (2 * Math.cos(pitchRad));

  // Rafters: spaced at 0.9m, each rafter length = slopeLength + overhang
  const rafterSpacing = 0.9;
  const rafterCount = Math.ceil(buildingLength / rafterSpacing) + 1;
  const rafterTotalM = rafterCount * 2 * slopeLength; // both sides

  // Purlins: 3-4 rows per slope, each running the length of the building
  const purlinRows = 4;
  const purlinTotalM = purlinRows * 2 * buildingLength;

  if (roofType === 'flat') {
    return Math.ceil(roofAreaM2 * 2); // minimal timber for flat
  }

  return round(rafterTotalM + purlinTotalM);
}

// ── Reinforcement estimation (from engineer's schedule) ──

export function estimateReinforcementKg(member: StructuralMemberInput): number {
  if (!member.bar_diameter_mm || !member.bar_count_main) return 0;

  // Steel weight per meter: kg/m = (d² / 162)  [where d is in mm]
  const mainBarWeightPerM = Math.pow(member.bar_diameter_mm, 2) / 162;
  const mainBarLength = member.bar_length_main ?? member.length;
  const mainBarsTotal = member.bar_count_main * mainBarLength * member.quantity;
  const mainBarsKg = mainBarsTotal * mainBarWeightPerM;

  // Links/stirrups
  let linksKg = 0;
  if (member.link_diameter_mm && member.bar_count_links) {
    const linkWeightPerM = Math.pow(member.link_diameter_mm, 2) / 162;
    // Link length ≈ 2×(width + depth) - 2×cover
    const cover = (member.cover_mm ?? 25) / 1000;
    const linkLength = 2 * (member.width + member.depth - 4 * cover);
    const linksTotal = member.bar_count_links * member.length * member.quantity;
    linksKg = linksTotal * linkLength * linkWeightPerM;
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

  // 1. Excavation volume
  const excavationVol = perimeter * input.foundation_width * input.foundation_depth;
  quantities.push(
    qtyLine('Excavation volume', 'Perimeter × Foundation width × Foundation depth',
      { perimeter, foundation_width: input.foundation_width, foundation_depth: input.foundation_depth },
      excavationVol, 'm³', 0)
  );
  labour.push(labLine('Excavation labour', 'm³', excavationVol, input.labour.excavation_per_m3));

  // 2. Blinding concrete
  const blindingVol = footprintArea * input.blinding_thickness;
  quantities.push(
    qtyLine('Blinding concrete volume', 'Footprint area × Blinding thickness',
      { footprint_area: footprintArea, blinding_thickness: input.blinding_thickness },
      blindingVol, 'm³', input.wastage.cement)
  );
  const blindingMats = concreteToMaterials(blindingVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_aggregate);
  materials.push(matLine('Cement (blinding)', 'bags', blindingMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (blinding)', 'm³', blindingMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (blinding)', 'm³', blindingMats.aggregate_m3, input.wastage.aggregate, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Blinding labour', 'm³', blindingVol, input.labour.blinding_per_m3));

  // 3. Foundation concrete (strip footing)
  const foundationConcreteVol = perimeter * input.foundation_width * 0.225; // 225mm footing depth assumed
  quantities.push(
    qtyLine('Foundation concrete volume', 'Perimeter × Foundation width × 0.225',
      { perimeter, foundation_width: input.foundation_width, depth: 0.225 },
      foundationConcreteVol, 'm³', input.wastage.cement)
  );
  const foundMats = concreteToMaterials(foundationConcreteVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_aggregate);
  materials.push(matLine('Cement (foundation)', 'bags', foundMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (foundation)', 'm³', foundMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (foundation)', 'm³', foundMats.aggregate_m3, input.wastage.aggregate, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Concrete labour', 'm³', foundationConcreteVol, input.labour.concrete_per_m3));

  // 4. Hardcore filling
  const hardcoreVol = footprintArea * input.hardcore_thickness;
  quantities.push(
    qtyLine('Hardcore filling volume', 'Footprint area × Hardcore thickness',
      { footprint_area: footprintArea, hardcore_thickness: input.hardcore_thickness },
      hardcoreVol, 'm³', 0)
  );
  labour.push(labLine('Hardcore labour', 'm³', hardcoreVol, input.labour.hardcore_per_m3));

  // 5. Sand filling (over hardcore)
  const sandFillVol = footprintArea * 0.05; // 50mm sand blinding over hardcore
  quantities.push(
    qtyLine('Sand filling volume', 'Footprint area × 0.05',
      { footprint_area: footprintArea, thickness: 0.05 },
      sandFillVol, 'm³', input.wastage.sand)
  );
  materials.push(matLine('Sand (filling)', 'm³', sandFillVol, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  labour.push(labLine('Sand filling labour', 'm³', sandFillVol, input.labour.sand_filling_per_m3));

  // 6. DPC
  if (input.dpc_length > 0) {
    quantities.push(
      qtyLine('DPC length', 'Perimeter + internal walls',
        { perimeter, internal_walls: input.internal_wall_length },
        perimeter + input.internal_wall_length, 'm', 0)
    );
    materials.push(matLine('DPC/DPM', 'm', perimeter + input.internal_wall_length, 0, input.prices.dpc_per_meter, input.prices.price_source));
  }

  // 7. Foundation blockwork (up to DPC)
  const foundationBlockHeight = 0.225 * 4; // typically 4 courses below DPC
  const foundationWallArea = perimeter * foundationBlockHeight;
  const blocksPerM2Val = blocksPerM2(input.block_length, input.block_height);
  const foundationBlocks = foundationWallArea * blocksPerM2Val;
  quantities.push(
    qtyLine('Foundation blocks', 'Foundation wall area × Blocks per m²',
      { wall_area: foundationWallArea, blocks_per_m2: blocksPerM2Val },
      foundationBlocks, 'pcs', input.wastage.blocks)
  );
  materials.push(matLine('Blocks (foundation)', 'pcs', foundationBlocks, input.wastage.blocks, input.prices.block_per_piece, input.prices.price_source));

  // Mortar for foundation blockwork
  const foundationMortarVol = foundationWallArea * 0.03;
  const foundMortarMats = mortarToMaterials(foundationMortarVol, input.mortar_mix_cement, input.mortar_mix_sand);
  materials.push(matLine('Cement (foundation mortar)', 'bags', foundMortarMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (foundation mortar)', 'm³', foundMortarMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  labour.push(labLine('Blockwork labour (foundation)', 'blocks', foundationBlocks, input.labour.blockwork_per_block));

  // 8. General labour for site prep
  labour.push(labLine('Site preparation labour', 'days', input.labour.general_labour_days, input.labour.general_labour_per_day));

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

  // Oversite concrete (ground floor slab)
  const slabThickness = 0.1; // 100mm
  const slabVol = footprintArea * slabThickness;
  quantities.push(
    qtyLine('Ground floor concrete volume', 'Footprint area × Slab thickness (100mm)',
      { footprint_area: footprintArea, slab_thickness: slabThickness },
      slabVol, 'm³', input.wastage.cement)
  );

  const slabMats = concreteToMaterials(slabVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_aggregate);
  materials.push(matLine('Cement (ground floor)', 'bags', slabMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (ground floor)', 'm³', slabMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (ground floor)', 'm³', slabMats.aggregate_m3, input.wastage.aggregate, input.prices.granite_per_m3, input.prices.price_source));
  labour.push(labLine('Concrete labour (ground floor)', 'm³', slabVol, input.labour.concrete_per_m3));

  // DPM under slab
  if (input.dpc_length > 0) {
    materials.push(matLine('DPM membrane', 'm²', footprintArea, 5, input.prices.dpc_per_meter, input.prices.price_source));
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

  const netWallArea = externalGrossArea + internalGrossArea - openingArea;

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

  // Mortar
  const mortarVol = netWallArea * 0.03; // ~0.03 m³ mortar per m² of wall
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
    // Concrete volume
    let vol: number;
    if (member.type === 'slab') {
      vol = member.length * member.width * member.depth * member.quantity;
    } else {
      // Columns, beams, lintels: length × cross-section × quantity
      vol = member.length * member.width * member.depth * member.quantity;
    }
    totalConcreteVol += vol;

    // Formwork area (sides + bottom for beams, sides for columns)
    let formwork: number;
    if (member.type === 'column') {
      formwork = member.length * 2 * (member.width + member.depth) * member.quantity;
    } else if (member.type === 'slab') {
      formwork = member.length * member.width * member.quantity; // soffit only
    } else {
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
  const concreteMats = concreteToMaterials(totalConcreteVol, input.concrete_mix_cement, input.concrete_mix_sand, input.concrete_mix_aggregate);
  materials.push(matLine('Cement (structural)', 'bags', concreteMats.cement_bags, input.wastage.cement, input.prices.cement_per_bag, input.prices.price_source));
  materials.push(matLine('Sand (structural)', 'm³', concreteMats.sand_m3, input.wastage.sand, input.prices.sand_per_m3, input.prices.price_source));
  materials.push(matLine('Granite (structural)', 'm³', concreteMats.aggregate_m3, input.wastage.aggregate, input.prices.granite_per_m3, input.prices.price_source));

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

  quantities.push(
    qtyLine('Roof surface area', 'Footprint × (1/cos(pitch)) + overhang',
      { length: input.building_length, width: input.building_width, pitch: input.roof_pitch_degrees, overhang: input.roof_overhang },
      roofArea, 'm²', input.wastage.roofing_sheets)
  );

  // Roofing sheets (assume standard 0.5m × 3m = 1.5 m² per sheet for long span)
  const sheetCoverage = 1.5;
  const sheetCount = roofingSheetsCount(roofArea, sheetCoverage);
  quantities.push(
    qtyLine('Roofing sheets', `ceil(Roof area / ${sheetCoverage}m²)`,
      { roof_area: roofArea, coverage: sheetCoverage },
      sheetCount, 'pcs', input.wastage.roofing_sheets)
  );
  materials.push(matLine('Roofing sheets', 'pcs', sheetCount, input.wastage.roofing_sheets, input.prices.roofing_sheet_per_piece, input.prices.price_source));

  // Ridge caps
  const ridgeLength = calculateRidgeLength(input.building_length, input.building_width, input.roof_type);
  quantities.push(
    qtyLine('Ridge cap length', 'Depends on roof type',
      { roof_type: input.roof_type, length: input.building_length, width: input.building_width },
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

  // Timber
  const timberM = estimateTimberMeters(roofArea, input.building_length, input.building_width, input.roof_pitch_degrees, input.roof_type);
  quantities.push(
    qtyLine('Timber (rafters + purlins)', 'Rafters + purlins estimate',
      { roof_area: roofArea },
      timberM, 'm', input.wastage.timber)
  );
  materials.push(matLine('Timber', 'm', timberM, input.wastage.timber, input.prices.timber_per_m, input.prices.price_source));

  // Roofing screws (approx 10 per sheet)
  const screwCount = sheetCount * 10;
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

  // Group similar items (e.g., "Cement (blinding)" + "Cement (foundation)" → "Cement")
  const cementTotal = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('cement'))
    .reduce((s, m) => s + m.total_quantity, 0);
  const cementCost = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('cement'))
    .reduce((s, m) => s + m.total_cost, 0);
  const sandTotal = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('sand'))
    .reduce((s, m) => s + m.total_quantity, 0);
  const sandCost = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('sand'))
    .reduce((s, m) => s + m.total_cost, 0);
  const graniteTotal = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('granite'))
    .reduce((s, m) => s + m.total_quantity, 0);
  const graniteCost = [...map.values()]
    .filter(m => m.label.toLowerCase().includes('granite'))
    .reduce((s, m) => s + m.total_cost, 0);

  // Remove individual cement/sand/granite entries, add consolidated
  const consolidated: ConsolidatedMaterial[] = [];
  if (cementTotal > 0) {
    consolidated.push({
      label: 'Cement',
      unit: 'bags',
      total_quantity: round(cementTotal),
      unit_price: 0, // varies — show total cost instead
      total_cost: round(cementCost),
      stages: ['All stages'],
    });
  }
  if (sandTotal > 0) {
    consolidated.push({
      label: 'Sharp Sand',
      unit: 'm³',
      total_quantity: round(sandTotal),
      unit_price: 0,
      total_cost: round(sandCost),
      stages: ['All stages'],
    });
  }
  if (graniteTotal > 0) {
    consolidated.push({
      label: 'Granite',
      unit: 'm³',
      total_quantity: round(graniteTotal),
      unit_price: 0,
      total_cost: round(graniteCost),
      stages: ['All stages'],
    });
  }

  // Add non-consolidated items
  for (const [key, val] of map) {
    if (!key.toLowerCase().includes('cement') &&
        !key.toLowerCase().includes('sand') &&
        !key.toLowerCase().includes('granite')) {
      consolidated.push(val);
    }
  }

  return consolidated;
}

// ── Confidence assessment ──

function assessConfidence(input: BuildToRoofInput): { level: ConfidenceLevel; reason: string } {
  const hasDrawing = !!input.drawing_analysis?.confirmed.building_length;
  const hasStructural = input.has_engineer_schedule && input.structural_members.length > 0;

  if (hasDrawing && hasStructural) {
    return {
      level: 'high',
      reason: 'Dimensioned drawings and engineer-supplied structural schedule provided. Quantities derived from confirmed dimensions and verified structural inputs.',
    };
  }

  if (hasDrawing || (input.building_length > 0 && input.building_width > 0 && input.internal_wall_length > 0)) {
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
  const stages: StageResult[] = [];

  stages.push(calcSiteAndFoundation(input));
  stages.push(calcGroundFloor(input));
  stages.push(calcWalls(input));
  stages.push(calcStructuralFrame(input));
  stages.push(calcRoofing(input));

  const shoppingList = consolidateMaterials(stages);

  const materialsTotal = stages.reduce((s, stage) => s + stage.materials_total, 0);
  const labourTotal = stages.reduce((s, stage) => s + stage.labour_total, 0);

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
    `Concrete mix ratio: ${input.concrete_mix_cement}:${input.concrete_mix_sand}:${input.concrete_mix_aggregate} (cement:sand:aggregate)`,
    `Mortar mix ratio: ${input.mortar_mix_cement}:${input.mortar_mix_sand} (cement:sand)`,
    `Block size: ${input.block_length}mm × ${input.block_height}mm × ${input.block_width}mm`,
    `Foundation type: ${input.foundation_type}`,
    `Roof type: ${input.roof_type} at ${input.roof_pitch_degrees}° pitch`,
    `Wall height: ${input.floor_to_floor_height}m per floor, ${input.number_of_floors} floor(s)`,
    `Blinding thickness: ${input.blinding_thickness}m`,
    `Hardcore thickness: ${input.hardcore_thickness}m`,
    `Prices as of: ${input.prices.price_date} (${input.prices.price_source})`,
  ];

  const limitations: string[] = [
    'This estimate stops at the Build-to-Roof stage. It does NOT include plastering, painting, screeding, tiling, POP/ceiling finishing, doors, windows, plumbing, electrical, or other finishing works.',
    'Doors and windows are used only as wall opening deductions. Their purchase and installation costs are NOT included.',
    'Structural member sizes (columns, beams, slabs, reinforcement) must be verified by a qualified structural engineer. This tool does NOT design or certify structural adequacy.',
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
  granite_per_m3: 95000,
  reinforcement_per_tonne: 1200000,
  binding_wire_per_kg: 2500,
  timber_per_m: 2500,
  roofing_sheet_per_piece: 8500,
  ridge_cap_per_meter: 3500,
  roofing_screws_per_piece: 150,
  fascia_per_meter: 2500,
  dpc_per_meter: 800,
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
  general_labour_per_day: 10000,
  general_labour_days: 5,
};

export const DEFAULT_WASTAGE = {
  blocks: 5,
  cement: 5,
  sand: 10,
  aggregate: 10,
  reinforcement: 3,
  timber: 10,
  roofing_sheets: 5,
};

export const CALCULATOR_TYPE = 'build_to_roof';
