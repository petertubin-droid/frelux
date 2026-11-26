import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const buildToRoofEstimatorGuide: CalculatorGuide = {
  slug: "build-to-roof-estimator",
  heading: "Build to Roof Structural Shell Takeoff & Bill of Quantities Guide",
  howItWorks: [
    "Measure the building footprint perimeter and internal load-bearing wall centreline lengths to establish substructure trench and superstructure wall linear metres.",
    "Calculate foundation strip trench excavation, blinding concrete, foundation footing concrete, and foundation hollow block courses up to damp-proof course level.",
    "Quantify hardcore filling, sand blinding bed, damp-proof membrane (1000 gauge polythene), welded wire fabric mesh (BRC A142), and ground floor slab concrete.",
    "Measure superstructure wall elevation gross areas, deduct door and window voids, and multiply net wall area by unit block density (10 blocks per square metre for metric 450 mm by 225 mm blocks).",
    "Calculate reinforced concrete lintel and tie beams across openings and wall heads, including longitudinal high-yield rebar and shear stirrups.",
    "Estimate timber or light-gauge steel roof truss spacing (typically 1.2 metre centres), wall plates, purlins, king posts, ridge boards, and corrugated metal or stone-coated roof sheets.",
  ],
  workedExample: {
    intro:
      "Consider a single-storey residential bungalow with an external footprint of 12.0 metres by 10.0 metres (total gross footprint area of 120 square metres) and a wall height of 3.0 metres. The external perimeter is 44.0 metres, and internal structural partition walls measure 36.0 metres, giving a total wall run of 80.0 metres. Total window and door opening deductions equal 24.0 square metres.",
    steps: [
      {
        label:
          "Substructure footing concrete (0.60 m wide x 0.225 m deep x 80 m run)",
        value: "10.80 m3",
      },
      {
        label:
          "Substructure blockwork (4 courses of 225 mm blocks below DPC = 0.90 m high)",
        value: "720 units",
      },
      {
        label:
          "Compacted hardcore subbase fill (120 m2 footprint x 0.30 m depth)",
        value: "36.00 m3",
      },
      {
        label:
          "Ground oversite slab concrete (C20 mix, 0.15 m thick across 120 m2)",
        value: "18.00 m3",
      },
      {
        label:
          "Net superstructure wall area (80 m wall length x 3.0 m height minus 24 m2 voids)",
        value: "216.00 m2",
      },
      {
        label:
          "Superstructure hollow blocks (216 m2 net area x 10 blocks/m2 plus 5% site waste)",
        value: "2,268 units",
      },
      {
        label:
          "Continuous reinforced concrete tie beam (0.225 m x 0.225 m x 80 m wall head)",
        value: "4.05 m3",
      },
      {
        label:
          "Pitched roof projected surface area (120 m2 footprint with 30-degree pitch and eaves overhang)",
        value: "155.00 m2",
      },
    ],
    result:
      "The complete structural shell from trench bottom to ridge cap requires 32.85 cubic metres of structural concrete, 2,988 hollow blocks (substructure and superstructure combined), 36 cubic metres of compacted hardcore, and 155 square metres of roof covering.",
    note: "All quantities assume plumb masonry walls, sound bearing soil strata, and standard 5 percent cutting waste allowance on hollow masonry blocks and roof tiles.",
  },
  ratioTable: {
    caption:
      "Typical structural shell material benchmark consumption per square metre of gross floor area",
    columns: [
      "Building Stage",
      "Primary Material",
      "Metric Ratio per m2 GFA",
      "Typical Waste Factor",
    ],
    rows: [
      [
        "Substructure Strip Footing",
        "Concrete (C20/25)",
        "0.08 m3 to 0.12 m3 / m2",
        "5% to 7%",
      ],
      [
        "Oversite Ground Slab",
        "Concrete (150 mm)",
        "0.15 m3 to 0.16 m3 / m2",
        "3% to 5%",
      ],
      [
        "Substructure & Superstructure",
        "Hollow Masonry Blocks",
        "22 to 28 blocks / m2",
        "5% to 8%",
      ],
      [
        "Structural Rebar Reinforcement",
        "High-Yield Steel Bars",
        "18 kg to 25 kg / m2",
        "5% to 10%",
      ],
      [
        "Roof Framing & Truss Timber",
        "Treated Softwood / Hardwood",
        "0.035 m3 to 0.050 m3 / m2",
        "8% to 12%",
      ],
      [
        "Roof Covering Sheets",
        "Profiled Metal / Stone Coated",
        "1.25 m2 to 1.35 m2 / m2",
        "7% to 10%",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between substructure and superstructure in a build-to-roof estimate?",
      answer:
        "The substructure includes all building elements constructed below the damp-proof course (DPC) level, including excavation trenches, blinding concrete, strip or pad footings, foundation blockwork, hardcore fill, oversite membrane, and ground slab. The superstructure encompasses all building elements erected above the DPC level up to the roof ridge, such as external envelope walls, internal partition walls, columns, lintels, roof trusses, purlins, and roof coverings.",
    },
    {
      question:
        "How do openings for doors and windows affect masonry block takeoffs?",
      answer:
        "Openings must be calculated by multiplying opening width by opening height to establish total void area. In professional quantity surveying, this void area is deducted from the gross wall elevation area to arrive at the net wall area. However, the concrete lintel beam above the opening and additional reinforcement stirrups around opening corners must be added to the structural concrete and steel schedules.",
    },
    {
      question: "Why must hardcore subbase fill be compacted in layers?",
      answer:
        "Hardcore subbase material placed in thick uncontrolled layers cannot achieve uniform mechanical density. It must be deposited in layers not exceeding 150 millimetres to 200 millimetres in loose depth and thoroughly consolidated with a mechanical plate compactor or vibratory roller. Inadequate compaction causes settlement of the ground oversite slab, leading to cracked floor tiles and fractured underground drainage lines.",
    },
    {
      question:
        "How is roof area calculated from building ground floor footprint?",
      answer:
        "Roof area is significantly larger than the ground floor footprint due to roof slope pitch and perimeter eaves overhangs. For a standard 30-degree pitched gable or hip roof with a 600 millimetre eaves projection, the actual rafter slope length increases the surface area by a multiplier of approximately 1.20 to 1.30 times the horizontal plan projection. Rafter layout, valley gutters, and ridge hips also introduce cut waste on sheet materials.",
    },
    {
      question:
        "What waste allowances should be applied to structural building materials?",
      answer:
        "Standard UK and international quantity surveying practice applies specific waste factors: 5 percent on ready-mix concrete, 5 percent to 8 percent on concrete hollow blocks (to account for transit chipping and split cut units), 5 percent to 10 percent on reinforcement steel bars (cutting and lap offcuts), and 7 percent to 10 percent on roof sheeting and timber elements.",
    },
  ],
  limits:
    "This build-to-roof estimator provides preliminary material takeoffs and baseline bill of quantities for budgetary planning. It does not replace certified structural engineering calculations, soil geotechnical borehole tests, or stamped architectural plans required by municipal building authorities.",
};
