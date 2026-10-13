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
  const out = Object.keys(PROFILES).map((code) => ({ code, verified: true }));
  out.push(
    ...["CA", "FR", "IT", "SA", "AE", "CN", "ID", "MX", "KR", "GH", "KE"].map((code) => ({
      code,
      verified: false,
    })),
  );
  return out;
}
