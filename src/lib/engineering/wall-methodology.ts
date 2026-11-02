/**
 * Market-scoped wall methodology profiles for the sequence planner.
 *
 * Each profile describes the load-bearing wall system that is standard
 * practice in a market, with the source that verifies it. Profiles marked
 * verified=false are generic masonry placeholders that MUST be disclosed
 * to users as unverified for that market (never silently treated as
 * Nigerian practice).
 */

export interface WallComponent {
  /** Human description used directly in plan text. */
  description: string;
  /** Nominal thickness in mm where meaningful (0 = n/a for frame walls). */
  thicknessMm: number;
  /** Unit label for materials lists. */
  unitLabel: string;
}

export interface WallMethodologyProfile {
  marketCode: string;
  /** Wall system from footing to DPC level. */
  foundationWall: WallComponent;
  /** External/load-bearing wall above DPC. */
  externalWall: WallComponent;
  /** Internal partition wall. */
  partitionWall: WallComponent;
  /** Optional framing note for frame-based markets. */
  framingNote: string | null;
  /** One-line methodology summary. */
  methodSummary: string;
  /** Provenance. */
  source: string;
  verified: boolean;
  confidence: "verified" | "industry_standard" | "pending_verification";
}

const NG_PROFILE: WallMethodologyProfile = {
  marketCode: "NG",
  foundationWall: {
    description: "9-inch (225mm) hollow sandcrete blocks, the standard for Nigerian foundation walls",
    thicknessMm: 225,
    unitLabel: "9-inch hollow blocks (225mm), mandatory for foundations",
  },
  externalWall: {
    description: "9-inch (225mm) hollow sandcrete blocks for external load-bearing walls",
    thicknessMm: 225,
    unitLabel: "9-inch hollow blocks (external load-bearing walls)",
  },
  partitionWall: {
    description: "6-inch (150mm) blocks for internal non-load-bearing partitions",
    thicknessMm: 150,
    unitLabel: "6-inch blocks (internal partitions, hollow or solid)",
  },
  framingNote: null,
  methodSummary: "Hollow sandcrete blockwork with RC columns and lintels",
  source: "Established Frelux NG methodology baseline (verified through NG supplier price books)",
  verified: true,
  confidence: "verified",
};

