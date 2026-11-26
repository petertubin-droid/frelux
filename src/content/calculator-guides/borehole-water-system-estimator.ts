import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the borehole and water distribution system estimator.
 *
 * Sizing a private groundwater abstraction scheme involves combining borehole
 * drilling depth, casing and screen schedules, submersible pump hydraulic head,
 * power cabling, and elevated storage staging.
 */
export const boreholeWaterSystemEstimatorGuide: CalculatorGuide = {
  slug: "borehole-water-system-estimator",
  heading: "How the borehole and water distribution estimator works",
  howItWorks: [
    "Determine the anticipated drilling depth from local hydrogeological data or resistivity geophysical sounding. Drilling diameter is typically 150 mm to 200 mm (6 to 8 inches) to accommodate standard casing and gravel filter pack.",
    "Schedule casing and screen pipe assemblies. Plain blind casing lines the unstable overburden, while slotted screen pipes (0.5 mm to 1.0 mm slots) are installed across the water-bearing aquifer zone, wrapped in clean, rounded silica gravel pack to filter sand.",
    "Calculate Total Dynamic Head (TDH) to size the submersible pump motor. TDH combines the static water level, pumping drawdown, vertical lift from ground level to the elevated storage tank, and frictional pipe losses through riser and distribution lines.",
    "Size the submersible drop cable and mechanical riser pipes. Deep well pumps require heavy-gauge 3-core submersible drop cable, waterproof resin or heat-shrink splice kits, stainless steel safety suspension cables, and high-pressure threaded uPVC or galvanized riser pipes.",
    "Schedule overhead storage and surface water distribution. Sizing covers poly cylindrical or galvanized pressed steel storage tanks, elevated structural steel towers with reinforced concrete pad footings, automatic float switches, and non-return check valves.",
  ],
  workedExample: {
    intro:
      "A residential development drilling a 60-metre deep borehole with water struck at 35 m, a static water level of 18 m, pumping up to a 5,000-litre overhead tank elevated 6 metres above ground.",
    steps: [
      { label: "Borehole drilled depth", value: "60.0 m (150 mm diameter)" },
      {
        label: "Casing schedule",
        value: "48 m blind casing + 12 m slotted screen",
      },
      {
        label: "Silica gravel filter pack",
        value: "1.20 tonnes (2 mm to 4 mm rounded gravel)",
      },
      {
        label: "Bentonite sanitary top seal",
        value: "3 bags (top 3 metres surface seal)",
      },
      {
        label: "Submersible pump setting depth",
        value: "45.0 m below wellhead",
      },
      {
        label: "Total Dynamic Head (TDH)",
        value: "62.0 m head (lift + friction)",
      },
      {
        label: "Submersible pump unit",
        value: "1.5 HP (1.1 kW) multistage deep well pump",
      },
      {
        label: "Overhead storage & tower",
        value: "5,000 L cylindrical tank on 6 m steel stand",
      },
    ],
    result:
      "The scheme requires 60 m of drilling, 60 m of casing and screen, a 1.5 HP submersible pump set at 45 m, 50 m of riser pipe, a 5,000-litre tank, and a 6-metre elevated steel stand.",
    note: "Always complete a continuous 4 to 8 hour pumping yield test after development to verify sustainable yield (m³/hr) and prevent dry-running pump failure.",
  },
  ratioTable: {
    caption:
      "Typical borehole pump motor ratings, flow rates, and total dynamic head relationships.",
    columns: [
      "Motor Power",
      "Optimum Head Range",
      "Typical Flow Rate",
      "Recommended Riser Size",
      "Power Supply",
    ],
    rows: [
      [
        "0.75 HP (0.55 kW)",
        "20 to 45 metres",
        "1.5 to 2.5 m³/hr",
        "1.0 inch (25 mm) uPVC/GI",
        "230V Single Phase",
      ],
      [
        "1.00 HP (0.75 kW)",
        "35 to 60 metres",
        "2.0 to 3.5 m³/hr",
        "1.25 inch (32 mm) uPVC/GI",
        "230V Single Phase",
      ],
      [
        "1.50 HP (1.10 kW)",
        "50 to 85 metres",
        "2.5 to 4.5 m³/hr",
        "1.25 or 1.50 inch",
        "230V Single Phase",
      ],
      [
        "2.00 HP (1.50 kW)",
        "70 to 110 metres",
        "3.0 to 6.0 m³/hr",
        "1.50 inch (38 mm) uPVC/GI",
        "230V or 400V 3-Phase",
      ],
      [
        "3.00 HP (2.20 kW)",
        "90 to 140 metres",
        "4.0 to 8.0 m³/hr",
        "2.0 inch (50 mm) uPVC/GI",
        "400V Three Phase",
      ],
      [
        "5.50 HP (4.00 kW)",
        "120 to 200 metres",
        "6.0 to 12.0 m³/hr",
        "2.0 or 2.5 inch",
        "400V Three Phase",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why is a geophysical resistivity survey recommended before drilling?",
      answer:
        "A vertical electrical sounding (VES) survey identifies subsurface geological strata, depth of bedrock, and fracture zones with high groundwater potential. Surveying avoids drilling dry holes in dense non-water-bearing solid granite.",
    },
    {
      question:
        "What is the function of the gravel pack around the borehole screen?",
      answer:
        "Clean silica pea gravel placed in the annular space between the drill hole and slotted casing stabilizes the formation, prevents fine sand from entering the borehole, and creates a permeable filter zone that maximizes water inflow.",
    },
    {
      question:
        "How is Total Dynamic Head (TDH) calculated for submersible pump selection?",
      answer:
        "Total Dynamic Head is the sum of vertical elevation from the pumping water level to the tank discharge point, plus pressure requirements, plus frictional head loss through the pipe elbows and valves at maximum flow velocity.",
    },
    {
      question:
        "Why should a sanitary grout seal be installed at the top of the well?",
      answer:
        "Surface runoff carrying pesticides, bacteria, and sewage can migrate downward along the borehole casing exterior into the deep aquifer. A cement bentonite grout seal installed in the top 3 to 6 metres creates an impermeable barrier against contamination.",
    },
    {
      question:
        "What protective devices should be installed with a submersible pump?",
      answer:
        "Every installation requires dry-run protection (water level probe sensors or electronic pump protection relays), a digital voltage monitor against brownouts and phase failure, and a reliable non-return check valve at the pump outlet.",
    },
  ],
  limits:
    "This calculator provides preliminary mechanical, civil, and material estimation. It does not replace on-site hydrogeological surveys, certified well driller geological logging, laboratory chemical potability testing, or municipal water abstraction licensing.",
};
