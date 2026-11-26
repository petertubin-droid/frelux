import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const foundationEstimatorGuide: CalculatorGuide = {
  slug: "foundation-estimator",
  heading: "Foundation Concrete, Hardcore & Substructure Masonry Takeoff Guide",
  howItWorks: [
    "Determine the required foundation type (strip footing, pad footing, reinforced raft, or ground beam) based on soil bearing capacity and superstructure loads.",
    "Calculate trench excavation volume by multiplying total trench length by trench width and depth below existing ground level, adding a working space factor.",
    "Specify unreinforced blinding concrete (50 mm to 75 mm depth of lean C10 mix) to provide a clean, level working platform protecting footing reinforcement from soil contamination.",
    "Compute foundation footing concrete volume based on designed structural width (typically 600 mm to 900 mm) and thickness (225 mm to 450 mm).",
    "Calculate foundation masonry courses required from footing level up to damp-proof course (DPC) level, allowing for mortar bed joints (10 mm to 12 mm).",
    "Quantify hardcore subbase stone volume, sand blinding layer, 1000-gauge polyethylene damp-proof membrane, and steel reinforcement starter bars.",
  ],
  workedExample: {
    intro:
      "A perimeter continuous strip foundation runs 50.0 linear metres around a residential extension on firm sandy clay soil (allowable safe bearing capacity of 150 kN/m2). The foundation trench is excavated 0.90 metres wide and 1.00 metre deep.",
    steps: [
      {
        label:
          "Trench excavation volume (50 m length x 0.90 m width x 1.00 m depth)",
        value: "45.00 m3",
      },
      {
        label: "Bulked spoil disposal volume (45 m3 x 1.25 soil swell factor)",
        value: "56.25 m3",
      },
      {
        label:
          "Lean mix blinding concrete (50 mm thick over 50 m x 0.90 m trench floor)",
        value: "2.25 m3",
      },
      {
        label:
          "Strip footing concrete (C25/30 mix, 0.60 m wide x 0.30 m deep x 50 m run)",
        value: "9.00 m3",
      },
      {
        label:
          "Substructure masonry walls (5 courses of 225 mm hollow blocks = 1.125 m height)",
        value: "562 blocks",
      },
      {
        label:
          "Compacted granular hardcore fill (interior perimeter bed, 60 m2 x 0.20 m deep)",
        value: "12.00 m3",
      },
      {
        label:
          "Damp-proof membrane (1000 gauge polythene including 150 mm joint laps)",
        value: "72.00 m2",
      },
      {
        label:
          "High-yield longitudinal reinforcement (4 x Y12 bars with Y8 links at 200 mm centres)",
        value: "248 kg",
      },
    ],
    result:
      "The 50.0-metre strip foundation requires 45 cubic metres of machine excavation, 11.25 cubic metres of structural and blinding concrete, 562 foundation blocks, 12 cubic metres of hardcore fill, 72 square metres of DPM sheeting, and 248 kilograms of steel reinforcement.",
    note: "Quantities include standard industry allowances of 5 percent waste on in-situ concrete and 7 percent cutting waste on hollow masonry units.",
  },
  ratioTable: {
    caption:
      "Foundation substructure component dimensions and typical material takeoff consumption ratios",
    columns: [
      "Foundation Element",
      "Standard Dimension Range",
      "Concrete Mix Grade",
      "Rebar Steel Intensity",
    ],
    rows: [
      [
        "Leveling Blinding Bed",
        "50 mm to 75 mm depth",
        "C10 / C15 lean mix",
        "Unreinforced",
      ],
      [
        "Residential Strip Footing",
        "600 mm to 900 mm wide x 250 mm to 400 mm deep",
        "C20/25 ready-mix",
        "45 kg to 70 kg / m3",
      ],
      [
        "Isolated Pad Footing",
        "1000 mm x 1000 mm x 450 mm deep",
        "C25/30 ready-mix",
        "60 kg to 90 kg / m3",
      ],
      [
        "Reinforced Raft Slab",
        "200 mm to 300 mm thick slab",
        "C25/30 or C30/37",
        "80 kg to 120 kg / m3",
      ],
      [
        "Substructure Stem Wall",
        "225 mm solid or grouted hollow block",
        "1:3 mortar class M4",
        "Starter pins at 600 mm",
      ],
      [
        "Compacted Hardcore Base",
        "150 mm to 300 mm consolidated depth",
        "Well-graded stone fill",
        "Non-reinforced",
      ],
    ],
  },
  faqs: [
    {
      question:
        "How deep should a residential foundation footing be placed below ground?",
      answer:
        "The minimum foundation depth must penetrate below the active seasonal frost penetration zone and moisture change zone to avoid heave and subsidence. In temperate climates, minimum strip footing depth is typically 900 millimetres to 1000 millimetres below finished ground level. In heavy shrinkable clay soils with nearby mature trees, foundation depths frequently exceed 1500 millimetres to 2000 millimetres to reach stable, unyielding soil strata.",
    },
    {
      question:
        "Why is a lean concrete blinding layer essential before pouring footing concrete?",
      answer:
        "Blinding concrete creates a clean, dry, and flat working platform over the raw excavated soil. Without blinding, structural concrete poured directly onto clay or loose dirt mixes with mud, reducing its compressive strength and compromising rebar cover. A sound blinding layer ensures reinforcement spacer blocks maintain the mandatory 50 millimetre cover to prevent corrosion from groundwater.",
    },
    {
      question:
        "What is soil bulking, and why does it affect trench excavation costs?",
      answer:
        "When virgin consolidated ground is dug up by an excavator, the soil particles loosen and air voids are introduced. This physical expansion is called bulking or swell factor. Compacted clay swells by approximately 25 percent to 35 percent, while solid rock swells by up to 50 percent. When planning site haulage trucks and skip disposal, virgin trench volume must be multiplied by the bulking factor to determine true disposal volume.",
    },
    {
      question:
        "How does allowable soil bearing capacity influence strip footing width?",
      answer:
        "Footing width is calculated by dividing total vertical wall load (dead load plus live load) by the safe allowable soil bearing capacity. On dense gravel with high bearing capacity (300 kN/m2), a narrow 450 millimetre footing suffices. On soft clay or loose silt with low bearing capacity (75 kN/m2), footing width must be widened to 900 millimetres or 1200 millimetres to spread the load safely without shear failure or excessive settlement.",
    },
    {
      question:
        "Why must foundation blocks below ground level have high compressive strength?",
      answer:
        "Masonry units laid below the damp-proof course operate under continuous exposure to damp ground, lateral soil pressure, and groundwater salts. Standard hollow blocks used below ground must achieve minimum compressive strength of 7.3 N/mm2 to 10.4 N/mm2, or have their hollow cores fully grouted with C20 concrete mortar to resist lateral earth thrust and moisture ingress.",
    },
  ],
  limits:
    "This foundation estimator computes deterministic material volumes based on specified linear dimensions and nominal mix proportions. It does not replace a geotechnical soil investigation report, site slope stability analysis, or structural engineering foundation designs approved by chartered civil engineers.",
};
