import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const structuralCalculatorGuide: CalculatorGuide = {
  slug: "structural-calculator",
  heading: "Reinforced Concrete Structural Element Design and Analysis Guide",
  howItWorks: [
    "Define structural member geometry: enter clear span, section breadth, overall depth, column height, or slab thickness alongside exposure-governed concrete cover depth.",
    "Evaluate characteristic actions: determine self-weight of reinforced concrete (24 to 25 kN/m3), finishes, partition line loads, and code-prescribed imposed live loads by occupancy.",
    "Combine factored ultimate limit state (ULS) loads: apply governing load factors, such as 1.35 Gk + 1.50 Qk under Eurocode 2, 1.4 Gk + 1.6 Qk under BS 8110, or 1.2 D + 1.6 L under ACI 318-19.",
    "Calculate flexural tension steel: compute design bending moment, normalized moment K, internal lever arm z, and tension reinforcement area As,req = M / (0.87 fy z).",
    "Design shear links and stirrups: compute design shear force VEd, check concrete shear resistance VRd,c, and determine stirrup bar diameter, link leg count, and longitudinal spacing.",
    "Verify serviceability limit states (SLS): evaluate span-to-effective-depth ratios against allowable deflection limits, factoring in tension steel ratios and service stresses.",
  ],
  workedExample: {
    intro:
      "Consider a simply supported rectangular reinforced concrete beam spanning 5.0 metres in a residential building supporting a 150 mm thick solid concrete slab and 225 mm hollow sandcrete block partitions. The calculation follows Eurocode 2 / BS 8110 principles using Grade C25/30 concrete and Grade 500 MPa high-yield steel reinforcement with 25 mm nominal cover.",
    steps: [
      {
        label: "Clear span length L and support widths",
        value: "5.0 m clear span with 225 mm bearing supports",
      },
      {
        label: "Beam rectangular cross-section dimensions (breadth b x depth h)",
        value: "225 mm width by 450 mm overall depth",
      },
      {
        label: "Effective depth d (450 mm minus 25 mm cover, 8 mm link, 8 mm bar radius)",
        value: "409 mm",
      },
      {
        label: "Characteristic dead load gk (beam self-weight 2.43 kN/m + slab/wall load 15.5 kN/m)",
        value: "17.93 kN/m",
      },
      {
        label: "Characteristic live load qk (tributary floor width 3.0 m at 2.0 kN/m2)",
        value: "6.00 kN/m",
      },
      {
        label: "Factored design ultimate load (1.35 x 17.93 + 1.50 x 6.00)",
        value: "33.21 kN/m",
      },
      {
        label: "Design ultimate bending moment at midspan (w L^2 / 8)",
        value: "103.78 kN.m",
      },
      {
        label: "Normalized moment K factor (M / (b d^2 fck))",
        value: "0.111 (less than K_bal 0.167, singly reinforced)",
      },
      {
        label: "Internal lever arm z (d x [0.5 + sqrt(0.25 - K / 1.134)])",
        value: "365 mm (0.89 d)",
      },
      {
        label: "Required tension steel area As,req (103.78 x 10^6 / [0.87 x 500 x 365])",
        value: "654 mm2",
      },
      {
        label: "Main bottom reinforcement provided",
        value: "4 number 16 mm diameter high-yield bars (As,prov = 804 mm2)",
      },
      {
        label: "Nominal top hanger bars provided",
        value: "2 number 12 mm diameter high-yield bars (As = 226 mm2)",
      },
      {
        label: "Shear stirrups (8 mm two-leg high-yield links)",
        value: "8 mm links at 175 mm centres along span, reducing to 125 mm near supports",
      },
    ],
    result:
      "The beam section requires a 225 mm by 450 mm concrete section reinforced with 4 number 16 mm diameter high-yield bottom bars and 8 mm high-yield stirrups spaced at 175 mm centres.",
    note: "Point loads from secondary transfer beams or heavy masonry openings require dedicated punching and localized shear calculations.",
  },
  ratioTable: {
    caption:
      "Characteristic compressive concrete strengths, steel yield strengths, and minimum tension rebar ratios across standard codes.",
    columns: [
      "Design Standard",
      "Concrete Grade",
      "Characteristic Strength fck / fcu",
      "Steel Yield Strength fyk",
      "Minimum Tension Steel Area",
    ],
    rows: [
      [
        "Eurocode 2 (EN 1992-1-1)",
        "C25/30",
        "25 N/mm2 (cyl) / 30 N/mm2 (cube)",
        "Grade 500 MPa",
        "0.26 (fctm / fyk) b d (approx 0.13% b d)",
      ],
      [
        "British Standard (BS 8110)",
        "Grade 25 / 30",
        "25 N/mm2 / 30 N/mm2 cube",
        "Grade 460 / 500 MPa",
        "0.13% b d (high yield) / 0.24% (mild steel)",
      ],
      [
        "American Standard (ACI 318)",
        "fc = 4,000 psi (28 MPa)",
        "27.6 N/mm2 cylinder",
        "Grade 60 (414 MPa)",
        "3 sqrt(fc) / fy >= 200 / fy (approx 0.33% b d)",
      ],
      [
        "Indian Standard (IS 456)",
        "M25",
        "25 N/mm2 characteristic cube",
        "Fe 500 (500 N/mm2)",
        "0.85 b d / fy (approx 0.17% b d)",
      ],
      [
        "Australian Standard (AS 3600)",
        "N25 / N32",
        "25 N/mm2 / 32 N/mm2 cylinder",
        "Class 500N (500 MPa)",
        "0.20 (D / d)^2 (fct.f / fsy) b d",
      ],
    ],
  },
  faqs: [
    {
      question: "What is the difference between cylinder strength and cube strength in concrete specifications?",
      answer:
        "Cylinder strength (fck) uses a 150 mm diameter by 300 mm cylinder, whereas cube strength (fcu) uses a 150 mm cube mould. Because the platen friction in test compression machines restrains lateral expansion in cubes, cube strength typically measures 20 to 25 per cent higher than cylinder strength for identical concrete batches. Eurocode specifies both (e.g., C25/30 denotes 25 N/mm2 cylinder and 30 N/mm2 cube strength).",
    },
    {
      question: "How is effective depth calculated from overall member depth?",
      answer:
        "Effective depth (d) represents the distance from the extreme compression fibre to the centroid of the tensile reinforcement. It equals the total depth (h) minus the nominal concrete cover, minus the shear link or stirrup diameter, and minus half the diameter of the longitudinal tensile rebar. Accurate effective depth is critical because flexural moment resistance varies with effective depth squared.",
    },
    {
      question: "When is compression steel reinforcement required in a concrete beam?",
      answer:
        "Compression steel is required when the design bending moment exceeds the maximum balanced moment capacity of the concrete cross-section (e.g., K exceeds 0.167 in Eurocode 2 or 0.156 in BS 8110). Adding compression bars in the top zone prevents brittle concrete crushing and allows the beam to resist higher moments without increasing overall depth.",
    },
    {
      question: "What governs the longitudinal spacing of shear links and stirrups?",
      answer:
        "Stirrup spacing is governed by maximum shear stress at supports, crack control, and physical bar stability. Design codes specify that maximum spacing must not exceed 0.75 times effective depth (or 600 mm) in non-critical zones, reducing to 0.50 d or less near beam supports where diagonal shear cracking risks are highest.",
    },
    {
      question: "Can this structural calculator replace certified structural engineering drawings?",
      answer:
        "No. This tool is designed for preliminary member sizing, budget planning, and structural feasibility checks. Construction execution requires fully certified drawings, bar bending schedules, and structural calculations sealed by a locally registered professional engineer.",
    },
  ],
  limits:
    "This structural calculator provides preliminary screening, member cross-section sizing, and indicative rebar area estimates only. It is not an engineering design certificate and does not produce construction-ready working drawings. A locally licensed structural engineer must independently evaluate load combinations, soil interactions, dynamic effects, and statutory code compliance before fabrication or casting.",
};
