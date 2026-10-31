import { getPackagingEvidence } from "./market-packaging-verification";

/**
 * FRELUX Standalone Masonry, Brickwork & Blockwork Engine
 *
 * Provides deterministic, multi-jurisdiction takeoff for masonry walls
 * (load-bearing, partition, perimeter fence, retaining, cavity).
 *
 * Supports all 32 Frelux markets with primary standard units, local mortar
 * specifications, cement packaging sizes, and opening deductions.
 * No silent Nigerian fallback.
 */

export interface MasonryOpening {
  id: string;
  description: string;
  widthM: number;
  heightM: number;
  quantity: number;
}

export type MasonryUnitCategory =
  "cmu" | "brick" | "sandcrete" | "clay_block" | "natural_stone" | "aac";

export interface MasonryUnitProfile {
  id: string;
  name: string;
  category: MasonryUnitCategory;
  lengthMm: number;
  heightMm: number;
  widthMm: number; // bed depth / wall thickness
  isHollow: boolean;
  standardJointMm: number;
  standardMixRatio: "1:3" | "1:4" | "1:5" | "1:6";
  sourceStandard: string;
}

export interface MarketMasonryConfig {
  marketCode: string;
  countryName: string;
  cementBagWeightKg: number;
  defaultUnit: MasonryUnitProfile;
  availableUnits: MasonryUnitProfile[];
  regulatoryNote: string;
}

