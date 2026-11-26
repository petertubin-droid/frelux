import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Insulated Concrete Form (ICF) Wall Estimator.
 *
 * ICF wall construction uses hollow expanded polystyrene (EPS) foam blocks
 * stacked dry and filled with structural reinforced concrete to create highly
 * insulated, disaster-resilient monolithic building envelopes.
 */
export const icfWallEstimatorGuide: CalculatorGuide = {
  slug: "icf-wall-estimator",
  heading: "How the insulated concrete form wall takeoff estimator works",
  howItWorks: [
    "Measure gross external wall perimeter and storey heights to calculate total exterior form surface area, deducting window and door rough openings to establish net wall area.",
    "Schedule modular ICF block units based on standard block face geometry (typically 1200 mm length by 400 mm height, providing 0.48 m2 face area per block), with 5% to 8% allowance for vertical coursing stagger, factory corners, and site cuts.",
    "Calculate core concrete volume from net wall area and core cavity thickness (100 mm to 300 mm cavity width), deducting interior plastic web displacement and adding pump line priming and consolidation allowances.",
    "Schedule horizontal rebar placed in integrated web saddles and vertical rebar grids (400 mm or 600 mm on centre) with standard 40 bar diameter tension lap splices.",
    "Apportion adjustable turnbuckle alignment bracing jacks at 1.8 m centres along the wall perimeter plus every corner to maintain plumb walls and provide catwalk scaffold safety during concrete placement.",
  ],
  workedExample: {
    intro:
      "A single-storey residential perimeter envelope with 48.0 metres perimeter, 3.0 metres wall height (144.0 square metres gross area). Deductions: 4 windows (6.0 square metres) and 2 doors (4.2 square metres), giving 133.8 square metres net ICF wall area. Specified 150 mm concrete core, 12 mm horizontal rebar every 400 mm course, and 12 mm vertical rebar at 400 mm centres.",
    steps: [
      { label: "Gross perimeter wall area", value: "144.0 m2" },
      {
        label: "Window and door opening deductions",
        value: "10.2 m2 (deducted from gross)",
      },
      { label: "Net ICF wall surface area", value: "133.8 m2" },
      {
        label: "Standard straight ICF blocks",
        value: "296 blocks (133.8 / 0.48 m2 plus 6% site cut waste)",
      },
      {
        label: "Preformed 90-degree corner blocks",
        value: "16 pairs (8 courses high across 4 external corners)",
      },
      {
        label: "Concrete core volume (150 mm)",
        value: "20.4 m3 (net cavity 19.47 m3 plus 5% pumping and hopper allowance)",
      },
      {
        label: "Horizontal rebar (12 mm T12)",
        value: "422 linear metres (36 standard 12 m stock bars, including 10% lap splices)",
      },
      {
        label: "Vertical rebar grid (12 mm T12)",
        value: "432 linear metres (36 standard 12 m stock bars, including footing dowel overlap)",
      },
      {
        label: "Turnbuckle alignment bracing jacks",
        value: "31 jack assemblies (spaced at 1.8 m plus corner pairs)",
      },
      {
        label: "Low-expansion joint foam adhesive",
        value: "6 cans (750 ml cans for sealing top course and cut blocks)",
      },
    ],
    result:
      "Takeoff bill of materials totals 296 straight blocks, 16 corner pairs, 20.4 m3 ready-mix concrete, 72 bars of 12 mm rebar, 31 bracing jacks, and 6 cans foam adhesive.",
    note: "Does not include continuous footing excavation, concrete pump truck hire, or exterior acrylic render finishes.",
  },
  ratioTable: {
    caption:
      "Standard ICF block dimensions, concrete fill factors, and reinforcement ratios",
    columns: [
      "Component & Dimension",
      "Consumption / Spacing",
      "Unit Packaging",
      "Site Allowance",
    ],
    rows: [
      [
        "Standard Straight Block (1200x400 mm)",
        "2.08 blocks per m2 wall face",
        "Single molded EPS unit",
        "5% to 8% stagger waste",
      ],
      [
        "Preformed 90-Degree Corner Block",
        "2 units per corner per course",
        "Molded corner pair",
        "Order exact plus 1 spare",
      ],
      [
        "150 mm Concrete Core Cavity",
        "0.145 m3 concrete per m2 face",
        "Ready-mix truck delivery",
        "5% pump line and consolidation",
      ],
      [
        "200 mm Concrete Core Cavity",
        "0.194 m3 concrete per m2 face",
        "Ready-mix truck delivery",
        "5% pump line and consolidation",
      ],
      [
        "Horizontal Rebar (12 mm T12)",
        "1 bar per 400 mm lift course",
        "12 m standard stock length",
        "10% tension lap splice (40d)",
      ],
      [
        "Vertical Rebar Grid (12 mm T12)",
        "Spacing 400 mm to 600 mm on centre",
        "12 m standard stock length",
        "8% footing dowel overlap",
      ],
      [
        "Turnbuckle Alignment Jack",
        "1 jack per 1.8 m wall run",
        "Modular rental kit",
        "Include all corners and splays",
      ],
      [
        "Spray Foam Low-Expansion Adhesive",
        "1 canister per 25 m2 block joints",
        "750 ml aerosol can",
        "10% nozzle purging loss",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why is concrete pour rate restricted to 1.2 metres per hour in ICF walls?",
      answer:
        "Fresh fluid concrete exerts hydrostatic lateral pressure against the EPS foam forms. Exceeding a vertical placement rate of 1.2 metres (4 feet) per hour before initial set can cause form blowout, bulging webs, or lifted blocks. Pouring in sequential 1.0 to 1.2 metre lifts around the entire building perimeter allows lower concrete lifts to begin setting, keeping lateral pressure within safe manufacturer form limits.",
    },
    {
      question:
        "How are window and door openings bucked and reinforced in an ICF building?",
      answer:
        "Openings are framed before concrete placement using treated dimensional timber or vinyl buck profiles that contain the wet concrete. Heavy lintel rebar cages with top tensile rebar, bottom rebar, and stirrup ties are placed directly in the continuous horizontal core across the opening head, spanning at least 300 mm to 450 mm into the adjacent solid wall on both sides.",
    },
    {
      question:
        "What aggregate size and concrete slump are required for ICF core consolidation?",
      answer:
        "ICF cores require high-workability ready-mix concrete with a slump of 150 mm to 180 mm (or self-consolidating concrete with a 550 mm to 650 mm spread) and maximum aggregate size of 10 mm to 14 mm (pea gravel). This ensures fluid flow around dense rebar grids and internal plastic webs without honeycombing or aggregate bridging.",
    },
    {
      question:
        "How is interior drywall plasterboard attached to ICF foam blocks?",
      answer:
        "Drywall is screwed directly into the high-density polypropylene webs embedded within the EPS foam panels. These plastic webs occur every 150 mm or 200 mm on centre and feature full-height fastening flanges marked on the outer foam surface, accepting standard coarse-thread drywall screws without requiring additional timber stud furring.",
    },
    {
      question:
        "Does this estimator certify structural wind, seismic, or load-bearing capacities?",
      answer:
        "No. This calculator produces preliminary material takeoffs and bills of quantities based on prescriptive residential building codes. Stamped structural engineering drawings and site-specific seismic and hurricane wind-load calculations must be verified by a licensed structural engineer in your jurisdiction.",
    },
  ],
  limits:
    "This calculator provides preliminary material takeoffs for ICF walls. It does not replace project-specific structural engineering drawings, seismic wind-load analysis, or local building code lintel sizing.",
};
