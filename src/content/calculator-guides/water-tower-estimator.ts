import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Water Tower and Overhead Storage Staging Estimator.
 *
 * Sizing an elevated water tank tower requires balancing dead load of the water
 * (1 cubic metre = 1,000 kg), wind overturning moments, structural steel staging,
 * and reinforced concrete pad footings based on soil bearing capacity.
 */
export const waterTowerEstimatorGuide: CalculatorGuide = {
  slug: "water-tower-estimator",
  heading: "How the water tower staging estimator works",
  howItWorks: [
    "Determine the total water storage volume required. Each 1,000 litres (1 cubic metre) of water exerts an operational dead load of 1,000 kg (9.81 kN), in addition to the self-weight of the cylindrical or rectangular storage vessels.",
    "Select the tower elevation height to establish static gravitational pressure. Every 10 metres of elevation head provides approximately 1 bar (14.5 psi / 98.1 kPa) of static water head pressure for gravity-fed plumbing distribution.",
    "Size the structural tower columns and diagonal wind bracing. Steel towers typically employ square hollow sections (SHS), equal angle sections (EA), or universal columns (UC) cross-braced on all four faces to resist lateral wind shear and dynamic gusts.",
    "Evaluate overturning moments and footing dimensions. The lateral force of wind acting against the tank projected area and elevated steel framework creates an overturning moment at the ground line that must be resisted by gravity pad footings.",
    "Size the reinforced concrete pad foundations based on site-specific soil bearing capacity. Total vertical gravity load plus wind overturning eccentricity is distributed across four reinforced pad footings with high-yield deformed rebar mesh.",
  ],
  workedExample: {
    intro:
      "A commercial water supply project elevating two 5,000-litre polyethylene storage tanks (10,000 litres total capacity) on a 6-metre high structural steel tower, constructed on firm clay soil with an allowable bearing capacity of 150 kPa.",
    steps: [
      {
        label: "Nominal water storage volume",
        value: "10,000 litres (10.0 m3)",
      },
      {
        label: "Water operational dead load",
        value: "10,000 kg (98.1 kN vertical load)",
      },
      {
        label: "Tank vessel and platform self-weight",
        value: "1,200 kg (11.8 kN)",
      },
      {
        label: "Tower steel framework self-weight",
        value: "1,600 kg (15.7 kN)",
      },
      {
        label: "Total factored vertical load on foundations",
        value: "125.6 kN (including safety factor)",
      },
      {
        label: "Tower staging height",
        value: "6.0 metres above finished ground",
      },
      {
        label: "Main steel column sections",
        value: "4 units SHS 120 x 120 x 6 mm",
      },
      {
        label: "Diagonal wind bracing sections",
        value: "Equal angle 60 x 60 x 6 mm cross-braces",
      },
      {
        label: "Concrete pad footings (4 bases)",
        value: "1.4 m x 1.4 m x 0.45 m depth each",
      },
      {
        label: "Footing rebar reinforcement",
        value: "T12 rebar mesh at 150 mm centres both ways",
      },
    ],
    result:
      "Tower design supports 10,000 L water on a 6 m four-leg SHS 120 steel frame with 4 reinforced concrete pad footings (1.4 m square each) on 150 kPa soil.",
    note: "All calculations require site-specific soil bearing verification and structural sign-off prior to fabrication.",
  },
  ratioTable: {
    caption:
      "Structural steel staging, footing rules of thumb, and water load benchmarks",
    columns: [
      "Tank Capacity (Litres)",
      "Water Dead Weight",
      "Minimum Column Profile (6m Tower)",
      "Indicative Pad Size (150 kPa Soil)",
    ],
    rows: [
      [
        "1,500 to 2,500 L",
        "1.5 to 2.5 tonnes (14.7 to 24.5 kN)",
        "SHS 75 x 75 x 4 mm or 4-inch pipe",
        "1.0 m x 1.0 m x 0.35 m deep",
      ],
      [
        "3,000 to 5,000 L",
        "3.0 to 5.0 tonnes (29.4 to 49.0 kN)",
        "SHS 100 x 100 x 5 mm or 5-inch pipe",
        "1.2 m x 1.2 m x 0.40 m deep",
      ],
      [
        "7,500 to 10,000 L",
        "7.5 to 10.0 tonnes (73.5 to 98.1 kN)",
        "SHS 120 x 120 x 6 mm or 6-inch pipe",
        "1.4 m x 1.4 m x 0.45 m deep",
      ],
      [
        "15,000 to 20,000 L",
        "15.0 to 20.0 tonnes (147 to 196 kN)",
        "SHS 150 x 150 x 8 mm or UC 152x152",
        "1.8 m x 1.8 m x 0.55 m deep",
      ],
      [
        "25,000 to 50,000 L",
        "25.0 to 50.0 tonnes (245 to 490 kN)",
        "Universal Column UC 203 x 203 x 46",
        "2.4 m x 2.4 m x 0.70 m deep",
      ],
      [
        "Wind Bracing Ratios",
        "Lateral stability and torsional rigidity",
        "Angle iron 50x50x5 to 75x75x6 mm",
        "Diagonal cross on all 4 faces",
      ],
      [
        "Platform Chequered Plate",
        "Deck plate supporting tank base",
        "4.5 mm to 6.0 mm tear-drop steel plate",
        "Welded to secondary cross beams",
      ],
      [
        "Concrete Grade for Pads",
        "Substructure foundation mix",
        "C25/30 ready-mix or 1:2:4 batch mix",
        "Minimum 50 mm clear rebar cover",
      ],
    ],
  },
  faqs: [
    {
      question: "How do I calculate static water pressure from tower height?",
      answer:
        "Every 10 metres of vertical head provides 1 bar of static pressure, equivalent to 0.1 bar per metre of vertical drop (approximately 0.433 psi per foot). For example, a 6-metre tower provides 0.6 bar of gravitational pressure at ground level before plumbing friction losses. If downstream showers require 1.5 to 2.0 bar, you must either increase tower height or install an automatic inline booster pump.",
    },
    {
      question:
        "Why is allowable soil bearing capacity critical for water tower footings?",
      answer:
        "Water towers concentrate substantial dead weight onto small footprints. A 10,000-litre tank full of water weighs 10 metric tonnes plus the structural steel weight. If the underlying soil bearing capacity is only 100 kPa (soft sandy loam) rather than 200 kPa (dense gravel or hardpan), footings must be significantly enlarged to prevent differential settlement, tower tilting, or structural collapse.",
    },
    {
      question:
        "What protective coatings prevent corrosion on outdoor water towers?",
      answer:
        "External steel staging is constantly exposed to weather and atmospheric condensation. The recommended commercial specification is hot-dip galvanizing to ISO 1461 with minimum 85 micron coating thickness. If fabricating from black steel, the framework must be grit blasted to Sa 2.5, primed with zinc-rich epoxy primer (75 microns), and finished with two coats of UV-resistant polyurethane enamel.",
    },
    {
      question:
        "Can I place a water tower on a standard building roof instead of a standalone ground tower?",
      answer:
        "Never place heavy water tanks on a building roof without a certified structural engineer verifying that the reinforced concrete slab or roof beams can sustain the concentrated point load. A 5,000-litre tank imposes a 5-tonne concentrated load, which will cause severe structural cracking or progressive slab failure on domestic slabs designed only for 1.5 kN/m2 residential live loads.",
    },
    {
      question:
        "Does this estimator produce certified structural fabrication blueprints?",
      answer:
        "No. This calculator produces preliminary material takeoff schedules, approximate steel weights, and recommended foundation sizing. Specific wind-load gust calculations, seismic zone coefficients, anchor bolt embedment details, and certified fabrication shop drawings must be prepared by a licensed structural engineer.",
    },
  ],
  limits:
    "This calculator provides preliminary engineering takeoff schedules. It does not replace site-specific geotechnical soil bore testing, dynamic wind tunnel modeling, or licensed structural engineer certifications.",
};