export const MASONRY_MARKET_REGISTRY: Record<string, MarketMasonryConfig> = {
  NG: {
    marketCode: "NG",
    countryName: "Nigeria",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "ng-sandcrete-9in",
      name: "9-inch Hollow Sandcrete Block (450x225x225mm)",
      category: "sandcrete",
      lengthMm: 450,
      heightMm: 225,
      widthMm: 225,
      isHollow: true,
      standardJointMm: 12,
      standardMixRatio: "1:5",
      sourceStandard: "NIS 87:2007 (Sandcrete Blocks)",
    },
    availableUnits: [
      {
        id: "ng-sandcrete-9in",
        name: "9-inch Hollow Sandcrete Block (450x225x225mm)",
        category: "sandcrete",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 225,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "NIS 87:2007",
      },
      {
        id: "ng-sandcrete-6in",
        name: "6-inch Hollow Sandcrete Block (450x150x225mm)",
        category: "sandcrete",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "NIS 87:2007",
      },
      {
        id: "ng-sandcrete-5in",
        name: "5-inch Solid Sandcrete Block (450x125x225mm)",
        category: "sandcrete",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 125,
        isHollow: false,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "NIS 87:2007",
      },
    ],
    regulatoryNote:
      "Nigerian National Building Code Part II (Materials). Sandcrete block minimum 28-day crushing strength 2.5 N/mm² for non-loadbearing and 3.5 N/mm² for loadbearing.",
  },
  US: {
    marketCode: "US",
    countryName: "United States",
    cementBagWeightKg: 42.6, // 94 lb standard Portland cement bag
    defaultUnit: {
      id: "us-cmu-8in",
      name: "8x8x16 CMU (Actual 7-5/8 x 7-5/8 x 15-5/8 in / 194x194x397mm)",
      category: "cmu",
      lengthMm: 397,
      heightMm: 194,
      widthMm: 194,
      isHollow: true,
      standardJointMm: 9.5, // 3/8 in
      standardMixRatio: "1:4",
      sourceStandard: "ASTM C90 (Loadbearing Concrete Masonry Units)",
    },
    availableUnits: [
      {
        id: "us-cmu-8in",
        name: "8x8x16 CMU Stretcher (194x194x397mm)",
        category: "cmu",
        lengthMm: 397,
        heightMm: 194,
        widthMm: 194,
        isHollow: true,
        standardJointMm: 9.5,
        standardMixRatio: "1:4",
        sourceStandard: "ASTM C90",
      },
      {
        id: "us-cmu-6in",
        name: "6x8x16 CMU Partition (143x194x397mm)",
        category: "cmu",
        lengthMm: 397,
        heightMm: 194,
        widthMm: 143,
        isHollow: true,
        standardJointMm: 9.5,
        standardMixRatio: "1:4",
        sourceStandard: "ASTM C90",
      },
      {
        id: "us-cmu-4in",
        name: "4x8x16 CMU Partition (92x194x397mm)",
        category: "cmu",
        lengthMm: 397,
        heightMm: 194,
        widthMm: 92,
        isHollow: true,
        standardJointMm: 9.5,
        standardMixRatio: "1:4",
        sourceStandard: "ASTM C90",
      },
      {
        id: "us-modular-brick",
        name: "Standard Modular Brick (3-5/8 x 2-1/4 x 7-5/8 in / 92x57x194mm)",
        category: "brick",
        lengthMm: 194,
        heightMm: 57,
        widthMm: 92,
        isHollow: false,
        standardJointMm: 9.5,
        standardMixRatio: "1:3",
        sourceStandard: "ASTM C216 / C62",
      },
    ],
    regulatoryNote:
      "TMS 402/602 Building Code Requirements and Specification for Masonry Structures; Type N / Type S mortar ASTM C270.",
  },
  GB: {
    marketCode: "GB",
    countryName: "United Kingdom",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "gb-facing-brick",
      name: "Standard Facing Brick (215x102.5x65mm)",
      category: "brick",
      lengthMm: 215,
      heightMm: 65,
      widthMm: 102.5,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "BS EN 771-1 (Clay masonry units)",
    },
    availableUnits: [
      {
        id: "gb-facing-brick",
        name: "Standard UK Facing Brick (215x102.5x65mm)",
        category: "brick",
        lengthMm: 215,
        heightMm: 65,
        widthMm: 102.5,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "BS EN 771-1",
      },
      {
        id: "gb-dense-block-100",
        name: "Dense Concrete Block (440x215x100mm)",
        category: "cmu",
        lengthMm: 440,
        heightMm: 215,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "BS EN 771-3",
      },
      {
        id: "gb-dense-block-140",
        name: "Dense Concrete Block (440x215x140mm)",
        category: "cmu",
        lengthMm: 440,
        heightMm: 215,
        widthMm: 140,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "BS EN 771-3",
      },
      {
        id: "gb-aerated-block",
        name: "Aircrete / Thermalite Block (440x215x100mm)",
        category: "aac",
        lengthMm: 440,
        heightMm: 215,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:5",
        sourceStandard: "BS EN 771-4",
      },
    ],
    regulatoryNote:
      "BS EN 1996 (Eurocode 6: Design of masonry structures) & Approved Document A (Structure).",
  },
  CA: {
    marketCode: "CA",
    countryName: "Canada",
    cementBagWeightKg: 40,
    defaultUnit: {
      id: "ca-cmu-20cm",
      name: "20cm Metric CMU (190x190x390mm)",
      category: "cmu",
      lengthMm: 390,
      heightMm: 190,
      widthMm: 190,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "CSA A165.1 (Concrete Block Masonry Units)",
    },
    availableUnits: [
      {
        id: "ca-cmu-20cm",
        name: "20cm CMU Block (190x190x390mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 190,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "CSA A165.1",
      },
      {
        id: "ca-modular-brick",
        name: "Metric Modular Brick (190x90x57mm)",
        category: "brick",
        lengthMm: 190,
        heightMm: 57,
        widthMm: 90,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:3",
        sourceStandard: "CSA A82",
      },
    ],
    regulatoryNote:
      "National Building Code of Canada (NBC Part 4) & CSA S304 (Design of Masonry Structures).",
  },
  AU: {
    marketCode: "AU",
    countryName: "Australia",
    cementBagWeightKg: 20,
    defaultUnit: {
      id: "au-standard-brick",
      name: "Standard Australian Brick (230x110x76mm)",
      category: "brick",
      lengthMm: 230,
      heightMm: 76,
      widthMm: 110,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "AS/NZS 4455 (Masonry units, pavers and flags)",
    },
    availableUnits: [
      {
        id: "au-standard-brick",
        name: "Standard Australian Clay Brick (230x110x76mm)",
        category: "brick",
        lengthMm: 230,
        heightMm: 76,
        widthMm: 110,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "AS/NZS 4455",
      },
      {
        id: "au-besser-200",
        name: "200 Series Besser Block (390x190x190mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 190,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "AS 3700 / AS/NZS 4455",
      },
      {
        id: "au-besser-100",
        name: "100 Series Besser Block (390x190x90mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 90,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "AS 3700",
      },
    ],
    regulatoryNote:
      "National Construction Code (NCC) Volume Two & AS 3700 (Masonry structures).",
  },
  NZ: {
    marketCode: "NZ",
    countryName: "New Zealand",
    cementBagWeightKg: 40,
    defaultUnit: {
      id: "nz-standard-brick",
      name: "Standard NZ Brick (230x110x76mm)",
      category: "brick",
      lengthMm: 230,
      heightMm: 76,
      widthMm: 110,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "NZS 4210 / AS/NZS 4455",
    },
    availableUnits: [
      {
        id: "nz-standard-brick",
        name: "Standard NZ Brick (230x110x76mm)",
        category: "brick",
        lengthMm: 230,
        heightMm: 76,
        widthMm: 110,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NZS 4210",
      },
      {
        id: "nz-concrete-block-20",
        name: "20 Series Concrete Block (390x190x190mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 190,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NZS 4229 / NZS 4230",
      },
    ],
    regulatoryNote:
      "NZS 4229 (Concrete masonry buildings not requiring specific engineering design) & NZS 4230.",
  },
  DE: {
    marketCode: "DE",
    countryName: "Germany",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "de-mauerziegel-nf",
      name: "Normalformat (NF) Mauerziegel (240x115x71mm)",
      category: "brick",
      lengthMm: 240,
      heightMm: 71,
      widthMm: 115,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "DIN 105 / DIN EN 771-1",
    },
    availableUnits: [
      {
        id: "de-mauerziegel-nf",
        name: "Normalformat (NF) Mauerziegel (240x115x71mm)",
        category: "brick",
        lengthMm: 240,
        heightMm: 71,
        widthMm: 115,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "DIN 105",
      },
      {
        id: "de-mauerziegel-df",
        name: "Dünnformat (DF) Ziegel (240x115x52mm)",
        category: "brick",
        lengthMm: 240,
        heightMm: 52,
        widthMm: 115,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "DIN 105",
      },
      {
        id: "de-kalksandstein-2df",
        name: "Kalksandstein 2DF (248x115x113mm)",
        category: "cmu",
        lengthMm: 248,
        heightMm: 113,
        widthMm: 115,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "DIN V 106",
      },
    ],
    regulatoryNote:
      "DIN EN 1996 (Eurocode 6) & DIN 20000-401 (Mauerwerk nach nationalen Regeln).",
  },
  FR: {
    marketCode: "FR",
    countryName: "France",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "fr-parpaing-20",
      name: "Parpaing creux 20x20x50 (500x200x200mm)",
      category: "cmu",
      lengthMm: 500,
      heightMm: 200,
      widthMm: 200,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "NF EN 771-3 / DTU 20.1",
    },
    availableUnits: [
      {
        id: "fr-parpaing-20",
        name: "Parpaing creux standard (500x200x200mm)",
        category: "cmu",
        lengthMm: 500,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NF EN 771-3",
      },
      {
        id: "fr-parpaing-15",
        name: "Parpaing creux cloison (500x150x200mm)",
        category: "cmu",
        lengthMm: 500,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NF EN 771-3",
      },
      {
        id: "fr-brique-creuse",
        name: "Brique creuse de terre cuite (500x200x200mm)",
        category: "clay_block",
        lengthMm: 500,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NF EN 771-1",
      },
    ],
    regulatoryNote:
      "NF DTU 20.1 (Ouvrages en maçonnerie de petits éléments) & Eurocode 6 (NF EN 1996).",
  },
  IN: {
    marketCode: "IN",
    countryName: "India",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "in-modular-brick",
      name: "Standard Modular Brick (190x90x90mm)",
      category: "brick",
      lengthMm: 190,
      heightMm: 90,
      widthMm: 90,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "IS 1077 (Common Burnt Clay Building Bricks)",
    },
    availableUnits: [
      {
        id: "in-modular-brick",
        name: "Standard Modular Clay Brick (190x90x90mm)",
        category: "brick",
        lengthMm: 190,
        heightMm: 90,
        widthMm: 90,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "IS 1077",
      },
      {
        id: "in-traditional-brick",
        name: "Traditional / Non-Modular Brick (230x115x75mm)",
        category: "brick",
        lengthMm: 230,
        heightMm: 75,
        widthMm: 115,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:5",
        sourceStandard: "IS 1077 / CPWD Specifications",
      },
      {
        id: "in-aac-block-200",
        name: "AAC Lightweight Block (600x200x200mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 200,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 3, // thin bed mortar
        standardMixRatio: "1:3",
        sourceStandard: "IS 2185 Part 3 (Autoclaved Cellular Concrete Blocks)",
      },
    ],
    regulatoryNote:
      "IS 1905 (Code of practice for structural use of unreinforced masonry) & National Building Code of India (NBC 2016).",
  },
  ZA: {
    marketCode: "ZA",
    countryName: "South Africa",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "za-stock-brick",
      name: "Standard Stock Brick (222x106x73mm)",
      category: "brick",
      lengthMm: 222,
      heightMm: 73,
      widthMm: 106,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "SANS 227 (Burnt clay masonry units)",
    },
    availableUnits: [
      {
        id: "za-stock-brick",
        name: "Clay Stock Brick (222x106x73mm)",
        category: "brick",
        lengthMm: 222,
        heightMm: 73,
        widthMm: 106,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SANS 227",
      },
      {
        id: "za-maxi-brick",
        name: "Maxi Brick (290x140x90mm)",
        category: "brick",
        lengthMm: 290,
        heightMm: 90,
        widthMm: 140,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SANS 227 / SANS 1215",
      },
      {
        id: "za-concrete-block-140",
        name: "Hollow Concrete Block (390x190x140mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 140,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SANS 1215 (Concrete masonry units)",
      },
    ],
    regulatoryNote:
      "SANS 10400-K (The application of the National Building Regulations: Walls) & SANS 2001-CM1.",
  },
  KE: {
    marketCode: "KE",
    countryName: "Kenya",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "ke-quarry-stone-9in",
      name: "Machine-Cut Building Stone 9x9 in (400x200x200mm)",
      category: "natural_stone",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 200,
      isHollow: false,
      standardJointMm: 12,
      standardMixRatio: "1:4",
      sourceStandard: "KS EAS 18 (Building stones and masonry)",
    },
    availableUnits: [
      {
        id: "ke-quarry-stone-9in",
        name: "Machine-Cut Stone 9x9 in (400x200x200mm)",
        category: "natural_stone",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "KS EAS 18",
      },
      {
        id: "ke-quarry-stone-6in",
        name: "Machine-Cut Stone 6x9 in (400x150x200mm)",
        category: "natural_stone",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: false,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "KS EAS 18",
      },
      {
        id: "ke-concrete-block",
        name: "Hollow Concrete Block (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "KS 02-95",
      },
    ],
    regulatoryNote:
      "Kenya Building Code 1968 / National Building Code 2024 & Kenya Bureau of Standards (KEBS).",
  },
  GH: {
    marketCode: "GH",
    countryName: "Ghana",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "gh-sandcrete-6in",
      name: "6-inch Solid Sandcrete Block (450x150x225mm)",
      category: "sandcrete",
      lengthMm: 450,
      heightMm: 225,
      widthMm: 150,
      isHollow: false,
      standardJointMm: 12,
      standardMixRatio: "1:4",
      sourceStandard: "GS 297:2018 (Specifications for Sandcrete Blocks)",
    },
    availableUnits: [
      {
        id: "gh-sandcrete-6in",
        name: "6-inch Sandcrete Block (450x150x225mm)",
        category: "sandcrete",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 150,
        isHollow: false,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "GS 297:2018",
      },
      {
        id: "gh-sandcrete-9in",
        name: "9-inch Sandcrete Block (450x225x225mm)",
        category: "sandcrete",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 225,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "GS 297:2018",
      },
    ],
    regulatoryNote:
      "Ghana Building Code (GS 1207:2018) Part 5 Structure - Section 5.6 Masonry.",
  },
  TZ: {
    marketCode: "TZ",
    countryName: "Tanzania",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "tz-concrete-block-6in",
      name: "6-inch Concrete Block (450x150x225mm)",
      category: "cmu",
      lengthMm: 450,
      heightMm: 225,
      widthMm: 150,
      isHollow: true,
      standardJointMm: 12,
      standardMixRatio: "1:5",
      sourceStandard: "TZS 283 (Precast concrete masonry units)",
    },
    availableUnits: [
      {
        id: "tz-concrete-block-6in",
        name: "6-inch Concrete Block (450x150x225mm)",
        category: "cmu",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "TZS 283",
      },
      {
        id: "tz-concrete-block-9in",
        name: "9-inch Concrete Block (450x225x225mm)",
        category: "cmu",
        lengthMm: 450,
        heightMm: 225,
        widthMm: 225,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:5",
        sourceStandard: "TZS 283",
      },
    ],
    regulatoryNote: "Tanzania Building Regulations & TBS standards.",
  },
  CI: {
    marketCode: "CI",
    countryName: "Côte d'Ivoire",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "ci-agglo-15",
      name: "Agglo creux de 15 (400x150x200mm)",
      category: "cmu",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 150,
      isHollow: true,
      standardJointMm: 12,
      standardMixRatio: "1:4",
      sourceStandard: "NI 05.08.001 (Agglomérés de ciment)",
    },
    availableUnits: [
      {
        id: "ci-agglo-15",
        name: "Agglo creux de 15 (400x150x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "NI 05.08.001",
      },
      {
        id: "ci-agglo-20",
        name: "Agglo creux de 20 (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "NI 05.08.001",
      },
    ],
    regulatoryNote:
      "Code de la Construction et de l'Habitat de Côte d'Ivoire & Normes Ivoiriennes CODEX.",
  },
  ET: {
    marketCode: "ET",
    countryName: "Ethiopia",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "et-hcb-15",
      name: "HCB Class B (400x150x200mm)",
      category: "cmu",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 150,
      isHollow: true,
      standardJointMm: 12,
      standardMixRatio: "1:4",
      sourceStandard: "ES 596:2001 (Hollow Concrete Blocks)",
    },
    availableUnits: [
      {
        id: "et-hcb-15",
        name: "HCB Class B (400x150x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "ES 596:2001",
      },
      {
        id: "et-hcb-20",
        name: "HCB Class A (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "ES 596:2001",
      },
    ],
    regulatoryNote:
      "Ethiopian Building Code Standard (EBCS 6: Code of Practice for Design of Masonry Structures).",
  },
  EG: {
    marketCode: "EG",
    countryName: "Egypt",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "eg-clay-brick",
      name: "Red Clay Brick (250x120x60mm)",
      category: "brick",
      lengthMm: 250,
      heightMm: 60,
      widthMm: 120,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "ES 47:2005 (Clay building bricks)",
    },
    availableUnits: [
      {
        id: "eg-clay-brick",
        name: "Red Perforated Clay Brick (250x120x60mm)",
        category: "brick",
        lengthMm: 250,
        heightMm: 60,
        widthMm: 120,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "ES 47:2005",
      },
      {
        id: "eg-cement-block",
        name: "Hollow Cement Block (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "ES 1292:2005",
      },
    ],
    regulatoryNote:
      "Egyptian Code of Practice for the Design and Execution of Masonry Works (ECP 204).",
  },
  SA: {
    marketCode: "SA",
    countryName: "Saudi Arabia",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "sa-cmu-20",
      name: "Hollow Concrete Block 20cm (400x200x200mm)",
      category: "cmu",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 200,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "SASO GSO EN 771-3 (Concrete masonry units)",
    },
    availableUnits: [
      {
        id: "sa-cmu-20",
        name: "Hollow Concrete Block (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SASO GSO EN 771-3",
      },
      {
        id: "sa-cmu-15",
        name: "Hollow Concrete Block (400x150x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SASO GSO EN 771-3",
      },
    ],
    regulatoryNote:
      "Saudi Building Code (SBC 305: Masonry Structures Requirements).",
  },
  AE: {
    marketCode: "AE",
    countryName: "United Arab Emirates",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "ae-cmu-200",
      name: "Thermal Insulated Block (400x200x200mm)",
      category: "cmu",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 200,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "Dubai Municipality Al Sa'fat / GSO EN 771-3",
    },
    availableUnits: [
      {
        id: "ae-cmu-200",
        name: "Thermal Insulated Block (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "GSO EN 771-3",
      },
      {
        id: "ae-cmu-150",
        name: "Solid / Hollow Block (400x150x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "GSO EN 771-3",
      },
    ],
    regulatoryNote:
      "Abu Dhabi International Building Code (ADIBC) / Dubai Building Code (DBC).",
  },
  TR: {
    marketCode: "TR",
    countryName: "Turkey",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "tr-izotugla",
      name: "İzotuğla (190x190x135mm)",
      category: "clay_block",
      lengthMm: 190,
      heightMm: 135,
      widthMm: 190,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "TS EN 771-1 (Kil kâgir birimler)",
    },
    availableUnits: [
      {
        id: "tr-izotugla",
        name: "İzotuğla Duvar Bloğu (190x190x135mm)",
        category: "clay_block",
        lengthMm: 190,
        heightMm: 135,
        widthMm: 190,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "TS EN 771-1",
      },
      {
        id: "tr-gazbeton-20",
        name: "Gazbeton / Ytong Bloğu (600x250x200mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 250,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "TS EN 771-4",
      },
    ],
    regulatoryNote:
      "TBDY 2018 (Türkiye Bina Deprem Yönetmeliği) Bölüm 11: Yığma Bina Tasarımı.",
  },
  IT: {
    marketCode: "IT",
    countryName: "Italy",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "it-doppio-uni",
      name: "Doppio UNI Forato (245x120x120mm)",
      category: "clay_block",
      lengthMm: 245,
      heightMm: 120,
      widthMm: 120,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "UNI EN 771-1",
    },
    availableUnits: [
      {
        id: "it-doppio-uni",
        name: "Doppio UNI Laterizio (245x120x120mm)",
        category: "clay_block",
        lengthMm: 245,
        heightMm: 120,
        widthMm: 120,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "UNI EN 771-1",
      },
      {
        id: "it-blocco-cls",
        name: "Blocco in cls (500x200x200mm)",
        category: "cmu",
        lengthMm: 500,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "UNI EN 771-3",
      },
    ],
    regulatoryNote:
      "NTC 2018 (Norme Tecniche per le Costruzioni) Capitolo 7.8: Costruzioni in muratura.",
  },
  ES: {
    marketCode: "ES",
    countryName: "Spain",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "es-ladrillo-doble",
      name: "Ladrillo hueco doble (240x115x70mm)",
      category: "clay_block",
      lengthMm: 240,
      heightMm: 70,
      widthMm: 115,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "UNE-EN 771-1",
    },
    availableUnits: [
      {
        id: "es-ladrillo-doble",
        name: "Ladrillo hueco doble (240x115x70mm)",
        category: "clay_block",
        lengthMm: 240,
        heightMm: 70,
        widthMm: 115,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "UNE-EN 771-1",
      },
      {
        id: "es-bloque-hormigon",
        name: "Bloque de hormigón (400x200x150mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "UNE-EN 771-3",
      },
    ],
    regulatoryNote:
      "Código Técnico de la Edificación (CTE DB-SE-F: Seguridad Estructural Fábrica).",
  },
  NL: {
    marketCode: "NL",
    countryName: "Netherlands",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "nl-waalformaat",
      name: "Waalformaat (WF) Baksteen (210x100x50mm)",
      category: "brick",
      lengthMm: 210,
      heightMm: 50,
      widthMm: 100,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "NEN-EN 771-1",
    },
    availableUnits: [
      {
        id: "nl-waalformaat",
        name: "Waalformaat (WF) Baksteen (210x100x50mm)",
        category: "brick",
        lengthMm: 210,
        heightMm: 50,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NEN-EN 771-1",
      },
      {
        id: "nl-kalkzandsteen",
        name: "Kalkzandsteen blok (437x100x198mm)",
        category: "cmu",
        lengthMm: 437,
        heightMm: 198,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "NEN-EN 771-2",
      },
    ],
    regulatoryNote:
      "Besluit bouwwerken leefomgeving (Bbl) & NEN-EN 1996 (Eurocode 6).",
  },
  PL: {
    marketCode: "PL",
    countryName: "Poland",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "pl-porotherm-25",
      name: "Pustak ceramiczny Porotherm 25 (375x250x238mm)",
      category: "clay_block",
      lengthMm: 375,
      heightMm: 238,
      widthMm: 250,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "PN-EN 771-1",
    },
    availableUnits: [
      {
        id: "pl-porotherm-25",
        name: "Pustak ceramiczny 25 (375x250x238mm)",
        category: "clay_block",
        lengthMm: 375,
        heightMm: 238,
        widthMm: 250,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "PN-EN 771-1",
      },
      {
        id: "pl-cegla-pelna",
        name: "Cegła ceramiczna pełna (250x120x65mm)",
        category: "brick",
        lengthMm: 250,
        heightMm: 65,
        widthMm: 120,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "PN-EN 771-1",
      },
    ],
    regulatoryNote:
      "Rozporządzenie Ministra Transportu i Gospodarki Morskiej & PN-EN 1996.",
  },
  SE: {
    marketCode: "SE",
    countryName: "Sweden",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "se-lattbetong",
      name: "Lättbetongblock / Siporex (600x200x200mm)",
      category: "aac",
      lengthMm: 600,
      heightMm: 200,
      widthMm: 200,
      isHollow: false,
      standardJointMm: 3,
      standardMixRatio: "1:3",
      sourceStandard: "SS-EN 771-4",
    },
    availableUnits: [
      {
        id: "se-lattbetong",
        name: "Lättbetongblock (600x200x200mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 200,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "SS-EN 771-4",
      },
      {
        id: "se-tegel",
        name: "Svenskt standardtegel (250x120x62mm)",
        category: "brick",
        lengthMm: 250,
        heightMm: 62,
        widthMm: 120,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SS-EN 771-1",
      },
    ],
    regulatoryNote: "Boverkets byggregler (BBR) & EKS (Eurokoder).",
  },
  CH: {
    marketCode: "CH",
    countryName: "Switzerland",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "ch-modulbackstein",
      name: "Swiss Modul Backstein (290x150x140mm)",
      category: "clay_block",
      lengthMm: 290,
      heightMm: 140,
      widthMm: 150,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "SIA 266 (Mauerwerk)",
    },
    availableUnits: [
      {
        id: "ch-modulbackstein",
        name: "Swiss Modul Backstein (290x150x140mm)",
        category: "clay_block",
        lengthMm: 290,
        heightMm: 140,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SIA 266",
      },
    ],
    regulatoryNote:
      "Schweizerischer Ingenieur- und Architektenverein Norm SIA 266 (Mauerwerk).",
  },
  SG: {
    marketCode: "SG",
    countryName: "Singapore",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "sg-clay-brick",
      name: "Standard Clay Brick (215x102.5x65mm)",
      category: "brick",
      lengthMm: 215,
      heightMm: 65,
      widthMm: 102.5,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "SS 103 (Specification for clay bricks)",
    },
    availableUnits: [
      {
        id: "sg-clay-brick",
        name: "Standard Clay Brick (215x102.5x65mm)",
        category: "brick",
        lengthMm: 215,
        heightMm: 65,
        widthMm: 102.5,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "SS 103",
      },
      {
        id: "sg-aac-block",
        name: "AAC Autoclaved Block (600x200x100mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 200,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "SS EN 771-4",
      },
    ],
    regulatoryNote:
      "BCA Approved Document & SS EN 1996 (Singapore Annex to Eurocode 6).",
  },
  JP: {
    marketCode: "JP",
    countryName: "Japan",
    cementBagWeightKg: 25,
    defaultUnit: {
      id: "jp-concrete-block-120",
      name: "JIS C-Block 120 (390x190x120mm)",
      category: "cmu",
      lengthMm: 390,
      heightMm: 190,
      widthMm: 120,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:3",
      sourceStandard: "JIS A 5406 (Architectural concrete blocks)",
    },
    availableUnits: [
      {
        id: "jp-concrete-block-120",
        name: "JIS Concrete Block (390x190x120mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 120,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:3",
        sourceStandard: "JIS A 5406",
      },
      {
        id: "jp-brick",
        name: "JIS Standard Brick (210x100x60mm)",
        category: "brick",
        lengthMm: 210,
        heightMm: 60,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:3",
        sourceStandard: "JIS R 1250",
      },
    ],
    regulatoryNote:
      "Building Standard Law of Japan (BSLJ) Enforcement Order Chapter 4 Section 3 & AIJ Standards.",
  },
  KR: {
    marketCode: "KR",
    countryName: "South Korea",
    cementBagWeightKg: 40,
    defaultUnit: {
      id: "kr-standard-brick",
      name: "Standard Red Brick (190x90x57mm)",
      category: "brick",
      lengthMm: 190,
      heightMm: 57,
      widthMm: 90,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "KS L 4201 (Clay bricks)",
    },
    availableUnits: [
      {
        id: "kr-standard-brick",
        name: "Standard Clay Brick (190x90x57mm)",
        category: "brick",
        lengthMm: 190,
        heightMm: 57,
        widthMm: 90,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "KS L 4201",
      },
      {
        id: "kr-cement-brick",
        name: "Concrete / Cement Brick (190x90x57mm)",
        category: "cmu",
        lengthMm: 190,
        heightMm: 57,
        widthMm: 90,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "KS F 4004",
      },
    ],
    regulatoryNote:
      "Korean Building Code (KBC 2016) Chapter 05 Masonry & MOLIT KCS 41 34 00.",
  },
  CN: {
    marketCode: "CN",
    countryName: "China",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "cn-standard-brick",
      name: "Standard Sintered Brick (240x115x53mm)",
      category: "brick",
      lengthMm: 240,
      heightMm: 53,
      widthMm: 115,
      isHollow: false,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard: "GB/T 5101 (Fired common bricks)",
    },
    availableUnits: [
      {
        id: "cn-standard-brick",
        name: "Standard Sintered Brick (240x115x53mm)",
        category: "brick",
        lengthMm: 240,
        heightMm: 53,
        widthMm: 115,
        isHollow: false,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "GB/T 5101",
      },
      {
        id: "cn-aac-block-200",
        name: "AAC Autoclaved Block (600x200x200mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 200,
        widthMm: 200,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "GB 11968",
      },
    ],
    regulatoryNote: "GB 50003-2011 (Code for design of masonry structures).",
  },
  ID: {
    marketCode: "ID",
    countryName: "Indonesia",
    cementBagWeightKg: 40, // standard retail bag 40kg / 50kg
    defaultUnit: {
      id: "id-bata-merah",
      name: "Bata Merah Bakar (200x100x50mm)",
      category: "brick",
      lengthMm: 200,
      heightMm: 50,
      widthMm: 100,
      isHollow: false,
      standardJointMm: 15, // traditional thick mortar bed
      standardMixRatio: "1:4",
      sourceStandard:
        "SNI 15-2094-2000 (Bata merah pejal untuk pasangan dinding)",
    },
    availableUnits: [
      {
        id: "id-bata-merah",
        name: "Bata Merah (200x100x50mm)",
        category: "brick",
        lengthMm: 200,
        heightMm: 50,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 15,
        standardMixRatio: "1:4",
        sourceStandard: "SNI 15-2094-2000",
      },
      {
        id: "id-bata-ringan-hebel",
        name: "Bata Ringan / Hebel (600x200x100mm)",
        category: "aac",
        lengthMm: 600,
        heightMm: 200,
        widthMm: 100,
        isHollow: false,
        standardJointMm: 3,
        standardMixRatio: "1:3",
        sourceStandard: "SNI 03-6886-2002",
      },
    ],
    regulatoryNote:
      "SNI 2847 & SNI 1726 (Tata Cara Perencanaan Struktur Tahan Gempa).",
  },
  BR: {
    marketCode: "BR",
    countryName: "Brazil",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "br-bloco-ceramico-14",
      name: "Bloco Cerâmico de Vedação (190x190x140mm)",
      category: "clay_block",
      lengthMm: 190,
      heightMm: 190,
      widthMm: 140,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard:
        "ABNT NBR 15270 (Componentes cerâmicos - Blocos e tijolos)",
    },
    availableUnits: [
      {
        id: "br-bloco-ceramico-14",
        name: "Bloco Cerâmico 14 (190x190x140mm)",
        category: "clay_block",
        lengthMm: 190,
        heightMm: 190,
        widthMm: 140,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "ABNT NBR 15270",
      },
      {
        id: "br-bloco-concreto-14",
        name: "Bloco de Concreto Estrutural (390x190x140mm)",
        category: "cmu",
        lengthMm: 390,
        heightMm: 190,
        widthMm: 140,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "ABNT NBR 6136",
      },
    ],
    regulatoryNote: "ABNT NBR 16868 (Alvenaria estrutural) & NBR 15270.",
  },
  MX: {
    marketCode: "MX",
    countryName: "Mexico",
    cementBagWeightKg: 50,
    defaultUnit: {
      id: "mx-tabique-rojo",
      name: "Tabique Rojo Recocido (240x120x60mm)",
      category: "brick",
      lengthMm: 240,
      heightMm: 60,
      widthMm: 120,
      isHollow: false,
      standardJointMm: 12,
      standardMixRatio: "1:4",
      sourceStandard: "NMX-C-404-ONNCCE (Bloques, tabiques o ladrillos)",
    },
    availableUnits: [
      {
        id: "mx-tabique-rojo",
        name: "Tabique Rojo Recocido (240x120x60mm)",
        category: "brick",
        lengthMm: 240,
        heightMm: 60,
        widthMm: 120,
        isHollow: false,
        standardJointMm: 12,
        standardMixRatio: "1:4",
        sourceStandard: "NMX-C-404-ONNCCE",
      },
      {
        id: "mx-block-concreto-15",
        name: "Block de Concreto (400x200x150mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 150,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard: "NMX-C-404-ONNCCE",
      },
    ],
    regulatoryNote:
      "Normas Técnicas Complementarias para Diseño y Construcción de Estructuras de Mampostería (RCDF-CDMX 2023).",
  },
};

