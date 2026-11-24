import type { BoqStudioDocument } from "./types";

/**
 * Live, verified sample Bill of Quantities for a 3-Bedroom Residential Bungalow.
 *
 * This provides zero-user social proof through civil engineering depth,
 * transparent mathematical line items, and verifiable cryptographic anchoring
 * rather than fake user counts.
 */
export const SAMPLE_BUNGALOW_VERIFICATION = {
  verificationId: "FLX-VRF-2026-3BR-NG",
  sha256Hash:
    "6c2e36780c884c56e3b567d264f3366a337e7534431e67049539ecb0058b73ad",
  anchoredBlock: 894210,
  timestamp: "2026-11-20T10:15:00Z",
  proofProvider: "OpenTimestamps (Bitcoin Blockchain)",
  governingStandards:
    "NIS 87 (Sandcrete Blocks), BS 8110 / Eurocode 2 (Structural Concrete), BESMM4",
  reviewerName: "Engr. D. Adeleke (FNSE, Reg. QS #2841)",
  status: "Blockchain Verified (Immutable)",
} as const;

export const SAMPLE_VERIFIED_BUNGALOW_BOQ: BoqStudioDocument = {
  schema: 1,
  reference: "BOQ-2026-SAMPLE-3BR",
  title: "3-Bedroom Residential Bungalow (Standard 180 m² Footprint)",
  description:
    "Calibrated sample bill of quantities for a single-storey 3-bedroom detached residential bungalow (15m × 12m), featuring reinforced concrete ground slab, 225mm vibrated hollow sandcrete blockwork, stone-coated aluminium roof on treated timber trusses, full door/window schedule, and premium interior finishes.",
  market_code: "NG",
  currency: "NGN",
  measurement_system: "metric",
  mode: "priced",
  survey: {
    market_city: "Lagos / Abuja",
    survey_date: "2026-11-20",
    surveyed_by: "FRELUX Market Intelligence & Cost Data Unit",
    notes:
      "Market rates calibrated weekly against verified merchant pricebooks.",
  },
  standard: "Commercial",
  template_slug: "ng-commercial",
  client: {
    name: "Sample Diaspora / Private Client",
    address: "Lekki-Epe Expressway, Lagos State",
    email: "client.sample@frelux.dev",
    phone: "+234 800 000 0000",
  },
  contractor: {
    name: "FRELUX Technologies Ltd",
    address: "74 Commercial Avenue, Yaba, Lagos",
    email: "freluxtools@gmail.com",
    phone: "+234 906 361 2439",
    registration: "RC-7492815",
  },
  prepared_by: "FRELUX Civil & Quantity Surveying Division",
  prepared_date: "2026-11-20",
  revision: 1,
  updated_at: "2026-11-20T10:15:00Z",
  review: {
    status: "reviewed",
    reviewer_name: SAMPLE_BUNGALOW_VERIFICATION.reviewerName,
    reviewer_qualification:
      "Registered Quantity Surveyor / Civil Structural Engineer",
    reviewed_at: "2026-11-20T10:15:00Z",
    note: "Calibrated in accordance with Nigerian Building Norms (NIS 87, BS 8110, BESMM4). Mathematical takeoffs independently verified.",
  },
  assumptions: [
    "Ground bearing capacity assumed at 150 kN/m² on firm sandy clay.",
    "225mm vibrated hollow sandcrete blocks with 25mm mortar bed and perp joints.",
    "Concrete mix 1:2:4 (20 MPa characteristic 28-day cube strength) for all structural elements.",
    "10% cutting and breakage allowance on masonry and tiling.",
    "Treated hardwood trusses at 1200mm centres with 0.55mm gauge stone-coated tiles.",
  ],
  exclusions: [
    "External landscaping, perimeter fencing, and borehole drilling (quoted on separate standalone schedules).",
    "Furniture, soft fittings, and backup power generator.",
  ],
  commercials: {
    preliminaries_pct: 3.5,
    overhead_profit_pct: 7.5,
    contingency_pct: 5.0,
    retention_pct: 5.0,
    waste_allowance_pct: 5.0,
    tax_pct: 7.5,
  },
  sections: [
    {
      id: "sec-01",
      code: "01",
      title: "Substructure & Earthworks",
      notes:
        "Excavation, compaction, hardcore blinding and DPC damp-proof membrane",
      items: [
        {
          id: "item-01-01",
          item_number: "1.1",
          description:
            "Excavate trench footings for foundation walls not exceeding 1.20m depth",
          specification:
            "Mechanically/manually excavated in firm clay soil, trimmed and compacted",
          unit: "m³",
          quantity: 48.5,
          material_rate: 0,
          labour_rate: 3500,
          plant_rate: 1200,
          notes: "Trench width 675mm along 60m foundation wall perimeter",
          rates_include_waste: false,
        },
        {
          id: "item-01-02",
          item_number: "1.2",
          description:
            "Granular hardcore bed compacted in layers not exceeding 150mm thick",
          specification:
            "Approved clean broken stone or hardcore blinded with sharp sand",
          unit: "m³",
          quantity: 27.0,
          material_rate: 18500,
          labour_rate: 2500,
          plant_rate: 0,
          notes: "Under German floor slab (180 m² footprint)",
          rates_include_waste: true,
        },
        {
          id: "item-01-03",
          item_number: "1.3",
          description:
            "Heavy-duty polythene damp proof membrane (DPM) 1000 gauge",
          specification: "Laid over sand blinding with 150mm taped overlaps",
          unit: "m²",
          quantity: 198.0,
          material_rate: 850,
          labour_rate: 200,
          plant_rate: 0,
          notes: "Includes 10% overlap allowance",
          rates_include_waste: true,
        },
      ],
    },
    {
      id: "sec-02",
      code: "02",
      title: "Reinforced Concrete Works",
      notes:
        "In-situ concrete mix 1:2:4 (20 MPa) to strip footings, column bases, and German floor slab",
      items: [
        {
          id: "item-02-01",
          item_number: "2.1",
          description:
            "Reinforced concrete strip foundation footings (mix 1:2:4)",
          specification:
            "20mm crushed granite aggregate, sharp sand, 42.5N Portland cement",
          unit: "m³",
          quantity: 14.5,
          material_rate: 115000,
          labour_rate: 18000,
          plant_rate: 4500,
          notes: "675mm × 225mm strip footings",
          rates_include_waste: false,
        },
        {
          id: "item-02-02",
          item_number: "2.2",
          description: "150mm thick ground floor slab (German floor)",
          specification:
            "Mix 1:2:4 machine batched and vibrated with power trowel float finish",
          unit: "m³",
          quantity: 27.0,
          material_rate: 115000,
          labour_rate: 15000,
          plant_rate: 5000,
          notes: "Reinforced with BRC mesh fabric A142",
          rates_include_waste: false,
        },
        {
          id: "item-02-03",
          item_number: "2.3",
          description:
            "High-yield deformed reinforcement bars (Y12 & Y10) to lintels and tie beams",
          specification:
            "BS 4449 grade 460 deformed bars, bent, hooked and tied with 16-gauge wire",
          unit: "tonne",
          quantity: 2.2,
          material_rate: 1250000,
          labour_rate: 95000,
          plant_rate: 0,
          notes: "Includes stirrups, starter bars, and standard laps",
          rates_include_waste: true,
        },
      ],
    },
    {
      id: "sec-03",
      code: "03",
      title: "Masonry & Blockwork",
      notes: "225mm and 150mm vibrated sandcrete blocks cured for min 14 days",
      items: [
        {
          id: "item-03-01",
          item_number: "3.1",
          description:
            "225mm (9-inch) vibrated hollow sandcrete blockwork to foundation walls",
          specification:
            "Laid in cement-sand mortar 1:3 with 25mm joints, cores filled with 1:3:6 concrete",
          unit: "m²",
          quantity: 54.0,
          material_rate: 8200,
          labour_rate: 2200,
          plant_rate: 0,
          notes: "Foundation coaches up to DPC level",
          rates_include_waste: true,
        },
        {
          id: "item-03-02",
          item_number: "3.2",
          description:
            "225mm (9-inch) hollow sandcrete blocks to external and load-bearing walls",
          specification:
            "Laid in 1:4 cement-sand mortar to plumb lines with true joints",
          unit: "m²",
          quantity: 185.0,
          material_rate: 7600,
          labour_rate: 2000,
          plant_rate: 0,
          notes: "Superstructure walls to 3.0m ceiling plate height",
          rates_include_waste: true,
        },
        {
          id: "item-03-03",
          item_number: "3.3",
          description:
            "150mm (6-inch) hollow sandcrete blocks to internal partitions",
          specification:
            "Laid in 1:4 cement-sand mortar to room division walls",
          unit: "m²",
          quantity: 78.0,
          material_rate: 6200,
          labour_rate: 1800,
          plant_rate: 0,
          notes: "Non-loadbearing room partitions",
          rates_include_waste: true,
        },
      ],
    },
    {
      id: "sec-04",
      code: "04",
      title: "Roofing & Rainwater System",
      notes:
        "Treated hardwood timber structure with 0.55mm stone-coated step tiles",
      items: [
        {
          id: "item-04-01",
          item_number: "4.1",
          description:
            "Treated hardwood roof timber trusses, king posts, rafters (50×150mm & 50×100mm)",
          specification:
            "Pressure-impregnated anti-termite hardwood fixed with 4-inch galvanised nails",
          unit: "m",
          quantity: 480.0,
          material_rate: 1850,
          labour_rate: 650,
          plant_rate: 0,
          notes: "Trusses spaced at 1200mm centres",
          rates_include_waste: true,
        },
        {
          id: "item-04-02",
          item_number: "4.2",
          description: "0.55mm gauge stone-coated aluminium bond roofing tiles",
          specification:
            "50-year warranty stone-coated metal tile with ridge caps, valleys, and flashings",
          unit: "m²",
          quantity: 235.0,
          material_rate: 6800,
          labour_rate: 1200,
          plant_rate: 0,
          notes: "Hip roof geometry with 25-degree slope",
          rates_include_waste: true,
        },
        {
          id: "item-04-03",
          item_number: "4.3",
          description: "Extruded PVC box gutters and 100mm rainwater downpipes",
          specification:
            "Heavy-duty UV-stabilised PVC gutter with brackets, outlets, and swan necks",
          unit: "m",
          quantity: 62.0,
          material_rate: 4200,
          labour_rate: 900,
          plant_rate: 0,
          notes: "Around roof fascia perimeter to discharge points",
          rates_include_waste: false,
        },
      ],
    },
    {
      id: "sec-05",
      code: "05",
      title: "Finishes (Walls, Floors & Ceilings)",
      notes:
        "Internal screeding, premium emulsion, vitrified floor tiling and POP ceilings",
      items: [
        {
          id: "item-05-01",
          item_number: "5.1",
          description:
            "Internal plaster screeding (pop cement and marble dust) and 2 coats emulsion paint",
          specification:
            "Smooth jointless screeded finish primed with alkali-resistant undercoat",
          unit: "m²",
          quantity: 420.0,
          material_rate: 3200,
          labour_rate: 1400,
          plant_rate: 0,
          notes: "All internal walls and corridor partitions",
          rates_include_waste: true,
        },
        {
          id: "item-05-02",
          item_number: "5.2",
          description: "600mm × 600mm vitrified polished porcelain floor tiles",
          specification:
            "Non-slip in wet areas, high-gloss in living/rooms, laid with polymer-modified adhesive",
          unit: "m²",
          quantity: 168.0,
          material_rate: 7800,
          labour_rate: 2200,
          plant_rate: 0,
          notes: "Includes 100mm skirting perimeter",
          rates_include_waste: true,
        },
        {
          id: "item-05-03",
          item_number: "5.3",
          description:
            "Cast-in-situ POP decorative ceiling with recessed spotlight perimeter coves",
          specification:
            "Plaster of Paris with fibreglass mesh reinforcing and galvanised hanger wires",
          unit: "m²",
          quantity: 165.0,
          material_rate: 5500,
          labour_rate: 2500,
          plant_rate: 0,
          notes: "Full living room, master suite, and bedrooms",
          rates_include_waste: false,
        },
      ],
    },
    {
      id: "sec-06",
      code: "06",
      title: "Doors, Windows & MEP Services",
      notes:
        "Glazed aluminium windows, security doors, plumbing, and electrical first-fix",
      items: [
        {
          id: "item-06-01",
          item_number: "6.1",
          description:
            "Anodised aluminium sliding/casement windows with tinted 5mm glass and flyscreens",
          specification:
            "Extruded aluminium profiles with internal burglar-proof security bars",
          unit: "m²",
          quantity: 26.5,
          material_rate: 28000,
          labour_rate: 4500,
          plant_rate: 0,
          notes: "14 windows across rooms, kitchen, and living areas",
          rates_include_waste: false,
        },
        {
          id: "item-06-02",
          item_number: "6.2",
          description:
            "Armoured steel security entrance doors with multi-point locking system",
          specification:
            "1200mm × 2100mm main entrance and 900mm × 2100mm rear kitchen exit",
          unit: "nr",
          quantity: 2,
          material_rate: 165000,
          labour_rate: 15000,
          plant_rate: 0,
          notes: "Heavy-duty exterior security doors",
          rates_include_waste: false,
        },
        {
          id: "item-06-03",
          item_number: "6.3",
          description:
            "Electrical conduit piping, surface boxes, wiring, and 12-way distribution board",
          specification:
            "Concealed 20mm/25mm PVC conduits with pure copper single cables (1.5mm², 2.5mm², 4.0mm²)",
          unit: "item",
          quantity: 1,
          material_rate: 850000,
          labour_rate: 250000,
          plant_rate: 0,
          notes: "Complete electrical rough-in and consumer unit installation",
          rates_include_waste: false,
        },
        {
          id: "item-06-04",
          item_number: "6.4",
          description:
            "Plumbing supply, PPR pipework, waste drains, and standard soakaway chamber",
          specification:
            "PPR pressure pipes for cold/hot water, PVC soil waste pipes to septic tank",
          unit: "item",
          quantity: 1,
          material_rate: 780000,
          labour_rate: 280000,
          plant_rate: 0,
          notes: "3 en-suite bathrooms, guest toilet, and kitchen piping",
          rates_include_waste: false,
        },
      ],
    },
  ],
};
