import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const doorsWindowsEstimatorGuide: CalculatorGuide = {
  slug: "doors-windows-estimator",
  heading: "Doors, windows, architectural frames, and ironmongery schedule guide",
  howItWorks: [
    "A comprehensive door and window takeoff establishes the exact bill of quantities for fenestration openings across a building. Rather than treating openings as isolated fixtures, a professional takeoff coordinates four dependent material elements: the structural leaf or sash, the matching perimeter frame, the perimeter architraves or trims, and the complete ironmongery hardware suite.",
    "Door leaves are categorized by structural core and exposure duty. Heavy exterior entrance doors require solid hardwood or reinforced insulated steel assemblies with weather-resistant finishes. Bedroom and living doors utilize semi-solid or hollow-core flush leaves faced with veneer or HDF skins. High-humidity bathroom doors require moisture-sealed composite or UPVC materials to prevent warping and rot.",
    "Frames and sub-frames bridge masonry blockwork and the door leaf. Standard timber jambs (50 mm by 100 mm for 150 mm plastered blockwork, or 50 mm by 150 mm for 225 mm walls) are fixed with galvanized steel holdfast lugs or masonry frame anchors. Finished perimeters require 50 mm to 75 mm moulded architrave trims on both sides to conceal the expansion gap between masonry and timber jambs.",
    "Ironmongery scheduling follows strict hardware rules. Standard interior doors require 3 stainless steel butt hinges (100 mm by 75 mm by 2.5 mm) to prevent middle hinge binding and long-term leaf sag. Heavy exterior entrance doors require 4 ball-bearing hinges. Lockset specifications split between 2-lever or 3-lever sashlocks for internal privacy and certified 5-lever or Euro-profile cylinder deadlocks for exterior perimeter security.",
    "Window takeoffs coordinate glazed sashes, weatherproofing, and burglar protection. Aluminium casement or sliding assemblies specify frame wall thicknesses (typically 1.2 mm to 1.5 mm architectural grade), 5 mm to 6 mm toughened safety glass, perimeter weather-stripping seals, integrated insect fly screens, and structural steel burglar-proof grilles anchored into the surrounding concrete lintels and jambs.",
  ],
  workedExample: {
    intro:
      "Standard 3-bedroom residential bungalow schedule: calculating complete door leaves, frames, architectural ironmongery, and glazed window assemblies for a single-family residence with 1 security entrance, 5 bedroom doors, 3 bathroom doors, and 10 glazed window openings.",
    steps: [
      {
        label: "Armored security entrance door (1,000 mm × 2,100 mm)",
        value: "1 complete steel security unit with multi-point lock",
      },
      {
        label: "Solid hardwood bedroom doors (900 mm × 2,100 mm)",
        value: "5 solid panel leaves with matching hardwood frames",
      },
      {
        label: "Moisture-resistant bathroom doors (750 mm × 2,100 mm)",
        value: "3 flush composite leaves with matching jamb frames",
      },
      {
        label: "Architectural frame timber jambs (8 interior openings)",
        value: "8 complete three-piece frame sets (jambs and head)",
      },
      {
        label: "Perimeter architrave moulding trims (two-sided cover)",
        value: "80 linear metres of 65 mm moulded timber trim",
      },
      {
        label: "Stainless steel butt hinges (3 hinges × 8 interior doors)",
        value: "24 heavy-duty 100 mm stainless steel hinges (12 pairs)",
      },
      {
        label: "Mortice locksets (5 lever bedroom / bathroom privacy)",
        value: "5 bedroom sashlocks and 3 bathroom turn-snib locks",
      },
      {
        label: "Standard room windows (1,200 mm × 1,200 mm casement)",
        value: "8 glazed aluminium units with insect mesh and grilles",
      },
      {
        label: "Bathroom hopper vent windows (600 mm × 600 mm frosted)",
        value: "2 top-hung frosted glass ventilation window units",
      },
      {
        label: "Silicone weather-sealant cartridges (frame perimeter)",
        value: "12 tubes of neutral-cure silicone sealant",
      },
    ],
    result:
      "Total purchase list: 1 armored entrance door, 5 hardwood leaves, 3 composite leaves, 8 frame sets, 80 m architrave trim, 12 pairs of 100 mm hinges, 8 mortice locksets, 10 glazed window units with burglar grilles, and 12 tubes silicone.",
  },
  ratioTable: {
    caption:
      "Standard door and window opening dimensions, clearances, and hardware rules",
    columns: [
      "Opening location and application",
      "Nominal leaf and frame dimensions",
      "Standard clearance and ironmongery requirements",
    ],
    rows: [
      [
        "Main exterior entrance",
        "1,000 mm × 2,100 mm (or 1,200 mm double)",
        "4 ball-bearing hinges, 5-lever Euro cylinder, weather bar",
      ],
      [
        "Living room to corridor",
        "900 mm × 2,100 mm single leaf",
        "3 butt hinges (100 mm), lever latch handle, 2 architrave sets",
      ],
      [
        "Bedrooms and private rooms",
        "900 mm × 2,100 mm single leaf",
        "3 butt hinges, 3-lever mortice lock with keys, 1 rubber door stop",
      ],
      [
        "Bathrooms and utility stores",
        "750 mm × 2,100 mm single leaf",
        "3 butt hinges, privacy thumb-turn snib with emergency release",
      ],
      [
        "Living / bedroom casement window",
        "1,200 mm × 1,200 mm (2-sash unit)",
        "Toughened 6 mm glass, friction hinges, multi-point handle locks",
      ],
      [
        "Bathroom ventilation hopper window",
        "600 mm × 600 mm (top-hung sash)",
        "Obscure frosted glass, restrictor stay, insect mesh screen",
      ],
      [
        "Perimeter masonry rough opening",
        "Leaf width + 60 mm; height + 40 mm",
        "Allows 15 mm shimming and expanding foam insulation clearance",
      ],
    ],
  },
  faqs: [
    {
      question: "Why should interior doors use three hinges instead of two?",
      answer:
        "Standard timber doors expand and contract with atmospheric humidity changes. Using only two hinges leaves the mid-height of the door leaf unsupported, leading to warping, binding against the frame latch rebate, and latch misalignment. Three hinges distribute leaf weight evenly and maintain a true vertical line throughout seasons.",
    },
    {
      question: "What is rough opening clearance and why is it necessary?",
      answer:
        "Rough opening clearance is the physical gap between the structural blockwork lintel/jambs and the outer edge of the pre-assembled door or window frame. A clearance of 10 mm to 15 mm on each side ensures the frame can be plumbed perfectly vertical and level using wedges before fixing, without being compromised by irregular masonry.",
    },
    {
      question: "What is the difference between solid core and hollow core doors?",
      answer:
        "Solid core doors are filled with solid wood blocks, glued particle board, or compressed acoustic mineral fiber, delivering substantial sound reduction, thermal mass, and fire resistance. Hollow core doors contain a lightweight honeycomb cardboard lattice between thin outer veneers, making them cost-effective for secondary interior partitions.",
    },
    {
      question: "How do architraves protect and finish door installations?",
      answer:
        "Architraves are decorative moulded timber or MDF trim boards fixed around the perimeter of the frame. They serve the practical structural purpose of covering the messy expansion gap, shimming packers, and polyurethane foam insulation between the wall blockwork and the door frame, creating a neat shadow gap or flush joint.",
    },
    {
      question: "What thickness of aluminium profile is required for exterior windows?",
      answer:
        "Residential exterior windows should utilize aluminium profiles with a minimum wall thickness of 1.2 mm to 1.5 mm. Low-quality commercial profiles below 1.0 mm flex in high wind conditions, causing glass rattle, air infiltration, and premature failure of sliding rollers and friction stays.",
    },
  ],
  limits:
    "This tool estimates material quantities, fixture counts, and ironmongery hardware based on entered opening schedules. It does not generate structural lintel calculations or architectural fabrication shop drawings.",
};
