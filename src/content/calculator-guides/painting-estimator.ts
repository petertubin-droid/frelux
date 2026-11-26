import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const paintingEstimatorGuide: CalculatorGuide = {
  slug: "painting-estimator",
  heading:
    "Architectural Painting Takeoff: Surface Prep, Primer & Multi-Coat Guide",
  howItWorks: [
    "Calculate gross room wall elevation areas by multiplying perimeter by room ceiling height, then calculate separate horizontal ceiling surface areas.",
    "Deduct all window, door, and architectural joinery opening voids to establish net paintable wall surface area.",
    "Assess surface porosity and substrate condition: fresh raw sand-cement plaster or new gypsum plasterboard requires dedicated alkali-resisting primer or stabilizing mist coat.",
    "Select paint coating specification: typical commercial finishes require one primer coat followed by two full-bodied finish topcoats (matte emulsion, eggshell, satin, or gloss enamel).",
    "Divide net surface area by manufacturer theoretical spreading rate (typically 10 to 14 square metres per litre per coat), applying substrate texture loss factors.",
    "Calculate sundries including painter masking tape rolls, heavy polyethylene drop sheets, sanding abrasive paper, and acrylic gap sealant caulk tubes.",
  ],
  workedExample: {
    intro:
      "A complete internal repaint of an executive 4-room suite with a combined wall perimeter of 72.0 metres, standard 2.80 metre ceiling height, and 120.0 square metres of smooth ceiling surface. The walls contain 8 standard internal doors (2.1 m x 0.9 m) and 6 windows (1.5 m x 1.2 m), giving total opening deductions of 25.92 square metres. Substrate is previously painted, sound skimmed plaster.",
    steps: [
      {
        label:
          "Gross wall elevation area (72 m perimeter x 2.80 m ceiling height)",
        value: "201.60 m2",
      },
      {
        label:
          "Deduction for doors and windows voids (15.12 m2 doors + 10.80 m2 windows)",
        value: "25.92 m2",
      },
      {
        label:
          "Net paintable wall surface area (201.60 m2 minus 25.92 m2 voids)",
        value: "175.68 m2",
      },
      {
        label: "Total horizontal ceiling surface area (4 rooms combined)",
        value: "120.00 m2",
      },
      {
        label:
          "Wall acrylic emulsion (2 coats on 175.68 m2 at 11 m2/litre theoretical coverage)",
        value: "32.0 litres (2 x 20L drums)",
      },
      {
        label:
          "Ceiling flat white emulsion (2 coats on 120 m2 at 12 m2/litre coverage)",
        value: "20.0 litres (1 x 20L drum)",
      },
      {
        label:
          "High-tack painter masking tape (25 mm wide rolls for skirting and frames)",
        value: "8 rolls (400 m)",
      },
      {
        label:
          "Flexible paintable acrylic caulk (310 ml tubes for perimeter trim joints)",
        value: "6 tubes",
      },
    ],
    result:
      "The project requires 40 litres of premium washable wall emulsion (supplied in two 20-litre contractor tubs), 20 litres of flat ceiling paint, 8 rolls of masking tape, 6 tubes of acrylic caulk, and assorted sandpaper sheets.",
    note: "Calculations incorporate an 8 percent wastage allowance for roller sleeve retention, tray residues, cutting-in edges, and minor touch-up reserves.",
  },
  ratioTable: {
    caption:
      "Architectural paint spreading rates, coat recommendations, and drying intervals across common building substrates",
    columns: [
      "Substrate Surface",
      "Recommended Paint System",
      "Coats Required",
      "Coverage Rate per Coat",
      "Recoat Rec. Time",
    ],
    rows: [
      [
        "Fresh Sand-Cement Render",
        "Alkali-Resistant Primer + Acrylic",
        "1 Primer + 2 Topcoats",
        "8 to 10 m2 / litre",
        "6 to 8 hours",
      ],
      [
        "New Gypsum Plasterboard",
        "Mist Coat Primer + Vinyl Matte",
        "1 Mist + 2 Topcoats",
        "10 to 12 m2 / litre",
        "4 to 6 hours",
      ],
      [
        "Previously Painted Interior Wall",
        "Washable Silk / Satin Emulsion",
        "2 Topcoats",
        "12 to 14 m2 / litre",
        "2 to 4 hours",
      ],
      [
        "Exterior Masonry Facade",
        "100% Pure Acrylic Weatherproof",
        "2 Topcoats",
        "6 to 8 m2 / litre",
        "4 to 6 hours",
      ],
      [
        "Internal Wood Skirting & Trim",
        "Acrylic Primer/Undercoat + Gloss",
        "1 Primer + 2 Enamels",
        "11 to 13 m2 / litre",
        "16 hours (alkyd)",
      ],
      [
        "Bathroom / Kitchen Ceilings",
        "Anti-Fungal Mould-Resistant Matte",
        "2 Topcoats",
        "10 to 12 m2 / litre",
        "4 hours",
      ],
    ],
  },
  faqs: [
    {
      question: "Why is a mist coat primer necessary on newly plastered walls?",
      answer:
        "Fresh gypsum plaster and sand-cement render are highly porous and absorbent. Applying full-bodied paint directly onto unsealed fresh plaster causes the dry wall to suction water out of the paint film prematurely, preventing proper polymer curing and leading to peeling, flaking, and roller skidding. A mist coat (contractor matte emulsion diluted with 20 to 30 percent clean water) penetrates deeply into plaster capillaries, creating a bonded foundation for topcoats.",
    },
    {
      question:
        "How do you calculate paint quantity for door frames and skirting boards?",
      answer:
        "Architectural trim is measured linearly or by converted surface area. A standard skirting board is typically 100 millimetres to 150 millimetres high, so 10 linear metres equals approximately 1.0 to 1.5 square metres of painted surface. Standard six-panel timber doors require approximately 2.0 square metres per side (4.0 square metres per door including frame and architrave edges), typically coated in durable satin or gloss wood enamel.",
    },
    {
      question: "What causes paint blistering and flaking on interior walls?",
      answer:
        "Blistering is almost always caused by trapped moisture or painting over contaminated surfaces. If paint is applied over un-dried plaster, damp blockwork, efflorescence salts, or powdery chalk without an oil-based stabilizing primer, water vapor pushes against the elastic paint film as temperature rises, forming hollow blisters that rupture and flake.",
    },
    {
      question:
        "What is the practical difference between matte, silk, and satin finishes?",
      answer:
        "The difference lies in resin binder concentration and sheen level. Matte paint reflects almost no light (sheen below 5 percent), making it ideal for disguising imperfections on ceilings and living room walls, but it has lower scrub resistance. Silk and satin paints (sheen 15 percent to 35 percent) cure into a tighter, water-resistant film that withstands washing, making them standard for high-traffic corridors, children bedrooms, and kitchens.",
    },
    {
      question: "How much paint waste occurs during application?",
      answer:
        "Real-world paint loss ranges from 5 percent for experienced roller application on smooth walls up to 15 percent for rough exterior stucco or airless spray application. Spray equipment loses paint to atomized overspray, while rollers and brush bristles retain residual paint in the pile upon cleanup. A 10 percent allowance ensures adequate supply and leaves a small leftover container for future maintenance touch-ups.",
    },
  ],
  limits:
    "This painting estimator calculates volumetric requirements based on geometric dimensions and standard spreading rates. It does not account for severe efflorescence moisture remediation, chemical lead paint abatement, or heavy substrate skim-coating plaster repairs.",
};
