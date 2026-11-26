import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Renovation Estimator.
 *
 * Renovation projects require measuring existing structures room by room,
 * accounting for demolition, surface preparation, repairs, new finishes, and
 * fixtures without double counting or hiding contingency risks.
 */
export const renovationEstimatorGuide: CalculatorGuide = {
  slug: "renovation-estimator",
  heading: "How the renovation estimator works",
  howItWorks: [
    "Assemble a room-by-room schedule of dimensions. For each room, record perimeter length, ceiling height, and floor area, deducting significant door and window openings to establish exact net surface quantities.",
    "Categorise the scope of work into clear physical operations: demolition or strip-out, substrate repairs, wall finishing (patching, screeding, repainting, or tiling), floor replacement (screed, adhesive, tile, or laminate), ceiling restoration, electrical additions, and plumbing fixture refits.",
    "Calculate preliminary material quantities using standard trade coverage rates and realistic wastage allowances (typically 8% to 15% on cutting and breakage for tiles and sheet goods in existing irregular spaces).",
    "Separate unpriced site-specific obligations from standard measured quantities. Structural alterations, asbestos removal, major damp proofing repairs, and council building control approval fees must be flagged as provisional or specialist sums rather than merged into basic square-metre rates.",
    "Apply contingencies and regional pricing. Because hidden defects frequently emerge during strip-out, professional estimators recommend applying a dedicated 10% to 15% unforeseen site condition contingency on preliminary renovation budgets.",
  ],
  workedExample: {
    intro:
      "A complete cosmetic and wet-area refurbishment of a 2-bedroom residential apartment with 68 square metres of floor area, 2.7-metre ceiling height, and one 8-square-metre bathroom.",
    steps: [
      { label: "Total apartment floor area", value: "68.0 m2" },
      {
        label: "Living, dining and bedroom flooring",
        value: "60.0 m2 (engineered oak floorboards)",
      },
      {
        label: "Bathroom floor tiling",
        value: "8.0 m2 (including 10% cutting waste = 8.8 m2)",
      },
      {
        label: "Bathroom wall tiling",
        value: "24.0 m2 (to full 2.7 m height, less door/window openings)",
      },
      {
        label: "General wall repainting area",
        value: "172.0 m2 (net walls across all rooms, 2 coats emulsion)",
      },
      {
        label: "Ceiling repainting area",
        value: "68.0 m2 (matt ceiling white emulsion, 2 coats)",
      },
      {
        label: "Substrate leveling screed",
        value: "8.0 m2 in bathroom (30 mm cementitious leveling compound)",
      },
      {
        label: "Waterproofing membrane",
        value: "16.0 m2 (shower zone floor and walls, liquid polyurethane)",
      },
      {
        label: "Sanitary fixture replacements",
        value:
          "5 units (toilet suite, vanity basin, mixer tap, shower rose, screen)",
      },
      {
        label: "Demolition and waste haulage",
        value: "1 skip bin (6 cubic metres capacity)",
      },
    ],
    result:
      "Measured scope covers 68 m2 flooring, 32.8 m2 tiles, 240 m2 total painting, 16 m2 waterproofing, and 5 sanitary fixtures plus waste haulage.",
    note: "Calculations exclude structural wall removals, concealed pipe re-routing, and hazardous material remediation.",
  },
  ratioTable: {
    caption:
      "Standard preliminary renovation takeoff coverage rates and material allowances",
    columns: [
      "Renovation Operation",
      "Typical Unit Rate / Coverage",
      "Recommended Waste Allowance",
      "Primary Application",
    ],
    rows: [
      [
        "Floor Tile Takeoff",
        "1.0 m2 net area per m2",
        "10% to 12% extra for cuts",
        "Ceramic or porcelain floor replacement",
      ],
      [
        "Wall Tile Takeoff",
        "1.0 m2 net area per m2",
        "10% to 15% extra for cuts",
        "Bathroom and kitchen splashback tiling",
      ],
      [
        "Wall Repainting (2 coats)",
        "6.0 m2 to 8.0 m2 per litre",
        "5% to 8% tin residue allowance",
        "Internal acrylic emulsion paint",
      ],
      [
        "Ceiling Repainting (2 coats)",
        "7.0 m2 to 9.0 m2 per litre",
        "5% tin residue allowance",
        "Anti-reflex matt ceiling white paint",
      ],
      [
        "Waterproofing Membrane",
        "1.5 kg to 2.0 kg per m2 (2 coats)",
        "10% lap and corner waste",
        "Wet room shower enclosures and floor pans",
      ],
      [
        "Self-Leveling Compound",
        "1.7 kg per m2 per mm depth",
        "5% mixing waste",
        "Smoothing uneven existing concrete subfloors",
      ],
      [
        "Skirting Board Replacement",
        "1.0 m per room perimeter",
        "10% mitre cut allowance",
        "MDF or softwood internal baseboards",
      ],
      [
        "Debris Skip Bin Sizing",
        "1 m3 per 10 m2 full refurb",
        "15% packing void allowance",
        "Demolition waste disposal",
      ],
    ],
  },
  faqs: [
    {
      question:
        "How do I calculate net wall area for repainting during renovation?",
      answer:
        "Multiply the room perimeter by the ceiling height to determine gross wall area. Next, calculate and subtract the area of all doors, windows, and built-in wardrobes. For typical residential rooms, door openings represent approximately 1.8 to 2.0 square metres each, and standard windows account for 1.2 to 2.5 square metres. The remaining balance is your net painting area.",
    },
    {
      question:
        "Why should I add a higher wastage factor for renovation tiling than new construction?",
      answer:
        "Older buildings frequently have out-of-square corners, uneven wall surfaces, and irregular room dimensions. Tiles laid in renovated spaces require significantly more perimeter diagonal cuts and trimming around existing pipes, door frames, and obstacles. A waste allowance of 10% to 15% ensures you do not run short of matching tile batch dye lots.",
    },
    {
      question: "How do I budget for concealed electrical and plumbing work?",
      answer:
        "Concealed services should be itemised as unit counts of new connection points (power sockets, light switches, downlights, waste outlets, and hot/cold supply spurs) rather than surface area. If existing wiring or galvanized water supply pipework is degraded, schedule a dedicated preliminary sum for a complete rewire or replumb to prevent rework after finishing.",
    },
    {
      question:
        "What contingency percentage is appropriate for preliminary renovation budgets?",
      answer:
        "For standard cosmetic refurbishments with known substrate conditions, a 10% contingency is recommended. For older properties, structural layout alterations, or wet room refits where plumbing leaks or subfloor rot may be concealed behind existing finishes, carry a 15% to 20% unforeseen site condition contingency until demolition exposes the framing.",
    },
    {
      question:
        "Does this estimator generate a legally binding builder contract price?",
      answer:
        "No. This tool computes deterministic preliminary material quantities and measured trade schedules based on user-supplied dimensions. Local contractor labour rates, builder margin, access difficulties, scaffold hire, statutory building permits, and taxes vary by jurisdiction and require direct written supplier and contractor quotations.",
    },
  ],
  limits:
    "This calculator provides preliminary quantity takeoff schedules for planning and budgeting. It does not replace on-site physical surveys, structural engineering assessments, or licensed trade inspection reports.",
};
