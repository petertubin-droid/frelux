import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the EIFS / ETICS Wall Estimator.
 *
 * Exterior Insulation and Finish Systems (EIFS), known in Europe as External
 * Thermal Insulation Composite Systems (ETICS), provide continuous exterior
 * insulation, water-resistive barrier protection, and synthetic textured finishes.
 */
export const eifsWallEstimatorGuide: CalculatorGuide = {
  slug: "eifs-wall-estimator",
  heading: "How the EIFS and ETICS wall takeoff estimator works",
  howItWorks: [
    "Measure gross external wall area by multiplying building perimeter by storey wall height. Next, deduct significant window and door fenestration openings to establish net EIFS wall surface area.",
    "Schedule continuous insulation boards. Rigid expanded polystyrene (EPS Type I or II), extruded polystyrene (XPS), or non-combustible mineral wool boards are selected based on thermal R-value targets and regional fire codes. Boards are quantified in net area plus 5% to 8% cutting and trimming waste.",
    "Quantify adhesive and mechanical fasteners. Insulation boards are bonded to approved masonry or sheathing substrates using polymer-modified cementitious adhesive applied in a continuous perimeter ribbon with interior adhesive notches, supplemented with wind-load engineered mechanical anchor fixings.",
    "Schedule reinforcing alkali-resistant fiberglass mesh and base coat mortar. A continuous layer of 160 g/m2 alkali-resistant mesh is fully embedded into a 3 mm to 5 mm cementitious base coat with minimum 65 mm to 100 mm edge overlaps. High-impact areas at ground level require an extra layer of 500 g/m2 heavy-duty mesh.",
    "Calculate acrylic synthetic primer, finish texture coat, and flashing trims. Primer seals the cured base coat, followed by a flexible, dirt-pick-up resistant (DPR) 100% acrylic synthetic finish plaster in the chosen aggregate texture. PVC starter weep screeds, casing beads, corner mesh, and expansion joints complete the assembly.",
  ],
  workedExample: {
    intro:
      "A 2-storey commercial office facade with 320 square metres of gross exterior wall area, 48 square metres of window and entrance glazing deductions (272 square metres net EIFS area), using 75 mm rigid EPS boards, base coat with embedded reinforcing mesh, and 1.5 mm acrylic sand-pebble texture finish.",
    steps: [
      { label: "Gross facade wall area", value: "320.0 m2" },
      {
        label: "Glazing opening deductions",
        value: "48.0 m2 (doors and windows)",
      },
      { label: "Net EIFS insulated wall area", value: "272.0 m2" },
      {
        label: "EPS insulation boards (75 mm)",
        value:
          "288.0 m2 (including 6% cutting waste, 144 standard 1.2m x 0.6m boards)",
      },
      {
        label: "Polymer adhesive mortar",
        value: "1,224 kg (49 bags of 25 kg, based on 4.5 kg/m2)",
      },
      {
        label: "Mechanical anchor fasteners",
        value: "1,360 units (5 anchors per m2 for wind resistance)",
      },
      {
        label: "Alkali-resistant mesh (160 g/m2)",
        value: "305.0 m2 (6 rolls of 50 m2, allowing 12% for joint overlaps)",
      },
      {
        label: "Cementitious base coat mortar",
        value: "1,360 kg (55 bags of 25 kg, based on 5.0 kg/m2)",
      },
      {
        label: "Tinted acrylic primer",
        value: "54.4 litres (3 pails of 20 L, coverage 5.0 m2/L)",
      },
      {
        label: "Acrylic texture finish (1.5 mm)",
        value: "680 kg (28 pails of 25 kg, coverage 2.5 kg/m2)",
      },
      {
        label: "PVC starter track weep screed",
        value: "64.0 linear metres along bottom edge",
      },
    ],
    result:
      "Calculated system bill of materials covers 288 m2 EPS insulation, 104 bags total mortar, 6 rolls mesh, 1,360 anchors, 3 pails primer, 28 pails finish, and 64 m starter track.",
    note: "Does not include perimeter silicone joint sealants, scaffolding rental, or substrate moisture barrier membranes.",
  },
  ratioTable: {
    caption:
      "Standard EIFS and ETICS material coverage rates, board densities, and component ratios",
    columns: [
      "System Layer & Component",
      "Typical Consumption / Coverage",
      "Packaging Unit",
      "Recommended Waste Allowance",
    ],
    rows: [
      [
        "EPS Insulation Board (Type I)",
        "1.0 m2 net wall area",
        "0.72 m2 (1200 x 600 mm sheet)",
        "5% to 8% cutting waste",
      ],
      [
        "Mineral Wool Insulation Board",
        "1.0 m2 net wall area",
        "0.72 m2 (1200 x 600 mm slab)",
        "6% to 10% cutting waste",
      ],
      [
        "Polymer Adhesive Mortar",
        "4.0 to 5.0 kg per m2",
        "25 kg dry powder sack",
        "5% mixing container residue",
      ],
      [
        "Mechanical EIFS Anchors",
        "4 to 6 units per m2",
        "Boxes of 100 or 250 anchors",
        "5% site breakage loss",
      ],
      [
        "Alkali-Resistant Mesh (160g)",
        "1.0 m2 net wall area",
        "50 m2 roll (1.0 m x 50 m)",
        "10% to 12% lap allowance",
      ],
      [
        "Cementitious Base Coat",
        "4.5 to 5.5 kg per m2",
        "25 kg dry powder sack",
        "5% mixing container residue",
      ],
      [
        "Tinted Acrylic Primer",
        "0.18 to 0.22 L per m2",
        "20 L plastic pail",
        "5% pail residue loss",
      ],
      [
        "Synthetic Acrylic Finish (1.5mm)",
        "2.2 to 2.8 kg per m2",
        "25 kg ready-mixed pail",
        "5% tool scraping loss",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between barrier EIFS and water-drainage EIFS?",
      answer:
        "Older barrier EIFS relied exclusively on the exterior lamina face to keep out rainwater, which caused moisture entrapment problems if caulk joints failed. Modern exterior insulation specifications mandate water-drainage EIFS (ETICS with drainage cavity), which incorporates a continuous water-resistive air barrier membrane (WRB) on the sheathing, grooved insulation boards, and starter weep screeds to allow incidental moisture to drain harmlessly outside.",
    },
    {
      question:
        "Why must EIFS reinforcing fiberglass mesh be alkali-resistant?",
      answer:
        "Cementitious base coat mortars are highly alkaline due to the hydration of Portland cement (pH 12 to 13). Standard textile fiberglass mesh degrades rapidly when exposed to prolonged alkaline moisture, causing the render face to crack and delaminate. EIFS reinforcing mesh is specially coated with styrene-butadiene rubber (SBR) to provide verified alkali resistance under ASTM C1177 and ETAG 004.",
    },
    {
      question:
        "How are corner windows and doors reinforced to prevent diagonal cracking?",
      answer:
        "Standard EIFS detailing requires installing 300 mm x 400 mm butterfly diagnostic mesh patches oriented diagonally at 45 degrees across all four corners of every door and window opening before applying the main wall mesh. In addition, insulation board joints must never align with the corners of openings; boards must be cut into L-shaped shapes to span the opening corner by at least 150 mm.",
    },
    {
      question:
        "Can EIFS finish be applied directly over uninsulated concrete or brick masonry?",
      answer:
        "Yes, synthetic acrylic finishes can be applied over existing sound concrete or cement plaster substrates as a decorative textured render. However, this is termed direct-applied finish (DAFS) rather than EIFS, because it omits continuous thermal insulation boards and does not contribute to building continuous R-value energy conservation targets.",
    },
    {
      question:
        "Does this estimator certify local energy or fire code compliance?",
      answer:
        "No. This calculator produces preliminary material quantities, coverage ratios, and bills of materials. Continuous insulation R-value compliance with local energy standards (such as ASHRAE 90.1, IECC, or EU EPBD) and fire barrier requirements for combustible foam plastic insulation must be reviewed by a qualified building envelope architect or facade engineer.",
    },
  ],
  limits:
    "This calculator provides preliminary material takeoff schedules for budgeting. It does not replace project-specific dew-point condensation analysis, wind-load anchor engineering, or manufacturer warranty system specifications.",
};
