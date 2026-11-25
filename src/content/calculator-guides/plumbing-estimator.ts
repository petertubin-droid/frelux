import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const plumbingEstimatorGuide: CalculatorGuide = {
  slug: "plumbing-estimator",
  heading: "Plumbing pipework, drainage networks, and sanitary takeoff guide",
  howItWorks: [
    "A comprehensive plumbing takeoff coordinates two distinct fluid systems within a building: the pressurized domestic clean water supply network and the gravity-fed foul soil and wastewater drainage system. Accurate estimation ensures adequate water pressure at high-demand fixtures while preventing foul sewer gases from entering living quarters.",
    "Potable water supply pipework is estimated by pressure tier and thermal duty. Modern construction specifies polypropylene random copolymer (PPR) heat-fused pipes or CPVC for hot and cold water distribution. Main supply risers from overhead storage tanks or booster pumps utilize 32 mm (1 inch) PN20 pipes, branching into 25 mm (3/4 inch) distribution headers, and terminating in 20 mm (1/2 inch) localized supply branches to basins, showers, and water closets.",
    "Soil and waste drainage relies strictly on gravity fall and hydraulic capacity. Soil pipes carrying blackwater from water closets require 110 mm (4 inch) heavy-gauge UPVC pipes laid at a continuous 1 in 50 (2 percent) gradient. Greywater from wash hand basins, showers, and kitchen sinks is collected via 50 mm (2 inch) or 75 mm (3 inch) waste pipes and routed through water-sealed bottle traps and gulley traps.",
    "Fittings, valves, and fixture connection kits bridge pipe runs to sanitary appliances. Every wet zone requires dedicated full-bore brass ball isolation valves so maintenance can occur without shutting off the entire building. Fixture terminations require female threaded brass transition elbows, chrome-plated angle stop valves, and stainless steel braided flexible hoses (15 mm by 1/2 inch).",
    "Sewer infrastructure and ventilation complete the external takeoff. Every vertical soil stack must extend above the roofline as an open 110 mm soil vent pipe (SVP) fitted with a cowl to balance pneumatic pressures and vent gases. External subterranean drainage lines require 450 mm by 450 mm masonry or pre-formed PVC inspection chambers at every 90 degree turn and maximum 15 metre intervals.",
  ],
  workedExample: {
    intro:
      "Modern 3-bathroom residential bungalow takeoff: calculating water supply pipework, drainage conduits, valves, and fittings for 3 complete bathrooms (WC, shower, basin), 1 kitchen sink, 1 laundry connection, and an overhead tank connection.",
    steps: [
      {
        label: "PPR 32 mm PN20 water supply pipes (overhead tank riser)",
        value: "8 pipes (24 linear metres with 4 m pipe lengths)",
      },
      {
        label: "PPR 25 mm PN20 main branch distribution headers",
        value: "14 pipes (56 linear metres total pipe length)",
      },
      {
        label: "PPR 20 mm PN20 localized fixture connection pipes",
        value: "22 pipes (88 linear metres total pipe length)",
      },
      {
        label: "PPR heat-fusion fittings (elbows, tees, sockets, reducers)",
        value: "115 socket-fusion fittings across all diameters",
      },
      {
        label: "PPR female brass threaded wall elbows (for angle valves)",
        value: "14 brass transition drop-ear elbows",
      },
      {
        label: "UPVC 110 mm soil drainage pipes (WCs & stack vents)",
        value: "12 pipes (48 linear metres heavy-gauge UPVC)",
      },
      {
        label: "UPVC 50 mm greywater waste pipes (basins, sinks, showers)",
        value: "16 pipes (64 linear metres waste line UPVC)",
      },
      {
        label: "Drainage fittings (swept bends, 45° elbows, access junctions)",
        value: "42 solvent-weld drainage fittings with access plugs",
      },
      {
        label: "Sanitary fixture isolation (angle valves & braided hoses)",
        value: "14 chrome angle valves and 14 stainless braided hoses",
      },
      {
        label: "External subterranean inspection chambers / manholes",
        value: "4 pre-formed inspection chambers with airtight covers",
      },
    ],
    result:
      "Total purchase list: 44 PPR clean water pipes, 115 PPR fittings, 14 brass transition elbows, 28 UPVC drainage pipes, 42 drainage fittings, 14 angle valves with flexible connectors, and 4 inspection chambers.",
  },
  ratioTable: {
    caption:
      "Domestic plumbing pipe classifications, diameters, gradients, and support intervals",
    columns: [
      "Plumbing pipe application",
      "Standard nominal pipe diameter",
      "Design gradient / pressure rating & support interval",
    ],
    rows: [
      [
        "Main overhead tank down-feed riser",
        "32 mm (1 in nominal bore) PPR/CPVC",
        "PN20 rating; pipe clips spaced at 1.0 m centres",
      ],
      [
        "Cold & hot bathroom distribution loop",
        "25 mm (3/4 in nominal bore) PPR",
        "PN20 rating; pipe clips spaced at 0.8 m centres",
      ],
      [
        "Fixture connection branches (tap / WC)",
        "20 mm (1/2 in nominal bore) PPR",
        "PN20 rating; clip within 150 mm of every terminal fitting",
      ],
      [
        "WC toilet soil pipe & roof vent stack",
        "110 mm (4 in) heavy UPVC",
        "1:50 gradient (2% fall); brackets spaced at 1.0 m vertical",
      ],
      [
        "Kitchen sink & laundry waste branch",
        "50 mm or 75 mm (2 in or 3 in) UPVC",
        "1:40 gradient (2.5% fall); roddable access swept tees",
      ],
      [
        "Wash hand basin waste discharge",
        "40 mm or 50 mm (1.5 in or 2 in) UPVC",
        "1:40 gradient; bottle trap with 75 mm water seal",
      ],
      [
        "External buried gravity sewer lateral",
        "110 mm or 160 mm underground UPVC",
        "1:60 to 1:80 fall bedded on 100 mm pea gravel or sand",
      ],
    ],
  },
  faqs: [
    {
      question: "Why is PPR heat fusion preferred over solvent-weld PVC for clean water?",
      answer:
        "PPR pipes and fittings melt together during thermal socket fusion at 260 degrees Celsius to form a continuous, homogenous polymer joint without chemical solvents or glues. Unlike PVC solvent cement joints that degrade under fluctuating water pressure and thermal expansion, fused PPR joints possess the same burst pressure strength as the pipe wall itself.",
    },
    {
      question: "What is the correct gradient for soil drainage pipes?",
      answer:
        "Horizontal 110 mm soil pipes should be laid at a uniform slope between 1 in 40 (2.5 percent) and 1 in 60 (1.67 percent). If a pipe is too flat, water flows too slowly and solids deposit along the invert, creating blockages. If the slope is too steep (over 1 in 20), liquid drains away rapidly while leaving solid waste stranded behind.",
    },
    {
      question: "What is the function of the soil vent pipe (SVP)?",
      answer:
        "When a toilet flushes, the descending volume of water creates negative pneumatic pressure behind it that can siphon dry the water seals in nearby sink and shower traps. The soil vent pipe extends above the roofline to admit atmospheric air, balancing system pressure and preventing sewer odors from venting into living rooms.",
    },
    {
      question: "Why must every sanitary fixture incorporate a water-sealed trap?",
      answer:
        "Fixtures such as basins, sinks, showers, and water closets incorporate a U-shaped dip that permanently retains 50 mm to 75 mm of water. This water barrier forms an airtight seal separating indoor living spaces from harmful sewer gases, airborne bacteria, and vermin inhabiting drainage networks.",
    },
    {
      question: "How do zone isolation valves simplify building maintenance?",
      answer:
        "Installing individual quarter-turn ball valves on the cold and hot water feed lines to each bathroom or kitchen enables plumbers to isolate and repair a leaking tap or faulty valve without shutting off water to the entire property or draining overhead storage tanks.",
    },
  ],
  limits:
    "This tool provides bill of quantities material takeoff based on fixture schedules and user-entered pipe runs. It does not perform hydraulic head-loss calculations, pump horsepower sizing, or municipal storm-water design.",
};
