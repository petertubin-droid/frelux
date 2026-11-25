import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const plasterRenderCalculatorGuide: CalculatorGuide = {
  slug: "plaster-render-calculator",
  heading: "Plaster and exterior render material calculation guide",
  howItWorks: [
    "Plastering and rendering protect structural masonry walls and provide smooth, weather-resistant surfaces for painting and decorating. Interior walls generally receive gypsum skim plaster or fine sand-cement plaster, while exterior exposed surfaces receive durable cement-sand render, textured Tyrolene, or acrylic polymer finishes.",
    "To calculate materials accurately, determine the gross wall area by multiplying wall length by wall height, then subtract all door and window openings. Render is only ordered for net surface area that requires physical coverage.",
    "Mortar volume equals net wall area multiplied by the intended applied thickness. Standard interior plaster ranges between 12 mm and 15 mm, whereas exterior render is typically applied in two coats (a 10 mm scratch basecoat and an 8 mm finish coat) totalling 16 mm to 20 mm.",
    "Because sand and cement compress when mixed with water, loose dry mortar ingredients require a bulking conversion factor of 1.30 to 1.35. A rebound and wastage allowance of 10 percent to 15 percent must also be factored in for trowel droppings and corner finishing.",
    "Mix proportions govern strength and water resistance. A 1:4 mix (one part cement to four parts plaster sand) is recommended for general internal and external rendering, while high-exposure parapets or coastal splash zones benefit from a richer 1:3 mix with waterproofing admixtures.",
  ],
  workedExample: {
    intro:
      "Living room interior wall plastering: calculating sand and cement for the interior walls of a 6.0 m by 4.0 m living room with 3.0 m wall height, deducting one entry door (2.1 m × 0.9 m) and two windows (each 1.2 m × 1.2 m), plastered at 13 mm thickness in a 1:4 mortar mix.",
    steps: [
      {
        label: "Gross wall perimeter area (20 m perimeter × 3 m)",
        value: "60.00 m² gross wall area",
      },
      {
        label: "Openings deducted (1 door + 2 windows)",
        value: "4.77 m² total deducted",
      },
      { label: "Net plastering wall area", value: "55.23 m² net area" },
      {
        label: "Wet mortar volume with 10% waste factor",
        value: "0.790 m³ wet mortar",
      },
      {
        label: "Dry materials conversion (1.33 dry factor)",
        value: "1.051 m³ loose dry materials",
      },
      {
        label: "Portland cement required (1:4 mortar mix)",
        value: "6.05 bags (buy 7 bags of 50 kg cement)",
      },
      {
        label: "Plaster sand required (4 of 5 parts)",
        value: "0.84 m³ (approx 1.35 tonnes clean sand)",
      },
      {
        label: "Angle beads for external wall corners",
        value: "12 linear metres galvanized angle beads",
      },
    ],
    result:
      "Total purchase list: 7 bags of 50 kg cement, 0.84 m³ clean plaster sand, and 12 m of corner angle beads.",
  },
  ratioTable: {
    caption:
      "Plaster and render mix proportions, thicknesses, and bag coverage rates",
    columns: [
      "System & mix description",
      "Recommended thickness & coats",
      "Coverage per 50 kg cement bag or pack",
    ],
    rows: [
      [
        "Interior gypsum skim plaster",
        "2 mm to 3 mm single skim coat",
        "18 m² to 22 m² per 25 kg bag",
      ],
      [
        "Interior sand-cement plaster (1:4)",
        "12 mm to 15 mm single floated coat",
        "7.5 m² to 9.0 m² per 50 kg cement bag",
      ],
      [
        "Exterior weather render (1:4)",
        "16 mm to 20 mm two-coat system",
        "5.5 m² to 6.8 m² per 50 kg cement bag",
      ],
      [
        "Waterproof plinth render (1:3)",
        "15 mm with waterproofing additive",
        "4.2 m² to 5.2 m² per 50 kg cement bag",
      ],
      [
        "Tyrolene spatterdash texture coat",
        "3 mm to 5 mm flicked textured coat",
        "12.0 m² to 15.0 m² per 50 kg cement bag",
      ],
    ],
  },
  faqs: [
    {
      question: "What is the recommended mix ratio for wall plastering?",
      answer:
        "A 1:4 mix (one part cement to four parts clean sharp-fine sand) is the industry standard for interior and exterior masonry plaster. Ratios richer than 1:3 are prone to shrinkage crazing and cracking, while mixes leaner than 1:5 lack adhesion and crumble over time.",
    },
    {
      question: "Why does plaster crack and craze after drying?",
      answer:
        "Cracking occurs primarily from rapid moisture loss due to dry porous masonry sucking water from wet mortar, excessive cement in the mix, over-watering during mixing, or direct sun exposure. Walls must be damped down with clean water before plastering and damp-cured for three to five days afterwards.",
    },
    {
      question: "What type of sand should be used for plastering?",
      answer:
        "Plaster sand should be clean, sharp, and well-graded, free of organic soil, clay balls, and sea salt. Sieve the sand through a 3 mm to 5 mm mesh on site to remove stones, roots, and foreign debris before mixing.",
    },
    {
      question:
        "Should door and window openings be deducted from the calculation?",
      answer:
        "Yes. Doors and windows make up 10 percent to 25 percent of total wall area in typical buildings. Deducting openings prevents purchasing excess bags of cement and tons of sand. Corner reveals around windows and doors offset a portion of the deduction, so keeping a 10 percent waste allowance balances the takeoff.",
    },
    {
      question: "What is the difference between plaster and render?",
      answer:
        "Plaster refers to mortar applied to interior wall surfaces, designed for smoothness and easy decoration with paint or wallpaper. Render refers to stronger, weather-resistant mortar applied to external walls, formulated to resist driving rain, thermal cycles, and wind erosion.",
    },
  ],
  limits:
    "This calculator estimates material quantities for uniform substrates. It does not account for excessive wall out-of-plumb correction exceeding 25 mm, structural movement cracks, or scaffold equipment rental costs.",
};
