import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const conduitWiringEstimatorGuide: CalculatorGuide = {
  slug: "conduit-wiring-estimator",
  heading: "Electrical conduit piping, wiring coils, and circuit drop calculation guide",
  howItWorks: [
    "Electrical conduit and wiring takeoff calculates the concealed containment infrastructure and insulated conductor cables required to power a building safely. The estimation workflow coordinates three interlinked layers: the rigid or flexible conduit network embedded in concrete slabs and chased into masonry walls, the copper conductor cable coils pulled through conduits, and the accessory back boxes and junction fittings.",
    "Conduit piping is estimated using orthogonal taxicab routing: conduits follow building perimeters and grid lines rather than diagonal shortcuts across ceilings or floors. To the horizontal distance between distribution board and outlet points, vertical drops must be added: typically 1.2 m to 1.4 m drop from ceiling level to wall light switches, and 2.4 m to 2.6 m drop to low-level socket outlets placed 300 mm above finished floor level.",
    "Conduit diameter dictates conductor pulling capacity. Standard 20 mm external diameter rigid PVC conduit safely accommodates up to six 1.5 mm² lighting conductors or four 2.5 mm² power cables while respecting the 40 percent space factor rule. When routing heavier circuits or multiple shared home-runs, 25 mm conduit is specified to prevent heat buildup and cable insulation friction damage during pulling.",
    "Conductor wire is purchased in standard 100-metre coils and sized strictly by circuit application. Lighting circuits utilize 1.5 mm² single-core copper cables (Live, Neutral, and Earth). Standard 13 A socket ring or radial circuits require 2.5 mm² conductors. High-draw appliances such as 1.5 HP to 2.5 HP air conditioners and water storage heaters require dedicated 4.0 mm² radial runs, while electric induction cookers require 6.0 mm² to 10.0 mm² circuits.",
    "Accessories, back boxes, and wastage factors complete the material takeoff. Every switch and socket requires a galvanized steel or high-impact PVC flush back box (75 mm by 75 mm for 1-gang or 75 mm by 135 mm for 2-gang). A 10 percent allowance is added to total conduit length to account for offcut wastage, and an extra 150 mm to 200 mm wire loop allowance is calculated at every termination point for stripping and terminal connection.",
  ],
  workedExample: {
    intro:
      "Modern 120 m² residential flat takeoff: calculating conduit pipes, cable coils, and back boxes for a layout featuring 20 lighting points, 24 double socket outlets, 3 dedicated split-unit AC feeds, and 2 water heater circuits linked to a central 12-way consumer unit.",
    steps: [
      {
        label: "Rigid 20 mm PVC conduit pipes (3 m lengths with 10% waste)",
        value: "95 pipes (285 linear metres total containment)",
      },
      {
        label: "Flexible corrugated PVC conduit (slab and beam drops)",
        value: "2 rolls of 50 m flexible tubing (100 m total)",
      },
      {
        label: "Circular junction boxes and inspection elbows",
        value: "35 junction boxes (1-way, 2-way through, and 4-way)",
      },
      {
        label: "Single-core 1.5 mm² copper cable (lighting circuits)",
        value: "3 coils Red/Live, 3 coils Black/Neutral, 3 coils Earth",
      },
      {
        label: "Single-core 2.5 mm² copper cable (ring and radial sockets)",
        value: "5 coils Red/Live, 5 coils Black/Neutral, 5 coils Earth",
      },
      {
        label: "Single-core 4.0 mm² copper cable (dedicated AC & heaters)",
        value: "2 coils Red/Live, 2 coils Black/Neutral, 2 coils Earth",
      },
      {
        label: "Flush metal knock-out back boxes (1-gang switches & spurs)",
        value: "22 boxes (75 mm × 75 mm × 35 mm deep)",
      },
      {
        label: "Flush metal knock-out back boxes (2-gang socket outlets)",
        value: "24 boxes (75 mm × 135 mm × 35 mm deep)",
      },
      {
        label: "PVC conduit solvent cement bonding adhesive",
        value: "4 tins of 250 ml quick-setting solvent cement",
      },
      {
        label: "Copper earth tape and grounding rod kit",
        value: "1 copper earth rod (1.5 m) with driving clamp and chamber",
      },
    ],
    result:
      "Total purchase list: 95 rigid 20 mm pipes, 100 m flexible conduit, 35 junction boxes, 9 coils 1.5 mm² wire, 15 coils 2.5 mm² wire, 6 coils 4.0 mm² wire, 46 flush back boxes, 4 tins solvent glue, and 1 earth rod kit.",
  },
  ratioTable: {
    caption:
      "Standard residential electrical circuit types, conductor cross-sections, and conduit rules",
    columns: [
      "Electrical circuit classification",
      "Conductor cross-section & cable type",
      "Conduit size & typical protective breaker rating",
    ],
    rows: [
      [
        "General indoor lighting and ceiling fans",
        "1.5 mm² stranded single-core copper",
        "20 mm rigid PVC conduit; 6 A or 10 A MCB breaker",
      ],
      [
        "Standard 13 A twin socket outlets (radial)",
        "2.5 mm² stranded single-core copper",
        "20 mm rigid PVC conduit; 16 A or 20 A MCB breaker",
      ],
      [
        "Standard 13 A socket ring main (loop)",
        "2.5 mm² stranded single-core copper",
        "20 mm or 25 mm conduit; 32 A MCB breaker",
      ],
      [
        "Split-unit air conditioners (up to 2.0 HP)",
        "4.0 mm² stranded single-core copper",
        "20 mm rigid PVC conduit; 20 A or 25 A MCB breaker",
      ],
      [
        "Instant / storage electric water heater",
        "4.0 mm² stranded single-core copper",
        "20 mm rigid PVC conduit; 20 A double-pole switch & MCB",
      ],
      [
        "Electric cooker unit and oven range",
        "6.0 mm² or 10.0 mm² copper conductor",
        "25 mm rigid PVC conduit; 32 A to 45 A cooker control unit",
      ],
      [
        "Main incoming sub-feeder to consumer board",
        "16.0 mm² to 25.0 mm² armored or single-core",
        "32 mm or 38 mm heavy-gauge duct; 63 A to 100 A main switch",
      ],
    ],
  },
  faqs: [
    {
      question: "Why are single-core cables preferred in conduit over flat twin and earth?",
      answer:
        "Single-core stranded copper cables pull easily around 90 degree conduit bends and allow individual circuit wires to be replaced or pulled in the future without chasing open walls. Flat twin and earth cables have wide sheaths that twist and bind inside circular conduit, dramatically reducing heat dissipation and violating space factor rules.",
    },
    {
      question: "What is the 40 percent space factor rule for electrical conduit?",
      answer:
        "Electrical safety standards dictate that the combined cross-sectional area of all conductor cables inside a conduit must not exceed 40 percent of the internal cross-sectional area of the conduit pipe. Leaving 60 percent free air space prevents insulation overheating and ensures cables can be drawn in or withdrawn without tearing their outer PVC insulation.",
    },
    {
      question: "Why should vertical conduit drops be installed plumb and straight?",
      answer:
        "Electrical conduits are chased into masonry walls before plastering. Installing conduits strictly in vertical and horizontal lines directly above or below switches and sockets establishes safe zones. This enables occupants and carpenters to know where not to drill or hammer nails for wall hangings years after construction.",
    },
    {
      question: "How much wire slack should be left at each back box termination?",
      answer:
        "Electricians should leave 150 mm to 200 mm (6 to 8 inches) of slack conductor wire protruding from every flush back box and ceiling rose. This slack allows comfortable stripping, loop testing, and terminating into switch terminals without placing tension on the copper cores or terminal screws.",
    },
    {
      question: "What is the purpose of the circuit protective conductor (earth wire)?",
      answer:
        "The earth wire provides a low-impedance fault current return path back to the consumer unit and earth rod. If a live conductor comes loose and touches a metal appliance body or metallic faceplate, the fault current flows safely down the earth wire and trips the circuit breaker or RCD instantly, preventing lethal electric shock.",
    },
  ],
  limits:
    "This tool estimates material quantities, conduit pipes, and cable coil allowances based on physical building layout and point schedules. It does not perform voltage drop calculations, maximum demand diversity studies, or certify electrical installations.",
};
