import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the soffit, fascia, and rainwater gutter estimator.
 *
 * Sizing roof trim and eaves drainage requires measuring the overall roof
 * perimeter, projecting eaves overhang, and matching gutter cross sections
 * to effective roof catchment areas under local rainfall intensity.
 */
export const soffitGutterEstimatorGuide: CalculatorGuide = {
  slug: "soffit-gutter-estimator",
  heading: "How the soffit, fascia and gutter estimator works",
  howItWorks: [
    "Measure the total roof eaves perimeter along both fascia runs and rake verges. For a simple rectangular hipped roof, the fascia perimeter equals twice the length plus twice the width at the roof overhang level.",
    "Determine the horizontal eaves overhang depth from the finished exterior wall face to the inner fascia backer. This depth dictates whether flat soffit boards require intermediate joist cleats or longitudinal timber noggings.",
    "Calculate the total soffit boarding surface area by multiplying the eaves perimeter by the overhang width. Add an 8 to 12 per cent waste allowance for mitred hip corner joints, fascia returns, and end offcuts.",
    "Schedule rainwater guttering and support brackets along the fascia line. Gutters are installed with a fall of 1:200 to 1:500 toward outlets, with support fascia brackets spaced at maximum 600 mm intervals and 150 mm from every joint or angle.",
    "Size downpipe assemblies based on effective roof catchment area. Standard practice requires at least one 68 mm or 82 mm circular downpipe for every 50 m² to 70 m² of roof plan area, complete with offset bends, pipe clips, and shoe outlets.",
  ],
  workedExample: {
    intro:
      "A detached residential bungalow with a 14 m by 9 m hipped roof footprint, a 450 mm horizontal eaves overhang, using 200 mm UPVC fascia, vented hollow soffit panels, and half-round guttering.",
    steps: [
      { label: "Roof perimeter measured", value: "46.00 m" },
      { label: "Overhang depth", value: "0.45 m" },
      { label: "Soffit surface area (46 m x 0.45 m)", value: "20.70 m²" },
      {
        label: "Fascia board length (with 10% waste)",
        value: "50.60 m (13 lengths of 4 m)",
      },
      { label: "Soffit cladding area (with 10% waste)", value: "22.77 m²" },
      {
        label: "Rainwater gutter lengths (4 m stock)",
        value: "12 units (48 m total)",
      },
      { label: "Fascia gutter brackets (at 600 mm)", value: "82 units" },
      {
        label: "Downpipe drops (4 corners)",
        value: "4 drops of 3.0 m (12 m total)",
      },
    ],
    result:
      "The roof requires 13 fascia lengths (4 m), 23 m² of vented soffit boards, 12 gutter lengths, 82 brackets, and 4 downpipe drops with shoe outlets.",
    note: "Allow extra union joints and expansion gaps of 5 mm at every gutter joint to accommodate thermal expansion during hot sunny weather.",
  },
  ratioTable: {
    caption:
      "Recommended rainwater drainage capacities and accessory spacing by gutter profile.",
    columns: [
      "Gutter Profile",
      "Nominal Width",
      "Max Roof Catchment Area",
      "Bracket Spacing",
      "Recommended Downpipe",
    ],
    rows: [
      [
        "Half-Round UPVC",
        "112 mm",
        "Up to 55 m² per outlet",
        "600 mm centres",
        "68 mm round",
      ],
      [
        "Deep Flow UPVC",
        "115 mm",
        "Up to 90 m² per outlet",
        "600 mm centres",
        "68 mm or 82 mm round",
      ],
      [
        "Square Line UPVC",
        "114 mm",
        "Up to 65 m² per outlet",
        "600 mm centres",
        "65 mm square",
      ],
      [
        "Ogee Decorative",
        "125 mm",
        "Up to 110 m² per outlet",
        "600 mm centres",
        "68 mm round or 65 mm square",
      ],
      [
        "Commercial Box Gutter",
        "150 mm",
        "Up to 160 m² per outlet",
        "500 mm centres",
        "110 mm circular",
      ],
      [
        "Aluminium Seamless",
        "125 mm",
        "Up to 100 m² per outlet",
        "600 mm hidden brackets",
        "75 mm round or fluted",
      ],
    ],
  },
  faqs: [
    {
      question: "Why is continuous ventilation necessary in roof soffits?",
      answer:
        "Warm, humid air rising from living spaces condenses against cold roof underlay and timber rafters. Continuous ventilated soffit strips or pre-vented boards provide cool air intake that expels moisture through high-level ridge vents, preventing dry rot.",
    },
    {
      question: "What slope or fall should roof gutters have toward downpipes?",
      answer:
        "Gutters perform best with a minimum fall of 1:350 to 1:500 (approximately 2 mm to 3 mm of drop per linear metre). While level gutters will drain by hydraulic head, a positive fall prevents stagnant standing water, debris accumulation, and mosquito breeding.",
    },
    {
      question:
        "How do I account for roof pitch when calculating catchment area?",
      answer:
        "Wind drives rain against sloping roofs, so effective catchment area is larger than horizontal ceiling area. Use the standard formula: Effective Area equals Length multiplied by Half-Width plus Half-Height of the roof pitch.",
    },
    {
      question:
        "What is the difference between replacement fascia and capping board?",
      answer:
        "Full replacement fascia boards are 16 mm to 20 mm thick, structural panels nailed directly to rafter tails to carry the full weight of gutters filled with water. Capping boards are thin 9 mm veneers designed only to face over sound existing timber.",
    },
    {
      question: "Do gutter unions require mechanical fastening or glue?",
      answer:
        "UPVC gutter joints use integral rubber compression gaskets with snap-fit clips. Never glue gutter unions, as thermal expansion and contraction will crack the plastic or tear brackets from the fascia.",
    },
  ],
  limits:
    "This calculator provides preliminary material estimates for roof trim and gutters. It does not perform hydraulic stormwater calculations for extreme cloudburst intensities, siphon drainage designs, or internal parapet box gutter overflows.",
};
