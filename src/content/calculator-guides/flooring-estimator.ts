import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const flooringEstimatorGuide: CalculatorGuide = {
  slug: "flooring-estimator",
  heading:
    "Flooring area, subfloor screed, tile, timber, and finish takeoff guide",
  howItWorks: [
    "Flooring estimation evaluates the complete layered assembly required to transform raw structural slabs into finished, level, and durable architectural floors. The assembly consists of three integrated strata: moisture protection and substrate preparation, leveling screed or acoustic underlayment, and the visible wear finish (such as porcelain tiles, solid or engineered hardwood, laminate planks, luxury vinyl tiles, or seamless epoxy coatings).",
    "Net surface area takeoff measures the clear internal floor dimensions across rooms, corridors, and wardrobe recesses, with additions for door openings where flooring passes through thresholds. Waste allowances depend heavily on room geometry and layout patterns: standard straight grid laying requires 8% to 10% cutting waste; diagonal 45-degree tile layouts require 12% to 15% waste; and intricate herringbone, chevron, or parquet patterns require 15% to 18% waste to compensate for corner edge cuts and offcuts.",
    "Subfloor leveling screeds bridge uneven concrete base slabs and provide a flat, bondable bed for finishes. Bonded sand-cement screeds (typically 1:3 or 1:4 cement to sharp sand mix) are laid at 40 mm to 50 mm thickness. Volume equals net floor area multiplied by nominal screed thickness: for example, 100 m² of floor at 50 mm thickness consumes 5.0 cubic metres of screed mortar, requiring approximately 35 to 40 bags of 50 kg cement and 6.5 tonnes of sharp washed sand.",
    "Finishing materials are ordered in commercial carton or box multiples based on manufacturer packaging specs. A standard box of 600 mm × 600 mm porcelain tiles contains 4 tiles covering 1.44 m², while laminate or engineered wood planks typically pack 1.80 m² to 2.40 m² per carton. Takeoff rounds calculated box quantities upward to ensure complete cartons of identical manufacturing batch and dye lot codes, preventing noticeable shade variations across adjacent rooms.",
    "Bonding mortars, grouts, underlayments, and perimeter trims finish the installation. Tile adhesives (cementitious C2TE or polymer-modified formulations) are budgeted at 4.5 kg to 6.0 kg per square metre for large-format tiles using a 10 mm to 12 mm notched trowel. Flexible anti-mold tile grout consumes 0.30 kg to 0.50 kg per square metre for standard 2 mm to 3 mm grout joints. Perimeter skirting (baseboard) linear metres match room perimeters minus door openings, plus 10% for corner mitre cuts.",
  ],
  workedExample: {
    intro:
      "Modern 3-bedroom residential apartment flooring takeoff: calculating subfloor leveling screed, 600 mm × 600 mm porcelain floor tiles, adhesive mortar, tile grout, and perimeter tiled skirting for a 120.0 m² net floor area with 78 linear metres of internal room perimeters (minus 8 door openings of 0.9 m width = 70.8 m net skirting).",
    steps: [
      {
        label: "Net architectural floor finish area",
        value: "120.0 m² net floor area across living, dining, and bedrooms",
      },
      {
        label:
          "50 mm sand-cement leveling screed mortar volume (120 m² × 0.05 m)",
        value:
          "6.00 m³ screed mortar (plus 10% compaction and batching waste = 6.60 m³)",
      },
      {
        label: "Screed materials (1:4 cement to sharp sand mix)",
        value:
          "45 bags of 50 kg Portland cement and 8.5 metric tonnes sharp sand",
      },
      {
        label: "Gross porcelain tile area with 10% straight-grid cutting waste",
        value: "120.0 m² × 1.10 = 132.0 m² ordered tile coverage",
      },
      {
        label: "Tile box packaging count (600 mm × 600 mm, 1.44 m² per box)",
        value: "132.0 m² ÷ 1.44 m² per box = 91.67 (rounded up to 92 boxes)",
      },
      {
        label: "Polymer-modified C2TE tile adhesive mortar (5.0 kg per m²)",
        value: "120.0 m² × 5.0 kg/m² = 600 kg (30 bags of 20 kg adhesive)",
      },
      {
        label:
          "Flexible water-resistant tile grout (0.35 kg per m² at 2 mm joint)",
        value: "120.0 m² × 0.35 kg/m² = 42 kg (9 bags of 5 kg grout)",
      },
      {
        label:
          "Perimeter tiled skirting linear run (70.8 m net run + 10% mitre waste)",
        value:
          "70.8 m × 1.10 = 77.88 linear metres of skirting tiles (100 mm height)",
      },
      {
        label: "Additional tile boxes for cutting 100 mm skirting strips",
        value:
          "77.88 m ÷ (0.6 m length × 6 strips per tile) = 22 tiles (approx 6 boxes)",
      },
    ],
    result:
      "Complete flooring purchase takeoff: 45 bags (50 kg) cement and 8.5 tonnes sharp sand for screed, 98 boxes (141.1 m²) of 600 mm × 600 mm porcelain tiles (92 floor + 6 skirting), 30 bags (20 kg) polymer tile adhesive, 9 bags (5 kg) flexible tile grout, and 500 tile leveling spacer clips.",
  },
  ratioTable: {
    caption:
      "Flooring finishes, standard substrate preparation, adhesive rates, and pattern cutting waste allowances",
    columns: [
      "Flooring finish and assembly",
      "Nominal thickness / pack specification",
      "Benchmark consumption rate and cutting waste factor",
    ],
    rows: [
      [
        "Bonded sand-cement leveling screed",
        "40 mm to 50 mm thickness (1:4 mix)",
        "0.05 m³ mortar per m² (approx 0.37 bags cement and 70 kg sand per m²)",
      ],
      [
        "Vitrified porcelain floor tiles (straight)",
        "600 mm × 600 mm (1.44 m² per box)",
        "8% to 10% cutting waste allowance",
      ],
      [
        "Vitrified porcelain floor tiles (diagonal 45°)",
        "600 mm × 600 mm (1.44 m² per box)",
        "12% to 15% cutting waste allowance",
      ],
      [
        "Engineered hardwood / laminate planks",
        "8 mm to 14 mm click-lock boards",
        "7% to 10% waste (1.8 m² to 2.4 m² per carton) plus 2 mm foam underlay",
      ],
      [
        "Polymer-modified tile adhesive mortar",
        "20 kg commercial dry-mix bags",
        "4.5 kg to 6.0 kg per m² (using 10 mm to 12 mm notched trowel bed)",
      ],
      [
        "Anti-fungal flexible tile grout",
        "2 mm to 3 mm joint width",
        "0.30 kg to 0.45 kg per m² (sold in 2 kg, 5 kg, and 20 kg bags)",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why do floor tiles crack or sound hollow (drummy) after installation?",
      answer:
        "Hollow or debonded tiles occur when the mortar bed dries prematurely, when the installer spot-bonds (dot and dab technique) rather than spreading a full continuous notched bed, or when tiles are placed over a green uncurred screed that later shrinks. A fresh sand-cement screed must cure for at least 21 to 28 days (or receive a specialized rapid-drying screed additive) before installing rigid porcelain tiles, and adhesive must achieve minimum 85% continuous contact coverage across dry areas and 95% in wet areas.",
    },
    {
      question:
        "What is the difference between ceramic and vitrified porcelain floor tiles?",
      answer:
        "Vitrified porcelain tiles are pressed from refined white clay, silica, and feldspar under massive hydraulic pressure and fired at over 1,200 degrees Celsius, resulting in water absorption below 0.5%. Ceramic tiles use coarser clays fired at lower temperatures, absorbing 3% to 7% water. Porcelain is significantly harder, frost-resistant, and impervious to heavy foot traffic, but requires polymer-modified C2-grade adhesive because standard cement mortar cannot mechanically bond to its non-porous underside.",
    },
    {
      question:
        "When are movement and perimeter expansion joints required in floor finishes?",
      answer:
        "Rigid tile and timber floors expand and contract with ambient temperature swings and structural building movements. Perimeter expansion gaps (minimum 6 mm to 10 mm hidden under the skirting board) must be left around every wall, column, and door threshold. In large open spaces, intermediate movement joints (flexible polyurethane or silicone sealant lines) are required every 6 to 8 metres in each direction, and every 4 to 5 metres in areas exposed to direct sunlight.",
    },
    {
      question:
        "How do you calculate the exact number of boxes of tiles to order?",
      answer:
        "Measure the net floor area in square metres, multiply by the selected layout waste factor (for example, multiply by 1.10 for straight grid or 1.15 for diagonal pattern), and add tile area needed for perimeter skirting. Divide this gross square metre figure by the exact square metre coverage printed on the manufacturer's tile carton (for example, 1.44 m² per box of four 600 mm × 600 mm tiles). Always round the result up to the next whole carton, plus one extra box kept as attic stock for future plumbing or tile repairs.",
    },
    {
      question:
        "What type of underlayment is needed beneath laminate or engineered timber?",
      answer:
        "Floating laminate and engineered wood floors require a continuous moisture barrier and acoustic cushion. Over ground-contact concrete slabs, installers must lay a 200-micron (0.2 mm) virgin polyethylene damp-proof membrane (DPM) with seams lapped 200 mm and taped with waterproof vapor tape, followed by a 2 mm to 3 mm high-density closed-cell foam or natural cork underlayment to absorb footfall noise and smooth minor slab imperfections.",
    },
  ],
  limits:
    "Preliminary architectural finish takeoff and purchase scheduling only. Material yields depend on subfloor level tolerance, trowel notch size, and substrate flatness. Subfloors must undergo moisture vapor emission testing (RH below 75% or calcium chloride test below 3 lbs/1,000 sq ft) before installing moisture-sensitive wood or vinyl floor coverings.",
};
