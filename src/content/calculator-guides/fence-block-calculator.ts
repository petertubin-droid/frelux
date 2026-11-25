import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the fence block and perimeter masonry calculator.
 *
 * Block counts, mortar volumes, and sand proportions are based on standard
 * 450 mm × 225 mm masonry block specifications with 10 mm joints. No prices
 * appear here; costs are calculated dynamically from current market price books.
 */
export const fenceBlockCalculatorGuide: CalculatorGuide = {
  slug: "fence-block-calculator",
  heading: "How the fence block calculator works",
  howItWorks: [
    "Calculate plot boundary perimeter. Add the lengths of all four boundary sides together. For a standard 100 ft by 50 ft plot (30.48 m by 15.24 m), the complete perimeter equals 91.44 linear metres.",
    "Establish wall height and number of courses. Blockwork height is measured in coaches (courses). A standard block face is 225 mm high plus a 10 mm mortar joint (235 mm total course height). A wall built 5 courses high reaches approximately 1.18 metres above damp proof course.",
    "Calculate total wall area and block count. Multiply total perimeter length by wall height to find gross wall area. Each standard 450 mm by 225 mm block covers about 0.101 m² with its joint, which means one square metre of wall requires approximately 9.25 to 9.88 blocks.",
    "Add breakage and cutting allowance. Masonry blocks, especially hollow sandcrete or concrete blocks, suffer breakage during transit, offloading, and corner cutting. A five to ten per cent allowance ensures the masons do not halt work before completing the final course.",
    "Calculate bedding mortar cement and sand. Compute the cement and sand required to lay the blocks. A 6 inch hollow block wall requires approximately one 50 kg bag of cement for every 50 to 55 blocks laid in a 1:4 or 1:6 mortar mix, accompanied by sharp sand delivered by tipper or wheelbarrow.",
  ],
  workedExample: {
    intro:
      "A standard single plot measuring 100 ft by 50 ft (30.48 m by 15.24 m), giving a total boundary perimeter of 91.44 m. The perimeter fence is planned at 5 courses high (1.18 m total wall height) using standard 6 inch hollow sandcrete blocks with 10 mm mortar joints.",
    steps: [
      { label: "Boundary perimeter (30.48 m + 15.24 m) × 2", value: "91.44 m" },
      { label: "Fence height (5 courses × 0.235 m)", value: "1.175 m" },
      { label: "Total boundary wall face area", value: "107.44 m²" },
      { label: "Standard block face area with 10 mm joint", value: "0.10125 m²" },
      { label: "Net block count (107.44 ÷ 0.10125)", value: "1,061 blocks" },
      { label: "Breakage and cutting allowance at 8 per cent", value: "85 blocks" },
      { label: "Total blocks to order from supplier", value: "1,146 blocks (round to 1,150)" },
      { label: "Bedding mortar cement (1 bag per 50 blocks)", value: "23 bags (50 kg Portland cement)" },
      { label: "Sharp plaster and bedding sand", value: "4.2 m³ (one 5 tonne tipper truck)" },
    ],
    result:
      "So a 5 course perimeter fence on a full plot requires approximately 1,150 blocks (6 inch), 23 bags of cement for mortar bedding, and one 5 tonne tipper truck of sharp sand.",
    note: "If the site ground slopes significantly across the plot, stepped foundation courses will add additional buried blocks below the level ground line. Confirm trench levels on site before ordering.",
  },
  ratioTable: {
    caption:
      "Standard sandcrete block dimensions, coverage per square metre, and bedding mortar material requirements.",
    columns: ["Block Type", "Block Face Dimensions", "Blocks per m²", "Cement per 100 Blocks", "Sand per 100 Blocks"],
    rows: [
      [
        "6 Inch Hollow Sandcrete",
        "450 mm × 225 mm × 150 mm",
        "9.25 to 9.88 units",
        "1.8 to 2.0 bags (50 kg)",
        "0.30 to 0.35 m³ (5 wheelbarrows)",
      ],
      [
        "9 Inch Hollow Sandcrete",
        "450 mm × 225 mm × 225 mm",
        "9.25 to 9.88 units",
        "2.5 to 2.8 bags (50 kg)",
        "0.45 to 0.50 m³ (7 wheelbarrows)",
      ],
      [
        "Solid Foundation Block",
        "450 mm × 225 mm × 225 mm",
        "9.25 to 9.88 units",
        "2.8 to 3.2 bags (50 kg)",
        "0.50 to 0.55 m³ (8 wheelbarrows)",
      ],
      [
        "Mortar Bed Joint",
        "10 mm thickness nominal",
        "Horizontal and vertical perps",
        "Mix ratio 1:4 to 1:6",
        "Sharp washed river or pit sand",
      ],
      [
        "Plastering Mortar (2 sides)",
        "12 mm to 15 mm thickness",
        "Both wall faces combined",
        "14 to 16 bags per 100 m²",
        "3.0 to 3.5 m³ per 100 m²",
      ],
    ],
  },
  faqs: [
    {
      question: "How many 6 inch blocks do I need for a 1 plot fence?",
      answer:
        "A full plot measures 100 ft by 50 ft, which is 30.48 m by 15.24 m and gives a perimeter of 91.44 m. A 6 inch block and a 9 inch block have the same face, 450 mm long and 225 mm high, so both take about 9.25 to 9.88 blocks per square metre of wall once the 10 mm joint is included. At five courses high, roughly 1.18 m, the wall area is about 107 m² and you need roughly 1,060 blocks before adding 5 to 10 per cent for breakage.",
    },
    {
      question: "How many coaches high should a fence wall be?",
      answer:
        "Most residential perimeter walls in West Africa and developing regions are built between four and seven courses high (0.94 m to 1.65 m) for low security boundaries, or eight to ten courses for privacy walls. Always verify local estate guidelines or town planning permits before construction.",
    },
    {
      question: "How many bags of cement will plaster a fence wall?",
      answer:
        "Plastering is calculated separately from block laying. Bedding mortar covers the joints between blocks, while plaster coats the exterior. A standard 12 mm to 15 mm plaster rendered on both sides of a 107 m² perimeter wall requires 12 to 16 bags of 50 kg cement in a standard 1:4 plaster mix.",
    },
    {
      question: "How many trips of sand does a fence need?",
      answer:
        "Trips depend on lorry capacity. A standard 10 tonne tipper carries roughly 6.25 m³ of sharp sand, while a 5 tonne tipper carries about 3.1 m³. For laying blocks on a 1 plot perimeter wall, one 5 tonne tipper is normally sufficient for mortar, while plastering both faces will require an additional tipper.",
    },
    {
      question: "Does this calculator include pillars and a gate?",
      answer:
        "No. This tool calculates a continuous linear perimeter wall. Structural pillars (typically built with 9 inch blocks or reinforced concrete columns) and vehicular gate openings should be calculated separately and adjusted in your bill of quantities.",
    },
  ],
  limits:
    "This calculator estimates material quantities for straight linear boundary wall masonry and bedding mortar only. It does not calculate excavation trenches, strip footings below damp proof course, reinforced concrete columns, iron gates, or coping stones.",
};
