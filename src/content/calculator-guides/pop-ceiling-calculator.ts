import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const popCeilingCalculatorGuide: CalculatorGuide = {
  slug: "pop-ceiling-calculator",
  heading: "POP ceiling and gypsum plasterboard material calculation guide",
  howItWorks: [
    "A Plaster of Paris (POP) ceiling provides decorative, seamless overhead architecture that hides concrete slab soffits, electrical conduit, air conditioning ductwork, and structural beams.",
    "In West African residential construction, traditional cast-in-place fibrous plastering remains popular: gypsum hemihydrate powder (POP cement) is mixed into a liquid slurry with water and natural reinforcement fiber (sisal, hemp, or jute), cast over suspended timber or light-gauge steel framing, and finished with smooth trowel skims.",
    "In commercial and contemporary modular building, suspended gypsum drywall systems are standard: 12.5 mm factory-pressed plasterboard sheets are screwed into galvanized steel ceiling grids (main channels and furring channels), then taped and flushed with joint compound.",
    "Material takeoff starts with net ceiling area (room length multiplied by room width). Perimeter drop bulkheads, concealed lighting troughs, and multi-level stepped centerpieces increase the surface area by 15 percent to 35 percent depending on design complexity.",
    "Perimeter cornices and moulding strips are calculated linearly around the room boundary, adding 10 percent to 15 percent for corner miter cuts and joining joints.",
  ],
  workedExample: {
    intro:
      "Master bedroom suspended POP ceiling: calculating materials for a 5.0 m by 5.0 m bedroom (25 m² flat ceiling area) featuring a simple perimeter recessed light trough, using cast POP cement, reinforcement fiber, and decorative perimeter cornice.",
    steps: [
      {
        label: "Flat ceiling base surface area (5.0 m × 5.0 m)",
        value: "25.00 m² base area",
      },
      {
        label: "Recessed tray bulkhead vertical drops",
        value: "5.00 m² additional decorative area",
      },
      {
        label: "Total developed plastering surface",
        value: "30.00 m² total area",
      },
      {
        label: "POP cement (40 kg bags at 0.85 bags per m²)",
        value: "26 bags (40 kg POP cement)",
      },
      {
        label: "Sisal reinforcement fiber (0.40 kg per m²)",
        value: "12.00 kg sisal or hemp fiber",
      },
      {
        label: "Framing battens (grid at 600 mm centers)",
        value: "75 linear metres framing profiles",
      },
      {
        label: "Perimeter decorative cornice moulding",
        value: "22.00 linear metres (9 lengths of 2.4 m)",
      },
    ],
    result:
      "Total purchase list: 26 bags of 40 kg POP cement, 12 kg sisal fiber, 75 m framing battens, and 9 lengths of 2.4 m cornice.",
  },
  ratioTable: {
    caption:
      "POP and gypsum ceiling material consumption rates and component yields",
    columns: [
      "Ceiling material / component",
      "Standard packaging or format",
      "Average consumption or coverage rate",
    ],
    rows: [
      [
        "POP casting cement powder",
        "40 kg bag (gypsum hemihydrate)",
        "1.1 m² to 1.3 m² finished ceiling per bag",
      ],
      [
        "Gypsum drywall board (12.5 mm)",
        "1.2 m × 2.4 m sheet (2.88 m²)",
        "1 sheet per 2.6 m² after 10% cutting waste",
      ],
      [
        "Sisal / hemp binding fiber",
        "Natural reinforcement fiber bundle",
        "0.35 kg to 0.45 kg per m² cast ceiling",
      ],
      [
        "Joint compound / skim filler",
        "25 kg bucket ready-mix compound",
        "40 m² to 50 m² tape and skim coverage",
      ],
      [
        "Galvanized furring channel",
        "3.66 m length metal ceiling profile",
        "1 length per 1.5 m² ceiling area",
      ],
      [
        "Decorative cornice moulding",
        "2.4 m standard profile length",
        "1 length per 2.2 m perimeter after miter cuts",
      ],
    ],
  },
  faqs: [
    {
      question: "What is a POP ceiling and how is it constructed?",
      answer:
        "A POP (Plaster of Paris) ceiling is a decorative overhead ceiling made from quick-setting gypsum plaster. In traditional methods, it is cast with water and sisal fiber over wooden or metal ceiling frames. In dry construction, pre-manufactured gypsum boards are screwed to a metal grid and finished with joint compound.",
    },
    {
      question: "How many bags of POP cement are needed for a standard room?",
      answer:
        "For a standard 3.6 m by 3.6 m room (approx 13 m²), a flat POP ceiling requires approximately 10 to 12 bags of 40 kg POP cement. If the design includes elaborate multi-step light troughs, curved bulkheads, or center domes, material requirements increase to 14 to 16 bags.",
    },
    {
      question: "What is the role of sisal fiber in POP ceilings?",
      answer:
        "Pure gypsum plaster has high compressive strength but low tensile strength, making unreinforced panels brittle. Sisal, hemp, or fiberglass strands act as tensile reinforcement within the plaster matrix, preventing cracking and supporting the suspended weight across framing spans.",
    },
    {
      question: "How long does a POP ceiling take to dry before painting?",
      answer:
        "Cast POP ceilings hold substantial moisture from the casting water. In well-ventilated warm conditions, a ceiling requires 14 to 21 days to dry thoroughly. Applying paint over damp POP traps moisture, leading to peeling paint, blistering, yellow water stains, and fungal growth.",
    },
    {
      question:
        "What is the difference between POP and PVC or polystyrene ceilings?",
      answer:
        "POP provides a seamless, fire-resistant, custom-sculpted architectural finish that can be repainted indefinitely. PVC panels and expanded polystyrene boards are lighter, faster to install, and moisture-proof, but lack the seamless luxury finish and fire-retardant mass of gypsum plaster.",
    },
  ],
  limits:
    "This tool provides material estimates for decorative and suspended ceiling layouts. It does not replace structural load calculations for heavy chandeliers, electrical cable conduit routing, or acoustic transmission ratings.",
};
