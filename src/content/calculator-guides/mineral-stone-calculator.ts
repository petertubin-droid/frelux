import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const mineralStoneCalculatorGuide: CalculatorGuide = {
  slug: "mineral-stone-calculator",
  heading: "Mineral Stone Exterior Wall Coating Takeoff and Coverage Guide",
  howItWorks: [
    "Measure wall elevation gross areas and subtract openings: calculate total external wall dimensions and deduct all door, window, and ventilation voids to establish true net square metre application area.",
    "Inspect substrate soundness and cure level: mineral stone coatings require a flat, fully cured cement-sand render substrate (minimum 14 to 28 days cure time) free from efflorescence, damp, or paint residues.",
    "Specify quartz bonding primer: apply a tinted acrylic penetrating primer containing silica quartz aggregate (coverage 0.18 to 0.25 kg/m2) to equalize substrate porosity and provide mechanical tooth.",
    "Calculate natural crushed aggregate compound: determine mass requirements based on calibrated grain size (typically 3.0 to 3.8 kg/m2 for 1.2 mm grain; 4.0 to 4.8 kg/m2 for 1.8 mm grain; 5.2 to 6.2 kg/m2 for 2.5 mm grain).",
    "Incorporate application wastage and pack rounding: add 7 to 10 per cent waste allowance for trowel drop, container residual clinging, and corner bead finishing, rounding up to full commercial 25 kg containers.",
    "Determine protective clear topcoat sealer: size clear weather-resistant acrylic or silicone protective facade sealer at 0.12 to 0.18 litres per square metre to seal against driving rain and ultraviolet degradation.",
  ],
  workedExample: {
    intro:
      "Consider a modern two-storey residential villa requiring natural mineral stone coating across 160.0 square metres of net exterior rendered wall area after deducting window and patio door openings. The specification calls for a tinted quartz primer, 1.8 mm medium-grain natural crushed marble aggregate paste in 25 kg containers, and an exterior clear protective silicone sealer.",
    steps: [
      {
        label: "Gross exterior wall elevation surface area",
        value: "195.0 m2",
      },
      {
        label: "Deductions for aluminium windows and sliding terrace doors",
        value: "35.0 m2",
      },
      {
        label: "Net application substrate surface area",
        value: "160.0 m2",
      },
      {
        label: "Penetrating quartz primer consumption (0.20 kg/m2 across 160 m2)",
        value: "32.0 kg",
      },
      {
        label: "Primer commercial packaging required (standard 20 kg pails)",
        value: "2 pails (40 kg total, yielding 8 kg reserve)",
      },
      {
        label: "Base mineral stone requirement (4.3 kg/m2 for 1.8 mm grain)",
        value: "688.0 kg",
      },
      {
        label: "On-site trowel drop and corner waste allowance (8 per cent)",
        value: "55.0 kg",
      },
      {
        label: "Total required mineral stone aggregate paste",
        value: "743.0 kg",
      },
      {
        label: "Commercial package units needed (standard 25 kg sealed pails)",
        value: "30 pails (750 kg total)",
      },
      {
        label: "Protective exterior clear silicone sealer (0.15 litres/m2 across 160 m2)",
        value: "24.0 litres",
      },
      {
        label: "Sealer commercial container units (standard 5 litre cans)",
        value: "5 cans (25 litres total)",
      },
    ],
    result:
      "160.0 square metres of net exterior wall requires 2 pails of quartz primer (20 kg each), 30 pails of mineral stone compound (25 kg each), and 5 cans of protective clear sealer (5 litres each).",
    note: "Mineral stone must be applied continuously from corner to corner in a single operation (wet-on-wet) to prevent visible cold joints or lap lines under raking sunlight.",
  },
  ratioTable: {
    caption:
      "Mineral stone aggregate grain grades, spreading rates, packaging yields, and system component specifications.",
    columns: [
      "System Component",
      "Grain Size",
      "Consumption Rate",
      "Standard Packaging",
      "Theoretical Yield per Pack",
    ],
    rows: [
      [
        "Fine Grain Mineral Stone",
        "0.8 mm to 1.2 mm",
        "2.8 to 3.5 kg/m2",
        "25 kg pail / bag",
        "7.1 to 8.9 m2 per unit",
      ],
      [
        "Medium Grain Mineral Stone",
        "1.5 mm to 2.0 mm",
        "3.8 to 4.8 kg/m2",
        "25 kg pail / bag",
        "5.2 to 6.5 m2 per unit",
      ],
      [
        "Coarse Heavy Mineral Stone",
        "2.5 mm to 3.2 mm",
        "5.0 to 6.5 kg/m2",
        "25 kg pail / bag",
        "3.8 to 5.0 m2 per unit",
      ],
      [
        "Quartz Penetrating Primer",
        "Liquid suspension",
        "0.18 to 0.25 kg/m2",
        "15 kg / 20 kg pail",
        "80 to 110 m2 per pail",
      ],
      [
        "Protective Acrylic Sealer",
        "Clear liquid coat",
        "0.12 to 0.18 L/m2",
        "5 L / 20 L drum",
        "30 to 40 m2 per 5 L",
      ],
    ],
  },
  faqs: [
    {
      question: "What raw materials make up natural mineral stone wall coatings?",
      answer:
        "Mineral stone coatings comprise graded natural crushed marble, granite, or quartz granules bound in an aqueous pure acrylic or silicone polymer emulsion. Because the colours originate from natural geological stones rather than synthetic chemical dyes, the finish exhibits exceptional ultraviolet colour stability and does not fade under prolonged tropical sun exposure.",
    },
    {
      question: "Can mineral stone finish be applied directly over old exterior wall paint?",
      answer:
        "No. Applying mineral stone directly over existing paint poses serious delamination risks. The heavyweight stone plaster (up to 5 kg/m2) creates substantial shearing tension on the underlying paint film. Existing paint must be chemically stripped, mechanically scarified, or grit-blasted back to sound cement render before priming.",
    },
    {
      question: "How do plasterers avoid noticeable joint lines across wide wall elevations?",
      answer:
        "To prevent cold joints, teams work simultaneously at staggered scaffold levels using the wet-on-wet technique. Application must never halt in the middle of an expansive wall face. If an elevation cannot be finished before a break, the team must terminate the coating along a natural architectural break, such as a rainwater downpipe, movement bead, or corner reveal.",
    },
    {
      question: "Is mineral stone coating inherently waterproof and breathable?",
      answer:
        "High-grade acrylic-bound mineral stone is water-resistant and repels wind-driven rain while remaining permeable to water vapour (microporous). This breathability allows moisture trapped within internal masonry to escape without blistering the exterior coating, provided a protective breathable silicone topcoat is maintained.",
    },
    {
      question: "How long must fresh cement-sand render cure before applying mineral stone?",
      answer:
        "Fresh cement-sand render must cure for a minimum of 21 to 28 days in moderate conditions (or at least 14 days in hot, dry climates with proper water curing). Applying coatings over green render traps moisture and high alkalinity, which degrades acrylic polymer binders and causes efflorescence staining.",
    },
  ],
  limits:
    "This mineral stone calculator estimates material quantities, primer pails, and topcoat packaging yields based on verified product coverage rates. It does not inspect substrate structural stability, diagnose rising damp, or include plasterer labour, scaffolding hire, and masking tapes.",
};