const PROFILES: Record<string, WallMethodologyProfile> = {
  NG: NG_PROFILE,
  US: {
    marketCode: "US",
    foundationWall: {
      description: "8-inch (203mm) CMU on spread footings, or poured concrete foundation walls",
      thicknessMm: 203,
      unitLabel: "8-inch CMU (203mm) or cast-in-place concrete foundation wall",
    },
    externalWall: {
      description: "8-inch (203mm) CMU load-bearing walls; wood-frame construction is the residential norm",
      thicknessMm: 203,
      unitLabel: "8-inch CMU (203mm) or lumber framing per design",
    },
    partitionWall: {
      description: "4-inch (102mm) CMU or wood/metal stud partitions",
      thicknessMm: 102,
      unitLabel: "4-inch CMU (102mm) or stud framing",
    },
    framingNote: "Most US homes are light wood-frame; masonry is typical for foundations and fire walls",
    methodSummary: "CMU/poured foundations with wood-frame superstructure",
    source: "CMU standard face 8x16 in, thicknesses 4-16 in (bartleby civil engineering; up.codes 722.3)",
    verified: true,
    confidence: "verified",
  },
  GB: {
    marketCode: "GB",
    foundationWall: {
      description: "Strip footing with 215mm blockwork inner leaf up to DPC",
      thicknessMm: 215,
      unitLabel: "215mm solid blockwork inner leaf to DPC",
    },
    externalWall: {
      description: "Cavity wall: 102.5mm facing brick outer leaf + 100mm block inner leaf with 50-75mm cavity",
      thicknessMm: 275,
      unitLabel: "102.5mm facing brick + 100mm block + cavity insulation",
    },
    partitionWall: {
      description: "100mm blockwork or stud partitions",
      thicknessMm: 100,
      unitLabel: "100mm blocks or timber/metal stud partitions",
    },
    framingNote: "Brick-and-block cavity construction; wall ties and cavity closers required",
    methodSummary: "Brick-and-block cavity wall construction",
    source: "MPA Masonry Easy Guide to cavity walls; Kingspan GB cavity guide (102.5mm brick + 100mm block + 50-75mm cavity)",
    verified: true,
    confidence: "verified",
  },
  DE: {
    marketCode: "DE",
    foundationWall: {
      description: "Cast-in-place reinforced concrete strip foundation (Ortbeton) to DPC level",
      thicknessMm: 240,
      unitLabel: "Cast-in-place RC foundation walls",
    },
    externalWall: {
      description: "Monolithic insulated masonry: 17.5cm or 24cm Poroton/clay blocks (or aerated concrete)",
      thicknessMm: 175,
      unitLabel: "17.5cm or 24cm clay block masonry (Poroton/H LZ)",
    },
    partitionWall: {
      description: "11.5cm to 17.5cm clay or aerated concrete blocks",
      thicknessMm: 115,
      unitLabel: "11.5cm-17.5cm partition blocks",
    },
    framingNote: "Monolithic single-leaf masonry with integrated insulation is the residential norm",
    methodSummary: "Monolithic insulated clay-block masonry on RC foundations",
    source: "Schlagmann Poroton S-Pz Planziegel datasheet (17.5/24/30cm walls); European Technical Assessment ETA-25/0604 masonry table",
    verified: true,
    confidence: "verified",
  },
  IN: {
    marketCode: "IN",
    foundationWall: {
      description: "9-inch (230mm) burnt clay brick masonry in foundation, stone masonry common in regions",
      thicknessMm: 230,
      unitLabel: "230mm (9-inch) burnt clay bricks",
    },
    externalWall: {
      description: "9-inch (230mm) burnt clay brick load-bearing walls",
      thicknessMm: 230,
      unitLabel: "230mm (9-inch) burnt clay bricks",
    },
    partitionWall: {
      description: "4.5-inch (115mm) half-brick partitions",
      thicknessMm: 115,
      unitLabel: "115mm (4.5-inch) bricks",
    },
    framingNote: "Load-bearing brickwork with RCC columns and slabs",
    methodSummary: "230mm burnt clay brick masonry with RCC frame",
    source: "BIS Handbook on Masonry Design (IS:SP 20); WeHouse brick masonry guide (230mm single-brick, 115mm half-brick walls)",
    verified: true,
    confidence: "verified",
  },
  AU: {
    marketCode: "AU",
    foundationWall: {
      description: "Concrete slab-on-ground with brick pier/strip footings",
      thicknessMm: 110,
      unitLabel: "Concrete slab and strip footings",
    },
    externalWall: {
      description: "Brick veneer: one external 90mm brick skin over a load-bearing timber or steel frame",
      thicknessMm: 90,
      unitLabel: "90mm external brick skin (veneer)",
    },
    partitionWall: {
      description: "Timber or steel stud partitions, plasterboard lined",
      thicknessMm: 90,
      unitLabel: "Stud framing with plasterboard",
    },
    framingNote: "The frame carries the loads; the brick skin is non-structural veneer",
    methodSummary: "Brick veneer over timber/steel frame on slab",
    source: "Admired Building Services and homeone.com.au brick-veneer guides (single brick skin over timber/steel frame)",
    verified: true,
    confidence: "verified",
  },
  JP: {
    marketCode: "JP",
    foundationWall: {
      description: "Reinforced concrete foundation (housing foundations are typically polished cast RC)",
      thicknessMm: 200,
      unitLabel: "Reinforced concrete foundation walls",
    },
    externalWall: {
      description: "RC walls in apartment/urban construction; ALC (autoclaved lightweight concrete) panels are ubiquitous",
      thicknessMm: 100,
      unitLabel: "RC walls or ALC panels",
    },
    partitionWall: {
      description: "ALC partition panels or stud partitions",
      thicknessMm: 100,
      unitLabel: "ALC panels",
    },
    framingNote: "Traditional houses use timber post-and-beam; urban buildings RC + ALC",
    methodSummary: "RC structure with ALC panel walls",
    source: "ALC panel ubiquity in Japanese construction (industry sources, 2026); RC standard for urban buildings",
    verified: true,
    confidence: "industry_standard",
  },
  BR: {
    marketCode: "BR",
    foundationWall: {
      description: "Reinforced concrete foundation with ceramic block masonry baldrames (foundation walls)",
      thicknessMm: 115,
      unitLabel: "Ceramic blocks (baldrames) for foundation walls",
    },
    externalWall: {
      description: "9x19x29cm ceramic hollow blocks laid on edge (alvenaria de bloco ceramico)",
      thicknessMm: 90,
      unitLabel: "9x19x29cm ceramic blocks",
    },
    partitionWall: {
      description: "9x19x29cm ceramic blocks on edge for partitions",
      thicknessMm: 90,
      unitLabel: "9x19x29cm ceramic blocks",
    },
    framingNote: "Structural masonry (NBR 15812) or RC frame with block infill",
    methodSummary: "Ceramic block structural masonry per NBR 15812",
    source: "Sodimac BR retail listing bloco ceramico 9x19x29cm; verbas CAG masonry block specs",
    verified: true,
    confidence: "verified",
  },
  ZA: {
    marketCode: "ZA",
    foundationWall: {
      description: "Concrete strip footing with 140mm concrete masonry foundation walls",
      thicknessMm: 140,
      unitLabel: "140mm concrete masonry units",
    },
    externalWall: {
      description: "140mm concrete masonry external walls (190mm series in some regions)",
      thicknessMm: 140,
      unitLabel: "140mm concrete masonry units",
    },
    partitionWall: {
      description: "90mm concrete masonry or drywall partitions",
      thicknessMm: 90,
      unitLabel: "90mm blocks or drywall",
    },
    framingNote: "Double-storey homes often brick veneer or cavity; 140mm blockwork is the single-storey norm",
    methodSummary: "140mm concrete masonry walling on strip footings",
    source: "Topblock masonry design guide (140mm external walls); Adbri masonry guide (190mm series)",
    verified: true,
    confidence: "verified",
  },

  CA: {
    marketCode: "CA",
    foundationWall: {
      description: "8-inch (200mm) poured concrete foundation walls, the standard in Canadian plan sets",
      thicknessMm: 200,
      unitLabel: "8-inch (200mm) poured concrete foundation walls",
    },
    externalWall: {
      description: "2x6 wood-frame studs at 16in o.c. with R-20 batt insulation, sheathing and cladding",
      thicknessMm: 140,
      unitLabel: "2x6 stud frame (140mm assembly) with R-20 insulation",
    },
    partitionWall: {
      description: "2x4 wood stud partitions with drywall",
      thicknessMm: 90,
      unitLabel: "2x4 stud partitions (90mm assembly)",
    },
    framingNote: "Wood frame carries all loads; masonry is a veneer, not the structure",
    methodSummary: "Platform wood-frame construction with poured concrete foundations",
    source: "Canadian residential plan sets ('ALL WALLS ARE 8\" CONCRETE', '2X6 STUDS AT 16\" O.C., R-20 BATT'); National Building Code of Canada",
    verified: true,
    confidence: "verified",
  },
  FR: {
    marketCode: "FR",
    foundationWall: {
      description: "Solid concrete block (bloc plein) or poured concrete foundation walls",
      thicknessMm: 200,
      unitLabel: "bloc plein / béton foundation walls (200mm)",
    },
    externalWall: {
      description: "200mm hollow concrete block (parpaing de béton 20cm) with external insulation (isolation par l'extérieur); exterior walls typically 20-40cm total",
      thicknessMm: 200,
      unitLabel: "parpaing 20cm blocks with external insulation",
    },
    partitionWall: {
      description: "100mm blocks or plaster tiles (carreaux de plâtre) for internal partitions",
      thicknessMm: 100,
      unitLabel: "bloc 10cm / carreaux de plâtre partitions",
    },
    framingNote: "Load-bearing masonry with RC floors; brique monomur (30-50cm insulating block) is an alternative system",
    methodSummary: "Parpaing masonry with external insulation and RC floors",
    source: "Qualitel wall thickness guide (exterior walls 20-40cm); Gedimat/Qualitel block wall guides; parpaing-brique-béton cellulaire comparatif (Hektor Services)",
    verified: true,
    confidence: "verified",
  },
  IT: {
    marketCode: "IT",
    foundationWall: {
      description: "Reinforced concrete foundation walls or full brick/concrete block (muratura piena) below grade",
      thicknessMm: 250,
      unitLabel: "RC / full masonry foundation walls",
    },
    externalWall: {
      description: "Fired-clay hollow blocks (laterizio forato, e.g. 20x25x25) for load-bearing or infill masonry with thermal insulation coat (cappotto termico)",
      thicknessMm: 250,
      unitLabel: "laterizio forato blocks (250mm) with cappotto insulation",
    },
    partitionWall: {
      description: "Hollow brick partitions (tramezze in laterizio forato)",
      thicknessMm: 80,
      unitLabel: "tramezze partition blocks (80-100mm)",
    },
    framingNote: "Traditional load-bearing or infill masonry with RC frame; insulated cavity or monolithic insulating blocks in colder zones",
    methodSummary: "Laterizio hollow-block masonry with cappotto insulation and RC frame",
    source: "Wienerberger Italia blocchi forati 20x25x25 datasheet; Poroton Italia muratura isolante / cappotto guide; T2D mattoni forati guide",
    verified: true,
    confidence: "industry_standard",
  },
  SA: {
    marketCode: "SA",
    foundationWall: {
      description: "Poured concrete or solid block foundation walls",
      thicknessMm: 200,
      unitLabel: "poured/solid-block foundation walls",
    },
    externalWall: {
      description: "Concrete block masonry external walls (typically 200mm), increasingly AAC blocks (autoclaved aerated concrete) for thermal performance",
      thicknessMm: 200,
      unitLabel: "concrete blocks (200mm) or AAC blocks",
    },
    partitionWall: {
      description: "100-150mm concrete block or AAC internal partitions",
      thicknessMm: 100,
      unitLabel: "100-150mm blocks / AAC partitions",
    },
    framingNote: "Load-bearing blockwork with RC columns and ring beams; red clay bricks traditional, AAC growing",
    methodSummary: "Concrete block / AAC masonry with RC frame",
    source: "Benna Saudi concrete block masonry procurement guide (types, specs, AAC usage); AAC vs red brick comparisons (Saudi market)",
    verified: true,
    confidence: "industry_standard",
  },
  AE: {
    marketCode: "AE",
    foundationWall: {
      description: "Poured concrete foundation walls on raft/strip footings",
      thicknessMm: 200,
      unitLabel: "poured concrete foundation walls",
    },
    externalWall: {
      description: "Hollow concrete block work (block masonry) for villa external walls (typically 200mm)",
      thicknessMm: 200,
      unitLabel: "hollow concrete blocks (200mm)",
    },
    partitionWall: {
      description: "Hollow block or drywall internal partitions",
      thicknessMm: 100,
      unitLabel: "100mm blocks / drywall partitions",
    },
    framingNote: "RC frame villas with block infill; 'block work' is the standard trade term in UAE construction",
    methodSummary: "RC frame with hollow concrete block work",
    source: "UAE block works suppliers (Abu Dhabi hollow concrete block works listings); standard UAE villa block-work practice",
    verified: true,
    confidence: "industry_standard",
  },
  CN: {
    marketCode: "CN",
    foundationWall: {
      description: "Poured concrete foundation walls or masonry strip footings",
      thicknessMm: 240,
      unitLabel: "poured concrete / masonry foundation walls",
    },
    externalWall: {
      description: "Brick-concrete masonry (砖混结构): clay brick or concrete block load-bearing walls, typically 240mm; RC shear walls in high-rise",
      thicknessMm: 240,
      unitLabel: "240mm brick / concrete block masonry",
    },
    partitionWall: {
      description: "120-180mm brick or aerated block partitions",
      thicknessMm: 120,
      unitLabel: "120-180mm partitions",
    },
    framingNote: "砖混 (brick-concrete) masonry is the standard low-rise residential system; cast-in-place RC dominates high-rise",
    methodSummary: "Brick-concrete masonry (low-rise) or RC frame (high-rise)",
    source: "ArchDaily China / brick masonry practice; Topcrete China concrete block product listings; 砖混结构 low-rise house design references",
    verified: true,
    confidence: "industry_standard",
  },
  ID: {
    marketCode: "ID",
    foundationWall: {
      description: "Stone rubble (batu kali) foundation walls, the traditional Indonesian footing",
      thicknessMm: 300,
      unitLabel: "batu kali stone rubble foundation",
    },
    externalWall: {
      description: "Red brick (bata merah) masonry external walls; Hebel AAC lightweight blocks increasingly used for speed and insulation",
      thicknessMm: 150,
      unitLabel: "bata merah red bricks / Hebel AAC blocks",
    },
    partitionWall: {
      description: "Red brick (bata merah) partitions, or Hebel AAC for faster construction",
      thicknessMm: 100,
      unitLabel: "red brick / AAC partitions",
    },
    framingNote: "Masonry infill with RC frame and sloof/column structure per SNI practice",
    methodSummary: "Red brick or AAC masonry with RC frame",
    source: "Bata merah vs Hebel comparisons (Indonesian building materials market, 2026); Indonesian architect brick wall practice (Andy Rahman)",
    verified: true,
    confidence: "industry_standard",
  },
  MX: {
    marketCode: "MX",
    foundationWall: {
      description: "Poured concrete or stone masonry foundation walls with castillos (RC confining columns)",
      thicknessMm: 200,
      unitLabel: "concrete / stone foundation with castillos",
    },
    externalWall: {
      description: "15cm concrete block (block de concreto 15x20x40) or fired clay (tabique rojo) with castillos y dalas confining reinforcement",
      thicknessMm: 150,
      unitLabel: "15cm blocks (15x20x40) / tabique rojo",
    },
    partitionWall: {
      description: "10cm tabique rojo or block partitions",
      thicknessMm: 100,
      unitLabel: "10cm tabique / block partitions",
    },
    framingNote: "Confined masonry: block or tabique walls tied with castillos (columns) and dalas (bond beams) per Mexican practice",
    methodSummary: "Confined masonry with castillos and dalas",
    source: "Scribd MX wall cost sheets (block de concreto 15x20x40, escalerilla reinforcement); tabique/tabicón/block type guides; tabique rojo process videos",
    verified: true,
    confidence: "industry_standard",
  },
  KR: {
    marketCode: "KR",
    foundationWall: {
      description: "Reinforced concrete basement/foundation walls (walls-and-slab RC construction)",
      thicknessMm: 250,
      unitLabel: "RC foundation walls",
    },
    externalWall: {
      description: "Reinforced concrete wall-panel structure (the standard for Korean apartments) with insulation and finish",
      thicknessMm: 200,
      unitLabel: "RC wall panels (200mm typical)",
    },
    partitionWall: {
      description: "Lightweight drywall partitions within RC structure",
      thicknessMm: 100,
      unitLabel: "drywall partitions (100mm)",
    },
    framingNote: "Monolithic RC wall-slab structure dominates Korean apartments; PC modular emerging",
    methodSummary: "Reinforced concrete wall-panel apartment construction",
    source: "Korean apartment construction history (Chungjeong 1937 first RC apartment; Hyundai apartment heritage); MDPI apartment typology analysis; PC modular news (and-rb)",
    verified: true,
    confidence: "verified",
  },
  GH: {
    marketCode: "GH",
    foundationWall: {
      description: "9-inch (225mm) sandcrete blocks for foundation walls, the Ghanaian standard",
      thicknessMm: 225,
      unitLabel: "9-inch sandcrete blocks (foundation)",
    },
    externalWall: {
      description: "9-inch (225mm) sandcrete blocks for external load-bearing walls",
      thicknessMm: 225,
      unitLabel: "9-inch sandcrete blocks (external walls)",
    },
    partitionWall: {
      description: "6-inch (150mm) sandcrete blocks for internal partitions",
      thicknessMm: 150,
      unitLabel: "6-inch sandcrete blocks (partitions)",
    },
    framingNote: "Sandcrete blockwork dominates Ghanaian wall construction; interlocking blocks studied for affordable housing",
    methodSummary: "Hollow sandcrete blockwork with RC columns and lintels",
    source: "ResearchGate sandcrete block studies (Ghana external walls, load and non-load-bearing use); Sunyani interlocking block study (Ghana industry dominated by conventional sandcrete)",
    verified: true,
    confidence: "verified",
  },
  KE: {
    marketCode: "KE",
    foundationWall: {
      description: "Foundation stones / rough quarry stone below grade, stepped strip footings",
      thicknessMm: 225,
      unitLabel: "foundation stones (9-inch course)",
    },
    externalWall: {
      description: "Machine-cut stones (Ndarugo stone, 9x9 or 6x9 inch) for external walls",
      thicknessMm: 225,
      unitLabel: "9x9 machine-cut stones (walls)",
    },
    partitionWall: {
      description: "6-inch (150mm) machine-cut stones or blocks for internal partitions",
      thicknessMm: 150,
      unitLabel: "6-inch stones / blocks (partitions)",
    },
    framingNote: "Machine-cut quarry stone walling is the Kenyan standard; rough stone for foundations, cut stone above grade",
    methodSummary: "Machine-cut quarry stone walling with RC ring beam",
    source: "Kenya stone market listings (9x9 Ndarugo 35-45 KSH, 6x9 28 KSH; foundation vs superstructure split per Kenyan builders)",
    verified: true,
    confidence: "verified",
  },
};

/** Generic fallback for markets not yet profiled — explicitly UNVERIFIED. */
function genericProfile(marketCode: string): WallMethodologyProfile {
  return {
    marketCode,
    foundationWall: {
      description: "Locally standard masonry or cast concrete foundation walls — verify with your engineer",
      thicknessMm: 0,
      unitLabel: "Locally standard foundation wall units",
    },
    externalWall: {
      description: "Locally standard external wall system — verify with your engineer",
      thicknessMm: 0,
      unitLabel: "Locally standard wall units",
    },
    partitionWall: {
      description: "Locally standard partition system",
      thicknessMm: 0,
      unitLabel: "Locally standard partition units",
    },
    framingNote: null,
    methodSummary: "Generic masonry methodology (unverified for this market)",
    source: "No market-specific wall methodology verified yet",
    verified: false,
    confidence: "pending_verification",
  };
}

export function resolveWallMethodology(marketCode: string): WallMethodologyProfile {
  return PROFILES[marketCode] ?? genericProfile(marketCode);
}

export function listWallMethodologyMarkets(): { code: string; verified: boolean }[] {
  return Object.keys(PROFILES).map((code) => ({
    code,
    verified: PROFILES[code].verified,
  }));
}