/**
 * Universal fallback configuration for markets not explicitly in registry.
 */
export function resolveMarketMasonryConfig(
  marketCode: string,
): MarketMasonryConfig {
  const upper = (marketCode || "UNSPECIFIED").toUpperCase();
  if (MASONRY_MARKET_REGISTRY[upper]) {
    return MASONRY_MARKET_REGISTRY[upper];
  }

  // Explicitly unverified generic geometry for unsupported markets; this is not a national standard.
  return {
    marketCode: upper,
    countryName: upper,
    cementBagWeightKg: 50,
    defaultUnit: {
      id: `${upper.toLowerCase()}-default-block`,
      name: "Standard Hollow Concrete Block (400x200x200mm)",
      category: "cmu",
      lengthMm: 400,
      heightMm: 200,
      widthMm: 200,
      isHollow: true,
      standardJointMm: 10,
      standardMixRatio: "1:4",
      sourceStandard:
        "Unverified generic placeholder; confirm product dimensions",
    },
    availableUnits: [
      {
        id: `${upper.toLowerCase()}-default-block`,
        name: "Standard Concrete Block (400x200x200mm)",
        category: "cmu",
        lengthMm: 400,
        heightMm: 200,
        widthMm: 200,
        isHollow: true,
        standardJointMm: 10,
        standardMixRatio: "1:4",
        sourceStandard:
          "Unverified generic placeholder; confirm product dimensions",
      },
    ],
    regulatoryNote:
      "No maintained market-specific unit profile. This generic geometry is only a user-editable placeholder and must not be treated as a national standard.",
  };
}

