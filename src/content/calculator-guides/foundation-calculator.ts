import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the foundation design and takeoff calculator.
 *
 * Soil bearing figures and mix proportions are based on standard civil
 * engineering handbooks and empirical building codes. No prices appear here;
 * costs depend on local supplier price books.
 */
export const foundationCalculatorGuide: CalculatorGuide = {
  slug: "foundation-calculator",
  heading: "How the foundation calculator works",
  howItWorks: [
    "Establish total trench run and excavation depth. Calculate the outer perimeter of the external walls and add all internal load-bearing wall trenches. A 15 m by 10 m building footprint with 25 m of internal load-bearing spine walls requires 75 linear metres of foundation trenching.",
    "Assess soil bearing capacity. Firm lateritic soil or dense coarse sand typically supports 150 to 200 kPa (kilonewtons per square metre), whereas soft alluvial clay may only support 75 kPa. Footing width must spread building load so pressure applied to the ground stays well below soil bearing capacity.",
    "Determine footing dimensions. For standard 225 mm (9 inch) masonry walls, building codes commonly require a continuous strip footing three times the wall thickness, giving a standard width of 675 mm (0.675 m) and a minimum concrete footing depth of 225 mm (0.225 m).",
    "Compute in-situ concrete volume and dry material bulking. Multiply total trench length by footing width and footing thickness to calculate wet in-situ concrete volume. To calculate dry ingredients before mixing, apply the standard 1.54 bulking factor, which accounts for volume lost when cement and sand fill the voids between coarse stone aggregate.",
    "Calculate cement bags, sand, and coarse granite aggregate. In a standard 1:2:4 nominal structural concrete mix (Grade 20), each cubic metre of placed concrete requires roughly 6.5 bags of 50 kg Portland cement, 0.45 m³ of sharp washed sand, and 0.85 m³ of crushed granite stone.",
  ],
  workedExample: {
    intro:
      "A four bedroom residential bungalow with a 15 m by 10 m perimeter (50 m) plus 25 m of internal load-bearing wall trenches, totalling 75 linear metres of strip foundation. The ground is firm lateritic soil with a 150 kPa safe bearing capacity, requiring a 675 mm wide by 225 mm deep concrete strip footing over a 50 mm lean concrete blinding layer.",
    steps: [
      { label: "Total foundation trench length", value: "75 linear metres" },
      { label: "Footing width and thickness", value: "0.675 m wide × 0.225 m deep" },
      { label: "Structural concrete footing volume (75 × 0.675 × 0.225)", value: "11.39 m³" },
      { label: "Blinding concrete layer (75 × 0.675 × 0.05)", value: "2.53 m³" },
      { label: "Total placed in-situ concrete volume", value: "13.92 m³" },
      { label: "Dry material conversion (1.54 bulking factor)", value: "21.44 m³ dry volume" },
      { label: "Portland cement bags (1:2:4 mix at 6.5 bags/m³)", value: "74 bags (50 kg)" },
      { label: "Sharp washed sand required", value: "8.2 tonnes (about 1.3 tippers)" },
      { label: "Crushed granite coarse aggregate (20 mm)", value: "15.8 tonnes (about 1.6 tippers)" },
    ],
    result:
      "So 75 linear metres of strip footing requires 11.39 m³ of structural concrete, which translates to about 74 bags of cement, 8.2 tonnes of sharp sand, and 15.8 tonnes of 20 mm crushed granite gravel.",
    note: "Site wastage of 5 to 10 per cent should be added when ordering bulk tippers of aggregate and sand, as loose stone penetrates soft trench soil during hand mixing or dumping.",
  },
  ratioTable: {
    caption:
      "Standard geotechnical bearing capacities and nominal concrete mix proportions for residential foundations.",
    columns: ["Soil Classification", "Safe Bearing (kPa)", "Recommended Foundation", "Standard Concrete Mix"],
    rows: [
      [
        "Firm Laterite or Hard Clay",
        "150 to 200 kPa",
        "Continuous unreinforced or lightly reinforced strip",
        "1:2:4 (Grade 20, 20 N/mm²)",
      ],
      [
        "Dense Sand and Coarse Gravel",
        "200 to 300 kPa",
        "Narrow strip or pad footings",
        "1:2:4 (Grade 20, 20 N/mm²)",
      ],
      [
        "Medium Stiff Clay",
        "100 to 150 kPa",
        "Wide reinforced strip with BRC wire mesh",
        "1:2:4 (Grade 20, 20 N/mm²)",
      ],
      [
        "Soft Mud, Peat or Marine Silt",
        "Below 75 kPa",
        "Reinforced raft slab or deep piled foundation",
        "1:1.5:3 (Grade 25, 25 N/mm²)",
      ],
      [
        "Trench Bottom Blinding",
        "Not structural",
        "50 mm unreinforced sealing screed layer",
        "1:3:6 (Grade 15 lean mix)",
      ],
    ],
  },
  faqs: [
    {
      question: "How deep should a residential strip foundation trench be dug?",
      answer:
        "In tropical and temperate zones without deep ground frost, residential strip trenches should penetrate through topsoil and vegetable roots down to firm undisturbed subsoil, typically between 0.9 m and 1.2 m below natural ground level. Never cast footings directly on fill, loose organic earth, or standing water.",
    },
    {
      question: "What is the standard strip footing width for 9 inch blockwork?",
      answer:
        "By standard building regulations, the strip footing width should be three times the wall thickness. For 225 mm (9 inch) masonry blocks, the footing width should be at least 675 mm. The footing projection on each side of the wall must equal or exceed half the wall thickness.",
    },
    {
      question: "Why does concrete calculation require a 1.54 bulking factor?",
      answer:
        "Dry constituent materials lose substantial volume when water is added and mixed together, because smaller sand particles occupy the voids between coarse stone fragments, and cement fills the pore spaces in the sand. Multiplying in-situ wet volume by 1.54 recovers the true volume of dry materials required from suppliers.",
    },
    {
      question: "What is the purpose of the blinding layer under the footing?",
      answer:
        "A 50 mm blinding layer of lean 1:3:6 concrete seals the bottom of the excavation trench. It prevents the dry trench earth from absorbing moisture from the structural concrete during curing and protects steel reinforcement spacers from sinking into loose mud.",
    },
    {
      question: "When is a raft foundation required instead of a strip foundation?",
      answer:
        "A raft foundation is recommended when soil bearing capacity is poor (below 100 kPa), when water tables are high, or when differential settlement is a risk on swampy or reclaimed land. A raft spreads the entire weight of the building across a monolithic reinforced concrete slab.",
    },
  ],
  limits:
    "This calculator provides an indicative quantity estimation for conventional low-rise residential foundations based on nominal empirical building rules. It is not an engineering design sign-off and does not replace a site-specific geotechnical soil investigation or structural drawings prepared by a licensed professional engineer.",
};
