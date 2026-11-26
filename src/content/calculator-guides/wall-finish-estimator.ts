import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const wallFinishEstimatorGuide: CalculatorGuide = {
  slug: "wall-finish-estimator",
  heading:
    "Wall Finishing System Takeoff: Scratch Coat, Render, Skim & Topcoat Guide",
  howItWorks: [
    "Measure total interior and exterior masonry wall surface area, taking accurate deductions for window reveals, door openings, and architectural recess features.",
    "Specify exterior render specification: typically a 2-coat sand-cement system comprising a 10 mm to 12 mm scratch base coat (1:4 cement to sharp sand) followed by an 8 mm finish floating coat (1:5 mix with waterproofer).",
    "Specify interior wall finish: raw blockwork requires a 12 mm leveling plaster undercoat followed by a 2 mm to 3 mm multi-finish gypsum skim coat to create an ultra-smooth porcelain-like surface.",
    "Compute cement bag quantities (50 kg bags) and sharp sand bulk tonnage based on dry mix yield factors (1.54 bulking factor for sand-cement mixes).",
    "Calculate galvanized or PVC angle beads for external corners, window reveals, and stop beads at abutment joints to prevent impact chipping.",
    "Include polymer bonding agents (SBR or PVA) applied to high-suction or dense low-suction concrete substrates to guarantee mechanical adhesion.",
  ],
  workedExample: {
    intro:
      "A complete external two-coat sand-cement rendering and internal gypsum skim takeoff for a 150 square metre external facade and 280 square metres of internal hollow blockwork walls. External render thickness is 18 mm nominal; internal plaster thickness is 12 mm base coat with 3 mm finish skim.",
    steps: [
      {
        label:
          "External net facade area to render (150 m2 at 18 mm average thickness = 2.70 m3 wet mortar)",
        value: "2.70 m3",
      },
      {
        label:
          "External render dry material volume (2.70 m3 x 1.54 dry factor)",
        value: "4.16 m3",
      },
      {
        label:
          "Cement for external render (1:4 mix = 4.16 m3 / 5 parts = 0.83 m3 cement = 24 bags)",
        value: "24 bags (50 kg)",
      },
      {
        label:
          "Sharp washed sand for external render (0.83 m3 x 4 parts = 3.33 m3 sand)",
        value: "5.33 tonnes",
      },
      {
        label:
          "Internal backing plaster undercoat (280 m2 at 12 mm = 3.36 m3 wet mortar = 28 bags cement)",
        value: "28 bags (50 kg)",
      },
      {
        label:
          "Internal multi-finish gypsum skim coat (280 m2 at 25 kg bag coverage of 10 m2)",
        value: "28 bags (25 kg)",
      },
      {
        label:
          "PVC/Galvanized external corner angle beads (3.0 m lengths for corners and reveals)",
        value: "32 lengths (96 m)",
      },
      {
        label:
          "SBR latex bonding agent / waterproofer admixture (5-litre containers)",
        value: "4 tubs (20 litres)",
      },
    ],
    result:
      "The complete wall finishing takeoff requires 52 bags of 50 kg Portland cement, 11 tonnes of sharp washed plaster sand, 28 bags of 25 kg finishing plaster, 32 lengths of corner beads, and 20 litres of SBR bonding polymer.",
    note: "Estimates include 10 percent waste allowance for screed drop rebound, wall irregularities, and reveal cuts.",
  },
  ratioTable: {
    caption:
      "Wall finishing mix proportions, mortar density, and theoretical coverage thicknesses across substrates",
    columns: [
      "Finishing Assembly",
      "Nominal Thickness",
      "Mix Proportions / Product",
      "Coverage per Unit",
      "Corner Bead Type",
    ],
    rows: [
      [
        "External Scratch Coat",
        "10 mm to 12 mm",
        "1:4 Cement to Sharp Sand",
        "1.8 m2 per 50 kg cement bag",
        "External PVC / Stainless",
      ],
      [
        "External Floating Finish",
        "6 mm to 8 mm",
        "1:5 Cement to Sand + SBR",
        "2.8 m2 per 50 kg cement bag",
        "Bellcast drip bead",
      ],
      [
        "Internal Sand-Cement Backing",
        "12 mm to 15 mm",
        "1:4 or 1:5 Cement to Sand",
        "1.6 m2 per 50 kg cement bag",
        "Galvanized angle bead",
      ],
      [
        "Gypsum Finish Skim Coat",
        "2 mm to 3 mm",
        "Premixed Multi-Finish",
        "10 m2 per 25 kg bag",
        "Thin-coat mesh bead",
      ],
      [
        "SBR Slurry Bonding Key",
        "1 mm to 2 mm",
        "1:1 SBR Latex to Cement",
        "3.5 m2 per litre SBR liquid",
        "Not applicable",
      ],
      [
        "Tyrolean Textured Finish",
        "4 mm to 6 mm",
        "1:2 White Cement to Marble",
        "6 m2 per 25 kg dry bag",
        "Stop bead at plinth",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why is an SBR bonding slurry required before rendering dense concrete columns?",
      answer:
        "Smooth poured concrete columns and beams have very low surface porosity and lack mechanical key. Sand-cement render applied directly to smooth concrete will de-bond and sound hollow when tapped. Applying a bonding slurry consisting of equal parts SBR (styrene-butadiene rubber) liquid and fresh Portland cement brushed onto the concrete creates an indestructible chemical and mechanical grip for subsequent render coats.",
    },
    {
      question:
        "What causes craze cracking and map cracking in exterior sand-cement render?",
      answer:
        "Craze cracking occurs when the render dries out too rapidly due to hot sun, drying wind, or excessive cement in the mix. Cement mortar shrinks as water evaporates during hydration. If the mortar mix is too rich (such as 1:2 or 1:3 instead of 1:4 or 1:5) or if newly applied render is not misted with water for several days after application, surface shrinkage stresses exceed tensile strength, resulting in a network of fine map cracks.",
    },
    {
      question:
        "How long must sand-cement base render cure before applying finishing paint?",
      answer:
        "Fresh sand-cement render has high alkalinity (pH 12 to 13) and contains substantial internal moisture. As a general rule, exterior render requires at least 4 to 6 weeks of curing and drying before applying standard acrylic exterior masonry paint. Painting too soon traps moisture, saponifies oil-based coatings, and pushes white efflorescence mineral salts through the paint film.",
    },
    {
      question:
        "What is the purpose of corner beads and stop beads on external wall finishes?",
      answer:
        "Corner beads provide a straight, true vertical guide for plastering trowels while reinforcing vulnerable 90-degree external wall corners against impact damage. Stop beads create neat, sealed termination lines at door and window frames, floor slab junctions, and roof soffit intersections, preventing moisture ingress and uncontrolled cracking along material transitions.",
    },
    {
      question:
        "How does wall surface unevenness affect plaster and render consumption?",
      answer:
        "Uneven or out-of-plumb blockwork significantly increases plaster consumption. If blocklayers allow a wall to drift 10 millimetres out of plumb, plasterers must apply 25 millimetres of mortar at the base to achieve a plumb face instead of the intended 15 millimetres. This increases cement and sand consumption by up to 40 percent on that elevation, highlighting the critical link between masonry craftsmanship and finishing costs.",
    },
  ],
  limits:
    "This wall finish estimator provides material takeoff benchmarks based on specified square meterage and nominal thickness layers. It does not replace on-site substrate pull-off testing, structural movement joint engineering, or building code compliance certification.",
};