export interface MasonryCalculationInput {
  marketCode: string;
  wallLengthM: number;
  wallHeightM: number;
  wallCount?: number;
  selectedUnitId?: string;
  customUnit?: Partial<MasonryUnitProfile>;
  jointThicknessMm?: number;
  openings?: MasonryOpening[];
  mortarMixRatio?: "1:3" | "1:4" | "1:5" | "1:6";
  wastePercent?: number; // default 5%
  /**
   * How many leaves the entered wall area represents. The area is always read
   * as ONE leaf's face, so a UK cavity wall (two leaves) or a Chinese 240 mm
   * wall (a 115 mm face repeated through the thickness) needs 2. Left unset it
   * is 1, which keeps every single-leaf market (US CMU, AE block, IN brick)
   * exactly as it was.
   */
  leafCount?: number;
}

export interface MasonryCalculationResult {
  marketCode: string;
  grossWallAreaM2: number;
  openingsAreaM2: number;
  netWallAreaM2: number;
  unit: MasonryUnitProfile;
  unitsPerM2: number;
  /** Units per square metre of the entered face, i.e. per leaf. */
  unitsPerM2Effective: number;
  leafCount: number;
  unitsRequiredNet: number;
  unitsRequiredGross: number; // rounded up
  mortarVolumeM3Net: number;
  mortarVolumeM3Gross: number; // with dry expansion/shrinkage factor ~ 1.33 and waste
  cementBagWeightKg: number;
  cementBagsRequired: number; // rounded up
  sandVolumeM3: number;
  sandWeightTonnes: number;
  waterLiters: number;
  estimatedLaborHours: {
    masonHours: number;
    helperHours: number;
  };
  marketNotes: string;
  packagingEvidence: ReturnType<typeof getPackagingEvidence>;
}

