import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const earthworksEstimatorGuide: CalculatorGuide = {
  slug: "earthworks-estimator",
  heading:
    "Earthworks excavation, trenching, bulking, and cart-away calculation guide",
  howItWorks: [
    "Earthworks estimation calculates the volumes of in-situ soil to be excavated, retained, backfilled, and transported off site. Construction excavations fall into three main categories: site strip (clearing topsoil and organic matter across the building footprint), trench excavations (linear digging for strip footings, grade beams, and drainage runs), and pit or basement excavations (bulk digging for pad footings, lift pits, or underground basements).",
    "Net in-situ excavation volume (bank volume) is calculated using geometric dimensions: Bank Volume (m³) = Length (m) × Width (m) × Depth (m). Trench depths are measured from the reduced ground level after initial topsoil stripping. To prevent wall collapse and provide working room for formwork and block laying, trenches exceeding 1.2 metres in depth require safe battering (sloping trench sides) or timber/trench box shoring, which increases total excavated volume by 15% to 30%.",
    "Soil bulking (also known as swell) is a critical physical phenomenon where compacted in-situ soil expands when dug. Excavating breaks cohesive soil particles apart and introduces air voids, causing loose volume to expand significantly beyond bank volume. Bulking factors typically range from 15% for clean gravel and sand up to 25% to 30% for ordinary cohesive loam and 35% to 40% for heavy clay or blasted rock. All haulage disposal volumes and cart-away trucks must be sized using loose bulked volume rather than bank volume.",
    "Backfilling and compaction calculations determine the amount of excavated material that can be returned around substructure masonry and grade beams. Backfilling requires manual or mechanical ramming in layers not exceeding 150 mm to 200 mm to achieve 95% to 98% standard Proctor dry density. Compaction removes air voids, resulting in compaction shrinkage (typically requiring 15% to 25% extra loose volume to achieve the compacted target).",
    "Cart-away disposal takeoff subtracts suitable backfill material from the total loose excavated volume to establish surplus soil volume for disposal. The surplus loose volume is divided by the rated volumetric capacity of available tipper trucks (typically 5 m³, 10 m³, 15 m³, or 20 m³ dump trucks) to determine the exact number of disposal haulage trips required to clear the job site.",
  ],
  workedExample: {
    intro:
      "Residential bungalow substructure earthworks: calculating topsoil strip, foundation trench excavation, soil bulking, backfill requirement, and tipper haulage trips for a 15.0 m by 10.0 m building footprint with 60 linear metres of foundation trenches at 0.68 m width and 1.0 m depth, in cohesive clay soil with a 25% bulking factor.",
    steps: [
      {
        label:
          "Topsoil site strip area (footprint plus 1.0 m working perimeter)",
        value: "(15.0 + 2.0 m) × (10.0 + 2.0 m) = 17.0 m × 12.0 m = 204.0 m²",
      },
      {
        label:
          "Topsoil strip volume at 150 mm depth (separated for landscaping)",
        value: "204.0 m² × 0.15 m = 30.60 m³ in-situ bank volume",
      },
      {
        label: "Foundation trench net bank volume (60 m × 0.68 m × 1.0 m)",
        value: "60.0 m × 0.68 m × 1.0 m = 40.80 m³ in-situ trench volume",
      },
      {
        label: "Total bank excavation (trench plus topsoil strip)",
        value: "40.80 m³ + 30.60 m³ = 71.40 m³ total in-situ volume",
      },
      {
        label: "Loose excavated spoil volume with 25% bulking factor",
        value: "71.40 m³ × 1.25 = 89.25 m³ loose spoil volume",
      },
      {
        label: "Substructure masonry and concrete displacement in trenches",
        value:
          "60.0 m × (0.68 m footing + 0.23 m blockwork) = 22.50 m³ displaced",
      },
      {
        label: "Net bank backfill volume around foundation walls",
        value: "40.80 m³ trench minus 22.50 m³ displaced = 18.30 m³ compacted",
      },
      {
        label:
          "Loose soil consumed for backfill (with 20% compaction allowance)",
        value: "18.30 m³ × 1.20 = 21.96 m³ loose soil retained on site",
      },
      {
        label: "Surplus loose spoil for disposal and cart-away",
        value: "89.25 m³ loose excavated minus 21.96 m³ backfill = 67.29 m³",
      },
      {
        label: "Disposal truck loads using standard 10 m³ tipper trucks",
        value:
          "67.29 m³ ÷ 10 m³ per truck = 6.73 (rounded up to 7 tipper trips)",
      },
    ],
    result:
      "Earthworks material schedule: 30.60 m³ stripped topsoil (stockpiled for landscaping), 40.80 m³ bank trench excavation (51.00 m³ loose), 21.96 m³ loose soil retained for compacted backfill, and 67.29 m³ surplus loose spoil requiring 7 tipper truck haulage trips (10 m³ capacity).",
  },
  ratioTable: {
    caption:
      "Soil classifications, bank-to-loose bulking swell factors, and compaction shrinkage percentages",
    columns: [
      "Soil classification and texture",
      "Bulking (swell) factor from bank to loose",
      "Compaction shrinkage factor (loose to compacted)",
    ],
    rows: [
      [
        "Clean gravel and sand (coarse granular)",
        "1.10 to 1.15 (10% to 15% volume increase)",
        "0.85 to 0.90 (10% to 15% compaction settlement)",
      ],
      [
        "Ordinary sandy loam / topsoil (organic blend)",
        "1.20 to 1.25 (20% to 25% volume increase)",
        "0.80 to 0.85 (15% to 20% compaction settlement)",
      ],
      [
        "Firm cohesive clay (standard subsoil)",
        "1.25 to 1.30 (25% to 30% volume increase)",
        "0.75 to 0.80 (20% to 25% compaction settlement)",
      ],
      [
        "Heavy stiff clay / marl (dense cohesive)",
        "1.30 to 1.38 (30% to 38% volume increase)",
        "0.72 to 0.78 (22% to 28% compaction settlement)",
      ],
      [
        "Blasted hard rock and granite boulders",
        "1.45 to 1.60 (45% to 60% volume increase)",
        "0.85 to 0.92 (minimal void settlement once interlocked)",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why do excavated soil piles take up so much more room than the hole?",
      answer:
        "In nature, soil has rested under gravity and overburden pressure for centuries or millennia, creating densely packed particles with minimal air voids. When an excavator bucket digs the earth, it tears the particles apart, introducing substantial ambient air into the soil mass. This expansion is called bulking or swell. A trench measuring 40 cubic metres in the ground routinely yields 50 to 55 cubic metres of loose spoil once dumped on the ground.",
    },
    {
      question: "How do you calculate truck capacity for spoil cart-away?",
      answer:
        "Truck capacity must always be calculated against loose bulked volume rather than bank volume, and must consider both volumetric limit and gross vehicle weight (GVW). A standard 6-wheel tipper truck carries approximately 10 cubic metres of loose material or 15 metric tonnes. Because wet clay weighs about 1.6 to 1.8 tonnes per cubic metre loose, a 10 m³ truck could reach its maximum safe road payload before volumetric capacity is fully reached. Always check local road axle weight regulations.",
    },
    {
      question:
        "Why should topsoil always be stripped and stockpiled separately?",
      answer:
        "Topsoil contains decomposing organic matter, roots, and humic acids. It cannot support structural foundations, floor slabs, or paving because organic matter decomposes over time, creating voids and causing uneven structural settlement. However, high-quality topsoil is valuable for post-construction landscaping and gardens. Stripping topsoil first and setting it aside in a low stockpile prevents it from contaminating subsoil backfill or being wasted at the landfill.",
    },
    {
      question: "What depth of trench requires safety shoring or stepping?",
      answer:
        "International occupational health and safety regulations (including OSHA and UK HSE) stipulate that any vertical trench excavation exceeding 1.20 metres (approx 4 feet) in depth must be protected against collapse by stepping, battering back the trench sides to a safe angle of repose, or installing hydraulic trench shields or timber shoring. Trenches in loose sand or saturated soils may require protective measures at shallower depths.",
    },
    {
      question: "How is backfill compacted properly around foundation walls?",
      answer:
        "Backfill must be deposited in uniform horizontal layers (lifts) no deeper than 150 mm to 200 mm, brought up evenly on both sides of a foundation wall to avoid unbalanced horizontal soil pressure. Each lift must be moistened to optimum moisture content and compacted with a mechanical jumping-jack tamper or vibrating plate compactor before placing the next lift. Tipping uncompacted soil loosely into trenches leads to ground subsidence and cracked exterior paving.",
    },
  ],
  limits:
    "Preliminary earthworks quantity takeoff and haulage scheduling only. Does not replace site-specific geotechnical soil investigations, standard penetration testing (SPT), slope stability calculations, or regulatory trench shoring safety requirements under OSHA, HSE, or local construction safety codes.",
};
