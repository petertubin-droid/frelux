import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const reinforcementEstimatorGuide: CalculatorGuide = {
  slug: "reinforcement-estimator",
  heading:
    "Steel reinforcement bar, stirrups, and rebar tonnage calculation guide",
  howItWorks: [
    "Reinforcement steel bar (rebar) provides tensile and shear capacity to reinforced concrete elements, compensating for concrete's low tensile strength. The estimation process translates architectural and structural drawings into a comprehensive bar bending schedule (BBS) categorised by element (footings, columns, beams, slabs, and stairs), nominal bar diameter, cut length, and total weight.",
    "Rebar mass calculation relies on the universal steel density constant of 7,850 kg per cubic metre, represented by the standard engineering formula: Mass (kg per linear metre) = (Nominal Diameter in mm)² ÷ 162.2. For example, a 10 mm diameter bar weighs 0.617 kg/m, a 12 mm bar weighs 0.888 kg/m, a 16 mm bar weighs 1.580 kg/m, and a 20 mm bar weighs 2.470 kg/m. Multiplying the total cut length of each bar size by its linear weight yields total kilogrammes, which are converted to metric tonnes (1,000 kg per tonne) for commercial purchasing.",
    "Bar cutting lengths account for gross member dimensions, minimum concrete cover, and structural end anchorages. Concrete cover protects steel against corrosion, carbonation, and fire exposure (typically 50 mm for ground-contact footings, 25 mm to 30 mm for internal beams and columns, and 20 mm for slabs). End hooks, 90-degree bends, and 135-degree seismic hooks add required development length according to structural codes (typically 10d to 12d extension past the bend).",
    "Continuous longitudinal members spanning beyond standard 12.0-metre commercial stock lengths require lap splices. Lap length depends on steel grade, concrete compressive strength, and bar stress state (tension laps typically require 40 to 50 times bar diameter, while compression laps require 30 to 40 times bar diameter). Staggering lap locations avoids concentrating weak planes at maximum bending moment zones.",
    "Transverse shear reinforcement (stirrups in beams, ties or links in columns) confines the core concrete and resists diagonal shear tension. Link length equals the perimeter of the concrete section minus two times cover on all sides, plus seismic corner hooks (135 degrees with 10d tail). Dividing element length by specified pitch spacing (for example, 150 mm or 200 mm centres) yields the required quantity of links.",
    "Binding wire, spacer blocks, and cutting waste complete the material schedule. Assembling rebar cages requires 16-gauge annealed mild steel black binding wire at a benchmark rate of 10 kg to 15 kg per metric tonne of placed steel. Precast concrete spacer blocks or plastic rebar chairs maintain concrete cover at 1.0 m spacing. A cutting and offcut waste allowance of 5% to 8% is applied to gross tonnage depending on building geometric regularity.",
  ],
  workedExample: {
    intro:
      "Perimeter ground ring beam reinforcement: calculating longitudinal bars, stirrup links, and binding wire for a 50.0-metre continuous ring beam perimeter (beam cross-section 225 mm wide by 450 mm deep), reinforced with 4 continuous 16 mm high-yield main bars (Y16) and 10 mm links (Y10) spaced at 200 mm centres, with 25 mm concrete cover and 50d tension lap factor.",
    steps: [
      {
        label: "Total longitudinal run for 4 continuous main bars",
        value: "4 bars × 50.0 m = 200.0 linear metres of Y16",
      },
      {
        label: "Number of standard 12.0 m commercial bars needed",
        value: "50 m ÷ 12 m = 4.17 bars per run (5 bars with laps)",
      },
      {
        label: "Lap splice allowance per bar run (4 laps × 50d = 800 mm)",
        value: "4 laps × 0.80 m = 3.20 m per run (12.80 m total laps)",
      },
      {
        label: "Gross Y16 cutting length including laps and 5% waste",
        value: "(200.0 m + 12.8 m) × 1.05 = 223.44 linear metres",
      },
      {
        label: "Y16 steel tonnage (linear mass 1.580 kg/m)",
        value: "223.44 m × 1.580 kg/m = 353.04 kg (approx 19 full 12 m bars)",
      },
      {
        label: "Core stirrup dimensions (225 mm × 450 mm minus 25 mm cover)",
        value: "Width: 175 mm, Depth: 400 mm",
      },
      {
        label: "Single Y10 stirrup cut length with 135° seismic hooks",
        value: "2 × (175 + 400 mm) + 2 × (10 × 10 mm) = 1,350 mm (1.35 m)",
      },
      {
        label: "Total Y10 stirrup count (50 m ÷ 0.20 m pitch spacing + 1)",
        value: "251 stirrup links required along beam run",
      },
      {
        label: "Gross Y10 link steel length and tonnage (mass 0.617 kg/m)",
        value: "251 × 1.35 m = 338.85 m (209.07 kg, approx 29 full 12 m bars)",
      },
      {
        label: "Annealed tie wire and concrete spacer blocks",
        value: "8.5 kg 16-gauge binding wire (15 kg/t) and 100 cover spacers",
      },
    ],
    result:
      "Total rebar purchase schedule: 19 commercial lengths (12 m) of Y16 high-yield deformed bars (353 kg), 29 commercial lengths (12 m) of Y10 mild steel or ribbed stirrup bars (209 kg), 1 roll (10 kg) of 16-gauge annealed binding wire, and 100 concrete cover blocks.",
  },
  ratioTable: {
    caption:
      "Standard metric deformed rebar sizes, unit mass coefficients, and common structural functions",
    columns: [
      "Bar designation and diameter",
      "Linear mass coefficient (kg/m)",
      "Standard structural application",
    ],
    rows: [
      [
        "Y8 (8 mm nominal diameter)",
        "0.395 kg per linear metre",
        "Slab distribution steel, light crack control mesh, secondary column ties",
      ],
      [
        "Y10 (10 mm nominal diameter)",
        "0.617 kg per linear metre",
        "Beam shear stirrups, column links, cantilever slab distribution steel",
      ],
      [
        "Y12 (12 mm nominal diameter)",
        "0.888 kg per linear metre",
        "Suspended slab main tension bars, foundation footing distribution mats",
      ],
      [
        "Y16 (16 mm nominal diameter)",
        "1.580 kg per linear metre",
        "Ground ring beams, lintels, column vertical starters, retaining wall stems",
      ],
      [
        "Y20 (20 mm nominal diameter)",
        "2.470 kg per linear metre",
        "Heavy multi-storey building columns, transfer beams, pile cap bottom mats",
      ],
      [
        "Y25 (25 mm nominal diameter)",
        "3.850 kg per linear metre",
        "Heavy structural foundation rafts, bridge piers, long-span transfer girders",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why is the constant 162.2 used to calculate rebar weight per metre?",
      answer:
        "The constant derives from the geometric volume of a steel cylinder and the specific gravity of structural steel. Steel has a nominal density of 7,850 kg/m³. For a bar of diameter d (in mm) and length 1 metre, volume equals Pi × (d ÷ 2000)² × 1 m³ = 0.0000007854 × d² m³. Multiplying this volume by 7,850 kg/m³ gives 0.006165 × d², which mathematically equals d² ÷ 162.2. This simple formula allows quantity surveyors to determine linear weight on site without look-up tables.",
    },
    {
      question: "What is the standard lap length for high-yield deformed bars?",
      answer:
        "Standard lap length typically ranges between 40 to 50 times the nominal bar diameter (40d to 50d) for tension zones, and 30d to 40d for compression zones in standard Grade 460 or Grade 500 steel embedded in C20/25 to C25/30 concrete. For example, a 16 mm bar in a tension beam requires a minimum lap of 50 × 16 mm = 800 mm. Where bars lap in aggressive environments or under dynamic load conditions, structural codes require full development lap lengths verified by a structural engineer.",
    },
    {
      question: "How much binding wire is needed per tonne of rebar?",
      answer:
        "Standard practice requires approximately 10 kg to 15 kg of 16-gauge (1.6 mm) annealed mild steel black binding wire per metric tonne of installed rebar. Dense cages with close stirrup spacing (such as column junctions or anti-earthquake beam ends) consume near 15 kg per tonne, whereas wide-spaced footing mats consume approximately 10 kg per tonne. Purchasing in 20 kg or 25 kg rolls with a 10% tying waste factor is recommended.",
    },
    {
      question: "Why must concrete cover spacers be placed every metre?",
      answer:
        "Concrete cover spacers guarantee that rebar remains in its designed position during wet concrete pouring, vibrator compaction, and operative foot traffic. Without spacers, rebar sags under its own weight or shifts against the timber formwork, leaving steel exposed to oxygen and moisture. Exposed steel corrodes, expanding up to 6 times its original volume, which causes concrete spalling and structural failure.",
    },
    {
      question: "How do commercial bundle quantities compare to single bars?",
      answer:
        "Rebar is manufactured in standard 12.0-metre (approx 39.4-foot) straight lengths and sold by the tonne or in full factory mill bundles. A commercial 2-tonne bundle contains varying bar counts depending on diameter: approximately 266 lengths of Y10, 187 lengths of Y12, 105 lengths of Y16, or 67 lengths of Y20. On small residential jobs, retailers sell individual 12-metre rods, but larger projects order full mill bundles to obtain wholesale pricing.",
    },
  ],
  limits:
    "Preliminary construction material takeoff and scheduling only. Does not calculate structural bending moments, shear resistance, crack width limits, or seismic ductility requirements. Structural detailing and bar schedules must comply with BS 8110, Eurocode 2 (EN 1992-1-1), or ACI 318 under the supervision of a licensed structural engineer.",
};