export const MORTAR_PARTS: Record<string, { cement: number; sand: number }> = {
  "1:3": { cement: 1, sand: 3 },
  "1:4": { cement: 1, sand: 4 },
  "1:5": { cement: 1, sand: 5 },
  "1:6": { cement: 1, sand: 6 },
};

/**
 * Markets whose ordinary wall is more than one leaf of the default unit.
 * China builds 240 mm walls from 115 mm bricks (115 + 10 + 115), and a UK
 * cavity wall is two leaves. Every other market builds single leaf walls from
 * its default unit, so the default stays 1 there.
 */
export const DEFAULT_LEAF_COUNT_BY_MARKET: Record<string, number> = {
  CN: 2,
  GB: 2,
};

export function defaultLeafCountFor(marketCode: string): number {
  return DEFAULT_LEAF_COUNT_BY_MARKET[marketCode] ?? 1;
}

/**
 * Thickness occupied by a build-up: one unit width per leaf plus one joint
 * between each pair of leaves. This is why a Chinese 240 mm wall is
 * 115 + 10 + 115, and why a UK brick is 215 mm long (2 x 102.5 + 10).
 */
export function wallThicknessForLeaves(
  unitWidthMm: number,
  jointMm: number,
  leaves: number,
): number {
  const count = Math.max(1, Math.round(leaves));
  return count * unitWidthMm + (count - 1) * jointMm;
}

