import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the tile calculator.
 *
 * Packaging yields, adhesive coverage, and grout consumption are derived from
 * tile manufacturing standards and ceramic tile adhesive guidelines. No prices
 * appear here; the calculator resolves prices through the market price book.
 */
export const tileCalculatorGuide: CalculatorGuide = {
  slug: "tile-calculator",
  heading: "How the tile calculator works",
  howItWorks: [
    "Measure room length and width to find gross surface area. Multiply length by width for rectangular floors, or measure individual wall sections for bathroom and kitchen wall tiling. A 6 m by 4 m room has a floor area of 24 m².",
    "Deduct non-tiled areas and openings. For wall tiling, subtract door frames, shower alcoves, and window recesses. For floor tiling, deduct permanent built-in features such as raised bath plinths or chimney breasts if they will not receive tile.",
    "Calculate individual tile area and basic piece count. Convert tile dimensions from millimetres to metres (for example, a 600 mm by 600 mm tile is 0.6 m by 0.6 m, equal to 0.36 m²). Divide total floor area by the area of one tile to get raw piece count.",
    "Add a waste allowance for cuts and diagonal layouts. Straight grid layouts require a minimum ten per cent waste allowance for edge cuts and handling breakage. Diagonal or herringbone patterns produce substantially more offcuts and need a fifteen per cent allowance.",
    "Calculate boxes, adhesive bags, and grout. Tiles are sold in full boxes, not loose pieces, so round your piece count up to full box multiples. Then calculate adhesive bags (usually 4.5 to 5.0 kg per m² in 20 kg bags) and grout bags based on joint width.",
  ],
  workedExample: {
    intro:
      "A living room and dining area floor measuring 6 m long by 4 m wide (24 m² total surface area), laid in a standard straight grid with 600 mm by 600 mm glazed porcelain tiles. The project includes a 10 per cent cutting allowance, 3 mm grout joints, and standard polymer-modified cementitious tile adhesive.",
    steps: [
      { label: "Floor surface area (6 m × 4 m)", value: "24.0 m²" },
      { label: "Tile size (600 mm × 600 mm)", value: "0.36 m² per tile" },
      { label: "Raw tile piece count (24.0 ÷ 0.36)", value: "66.7 tiles" },
      { label: "Waste allowance at 10 per cent", value: "7.3 tiles" },
      { label: "Total tiles required with waste", value: "74 tiles" },
      { label: "Box packaging yield (4 tiles = 1.44 m² per box)", value: "18.5 boxes" },
      { label: "Full boxes to order from supplier", value: "19 boxes (76 tiles = 27.36 m²)" },
      { label: "Tile adhesive (4.5 kg per m² for 24 m²)", value: "108 kg (six 20 kg bags)" },
      { label: "Tile grout at 3 mm joint width (0.35 kg per m²)", value: "8.4 kg (two 5 kg bags)" },
    ],
    result:
      "So 24 m² of tiled floor requires 19 boxes of 600 mm by 600 mm porcelain tiles, six 20 kg bags of tile adhesive, and two 5 kg bags of tile grout.",
    note: "Always retain at least half a box of spare tiles from the same production batch. Batch dye lots differ, and sourcing an identical replacement years later for plumbing or electrical repairs is often impossible.",
  },
  ratioTable: {
    caption:
      "Standard tile format piece counts, typical box packaging yields, and adhesive and grout requirements for interior tiling.",
    columns: ["Tile Format", "Pieces per m²", "Typical Box Packaging", "Adhesive per m²", "Grout per m² (3 mm)"],
    rows: [
      [
        "300 mm × 300 mm Ceramic",
        "11.1 pieces",
        "1.00 m² (11 or 12 tiles per box)",
        "3.5 to 4.5 kg/m²",
        "0.6 to 0.8 kg/m²",
      ],
      [
        "300 mm × 600 mm Wall Tile",
        "5.55 pieces",
        "1.44 m² (8 tiles per box)",
        "4.0 to 5.0 kg/m²",
        "0.4 to 0.55 kg/m²",
      ],
      [
        "600 mm × 600 mm Porcelain",
        "2.78 pieces",
        "1.44 m² (4 tiles per box)",
        "4.5 to 5.5 kg/m²",
        "0.3 to 0.45 kg/m²",
      ],
      [
        "600 mm × 1200 mm Large Format",
        "1.39 pieces",
        "1.44 m² (2 tiles per box)",
        "5.5 to 7.0 kg/m²",
        "0.2 to 0.35 kg/m²",
      ],
      [
        "Tile Spacers (Crosses)",
        "4 pieces per tile",
        "Packets of 250 or 500 units",
        "Not applicable",
        "Selected joint size: 2 mm to 5 mm",
      ],
    ],
  },
  faqs: [
    {
      question: "How much waste allowance should I add for tiling?",
      answer:
        "For standard rectangular rooms with straight grid layouts, add 10 per cent to cover perimeter cuts and transport breakage. For rooms with diagonal layouts, curved walls, multiple doorways, or intricate herringbone patterns, increase your waste margin to 15 or 20 per cent.",
    },
    {
      question: "How many 20 kg bags of tile adhesive do I need per square metre?",
      answer:
        "Average adhesive consumption is 4.0 to 5.0 kg per square metre when using a standard 6 mm to 8 mm notched trowel on a flat screed bed. A single 20 kg bag covers approximately 4.0 to 4.5 m² of floor area. Uneven floors requiring a thicker buttering bed will consume more.",
    },
    {
      question: "How do I calculate tile grout consumption for different joint widths?",
      answer:
        "Grout consumption depends on tile dimensions, tile thickness, and joint width. Larger tiles (such as 600 mm by 600 mm) have fewer joints per square metre and consume only 0.3 to 0.4 kg/m² for a 3 mm joint, whereas small 100 mm mosaic tiles can consume over 1.5 kg/m².",
    },
    {
      question: "Can floor tiles be used on walls and can wall tiles be used on floors?",
      answer:
        "Floor tiles (especially durable vitrified porcelain) can safely be installed on walls provided the wall structure can support the heavier weight and a high-grab polymer adhesive is used. Wall tiles, however, should never be installed on floors because their softer glaze and thinner body will crack under foot traffic.",
    },
    {
      question: "Why should I keep an extra box of tiles after installation?",
      answer:
        "Tiles are manufactured in distinct production runs identified by shade and calibre batch numbers. Even tiles from the same manufacturer will show noticeable shade variations between batches. Having leftover matching tiles on hand allows flawless repairs if tiles are chipped or removed for pipe maintenance later.",
    },
  ],
  limits:
    "This calculator provides material estimates for dry tile areas, box packaging, adhesive, and grout. It assumes a level and sound substrate. It does not assess subfloor flatness, perform damp testing, or price tiler labour, expansion joint trims, transition thresholds, and waterproof tanking membranes.",
};
