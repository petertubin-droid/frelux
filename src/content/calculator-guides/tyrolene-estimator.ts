import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Tyrolene Exterior Finish Estimator.
 *
 * Tyrolene (also known as Tyrolean finish or splatterdash render) is an open-textured,
 * weatherproof exterior wall coating formulated with white or grey Portland cement,
 * hydrated lime, fine crushed marble or silica aggregate, and mineral oxide pigments.
 */
export const tyroleneEstimatorGuide: CalculatorGuide = {
  slug: "tyrolene-estimator",
  heading: "How the Tyrolene exterior textured finish estimator works",
  howItWorks: [
    "Measure the net external wall area partition by partition. For each wall elevation, multiply length by height and deduct all window, door, and architectural openings to determine the exact area requiring textured splatter coating.",
    "Inspect substrate preparation and suction control. Tyrolene finish must be applied over a cured, flat, key-scratched sand-cement backing render (typically 1:4 cement:sand mix at 12 mm to 15 mm thickness). Highly porous or uneven substrates must be dampened with water or treated with an acrylic bonding agent to prevent premature desiccation.",
    "Calculate premixed Tyrolene dry powder bags or batch mix proportions. Commercial pre-bagged Tyrolene finish contains graded marble chips (1 mm to 3 mm), white Portland cement, lime, and water-repellent stearates, applied at an average coverage of 3.5 kg to 5.0 kg per square metre across two to three build coats.",
    "Schedule application tools and masking protection. Tyrolene is projected onto walls using a hand-cranked rotary comb hopper machine or pneumatic spray gun. Because the splatter pattern creates aggressive overspray, plastic masking film, paper tape, and drop sheets must be scheduled for all adjacent doors, windows, and finished surfaces.",
    "Incorporate environmental and curing considerations. Application must avoid direct scorching sunlight, strong drying winds, or rainfall during the initial 24-hour hydration window. Light mist water spraying during the first 48 hours maximizes surface hardness and prevents friable chalking.",
  ],
  workedExample: {
    intro:
      "A 4-bedroom residential detached house requiring Tyrolene splatterdash finish across four exterior elevations with a total gross area of 360 square metres, less 72 square metres of doors and windows (288 square metres net surface), using a standard 4.0 kg per square metre two-pass application.",
    steps: [
      {
        label: "Gross exterior wall area",
        value: "360.0 m2 across 4 elevations",
      },
      {
        label: "Door and window opening deductions",
        value: "72.0 m2 (total fenestration)",
      },
      { label: "Net wall area for Tyrolene", value: "288.0 m2" },
      {
        label: "Tyrolene premixed dry powder",
        value: "1,152 kg (based on 4.0 kg/m2 two-coat build)",
      },
      {
        label: "Standard commercial 25 kg bags",
        value: "49 bags (46.1 bags net + 6% spillage/waste)",
      },
      {
        label: "Acrylic bonding agent / sealer",
        value: "30.0 litres (diluted 1:3 for substrate suction control)",
      },
      {
        label: "Polyethylene masking film & tape",
        value: "120 linear metres (protecting all 18 window/door frames)",
      },
      {
        label: "Application method equipment",
        value: "2 rotary Tyrolean hand hopper machines",
      },
    ],
    result:
      "Measured scope requires 49 bags of 25 kg Tyrolene finish powder, 30 litres bonding agent, and 120 metres masking film for 288 m2 net wall area.",
    note: "Excludes preliminary sand-cement backing render, scaffolding hire, and post-application water misting labour.",
  },
  ratioTable: {
    caption:
      "Tyrolene material coverage benchmarks, mix proportions, and equipment guidelines",
    columns: [
      "Texture Style & Coat",
      "Dry Material Consumption",
      "Approximate Layer Thickness",
      "Typical Water Addition",
    ],
    rows: [
      [
        "Light Honeycomb (2 passes)",
        "3.5 to 4.0 kg per m2",
        "3 mm to 4 mm thickness",
        "6.0 to 7.0 L per 25 kg bag",
      ],
      [
        "Standard Roughcast (3 passes)",
        "4.5 to 5.5 kg per m2",
        "5 mm to 6 mm thickness",
        "6.5 to 7.5 L per 25 kg bag",
      ],
      [
        "Heavy Splatterdash Texture",
        "5.5 to 7.0 kg per m2",
        "6 mm to 8 mm thickness",
        "7.0 to 8.0 L per 25 kg bag",
      ],
      [
        "Site-Mixed Proportions (Volume)",
        "1 part White Cement : 1 part Lime : 3 parts Marble Chips (0.5 to 2mm)",
        "Standard batching",
        "Clean potable water to creamy consistency",
      ],
      [
        "Acrylic Primer / Sealer",
        "0.10 to 0.15 L per m2",
        "Thin penetration coat",
        "Ready to apply or 1:1 water mix",
      ],
      [
        "Window & Door Masking",
        "1.0 m tape per opening perimeter",
        "Adhesive border",
        "UV-resistant blue painters tape",
      ],
      [
        "Substrate Backing Render",
        "1:4 Cement:Sand plaster",
        "12 mm to 15 mm scratch coat",
        "Must cure 7 days prior to Tyrolene",
      ],
      [
        "Rotary Hand Gun Speed",
        "20 to 30 m2 per hour per operator",
        "Continuous horizontal passes",
        "Keep consistent crank cadence",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Can Tyrolene be applied directly onto bare concrete blocks or clay bricks?",
      answer:
        "No. Tyrolene is a thin decorative finish that cannot bridge deep mortar joints or hide irregularities in raw blockwork. If applied directly onto bare masonry, the mortar joint lines will telegraph through the textured finish (ghosting) and uneven suction will cause patchy discoloration. Always apply a 12 mm to 15 mm wood-floated sand-cement scratch coat and allow it to cure before applying Tyrolene.",
    },
    {
      question:
        "How do you achieve uniform colour across large wall elevations?",
      answer:
        "Colour shading variations (efflorescence and banding) occur when different mix batches have unequal water-to-cement ratios or when work is paused mid-wall. To ensure colour consistency, gauge water additions strictly using calibrated measuring buckets, mix entire bags at once, and plan work so that individual wall elevations are completed in one continuous session without stopping between corners or expansion joints.",
    },
    {
      question:
        "Can an existing Tyrolene wall be repaired or patched seamlessly?",
      answer:
        "Patching Tyrolene is challenging because fresh white cement and unweathered aggregate will not match aged, weathered walls, and the rotary splatter texture creates visible boundary lines. For best results, carefully feather out the patch area with a wire brush, apply matching mortar with a small hand flick-comb, and paint the entire elevation with an exterior masonry elastomeric paint to unify the appearance.",
    },
    {
      question:
        "How does Tyrolene compare to modern acrylic synthetic textured finishes?",
      answer:
        "Traditional Tyrolene is a rigid, mineral-cementitious coating that offers excellent breathability, natural stone aesthetics, and fire resistance at a lower material cost than acrylics. However, acrylic elastomeric finishes (such as synthetic DPR renders) provide greater flexibility, higher crack-bridging capability, and superior resistance to environmental dirt pick-up on flexible or insulated substrates.",
    },
    {
      question:
        "Does this estimator calculate site scaffold and equipment rental costs?",
      answer:
        "No. This tool computes physical material quantities, bag counts, and consumable allowances. Access costs such as tubular steel scaffolding, mobile tower hire, compressor fuel for pneumatic sprayers, and skilled plasterer labour rates vary by location and must be obtained from local hire and contracting specialists.",
    },
  ],
  limits:
    "This calculator provides preliminary material quantity estimates for planning. It does not replace on-site substrate structural soundness inspections, moisture testing, or licensed applicator quotations.",
};
