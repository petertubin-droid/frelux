import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the structural steel beam calculator.
 *
 * Sizing steel beams requires understanding linear mass, sectional geometry,
 * and bearing reactions. Steel is priced by the kilogram or metric tonne, so
 * mass calculation is deterministic while design moments require certified engineering.
 */
export const steelBeamEstimatorGuide: CalculatorGuide = {
  slug: "steel-beam-estimator",
  heading: "How the structural steel beam calculator works",
  howItWorks: [
    "Identify the required steel profile and nominal designation. Universal beams (UB) carry primary bending across horizontal spans, while universal columns (UC) support axial compression. The designation specifies section depth, width, and linear mass in kilograms per metre.",
    "Measure the clear unsupported span between supporting walls or columns. Add the required end bearing length on both sides, typically a minimum of 150 mm to 200 mm per side on reinforced concrete padstones or engineering masonry.",
    "Multiply the total overall beam length by the section linear weight to determine total steel mass in kilograms. If multiple identical beams are specified, such as paired compound channels or twin rolled joists, multiply by the member quantity.",
    "Include fabrication and installation accessories. Sizing must account for end bearing spreader plates, web stiffeners, connection cleats, high strength structural bolts, and factory applied anti corrosive zinc phosphate primer.",
    "Convert total mass to metric tonnes for commercial merchant quotation. Structural steel stockists price by weight, with cutting, drilling, and site crane delivery invoiced as itemised fabrication charges.",
  ],
  workedExample: {
    intro:
      "A residential knock-through opening requiring a 4.2 metre clear span supported on external brick piers with 200 mm bearing lengths on each side, using a 203 x 133 x 30 UB steel beam.",
    steps: [
      { label: "Clear span opening", value: "4.20 m" },
      { label: "End bearing allowance (2 x 0.20 m)", value: "0.40 m" },
      { label: "Total overall beam length", value: "4.60 m" },
      { label: "Linear weight (203x133x30 UB)", value: "30.0 kg/m" },
      { label: "Total steel profile mass", value: "138.0 kg" },
      {
        label: "Bearing padstones (reinforced concrete)",
        value: "2 units (300 x 150 x 215 mm)",
      },
      {
        label: "Surface protection (2 coats primer)",
        value: "2.80 m² surface area",
      },
    ],
    result:
      "The opening requires one 4.60 metre section of 203 x 133 x 30 UB with an exact unpainted steel mass of 138.0 kg, supported on twin concrete padstones.",
    note: "Steel mass is mathematically exact based on standard rolling mill tolerances. Deflection limits, masonry crush strength, and padstone reinforcement must be certified by a structural engineer.",
  },
  ratioTable: {
    caption:
      "Standard universal steel beam profiles, linear mass, and typical structural residential applications.",
    columns: [
      "Profile Designation",
      "Mass per Metre",
      "Typical Structural Use",
      "Minimum Bearing Length",
    ],
    rows: [
      [
        "152 x 89 x 16 UB",
        "16.0 kg/m",
        "Short lintels and masonry door openings up to 2.5 m",
        "150 mm",
      ],
      [
        "178 x 102 x 19 UB",
        "19.0 kg/m",
        "Domestic floor trimmer beams and window spans",
        "150 mm",
      ],
      [
        "203 x 133 x 25 UB",
        "25.1 kg/m",
        "Moderate domestic wall removal up to 3.8 m span",
        "200 mm",
      ],
      [
        "203 x 133 x 30 UB",
        "30.0 kg/m",
        "Standard load bearing partition removal up to 4.5 m",
        "200 mm",
      ],
      [
        "254 x 146 x 31 UB",
        "31.1 kg/m",
        "Heavy two storey load bearing cavity wall spans",
        "200 mm",
      ],
      [
        "254 x 146 x 43 UB",
        "43.0 kg/m",
        "Wide span double residential knock-through up to 5.5 m",
        "250 mm",
      ],
      [
        "152 x 152 x 23 UC",
        "23.0 kg/m",
        "Supporting vertical post or column beneath beam joints",
        "200 mm",
      ],
    ],
  },
  faqs: [
    {
      question:
        "How do I choose between a Universal Beam (UB) and Universal Column (UC)?",
      answer:
        "Universal beams have a distinctly rectangular I profile with deep webs designed for maximum resistance against horizontal bending moments. Universal columns have an H shape with equal depth and flange width, designed for compressive axial load without buckling.",
    },
    {
      question: "Why are concrete padstones required under steel beams?",
      answer:
        "Steel beams exert concentrated point loads at their ends. Placing the steel directly onto standard masonry blocks would crush the blocks. Concrete padstones distribute the load across a wider wall area to prevent local compression shear failure.",
    },
    {
      question: "How much bearing length should be allowed at each wall end?",
      answer:
        "Standard practice specifies at least 150 mm on solid engineering brick and 200 mm on aerated or lightweight blockwork. For longer spans exceeding 5 metres with heavy reactions, engineers often specify 250 mm to 300 mm bearing lengths.",
    },
    {
      question:
        "What is the difference between S275 and S355 structural steel grades?",
      answer:
        "S275 and S355 denote the characteristic yield strength in megapascals (N/mm²). S275 is standard commercial structural steel for residential construction, while S355 provides higher tensile and yield strength for heavily loaded commercial frames.",
    },
    {
      question:
        "Does the estimate include fire protection and corrosion coating?",
      answer:
        "This tool estimates base steel weight and primer area. Building codes require residential steelwork within habitable rooms to achieve 30, 60, or 90 minutes of fire resistance using intumescent paint or double layers of fire rated gypsum plasterboard.",
    },
  ],
  limits:
    "This calculator provides material takeoff and steel mass estimation only. It does not calculate bending moments, shear stresses, deflection limits, or lateral torsional buckling, and does not replace signed structural engineering calculations for building control approval.",
};
