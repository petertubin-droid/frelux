/**
 * FRELUX International Construction Typologies Architecture
 *
 * Modular structural and foundation typologies for all 20 markets.
 * Replaces hardcoded Nigerian sandcrete/concrete defaults with modular typologies.
 *
 * Non-negotiable honesty rules:
 * - Preliminary quantity takeoff, NOT certified structural or civil engineering design.
 * - Requires site-specific engineering inputs (frost depth, soil bearing, seismic zone).
 * - Never claims automatic code compliance or structural safety.
 */

export interface ConstructionTypology {
  id: string;
  marketCodes: string[];
  name: string;
  regionalCategory:
    | "west_african_masonry"
    | "north_american_timber_frame"
    | "british_cavity_wall"
    | "european_masonry_concrete"
    | "asian_rcc_frame"
    | "middle_eastern_concrete"
    | "latin_american_masonry"
    | "general_rcc";
  primaryStructuralSystem: string;
  wallTypology: string;
  foundationTypology: string;
  roofTypology: string;
  applicableStandards: string;
  typicalFramingOrUnitSize: string;
  disclaimer: string;
}

export const CONSTRUCTION_TYPOLOGIES: Record<string, ConstructionTypology> = {
  NG: {
    id: "ng_sandcrete_concrete",
    marketCodes: ["NG", "GH"],
    name: "West African Sandcrete Blockwork & Reinforced Concrete Frame",
    regionalCategory: "west_african_masonry",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete columns, beams, and slab floor plates",
    wallTypology:
      "225 mm (9-inch) external and 150 mm (6-inch) internal hollow sandcrete blocks with 1:4 cement-sand render",
    foundationTypology:
      "Strip foundation in mass concrete or raft foundation on expansive/waterlogged soils",
    roofTypology:
      "Hardwood timber roof trusses (0.45mm / 0.55mm aluminium corrugated or stone-coated step tiles)",
    applicableStandards:
      "Nigerian National Building Code & BS 8110 / Eurocode 2",
    typicalFramingOrUnitSize:
      "450 x 225 x 225 mm sandcrete blocks; 225 x 225 mm RC columns",
    disclaimer:
      "Preliminary material takeoff. Soil bearing capacity and structural member reinforcement must be designed by a registered COREN structural engineer.",
  },
  US: {
    id: "us_light_timber_frame",
    marketCodes: ["US"],
    name: "North American Light-Frame Wood Construction",
    regionalCategory: "north_american_timber_frame",
    primaryStructuralSystem:
      "Platform frame dimension lumber (2x4 / 2x6 studs at 16 in or 24 in o.c.) with engineered wood floor joists / I-joists",
    wallTypology:
      "2x6 exterior walls with OSB/plywood shear sheathing, housewrap (WRB), cavity insulation (R-20+), and 1/2 inch gypsum interior board",
    foundationTypology:
      "Poured concrete basement, ventilated crawlspace, or monolithic slab-on-grade per IRC R403",
    roofTypology:
      "Engineered timber roof trusses with 7/16 inch OSB sheathing, synthetic underlayment, and fiberglass asphalt architectural shingles",
    applicableStandards:
      "International Residential Code (IRC 2024) & IBC / NDS for Wood Construction",
    typicalFramingOrUnitSize:
      "2x6 studs (1.5 x 5.5 in) at 16 in o.c.; 4x8 ft OSB panels",
    disclaimer:
      "Preliminary material takeoff only. Local frost depth, wind exposure, seismic design category, and energy compliance (IECC) dictate actual required sections.",
  },
  CA: {
    id: "ca_light_timber_frame",
    marketCodes: ["CA"],
    name: "Canadian Cold-Climate Light-Frame Wood Construction",
    regionalCategory: "north_american_timber_frame",
    primaryStructuralSystem:
      "Platform-frame lumber with high-performance continuous thermal breaks",
    wallTypology:
      "2x6 wood framing with exterior continuous rigid insulation, 6 mil polyethylene air/vapour barrier, and interior 1/2 inch drywall",
    foundationTypology:
      "Deep frost-protected full basement with perimeter drainage weeping tile per NBC Part 9",
    roofTypology:
      "Engineered high-heel energy trusses allowing uncompressed attic insulation (R-60) with ice-and-water shield eaves protection",
    applicableStandards:
      "National Building Code of Canada (NBC 2020 Part 9 Housing and Small Buildings)",
    typicalFramingOrUnitSize:
      "2x6 studs at 16 in o.c.; continuous R-5/R-10 exterior insulation",
    disclaimer:
      "Preliminary material takeoff only. Cold-climate building envelope and deep frost depth (1.2m - 2.4m+) must comply with provincial building codes (OBC, BCBC, etc.).",
  },
  GB: {
    id: "gb_cavity_brick_block",
    marketCodes: ["GB"],
    name: "British Cavity Wall & Timber Floor Construction",
    regionalCategory: "british_cavity_wall",
    primaryStructuralSystem:
      "Masonry cavity wall (outer facing brick + insulated cavity + inner aerated/aggregate concrete block) or timber frame inner leaf",
    wallTypology:
      "102.5 mm facing brick + 100-150 mm fully filled cavity insulation + 100 mm concrete blockwork with plasterboard on dabs or timber battens",
    foundationTypology:
      "Trench fill or strip footing to Approved Document A/C, minimum 750 mm - 1000 mm depth depending on soil clay shrinkability",
    roofTypology:
      "Treated timber fink trusses or cut roof with breathable sarking membrane, counter-battens, and concrete interlocking or clay roof tiles",
    applicableStandards:
      "Building Regulations 2010 England & Wales (Approved Documents A, C, L) & BS EN 1996 Eurocode 6",
    typicalFramingOrUnitSize:
      "215 x 102.5 x 65 mm facing bricks; 440 x 215 x 100 mm concrete blocks",
    disclaimer:
      "Preliminary material takeoff only. Foundation depth in shrinkable clay soils influenced by nearby trees requires engineer verification.",
  },
  AU: {
    marketCode: "AU",
    id: "au_brick_veneer_timber",
    marketCodes: ["AU"],
    name: "Australian Brick Veneer & Lightweight Timber Framing",
    regionalCategory: "british_cavity_wall",
    primaryStructuralSystem:
      "Timber or light gauge steel structural framing with external masonry non-structural veneer leaf",
    wallTypology:
      "110 mm clay brick veneer leaf + 40-50 mm cavity + 90 mm stud framing with reflective foil laminate (sarking) and plasterboard interior lining",
    foundationTypology:
      "Waffle raft slab (AS 2870) or traditional strip footings with suspended timber floor",
    roofTypology:
      "Prefabricated timber trusses with metal roof battens and corrugated Colorbond steel sheeting or concrete roof tiles",
    applicableStandards:
      "National Construction Code (NCC 2022) Building Code of Australia & AS 1684 / AS 2870",
    typicalFramingOrUnitSize:
      "90 x 45 mm or 70 x 45 mm MGP10 pine studs at 450/600 mm centers; standard 230 x 110 x 76 mm bricks",
    disclaimer:
      "Preliminary material takeoff only. Soil classification per AS 2870 (Class A, S, M, H1, H2, E, P) and wind classification (N1-N4, C1-C4) govern foundation and tie-down design.",
  },
  DE: {
    id: "de_masonry_eurocode",
    marketCodes: ["DE", "FR", "IT"],
    name: "Central European High-Efficiency Masonry & Concrete",
    regionalCategory: "european_masonry_concrete",
    primaryStructuralSystem:
      "Monolithic highly insulating clay block (Porenbeton / Poroton) or sand-lime brick (Kalksandstein) with reinforced concrete floor slabs",
    wallTypology:
      "365 mm monolithic insulating clay block or 175 mm Kalksandstein with 160 mm external thermal insulation composite system (WDVS)",
    foundationTypology:
      "Insulated concrete basement (Weiße Wanne waterproof tub) or frost-skirted insulated slab-on-grade (Bodenplatte)",
    roofTypology:
      "Rafter roof (Pfettendach/Sparrendach) with timber I-joists, on-roof insulation (Aufsparrendämmung), and ceramic clay pantiles",
    applicableStandards:
      "Eurocode 2 (DIN EN 1992), Eurocode 6 (DIN EN 1996) & Gebäudeenergiegesetz (GEG)",
    typicalFramingOrUnitSize:
      "248 x 365 x 249 mm Poroton blocks with thin-bed mortar (Dünnbettmörtel)",
    disclaimer:
      "Preliminary material takeoff only. Thermal envelope and structural statics calculation (Statik) must be prepared by a licensed structural engineer (Tragwerksplaner).",
  },
  IN: {
    id: "in_brick_rcc_frame",
    marketCodes: ["IN"],
    name: "Indian Reinforced Concrete Frame with Infill Masonry",
    regionalCategory: "asian_rcc_frame",
    primaryStructuralSystem:
      "Ductile moment-resisting RC frame (columns, plinth beams, tie beams, and 125-150 mm cast-in-place slabs)",
    wallTypology:
      "230 mm (9-inch) burnt clay brickwork or 200 mm AAC (Autoclaved Aerated Concrete) blockwork with 1:6 cement-sand plaster",
    foundationTypology:
      "Isolated RC spread footings with connected plinth beams, or pile foundation in black cotton expansive soils",
    roofTypology:
      "Cast-in-situ RC flat slab with waterproofing membrane, brick bat coba screed, and China mosaic reflective tiles",
    applicableStandards:
      "IS 456:2000 (Plain and Reinforced Concrete), IS 13920 (Ductile Detailing) & IS 1893 (Seismic Criteria)",
    typicalFramingOrUnitSize:
      "230 x 450 mm RC beams, 230 x 300 mm columns; 600 x 200 x 150/200 mm AAC blocks",
    disclaimer:
      "Preliminary material takeoff only. Black cotton soil SBC and seismic zone (Zone II to V per IS 1893) require certified structural design.",
  },
};

