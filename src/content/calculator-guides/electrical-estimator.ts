import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const electricalEstimatorGuide: CalculatorGuide = {
  slug: "electrical-estimator",
  heading:
    "Electrical Installation Takeoff: Conduit, Wiring & Distribution Guide",
  howItWorks: [
    "Compile an electrical fixtures schedule listing all power socket outlets, lighting points, wall switches, cooker units, water heaters, and air-conditioning isolators per room.",
    "Assign standard conductor cross-sectional areas based on circuit design current: 1.5 mm2 for lighting, 2.5 mm2 for ring or radial socket circuits, 4.0 mm2 to 6.0 mm2 for cookers and showers, and 10 mm2 to 16 mm2 for main distribution sub-feeders.",
    "Measure horizontal wall chases, ceiling drops, and slab embedded conduit runs, adding 20 percent to account for riser vertical rises and junction routing.",
    "Calculate single-core PVC insulated copper cable coil lengths (typically 100-metre coils) by multiplying conduit route lengths by the number of active conductors (live, neutral, and circuit protective conductor).",
    "Size the main consumer unit distribution board based on total circuit ways plus 25 percent spare capacity for future expansion, equipped with residual current devices (RCD / RCBO).",
    "Specify earthing protection hardware including pure copper earth rods, inspection pits, brass driving clamps, and 16 mm2 green-yellow bonding conductors.",
  ],
  workedExample: {
    intro:
      "An electrical installation takeoff for a 3-bedroom apartment with a floor area of 110 square metres. The circuit schedule comprises 2 lighting circuits (24 points total), 3 ring main socket circuits (28 twin switched socket outlets), 2 dedicated radial circuits for air conditioning (4.0 mm2 cable), 1 dedicated cooker circuit (6.0 mm2 cable), and 1 water heater circuit.",
    steps: [
      {
        label:
          "20 mm heavy-duty PVC conduit pipe (3.0 m lengths across walls and ceilings)",
        value: "95 lengths (285 m)",
      },
      {
        label:
          "1.5 mm2 single-core copper wire for lighting (live, neutral, switch returns)",
        value: "4 coils (400 m)",
      },
      {
        label:
          "2.5 mm2 single-core copper wire for ring sockets (twin and earth loops)",
        value: "6 coils (600 m)",
      },
      {
        label: "4.0 mm2 single-core copper wire for dedicated AC units",
        value: "2 coils (200 m)",
      },
      {
        label:
          "6.0 mm2 single-core copper wire for electric cooker cooker unit",
        value: "1 coil (100 m)",
      },
      {
        label:
          "Single-gang and twin-gang back boxes (flush galvanized steel or dry-lining)",
        value: "62 units",
      },
      {
        label:
          "Split-load consumer unit distribution board (12-way metal enclosure with SPD)",
        value: "1 unit",
      },
      {
        label:
          "16 mm diameter x 1.5 m copper earth rod assembly with inspection chamber",
        value: "1 set",
      },
    ],
    result:
      "The apartment electrical rough-in and first fix requires 285 metres of PVC conduit, 13 coils (1,300 metres) of single-core insulated building wire, 62 flush metal back boxes, 1 multi-way consumer distribution board with surge protection, and 1 complete earthing rod kit.",
    note: "Estimates include a standard 10 percent cable waste allowance for distribution board dressing, terminations, junction boxes, and pulling slack.",
  },
  ratioTable: {
    caption:
      "Standard building electrical circuits, conductor sizing, and circuit protection ratings (BS 7671 / IEC 60364)",
    columns: [
      "Circuit Type",
      "Minimum Conductor Size",
      "Protective Breaker Rating",
      "Conduit Size (OD)",
      "Max Radial Run Length",
    ],
    rows: [
      [
        "Domestic Lighting Loop",
        "1.5 mm2 Cu",
        "6A or 10A MCB/RCBO",
        "20 mm rigid PVC",
        "35 metres",
      ],
      [
        "Ring Final Socket Circuit",
        "2.5 mm2 Cu",
        "32A Type B MCB",
        "20 mm / 25 mm PVC",
        "100 m2 floor coverage",
      ],
      [
        "Radial Power Circuit",
        "2.5 mm2 Cu",
        "20A Type B MCB",
        "20 mm rigid PVC",
        "25 metres",
      ],
      [
        "Split Air Conditioner",
        "4.0 mm2 Cu",
        "20A / 25A MCB",
        "20 mm rigid PVC",
        "30 metres",
      ],
      [
        "Electric Cooker / Range",
        "6.0 mm2 / 10 mm2 Cu",
        "32A / 40A MCB",
        "25 mm rigid PVC",
        "25 metres",
      ],
      [
        "Instant Water Heater",
        "4.0 mm2 / 6.0 mm2 Cu",
        "32A RCBO (30mA)",
        "25 mm rigid PVC",
        "20 metres",
      ],
      [
        "Main Incomer Sub-feeder",
        "16 mm2 / 25 mm2 Cu",
        "63A / 80A Main Switch",
        "32 mm / 38 mm conduit",
        "15 metres",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between a ring final circuit and a radial socket circuit?",
      answer:
        "A ring final circuit starts at the consumer distribution board, loops continuously through each 13A socket outlet in the circuit, and returns to terminate at the same circuit breaker in the board. This dual path allows 2.5 mm2 cable protected by a 32A breaker to serve up to 100 square metres of floor space. A radial circuit runs from the breaker and terminates at the last socket outlet without looping back, requiring lower breaker ratings (20A for 2.5 mm2 cable) or larger conductor sizes.",
    },
    {
      question:
        "Why must lighting and power circuits be kept on separate distribution breakers?",
      answer:
        "Separating lighting and power circuits ensures electrical safety and prevents total darkness during a fault. If an appliance plugged into a power socket causes an earth fault or short circuit that trips a 32A breaker, the lighting circuits remain energized. Additionally, lighting circuits use smaller 1.5 mm2 conductors that would overheat dangerously before tripping a large 32A socket circuit breaker.",
    },
    {
      question:
        "How does voltage drop affect conductor sizing on long electrical cable runs?",
      answer:
        "Electrical resistance causes voltage drop over long conductor distances. Under international electrical regulations (such as BS 7671 and IEC 60364), voltage drop between the installation origin and any load point must not exceed 3 percent for lighting circuits and 5 percent for power circuits. On long cable runs exceeding 30 metres, cable cross-sectional area must often be stepped up to the next gauge (e.g. from 2.5 mm2 to 4.0 mm2) to avoid excessive voltage drop and equipment malfunction.",
    },
    {
      question:
        "What is the function of a Residual Current Device (RCD) or RCBO?",
      answer:
        "An RCD continuously monitors balance between incoming active live current and outgoing neutral current. If current leaks to earth (such as through a person touching a live conductor or damaged insulation), the RCD disconnects power within 40 milliseconds at a sensitivity of 30 milliamps, preventing fatal electrocution. An RCBO combines residual current shock protection and overcurrent short-circuit protection into a single device.",
    },
    {
      question: "Why is conduit pipe fill capacity limited to 40 percent?",
      answer:
        "Electrical codes limit cable volume inside a rigid conduit to a maximum 40 percent space factor (conduit fill). Keeping 60 percent free air space prevents heat buildup from current-carrying conductors, dissipates thermal energy, and prevents cable insulation damage from friction and tension during wire pulling through conduit bends.",
    },
  ],
  limits:
    "This electrical installation takeoff provides bill of quantities estimates for cables, conduits, and accessories based on point counts and average run lengths. It does not replace an electrical design layout, fault current discrimination study, or statutory certification by a licensed electrical engineer.",
};
