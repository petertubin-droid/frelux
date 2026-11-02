/**
 * Market-scoped member sizing defaults for the structural calculator.
 *
 * Beam/column widths are tied to each market's verified standard wall unit
 * width (see wall-methodology.ts sources). Frame-based markets have no
 * single masonry width — their profile leaves width to the engineer with
 * an explicit note. Markets without verified data resolve to a generic
 * profile that MUST disclose itself as unverified.
 */

export interface MemberSizingProfile {
  marketCode: string;
  /** Default assumed beam width (mm) matching the market's standard wall unit. Null = engineer-determined. */
  beamWidthMm: number | null;
  beamWidthBasis: string;
  /** Typical ground beam depth practice note. */
  groundBeamNote: string;
  /** Typical lintel sizing note. */
  lintelNote: string;
  /** Minimum practical column width (mm) so it fits within the standard wall. Null = engineer-determined. */
  minColumnWidthMm: number | null;
  minColumnBasis: string;
  source: string;
  verified: boolean;
  confidence: "verified" | "industry_standard" | "pending_verification";
}

const NG: MemberSizingProfile = {
  marketCode: "NG",
  beamWidthMm: 225,
  beamWidthBasis: "b = 225mm (9-inch sandcrete block width), standard for Nigerian load-bearing walls",
  groundBeamNote: "Ground beams in Nigerian practice are typically ≥ 450mm deep. Consider increasing depth.",
  lintelNote: "Lintel beams are typically 225×225mm (9-inch). Verify if larger section is truly needed.",
  minColumnWidthMm: 225,
  minColumnBasis: "225mm (9-inch) minimum so the column fits Nigerian block walls",
  source: "Established Frelux NG methodology baseline",
  verified: true,
  confidence: "verified",
};

const p = (
  marketCode: string,
  beamWidthMm: number | null,
  beamWidthBasis: string,
  minColumnWidthMm: number | null,
  source: string,
  confidence: MemberSizingProfile["confidence"] = "verified",
): MemberSizingProfile => ({
  marketCode,
  beamWidthMm,
  beamWidthBasis,
  groundBeamNote:
    "Ground beam depth requirements vary by market — verify against local structural codes and your engineer.",
  lintelNote:
    "Lintel sizing follows local standard practice — verify with your engineer before construction.",
  minColumnWidthMm,
  minColumnBasis:
    minColumnWidthMm !== null
      ? `${minColumnWidthMm}mm minimum so the column fits within the market's standard wall unit width`
      : "Frame-based market: column dimensions are engineer-determined",
  source,
  verified: true,
  confidence,
});

const PROFILES: Record<string, MemberSizingProfile> = {
  NG,
  US: p("US", 203, "b = 203mm (8-inch CMU width); wood-frame design governs most US homes", 203,
    "CMU 8x16 in standard (bartleby civil engineering; up.codes 722.3) — matches verified US wall methodology"),
  GB: p("GB", 100, "b = 100mm (inner leaf blockwork width of the standard cavity wall)", 100,
    "MPA Masonry cavity wall guide (102.5mm brick + 100mm block inner leaf) — matches verified GB wall methodology"),
  DE: p("DE", 175, "b = 175mm (17.5cm Poroton/clay block monolithic wall)", 175,
    "Schlagmann Poroton S-Pz datasheet (17.5/24/30cm walls) — matches verified DE wall methodology"),
  IN: p("IN", 230, "b = 230mm (9-inch burnt clay brick wall width)", 230,
    "BIS Handbook on Masonry Design; WeHouse brick masonry guide — matches verified IN wall methodology"),
  AU: p("AU", null, "Brick veneer market: the timber/steel frame carries loads; RC beam width is engineer-determined", null,
    "Admired Building Services / homeone.com.au brick-veneer guides — frame carries loads"),
  JP: p("JP", null, "RC/ALC market: member sizes are engineer-determined (JIS/AIJ standards)", null,
    "ALC panel + RC standard practice in Japanese construction (industry sources)", "industry_standard"),
  BR: p("BR", 90, "b = 90mm (9x19x29cm ceramic block laid on edge)", 90,
    "Sodimac BR bloco ceramico 9x19x29cm listing — matches verified BR wall methodology"),
  ZA: p("ZA", 140, "b = 140mm (140mm concrete masonry external wall width)", 140,
    "Topblock masonry design guide (140mm external walls) — matches verified ZA wall methodology"),
  CA: p("CA", null, "Platform wood-frame market: 2x6 stud walls carry all loads; RC member sizes are engineer-determined", null,
    "Canadian residential plan sets (2x6 studs at 16in o.c.) and National Building Code of Canada — matches verified CA wall methodology"),
  FR: p("FR", 200, "b = 200mm (parpaing 20cm hollow concrete block width)", 200,
    "Qualitel / Gedimat parpaing 20cm wall guides — matches verified FR wall methodology"),
  IT: p("IT", null, "RC-frame / load-bearing masonry market: member sizes are engineer-determined (NTC 2018 practice)", null,
    "Wienerberger Italia laterizio forato datasheets; Italian RC frame practice — matches verified IT wall methodology", "industry_standard"),
  SA: p("SA", 200, "b = 200mm (concrete block / AAC external wall width)", 200,
    "Benna Saudi concrete block masonry procurement guide — matches verified SA wall methodology", "industry_standard"),
  AE: p("AE", 200, "b = 200mm (hollow concrete block villa external wall width)", 200,
    "UAE hollow concrete block works supplier listings (Abu Dhabi) — matches verified AE wall methodology", "industry_standard"),
  CN: p("CN", 240, "b = 240mm (zhuanhun brick-concrete masonry wall width)", 240,
    "Chinese brick-concrete (砖混) low-rise masonry practice — matches verified CN wall methodology", "industry_standard"),
  ID: p("ID", 150, "b = 150mm (bata merah red brick external wall width)", 150,
    "Indonesian red brick / Hebel AAC masonry practice (SNI) — matches verified ID wall methodology", "industry_standard"),
  MX: p("MX", 150, "b = 150mm (block de concreto 15cm confined-masonry wall width)", 150,
    "Scribd MX block de concreto 15x20x40 wall cost sheets — matches verified MX wall methodology", "industry_standard"),
  KR: p("KR", null, "RC wall-panel market: member sizes are engineer-determined (KDS/KCS standards)", null,
    "Korean RC wall-slab apartment construction standard — matches verified KR wall methodology"),
  GH: p("GH", 225, "b = 225mm (9-inch sandcrete block width)", 225,
    "Ghanaian 9-inch sandcrete block standard — matches verified GH wall methodology"),
  KE: p("KE", 225, "b = 225mm (9x9 machine-cut Ndarugo stone width)", 225,
    "Kenya machine-cut stone 9x9 standard — matches verified KE wall methodology"),
};

function genericProfile(marketCode: string): MemberSizingProfile {
  return {
    marketCode,
    beamWidthMm: null,
    beamWidthBasis:
      "Standard wall-unit width for this market is not yet verified; a generic 200mm is assumed — confirm with your engineer",
    groundBeamNote:
      "Ground beam depth requirements vary by market — verify against local structural codes and your engineer.",
    lintelNote:
      "Lintel sizing follows local standard practice — verify with your engineer before construction.",
    minColumnWidthMm: null,
    minColumnBasis:
      "Market minimum not yet verified — engineer-determined; confirm with your engineer",
    source: "No market-specific member sizing verified yet",
    verified: false,
    confidence: "pending_verification",
  };
}

export function resolveMemberSizing(marketCode: string): MemberSizingProfile {
  return PROFILES[marketCode] ?? genericProfile(marketCode);
}
