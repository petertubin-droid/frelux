/**
 * FRELUX Dedicated Regional Building Typology Assemblies
 *
 * Provides specialized, deterministic material takeoff models for non-RC typologies:
 * 1. North American Light Timber Framing (IRC 2024 / NDS Wood Construction)
 * 2. Light Gauge Cold-Formed Steel (CFS) Framing (AISI S100 / AS/NZS 4600)
 * 3. European Insulated Cavity Wall (BS EN 1996 Eurocode 6 / UK Approved Doc A, C, L)
 *
 * Complements the baseline West African / RCC frame & block infill model
 * with transparent formulas, explicit wastage factors, and standard specifications.
 */

export type StructuralTypologyType =
  | "rc_frame_block_infill"
  | "north_american_timber"
  | "light_gauge_steel"
  | "european_cavity_wall";

export interface TypologyAssemblyInput {
  typology: StructuralTypologyType;
  market_code?: string;
  building_length_m: number;
  building_width_m: number;
  floor_to_floor_height_m: number;
  number_of_floors: number;
  internal_wall_length_m?: number;
  openings_area_m2?: number;
  openings_count?: number;
  roof_slope_deg?: number;
  timber_stud_size?: "2x4" | "2x6";
  stud_spacing_inches?: 16 | 24;
  stud_spacing_mm?: 400 | 600;
  custom_waste_percent?: number;
}

export interface TypologyAssemblyMaterialItem {
  id: string;
  category:
    | "framing"
    | "sheathing"
    | "insulation"
    | "masonry"
    | "weatherproofing"
    | "lining"
    | "fasteners"
    | "lintels_accessories";
  name: string;
  specification: string;
  base_quantity: number;
  wastage_percent: number;
  final_quantity: number;
  unit: string;
  formula: string;
}

