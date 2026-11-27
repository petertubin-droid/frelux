import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const stuccoCalculatorGuide: CalculatorGuide = {
  slug: "stucco-calculator",
  heading: "Exterior Portland Cement Stucco Plaster Takeoff and Material Guide",
  howItWorks: [
    "Measure elevation geometry and opening subtractions: calculate total external wall areas and subtract all door, window, garage, and architectural voids to determine true net square metre stucco area.",
    "Select stucco wall assembly system: differentiate traditional three-coat Portland cement stucco (scratch coat, brown coat, finish coat) from one-coat polymer-modified stucco over continuous insulation.",
    "Quantify weather-resistive barrier (WRB) and lath: determine Grade D asphalt building paper (minimum two plies or synthetic air-water barrier) and expanded self-furring galvanized diamond mesh lath (1.4 or 1.8 kg/m2) with 50 mm laps.",
    "Calculate base coat cement, hydrated lime, and plaster sand: determine volumes for nominal 9 mm scratch coat (1:3 cement sand) and nominal 9 mm brown levelling coat (1:1:5 cement lime sand), factoring in dry sand bulk densities.",
    "Determine finish coat compound and colour pigment: size decorative textured stucco finish coat (dash, sand float, lace, or scraped trowel) at 2.8 to 4.0 kg dry mix per square metre, rounded to full commercial packaging units.",
    "Account for curing water, bonding admixtures, and metal trim accessories: evaluate moist water curing protocols (minimum 48 hours between base coats) alongside linear metre requirements for casing beads, weep screeds, and expansion control joints.",
  ],
  workedExample: {
    intro:
      "Consider a two-storey residential building requiring traditional three-coat Portland cement stucco across 220.0 square metres of net exterior wall surface over framed sheathing and metal lath. The specification comprises two plies of Grade D paper, 1.8 kg/m2 galvanized diamond lath, a 10 mm scratch coat, an 8 mm brown coat, and a 3 mm factory-premixed coloured acrylic stucco finish.",
    steps: [
      {
        label: "Gross exterior wall surface area",
        value: "268.0 m2",
      },
      {
        label: "Deductions for windows, entrance doors, and garage openings",
        value: "48.0 m2",
      },
      {
        label: "Net stucco application substrate area",
        value: "220.0 m2",
      },
      {
        label: "Grade D weather-resistive barrier (2 plies + 10% lap waste)",
        value: "484.0 m2 (purchased as 5 rolls of 100 m2)",
      },
      {
        label: "Galvanized diamond mesh lath (with 10% side and end laps)",
        value: "242.0 m2 (purchased as 145 sheets of 0.7 m x 2.4 m)",
      },
      {
        label: "Combined base coat mortar volume (18 mm total thickness = 0.018 m x 220 m2)",
        value: "3.96 m3 wet mixed mortar",
      },
      {
        label: "Portland cement required for scratch and brown coats (1:1:5 mix)",
        value: "32 bags (50 kg each, totalling 1,600 kg)",
      },
      {
        label: "Hydrated Type S masonry lime required",
        value: "16 bags (25 kg each, totalling 400 kg)",
      },
      {
        label: "Washed plastering sand required (clean sharp sand)",
        value: "5.5 tonnes (approx 3.8 m3 dry bulk volume)",
      },
      {
        label: "Textured stucco finish coat material (3.2 kg/m2 across 220 m2)",
        value: "704.0 kg dry premixed powder",
      },
      {
        label: "Finish coat commercial packaging (standard 25 kg moisture-proof bags)",
        value: "29 bags (725 kg total)",
      },
      {
        label: "Galvanized foundation weep screed and expansion control joints",
        value: "140 linear metres",
      },
    ],
    result:
      "220.0 square metres of exterior three-coat stucco requires 5 rolls of weather barrier, 145 sheets of lath, 32 bags of cement, 16 bags of lime, 5.5 tonnes of sand, and 29 bags of finish coat compound.",
    note: "Moist curing with water misting for at least 48 hours after scratch and brown coats is essential to achieve cement hydration and avoid plastic shrinkage cracks.",
  },
  ratioTable: {
    caption:
      "Stucco coat thicknesses, nominal mortar mix proportions, material consumption rates, and standard commercial packaging.",
    columns: [
      "Stucco Assembly Layer",
      "Standard Thickness",
      "Nominal Mix Ratio",
      "Material Consumption Rate",
      "Standard Packaging Unit",
    ],
    rows: [
      [
        "Scratch Base Coat",
        "9 mm to 10 mm",
        "1 part cement : 3 to 4 parts sand",
        "18 to 20 kg dry mortar per m2",
        "50 kg cement + bulk washed sand",
      ],
      [
        "Brown Levelling Coat",
        "8 mm to 10 mm",
        "1 part cement : 1 lime : 5 sand",
        "16 to 18 kg dry mortar per m2",
        "50 kg cement + 25 kg hydrated lime",
      ],
      [
        "Exterior Finish Coat",
        "2 mm to 3 mm",
        "Factory premixed coloured stucco",
        "2.8 to 4.0 kg powder per m2",
        "25 kg or 40 kg moisture-proof bag",
      ],
      [
        "One-Coat Polymer Stucco",
        "10 mm to 12 mm",
        "Fibre-reinforced polymer blend",
        "18 to 22 kg premix per m2",
        "25 kg or 36 kg commercial bag",
      ],
      [
        "Galvanized Diamond Lath",
        "0.6 mm sheet metal",
        "Self-furring dimpled pattern",
        "1 sheet per 1.5 m2 (with lap)",
        "0.7 m x 2.4 m sheet (10 per bundle)",
      ],
    ],
  },
  faqs: [
    {
      question: "What is the primary difference between traditional three-coat and one-coat stucco systems?",
      answer:
        "Traditional three-coat stucco consists of a scratch coat, brown coat, and decorative finish coat over metal lath, reaching an overall thickness of 20 to 22 mm. It offers superior impact resistance, sound dampening, and fire protection. One-coat stucco is a proprietary fibre-reinforced, polymer-modified cement blend applied at 10 to 12 mm thickness over continuous rigid foam insulation, providing faster installation and enhanced thermal insulation.",
    },
    {
      question: "Why is hydrated lime added to the stucco brown coat mortar?",
      answer:
        "Hydrated lime significantly improves mortar workability, plasticity, and water retention under the plasterer trowel. By retarding premature water suction from the sand particles, lime ensures uniform cement hydration and enhances the long-term flexural elasticity of the stucco wall, thereby reducing shrinkage cracking under thermal cycling.",
    },
    {
      question: "How long should plasterers wait between scratch coat and brown coat application?",
      answer:
        "Standard building codes (such as ASTM C926 and IBC Chapter 25) recommend moist curing the scratch coat for 48 hours, followed by a drying interval of 24 to 48 hours before applying the brown coat. This allows initial cement shrinkage to take place before the brown coat is rodded and floated flat.",
    },
    {
      question: "What causes hairline surface cracking in exterior cured stucco?",
      answer:
        "Hairline surface crazing is most commonly caused by rapid water loss during initial drying (plastic shrinkage) due to high winds, direct hot sun, or insufficient water misting during curing. Other causes include excessive fines in plastering sand, improper mortar mix proportions, or missing expansion control joints on long wall spans exceeding 18 square metres.",
    },
    {
      question: "Can Portland cement stucco be applied directly onto concrete or hollow block walls?",
      answer:
        "Yes, stucco can be applied directly to unpainted concrete masonry or cast-in-place concrete without metal lath, provided the concrete substrate is clean, sound, and mechanically roughened. A polymer bonding agent slurry or dashed dash-bond coat is applied first to ensure adequate mechanical adhesion between the wall and the stucco base coat.",
    },
  ],
  limits:
    "This stucco calculator provides material takeoff estimates for standard wall areas, base coat mixes, and finish coat packaging. It does not evaluate underlying structural shear walls, assess thermal insulation R-values, or include plasterer gang labour, scaffolding access, and local building permit inspection fees.",
};