export function calculateMasonryTakeoff(
  input: MasonryCalculationInput,
): MasonryCalculationResult {
  const config = resolveMarketMasonryConfig(input.marketCode);
  const wallCount = Math.max(1, input.wallCount ?? 1);
  const wallLength = Math.max(0, input.wallLengthM);
  const wallHeight = Math.max(0, input.wallHeightM);
  const wastePercent = Math.max(0, input.wastePercent ?? 5);

  let activeUnit: MasonryUnitProfile = config.defaultUnit;
  if (input.selectedUnitId) {
    const found = config.availableUnits.find(
      (u) => u.id === input.selectedUnitId,
    );
    if (found) activeUnit = found;
  }
  if (
    input.customUnit &&
    input.customUnit.lengthMm &&
    input.customUnit.heightMm &&
    input.customUnit.widthMm
  ) {
    activeUnit = {
      id: "custom-unit",
      name: input.customUnit.name || "Custom Unit",
      category: input.customUnit.category || "cmu",
      lengthMm: input.customUnit.lengthMm,
      heightMm: input.customUnit.heightMm,
      widthMm: input.customUnit.widthMm,
      isHollow: input.customUnit.isHollow ?? false,
      standardJointMm: input.customUnit.standardJointMm ?? 10,
      standardMixRatio: input.customUnit.standardMixRatio ?? "1:4",
      sourceStandard:
        input.customUnit.sourceStandard || "User-specified custom dimensions",
    };
  }

  const jointMm = Math.max(
    1,
    input.jointThicknessMm ?? activeUnit.standardJointMm,
  );
  const mixRatio = input.mortarMixRatio || activeUnit.standardMixRatio;

  // Geometry
  const grossWallAreaM2 = wallLength * wallHeight * wallCount;
  let openingsAreaM2 = 0;
  if (input.openings && input.openings.length > 0) {
    for (const op of input.openings) {
      openingsAreaM2 +=
        Math.max(0, op.widthM) *
        Math.max(0, op.heightM) *
        Math.max(1, op.quantity);
    }
  }
  const netWallAreaM2 = Math.max(0, grossWallAreaM2 - openingsAreaM2);
  const leafCount = Math.max(1, Math.round(input.leafCount ?? 1));

  // Unit face dimensions with joint (convert mm to m)
  const unitLengthM = activeUnit.lengthMm / 1000.0;
  const unitHeightM = activeUnit.heightMm / 1000.0;
  const unitWidthM = activeUnit.widthMm / 1000.0;
  const jointM = jointMm / 1000.0;

  const faceAreaWithJoint = (unitLengthM + jointM) * (unitHeightM + jointM);
  const unitsPerM2 = faceAreaWithJoint > 0 ? 1.0 / faceAreaWithJoint : 0;
  // Every leaf carries the same face count and the same mortar, so the whole
  // take-off scales with the leaf count rather than silently billing one.
  const unitsPerM2Effective = unitsPerM2 * leafCount;
  const unitsRequiredNet = netWallAreaM2 * unitsPerM2Effective;
  const unitsRequiredGross = Math.ceil(
    unitsRequiredNet * (1 + wastePercent / 100.0),
  );

  // Wet Mortar Volume:
  // Total wall solid envelope volume: netWallAreaM2 * unitWidthM
  // Volume occupied by masonry units:
  // If hollow block: net solid volume is approx 55-60% of gross block volume, but bed & head joints
  // typically apply to face shells plus webs. Standard industry formula for hollow block:
  // mortar wet volume is ~0.015 to 0.022 m3 per m2 of 200mm wall.
  // For solid units: Mortar wet volume = Total Wall Volume - Total Net Units Volume.
  let mortarVolumeM3Net = 0;
  if (activeUnit.isHollow) {
    // Face-shell bedding mortar allowance (~0.018 m3 per m2 for 200mm block)
    const factor = (unitWidthM / 0.2) * 0.018;
    mortarVolumeM3Net = netWallAreaM2 * factor * leafCount;
  } else {
    // Solid units: one leaf of thickness unitWidthM per leaf.
    const totalWallVolume = netWallAreaM2 * unitWidthM * leafCount;
    const unitsVolume =
      unitsRequiredNet * (unitLengthM * unitHeightM * unitWidthM);
    mortarVolumeM3Net = Math.max(0, totalWallVolume - unitsVolume);
  }

  // Dry volume conversion factor: 1.33 for shrinkage/void filling + waste
  const dryFactor = 1.33;
  const mortarVolumeM3Gross =
    mortarVolumeM3Net * dryFactor * (1 + wastePercent / 100.0);

  // Mix proportions
  const parts = MORTAR_PARTS[mixRatio] || MORTAR_PARTS["1:4"];
  const totalParts = parts.cement + parts.sand;
  const cementVolM3 = mortarVolumeM3Gross * (parts.cement / totalParts);
  const sandVolM3 = mortarVolumeM3Gross * (parts.sand / totalParts);

  // Densities: Cement = 1440 kg/m3, Sand = 1600 kg/m3 (dry loose/bulk)
  const cementKg = cementVolM3 * 1440.0;
  const cementBagWeight = config.cementBagWeightKg;
  const packagingEvidence = getPackagingEvidence(
    config.marketCode,
    "cement",
    MASONRY_MARKET_REGISTRY[config.marketCode]?.cementBagWeightKg,
  );
  if (!MASONRY_MARKET_REGISTRY[config.marketCode]) {
    packagingEvidence.guidance = `No maintained cement pack profile for ${config.marketCode}; the legacy 50 kg placeholder is used only to preserve a rough quantity output. Confirm actual packaging before use.`;
    packagingEvidence.label =
      "Unverified placeholder · supplier confirmation required";
    packagingEvidence.status = "not_available";
  }
  const cementBagsRequired = Math.ceil(cementKg / cementBagWeight);

  const sandWeightTonnes = Number((sandVolM3 * 1.6).toFixed(2));
  const waterLiters = Math.round(cementKg * 0.55); // W/C ratio 0.55

  // Labor Estimation (based on RSMeans & SMM7 historical rates)
  // Blocks: ~0.06 hr mason per unit, Bricks: ~0.03 hr mason per unit
  const masonRatePerHour = activeUnit.category === "brick" ? 0.03 : 0.06;
  const masonHours = Number((unitsRequiredGross * masonRatePerHour).toFixed(1));
  const helperHours = Number((masonHours * 0.75).toFixed(1));

  return {
    marketCode: config.marketCode,
    grossWallAreaM2: Number(grossWallAreaM2.toFixed(2)),
    openingsAreaM2: Number(openingsAreaM2.toFixed(2)),
    netWallAreaM2: Number(netWallAreaM2.toFixed(2)),
    unit: activeUnit,
    unitsPerM2: Number(unitsPerM2.toFixed(2)),
    unitsPerM2Effective: Number(unitsPerM2Effective.toFixed(2)),
    leafCount,
    unitsRequiredNet: Math.round(unitsRequiredNet),
    unitsRequiredGross,
    mortarVolumeM3Net: Number(mortarVolumeM3Net.toFixed(3)),
    mortarVolumeM3Gross: Number(mortarVolumeM3Gross.toFixed(3)),
    cementBagWeightKg: cementBagWeight,
    cementBagsRequired,
    sandVolumeM3: Number(sandVolM3.toFixed(2)),
    sandWeightTonnes,
    waterLiters,
    estimatedLaborHours: {
      masonHours,
      helperHours,
    },
    marketNotes: `${config.regulatoryNote} ${packagingEvidence.guidance}`,
    packagingEvidence,
  };
}