export interface TypologyAssemblyResult {
  typology: StructuralTypologyType;
  assembly_name: string;
  market_code: string;
  applicable_standards: string;
  governing_notes: string[];
  wall_area_gross_m2: number;
  wall_area_net_m2: number;
  floor_area_m2: number;
  roof_area_m2: number;
  materials: TypologyAssemblyMaterialItem[];
  assumptions: string[];
  limitations_notice: string;
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * Resolves the primary structural typology based on regional building traditions.
 */
export function resolveDefaultTypology(
  marketCode?: string,
): StructuralTypologyType {
  const code = (marketCode ?? "NG").trim().toUpperCase();
  if (code === "US" || code === "CA") {
    return "north_american_timber";
  }
  if (code === "GB" || code === "IE" || code === "ZA") {
    return "european_cavity_wall";
  }
  if (code === "AU" || code === "NZ") {
    return "light_gauge_steel";
  }
  return "rc_frame_block_infill";
}

/**
 * North American Light Timber Framing Assembly Takeoff
 * Evaluated under IRC 2024 / NDS specifications for platform framing:
 * - 2x6 exterior studs at 16 in (406 mm) o.c. or 2x4 at 16 in o.c.
 * - Double top plates, single sole/bottom plate
 * - 4x8 ft (1.22 x 2.44 m) 7/16 in OSB sheathing (2.977 m² per sheet)
 * - Continuous weather-resistant barrier (WRB / Housewrap)
 * - Cavity mineral/fiberglass batt insulation (R-20+ for 2x6, R-13 for 2x4)
 * - 1/2 in (12.7 mm) interior gypsum drywall
 * - Engineered wood floor joists & 3/4 in T&G subfloor
 * - Engineered roof trusses at 24 in o.c. with asphalt architectural shingles
 */
function calculateNorthAmericanTimber(
  input: TypologyAssemblyInput,
): TypologyAssemblyResult {
  const length = Math.max(1, input.building_length_m);
  const width = Math.max(1, input.building_width_m);
  const height = Math.max(2.4, input.floor_to_floor_height_m);
  const floors = Math.max(1, Math.round(input.number_of_floors));
  const perimeter = 2 * (length + width);
  const internalWallLen = Math.max(
    0,
    input.internal_wall_length_m ?? perimeter * 0.5,
  );

  const grossWallArea = perimeter * height * floors;
  const openingsArea = Math.min(
    grossWallArea * 0.5,
    Math.max(0, input.openings_area_m2 ?? grossWallArea * 0.15),
  );
  const netWallArea = Math.max(0, grossWallArea - openingsArea);
  const openingsCount = Math.max(
    1,
    input.openings_count ?? Math.ceil(openingsArea / 2.0),
  );

  const floorArea = length * width * floors;
  const pitchRad = ((input.roof_slope_deg ?? 20) * Math.PI) / 180;
  const roofArea = (length * width * 1.15) / Math.cos(pitchRad); // includes 0.45m nominal overhang

  const studSize = input.timber_stud_size ?? "2x6";
  const spacingInches = input.stud_spacing_inches ?? 16;
  const spacingM = spacingInches === 24 ? 0.61 : 0.406;

  // Exterior wall studs: (perimeter / spacing) + 4 corner studs (3 studs each = 12 extra per floor)
  // + 2 king/jack studs per opening
  const baseExtStudsPerFloor =
    Math.ceil(perimeter / spacingM) + 12 + openingsCount * 2;
  const totalExtStuds = baseExtStudsPerFloor * floors;

  // Internal partition studs: 2x4 at 16" o.c. + intersection studs
  const totalIntStuds = (Math.ceil(internalWallLen / 0.406) + 8) * floors;

  // Plates: 3 plates per wall length (1 sole plate + double top plate)
  const extPlatesLinearM = perimeter * 3 * floors;
  const intPlatesLinearM = internalWallLen * 3 * floors;

  // Sheathing: 4x8 ft (1.219 x 2.438 m = 2.973 m² per sheet)
  const OSB_SHEET_M2 = 2.973;
  const wallSheathingSheets = Math.ceil(netWallArea / OSB_SHEET_M2);
  const subfloorSheets = Math.ceil(
    (length * width * Math.max(1, floors - 1)) / OSB_SHEET_M2,
  );
  const roofSheathingSheets = Math.ceil(roofArea / OSB_SHEET_M2);

  // Insulation & drywall
  const insulationM2 = netWallArea;
  const drywallM2 = netWallArea + internalWallLen * height * 2 * floors; // both sides of internal walls

  const waste = input.custom_waste_percent ?? 10;
  const materials: TypologyAssemblyMaterialItem[] = [
    {
      id: "ext_studs",
      category: "framing",
      name: `Exterior Wall Studs (${studSize} SPF/Hem-Fir)`,
      specification: `${studSize} dimensional kiln-dried lumber, grade No.2 or better, length ${height.toFixed(1)} m`,
      base_quantity: totalExtStuds,
      wastage_percent: 5,
      final_quantity: Math.ceil(totalExtStuds * 1.05),
      unit: "pcs",
      formula: `(${perimeter.toFixed(1)}m perimeter / ${spacingInches}" spacing + corner & opening jacks) x ${floors} floors`,
    },
    {
      id: "int_studs",
      category: "framing",
      name: "Interior Partition Studs (2x4 SPF)",
      specification: "2x4 (38x89 mm) kiln-dried framing lumber at 16 in o.c.",
      base_quantity: totalIntStuds,
      wastage_percent: 5,
      final_quantity: Math.ceil(totalIntStuds * 1.05),
      unit: "pcs",
      formula: `(${internalWallLen.toFixed(1)}m internal partition / 0.406m spacing) x ${floors} floors`,
    },
    {
      id: "plates",
      category: "framing",
      name: `Wall Plates (${studSize} / 2x4 Top & Bottom Plates)`,
      specification: "Treated sole plates and double top plates",
      base_quantity: round(extPlatesLinearM + intPlatesLinearM, 1),
      wastage_percent: 10,
      final_quantity: round((extPlatesLinearM + intPlatesLinearM) * 1.1, 1),
      unit: "linear m",
      formula: `3 plates x (${perimeter.toFixed(1)}m ext + ${internalWallLen.toFixed(1)}m int) x ${floors} floors`,
    },
    {
      id: "wall_sheathing",
      category: "sheathing",
      name: "Exterior Wall Sheathing (7/16 in OSB / Plywood)",
      specification:
        "APA-rated 7/16 in (11 mm) OSB or 15/32 in structural-I plywood (4x8 ft)",
      base_quantity: wallSheathingSheets,
      wastage_percent: waste,
      final_quantity: Math.ceil(wallSheathingSheets * (1 + waste / 100)),
      unit: "sheets (4x8 ft)",
      formula: `${round(netWallArea, 1)} m² net exterior wall area / 2.973 m² per sheet`,
    },
    {
      id: "wrb_housewrap",
      category: "weatherproofing",
      name: "Weather-Resistant Barrier (WRB / Housewrap)",
      specification:
        "Spunbonded olefin / polyolefin air-and-water barrier (e.g. Tyvek HomeWrap)",
      base_quantity: round(netWallArea, 1),
      wastage_percent: 12,
      final_quantity: round(netWallArea * 1.12, 1),
      unit: "m²",
      formula: `${round(netWallArea, 1)} m² net exterior wall + 12% lap & corner overlap`,
    },
    {
      id: "cavity_insulation",
      category: "insulation",
      name: `Wall Cavity Insulation (${studSize === "2x6" ? "R-20 Batt" : "R-13 Batt"})`,
      specification: `Faced fiberglass or mineral wool thermal friction-fit batts for ${spacingInches} in o.c. framing`,
      base_quantity: round(insulationM2, 1),
      wastage_percent: 8,
      final_quantity: round(insulationM2 * 1.08, 1),
      unit: "m²",
      formula: `${round(insulationM2, 1)} m² net wall cavity area`,
    },
    {
      id: "interior_drywall",
      category: "lining",
      name: "Interior Gypsum Drywall (1/2 in Board)",
      specification:
        "1/2 in (12.7 mm) tapered edge standard drywall panels (4x8 ft or 4x12 ft)",
      base_quantity: Math.ceil(drywallM2 / OSB_SHEET_M2),
      wastage_percent: 10,
      final_quantity: Math.ceil((drywallM2 / OSB_SHEET_M2) * 1.1),
      unit: "sheets (4x8 ft)",
      formula: `${round(drywallM2, 1)} m² total interior wall surface / 2.973 m² per sheet`,
    },
    {
      id: "roof_trusses",
      category: "framing",
      name: "Engineered Timber Roof Trusses (24 in o.c.)",
      specification:
        "Gang-nail pre-engineered timber roof trusses designed for regional snow & wind loads",
      base_quantity: Math.ceil(length / 0.61) + 1,
      wastage_percent: 0,
      final_quantity: Math.ceil(length / 0.61) + 1,
      unit: "pcs",
      formula: `${length.toFixed(1)}m building length / 0.61m (24") truss centers + 1 gable end`,
    },
    {
      id: "roof_sheathing",
      category: "sheathing",
      name: "Roof Deck Sheathing (7/16 in OSB with H-Clips)",
      specification:
        "7/16 in APA Rated Sheathing with edge support panel clips",
      base_quantity: roofSheathingSheets,
      wastage_percent: waste,
      final_quantity: Math.ceil(roofSheathingSheets * (1 + waste / 100)),
      unit: "sheets (4x8 ft)",
      formula: `${round(roofArea, 1)} m² roof surface / 2.973 m² per sheet`,
    },
    {
      id: "asphalt_shingles",
      category: "weatherproofing",
      name: "Architectural Fiberglass Asphalt Shingles",
      specification:
        "Class A fire-rated architectural laminated shingles (3 bundles = 1 square = 100 sq ft / 9.29 m²)",
      base_quantity: round(roofArea / 9.29, 1),
      wastage_percent: 10,
      final_quantity: round((roofArea / 9.29) * 1.1, 1),
      unit: "squares (100 sq ft)",
      formula: `${round(roofArea, 1)} m² roof area / 9.29 m² per square + 10% starter/hip/ridge waste`,
    },
    {
      id: "structural_fasteners",
      category: "fasteners",
      name: "Framing Fasteners & Hurricane Ties",
      specification:
        "16d common galvanized nails (studs/plates), 8d ring-shank nails (sheathing), H2.5A hurricane ties",
      base_quantity: totalExtStuds + totalIntStuds,
      wastage_percent: 10,
      final_quantity: Math.ceil((totalExtStuds + totalIntStuds) * 1.1),
      unit: "connectors & sets",
      formula: `1 tie/clip connection per rafter/stud load path`,
    },
  ];

  return {
    typology: "north_american_timber",
    assembly_name: "North American Light-Frame Wood Construction (IRC 2024)",
    market_code: input.market_code ?? "US",
    applicable_standards:
      "IRC 2024 (R602 Wall Construction), IBC 2024, NDS for Wood Construction",
    governing_notes: [
      `Framing modeled with ${studSize} studs at ${spacingInches} in on-center.`,
      "Wall sheathing provides lateral shear resistance; panel nail spacing must follow structural plan.",
      "Vapor retarder and cavity insulation must be verified against local ASHRAE 90.1 / IECC climate zone (Zones 1-8).",
    ],
    wall_area_gross_m2: round(grossWallArea, 2),
    wall_area_net_m2: round(netWallArea, 2),
    floor_area_m2: round(floorArea, 2),
    roof_area_m2: round(roofArea, 2),
    materials,
    assumptions: [
      `Exterior framing: ${studSize} kiln-dried lumber at ${spacingInches}" o.c. with double top plate.`,
      `Interior partitions: 2x4 framing at 16" o.c.`,
      `Roof structure: engineered trusses at 24" o.c. with 7/16" OSB roof deck and architectural shingles.`,
    ],
    limitations_notice:
      "Preliminary material takeoff. Shear wall schedules, hold-downs, header spans, and hurricane/seismic tie-downs must be verified by a licensed structural engineer.",
  };
}

/**
 * Light Gauge Cold-Formed Steel (CFS) Framing Assembly Takeoff
 * Evaluated under AISI S100 / AS/NZS 4600 / Eurocode 3 Part 1-3:
 * - Structural C-studs (e.g. 600S162-43 or 350S162-33) at 400 mm or 600 mm o.c.
 * - U-tracks (runners) top and bottom
 * - External cementitious / fiber-cement sheathing
 * - Mineral wool acoustic/thermal cavity insulation
 * - Fire-rated Type X gypsum board interior lining
 * - Self-drilling framing screws and hold-down brackets
 */
function calculateLightGaugeSteel(
  input: TypologyAssemblyInput,
): TypologyAssemblyResult {
  const length = Math.max(1, input.building_length_m);
  const width = Math.max(1, input.building_width_m);
  const height = Math.max(2.4, input.floor_to_floor_height_m);
  const floors = Math.max(1, Math.round(input.number_of_floors));
  const perimeter = 2 * (length + width);
  const internalWallLen = Math.max(
    0,
    input.internal_wall_length_m ?? perimeter * 0.5,
  );

  const grossWallArea = perimeter * height * floors;
  const openingsArea = Math.min(
    grossWallArea * 0.5,
    Math.max(0, input.openings_area_m2 ?? grossWallArea * 0.15),
  );
  const netWallArea = Math.max(0, grossWallArea - openingsArea);
  const openingsCount = Math.max(
    1,
    input.openings_count ?? Math.ceil(openingsArea / 2.0),
  );

  const floorArea = length * width * floors;
  const pitchRad = ((input.roof_slope_deg ?? 15) * Math.PI) / 180;
  const roofArea = (length * width * 1.1) / Math.cos(pitchRad);

  const spacingM = (input.stud_spacing_mm ?? 400) / 1000;

  // Steel C-stud count: perimeter / spacing + corner assemblies (3 studs each) + jamb studs at openings
  const baseExtStuds = Math.ceil(perimeter / spacingM) + 12 + openingsCount * 2;
  const totalExtStuds = baseExtStuds * floors;
  const totalIntStuds = (Math.ceil(internalWallLen / 0.45) + 8) * floors;

  // U-tracks: 1 top track + 1 bottom track per wall run
  const extTrackLinearM = perimeter * 2 * floors;
  const intTrackLinearM = internalWallLen * 2 * floors;

  const BOARD_SHEET_M2 = 2.88; // 1200 x 2400 mm standard panel
  const extSheathingPanels = Math.ceil(netWallArea / BOARD_SHEET_M2);
  const intDrywallPanels = Math.ceil(
    (netWallArea + internalWallLen * height * 2 * floors) / BOARD_SHEET_M2,
  );

  const waste = input.custom_waste_percent ?? 8;
  const materials: TypologyAssemblyMaterialItem[] = [
    {
      id: "cfs_ext_studs",
      category: "framing",
      name: "Light Gauge Steel C-Studs (Exterior Structural)",
      specification:
        "Cold-formed galvanized steel C-section (G550 / Z275, 89x41x0.75mm or 150x45x1.0mm)",
      base_quantity: totalExtStuds,
      wastage_percent: 5,
      final_quantity: Math.ceil(totalExtStuds * 1.05),
      unit: "pcs",
      formula: `(${perimeter.toFixed(1)}m perimeter / ${spacingM}m spacing + jambs & corners) x ${floors} floors`,
    },
    {
      id: "cfs_int_studs",
      category: "framing",
      name: "Light Gauge Steel C-Studs (Interior Non-Bearing)",
      specification:
        "Drywall steel C-studs (0.55mm BMT, 64x34mm at 450mm centers)",
      base_quantity: totalIntStuds,
      wastage_percent: 5,
      final_quantity: Math.ceil(totalIntStuds * 1.05),
      unit: "pcs",
      formula: `(${internalWallLen.toFixed(1)}m internal partition / 0.45m spacing) x ${floors} floors`,
    },
    {
      id: "cfs_tracks",
      category: "framing",
      name: "Steel U-Tracks / Runners (Top & Bottom)",
      specification:
        "Galvanized deflection tracks and bottom runners with pre-punched fastener slots",
      base_quantity: round(extTrackLinearM + intTrackLinearM, 1),
      wastage_percent: 8,
      final_quantity: round((extTrackLinearM + intTrackLinearM) * 1.08, 1),
      unit: "linear m",
      formula: `2 tracks x (${perimeter.toFixed(1)}m ext + ${internalWallLen.toFixed(1)}m int) x ${floors} floors`,
    },
    {
      id: "fiber_cement_sheathing",
      category: "sheathing",
      name: "Exterior Fiber-Cement / Rigid Sheathing Board",
      specification:
        "9 mm to 12 mm autoclave-cured non-combustible fiber-cement structural lining (1200x2400 mm)",
      base_quantity: extSheathingPanels,
      wastage_percent: waste,
      final_quantity: Math.ceil(extSheathingPanels * (1 + waste / 100)),
      unit: "panels (1.2x2.4m)",
      formula: `${round(netWallArea, 1)} m² net exterior wall / 2.88 m² per panel`,
    },
    {
      id: "cfs_cavity_insulation",
      category: "insulation",
      name: "Non-Combustible Mineral Wool Cavity Insulation",
      specification:
        "High-density rockwool / stone wool thermal-acoustic friction-fit slab (A1 non-combustible)",
      base_quantity: round(netWallArea, 1),
      wastage_percent: 6,
      final_quantity: round(netWallArea * 1.06, 1),
      unit: "m²",
      formula: `${round(netWallArea, 1)} m² net stud cavity area`,
    },
    {
      id: "cfs_interior_lining",
      category: "lining",
      name: "Interior Fire-Rated Gypsum Board (Type X)",
      specification:
        "13 mm / 16 mm fire-rated gypsum board with fiberglass core reinforcing (1200x2400 mm)",
      base_quantity: intDrywallPanels,
      wastage_percent: 10,
      final_quantity: Math.ceil(intDrywallPanels * 1.1),
      unit: "panels (1.2x2.4m)",
      formula: `Total interior wall faces / 2.88 m² per panel`,
    },
    {
      id: "cfs_fasteners",
      category: "fasteners",
      name: "Self-Drilling Framing & Drywall Screws",
      specification:
        "Zinc-plated No. 8 & No. 10 self-drilling wafer-head framing screws and bugle-head drywall screws",
      base_quantity: round((totalExtStuds + totalIntStuds) * 12, 0),
      wastage_percent: 15,
      final_quantity: Math.ceil((totalExtStuds + totalIntStuds) * 12 * 1.15),
      unit: "screws",
      formula: `~12 structural screws per stud connection point + 15% allowance`,
    },
  ];

  return {
    typology: "light_gauge_steel",
    assembly_name:
      "Cold-Formed Light Gauge Steel (CFS) Framing (AISI / AS 4600)",
    market_code: input.market_code ?? "AU",
    applicable_standards:
      "AISI S100-16 / AS/NZS 4600 / Eurocode 3 (EN 1993-1-3)",
    governing_notes: [
      "Light gauge cold-formed steel framing provides high strength-to-weight ratio and dimensional stability.",
      "Thermal bridge mitigation (thermal break strips on exterior flange) is critical to prevent condensation.",
      "Fasteners must be approved self-drilling screws with appropriate corrosion-protective coating.",
    ],
    wall_area_gross_m2: round(grossWallArea, 2),
    wall_area_net_m2: round(netWallArea, 2),
    floor_area_m2: round(floorArea, 2),
    roof_area_m2: round(roofArea, 2),
    materials,
    assumptions: [
      `C-Stud spacing: ${(spacingM * 1000).toFixed(0)} mm on-center for exterior walls.`,
      "Interior partition studs: 64mm steel studs at 450mm centers.",
      "Exterior envelope: fiber-cement board + rockwool insulation + Type X interior lining.",
    ],
    limitations_notice:
      "Preliminary material takeoff. Axial capacity, wind uplift hold-downs, lintel box sections, and diagonal strap bracing must be calculated by a certified structural engineer.",
  };
}

/**
 * European Insulated Cavity Wall Assembly Takeoff
 * Evaluated under BS EN 1996 Eurocode 6 / UK Building Regulations Approved Doc A, C, L:
 * - Outer leaf: Facing bricks (215 x 102.5 x 65 mm) at ~60 bricks/m² with 10 mm mortar
 * - Cavity: 100-150 mm rigid PIR/PUR cavity insulation batts
 * - Stainless steel wall ties (BS EN 845-1) at 2.5 ties/m² + opening perimeter ties
 * - Inner leaf: Thermal aggregate or aircrete blocks (440 x 215 x 100 mm) at ~10 blocks/m²
 * - Thermally broken steel lintels & cavity trays with weep vents
 * - DPC polythene barrier at base of masonry
 */
function calculateEuropeanCavityWall(
  input: TypologyAssemblyInput,
): TypologyAssemblyResult {
  const length = Math.max(1, input.building_length_m);
  const width = Math.max(1, input.building_width_m);
  const height = Math.max(2.4, input.floor_to_floor_height_m);
  const floors = Math.max(1, Math.round(input.number_of_floors));
  const perimeter = 2 * (length + width);
  const internalWallLen = Math.max(
    0,
    input.internal_wall_length_m ?? perimeter * 0.4,
  );

  const grossWallArea = perimeter * height * floors;
  const openingsArea = Math.min(
    grossWallArea * 0.5,
    Math.max(0, input.openings_area_m2 ?? grossWallArea * 0.15),
  );
  const netWallArea = Math.max(0, grossWallArea - openingsArea);
  const openingsCount = Math.max(
    1,
    input.openings_count ?? Math.ceil(openingsArea / 2.0),
  );

  const floorArea = length * width * floors;
  const pitchRad = ((input.roof_slope_deg ?? 30) * Math.PI) / 180;
  const roofArea = (length * width * 1.15) / Math.cos(pitchRad);

  // Outer leaf: standard UK brick (215x102.5x65mm).
  // Nominal face including 10mm mortar = 0.225 x 0.075 = 0.016875 m² -> 59.26 ~ 60 bricks/m²
  const BRICKS_PER_M2 = 60;
  const outerBricks = Math.ceil(netWallArea * BRICKS_PER_M2);

  // Inner leaf: standard UK/European block (440x215x100mm).
  // Nominal face including 10mm mortar = 0.450 x 0.225 = 0.10125 m² -> 9.88 ~ 10 blocks/m²
  const BLOCKS_PER_M2 = 10;
  const innerBlocks = Math.ceil(netWallArea * BLOCKS_PER_M2);
  const internalPartitionBlocks = Math.ceil(
    internalWallLen * height * floors * BLOCKS_PER_M2,
  );

  // Wall ties: BS EN 845-1 / Approved Doc A: 2.5 ties/m² in general area +
  // 3 ties per vertical metre of opening jambs
  const openingPerimeterTies = openingsCount * 2 * height * 3;
  const totalWallTies = Math.ceil(grossWallArea * 2.5 + openingPerimeterTies);

  // Insulation: PIR/PUR rigid cavity insulation board (100mm to 150mm)
  const cavityInsulationM2 = netWallArea;

  // DPC membrane: linear perimeter x floors
  const dpcLinearM = perimeter * (floors + 1);

  // Mortar: approx 0.045 m³ per m² of brickwork + 0.012 m³ per m² of blockwork
  const brickMortarM3 = netWallArea * 0.045;
  const blockMortarM3 =
    (netWallArea + internalWallLen * height * floors) * 0.012;
  const totalMortarM3 = brickMortarM3 + blockMortarM3;

  const waste = input.custom_waste_percent ?? 5;
  const materials: TypologyAssemblyMaterialItem[] = [
    {
      id: "facing_bricks",
      category: "masonry",
      name: "Outer Leaf Facing Bricks (215x102.5x65 mm)",
      specification:
        "Clay facing bricks to BS EN 771-1, F2 frost-resistant, S2 active soluble salts",
      base_quantity: outerBricks,
      wastage_percent: waste,
      final_quantity: Math.ceil(outerBricks * (1 + waste / 100)),
      unit: "bricks",
      formula: `${round(netWallArea, 1)} m² net outer leaf x 60 bricks/m²`,
    },
    {
      id: "inner_leaf_blocks",
      category: "masonry",
      name: "Inner Leaf Thermal Concrete Blocks (440x215x100 mm)",
      specification:
        "Aircrete / aerated autoclaved concrete (AAC) blocks (3.6 N/mm² or 7.3 N/mm², lambda 0.11 W/mK)",
      base_quantity: innerBlocks,
      wastage_percent: waste,
      final_quantity: Math.ceil(innerBlocks * (1 + waste / 100)),
      unit: "blocks",
      formula: `${round(netWallArea, 1)} m² net inner leaf x 10 blocks/m²`,
    },
    {
      id: "internal_partition_blocks",
      category: "masonry",
      name: "Internal Load-Bearing Partition Blocks (100 mm)",
      specification:
        "Solid dense or medium-dense aggregate concrete blocks to BS EN 771-3",
      base_quantity: internalPartitionBlocks,
      wastage_percent: waste,
      final_quantity: Math.ceil(internalPartitionBlocks * (1 + waste / 100)),
      unit: "blocks",
      formula: `${(internalWallLen * height * floors).toFixed(1)} m² internal walls x 10 blocks/m²`,
    },
    {
      id: "cavity_insulation_boards",
      category: "insulation",
      name: "PIR Rigid Cavity Wall Insulation Boards (100-120 mm)",
      specification:
        "Foil-faced polyisocyanurate (PIR) rigid foam insulation (thermal conductivity 0.022 W/mK)",
      base_quantity: round(cavityInsulationM2, 1),
      wastage_percent: 7,
      final_quantity: round(cavityInsulationM2 * 1.07, 1),
      unit: "m²",
      formula: `${round(netWallArea, 1)} m² net cavity area + 7% cutting waste`,
    },
    {
      id: "stainless_wall_ties",
      category: "lintels_accessories",
      name: "Stainless Steel Cavity Wall Ties (BS EN 845-1 Type 2)",
      specification:
        "Grade 304/A2 stainless steel double-triangle or cavity ties with drip and insulation retaining clips",
      base_quantity: totalWallTies,
      wastage_percent: 5,
      final_quantity: Math.ceil(totalWallTies * 1.05),
      unit: "ties & clips",
      formula: `${round(grossWallArea, 1)} m² x 2.5/m² + opening jamb ties`,
    },
    {
      id: "dpc_membrane",
      category: "weatherproofing",
      name: "Damp Proof Course (DPC Polythene Roll 100/225 mm)",
      specification:
        "Embossed polyethylene DPC to BS 6515 / CE marked for masonry bed joints",
      base_quantity: round(dpcLinearM, 1),
      wastage_percent: 10,
      final_quantity: round(dpcLinearM * 1.1, 1),
      unit: "linear m",
      formula: `${perimeter.toFixed(1)}m perimeter x ${floors + 1} courses (dpc, cavity trays, cills)`,
    },
    {
      id: "masonry_mortar",
      category: "masonry",
      name: "Masonry Bedding Mortar (Designation iii / M4)",
      specification:
        "1:1:6 cement-lime-sand or 1:4 cement-sand with plasticiser (BS EN 998-2)",
      base_quantity: round(totalMortarM3, 2),
      wastage_percent: 10,
      final_quantity: round(totalMortarM3 * 1.1, 2),
      unit: "m³ wet mortar",
      formula: `(0.045 m³/m² brickwork + 0.012 m³/m² blockwork) x wall areas`,
    },
    {
      id: "insulated_steel_lintels",
      category: "lintels_accessories",
      name: "Thermally Broken Insulated Steel Cavity Lintels",
      specification:
        "Post-galvanized or composite stainless/galvanized cavity lintel with built-in thermal break & plaster key",
      base_quantity: openingsCount,
      wastage_percent: 0,
      final_quantity: openingsCount,
      unit: "units",
      formula: `1 lintel per window and external door opening (${openingsCount} openings)`,
    },
    {
      id: "cavity_trays_weeps",
      category: "lintels_accessories",
      name: "Preformed Cavity Trays & Acoustic/Perp Weep Vents",
      specification:
        "Polypropylene stepped cavity trays and perp-end weep vents (minimum 2 weeps per opening)",
      base_quantity: openingsCount * 2,
      wastage_percent: 5,
      final_quantity: Math.ceil(openingsCount * 2 * 1.05),
      unit: "weep vents",
      formula: `2 weep vents minimum per cavity tray over each opening`,
    },
  ];

  return {
    typology: "european_cavity_wall",
    assembly_name:
      "British & European Insulated Cavity Wall (Eurocode 6 / Approved Doc A, C, L)",
    market_code: input.market_code ?? "GB",
    applicable_standards:
      "BS EN 1996 (Eurocode 6 Design of Masonry), Building Regulations England & Wales Approved Doc A, C, L",
    governing_notes: [
      "Traditional two-leaf cavity wall construction with separated outer weather screen and inner loadbearing thermal leaf.",
      "Outer brickwork (102.5 mm) tied to inner aircrete blockwork (100 mm) across 100-150 mm insulated cavity.",
      "Stainless steel cavity ties must carry water drips pointing downward in the center of the cavity.",
    ],
    wall_area_gross_m2: round(grossWallArea, 2),
    wall_area_net_m2: round(netWallArea, 2),
    floor_area_m2: round(floorArea, 2),
    roof_area_m2: round(roofArea, 2),
    materials,
    assumptions: [
      "Outer leaf: facing bricks (60/m²) in 1:1:6 or 1:4 mortar.",
      "Cavity: 100-120mm foil-faced PIR insulation with stainless steel wall ties at 2.5 ties/m².",
      "Inner leaf: 100mm thermal lightweight/aerated concrete blocks (10/m²).",
      "Openings provided with thermally broken steel cavity lintels and weep-vented cavity trays.",
    ],
    limitations_notice:
      "Preliminary material takeoff. Lateral wind load restraint, movement joint spacing (typically max 12m for clay brick, 6m for concrete block), and structural lintel bearing lengths must be confirmed with structural drawings.",
  };
}

/**
 * Universal dispatcher for building typology assemblies
 */
export function calculateTypologyAssembly(
  input: TypologyAssemblyInput,
): TypologyAssemblyResult {
  const typology = input.typology ?? resolveDefaultTypology(input.market_code);

  switch (typology) {
    case "north_american_timber":
      return calculateNorthAmericanTimber(input);
    case "light_gauge_steel":
      return calculateLightGaugeSteel(input);
    case "european_cavity_wall":
      return calculateEuropeanCavityWall(input);
    case "rc_frame_block_infill":
    default:
      // When default RC is requested through the typology engine, wrap baseline metrics
      return {
        typology: "rc_frame_block_infill",
        assembly_name:
          "Reinforced Concrete Frame with Masonry Infill (Baseline)",
        market_code: input.market_code ?? "NG",
        applicable_standards:
          "Nigerian National Building Code / BS 8110 / Eurocode 2",
        governing_notes: [
          "Standard reinforced concrete column-and-beam skeletal frame with infill sandcrete/concrete block walls.",
          "Processed via core build-to-roof takeoff engine.",
        ],
        wall_area_gross_m2: round(
          2 *
            (input.building_length_m + input.building_width_m) *
            input.floor_to_floor_height_m *
            input.number_of_floors,
          2,
        ),
        wall_area_net_m2: round(
          2 *
            (input.building_length_m + input.building_width_m) *
            input.floor_to_floor_height_m *
            input.number_of_floors -
            (input.openings_area_m2 ?? 0),
          2,
        ),
        floor_area_m2: round(
          input.building_length_m *
            input.building_width_m *
            input.number_of_floors,
          2,
        ),
        roof_area_m2: round(
          input.building_length_m * input.building_width_m * 1.15,
          2,
        ),
        materials: [],
        assumptions: [
          "Handled by primary calculateBuildToRoof engine for RC framing, sandcrete blocks, and timber truss takeoff.",
        ],
        limitations_notice:
          "Baseline preliminary takeoff for RC frame + block infill. Refer to main build-to-roof schedule for itemized breakdown.",
      };
  }
}