export function getConstructionTypology(
  marketCode: string,
): ConstructionTypology {
  const upper = marketCode.toUpperCase();
  if (CONSTRUCTION_TYPOLOGIES[upper]) {
    return CONSTRUCTION_TYPOLOGIES[upper];
  }
  for (const typology of Object.values(CONSTRUCTION_TYPOLOGIES)) {
    if (typology.marketCodes.includes(upper)) {
      return typology;
    }
  }
  // Default localized typology for remaining markets
  return {
    id: `${upper.toLowerCase()}_regional_typology`,
    marketCodes: [upper],
    name: `${upper} Local Construction Practice`,
    regionalCategory: "general_rcc",
    primaryStructuralSystem:
      "Reinforced concrete frame / load-bearing masonry according to local construction methods",
    wallTypology:
      "Standard localized masonry or modular wall system with rendered or drylined finish",
    foundationTypology:
      "Reinforced strip footings or pad footings designed for local ground conditions and frost line",
    roofTypology:
      "Pitched or flat roof system suited to local climatic rainfall and thermal loading",
    applicableStandards:
      "National Building Code & Applicable Structural Standards",
    typicalFramingOrUnitSize:
      "Standard local modular masonry units or framing members",
    disclaimer:
      "Preliminary material takeoff only. Geotechnical soil testing and structural design calculations are mandatory prior to construction.",
  };
}
