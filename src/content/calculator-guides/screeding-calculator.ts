import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the wall screeding calculator.
 *
 * Coverage figures are ranges, because they belong to the compound or paste
 * in the reader's hand: manufacturers differ and a porous or uneven wall
 * drinks more paste. No prices appear here; the calculator prices from the price book.
 */
export const screedingCalculatorGuide: CalculatorGuide = {
  slug: "screeding-calculator",
  heading: "How the wall screeding calculator works",
  howItWorks: [
    "Measure room dimensions to find gross wall area. Add the lengths of all four walls together to find the room perimeter, then multiply by the ceiling height. A 5 m by 4 m room with a 2.8 m ceiling has an 18 m perimeter and a gross wall area of 50.4 m².",
    "Deduct openings from the total surface. Standard internal doors average about 1.8 m² each and typical aluminium casement windows measure about 1.44 m². Subtracting these openings gives the true net area that the screeding trowel covers.",
    "Account for two skim coats. Professional wall screeding requires at least two separate thin coats: a base levelling coat to fill hairline plaster irregularities, followed by a tight finishing skim coat to deliver a glass-smooth surface for paint.",
    "Calculate material consumption based on product type. White cement skim coat and POP screeding powder average 1.0 to 1.2 kg per m² for each millimetre of applied thickness, while premixed acrylic paste covers roughly 1.2 to 1.5 kg per m².",
    "Add a waste and sanding margin. Add ten per cent for mixing bucket residue, trowel waste, and sanding dust. Then round up to full commercial packaging units, which are commonly sold in 20 kg bags or 25 kg tubs in building supply markets.",
  ],
  workedExample: {
    intro:
      "A master bedroom measuring 5 m in length and 4 m in width, with a standard 2.8 m ceiling height, two entrance doors to deduct (3.6 m² combined), and two glazed windows to deduct (2.88 m² combined). The walls require a two-coat white cement skim screed over cured cement plaster.",
    steps: [
      { label: "Room perimeter (5 m + 4 m + 5 m + 4 m)", value: "18 m" },
      { label: "Gross wall area (18 m × 2.8 m)", value: "50.4 m²" },
      { label: "Doors and windows deducted", value: "6.48 m²" },
      { label: "Net screeding area", value: "43.92 m²" },
      { label: "Two coats total application area", value: "87.84 m²" },
      { label: "At 1.2 kg per m² per coat", value: "52.7 kg" },
      { label: "Waste allowance at 10 per cent", value: "58.0 kg" },
      { label: "Commercial bags to buy", value: "three 20 kg bags" },
    ],
    result:
      "So 43.92 m² of net wall surface, skim screeded with two coats, requires approximately 58 kg of material, which you purchase as three 20 kg bags.",
    note: "Rough or uneven cement render can increase paste consumption by 25 per cent or more. Inspect plaster straightness before ordering to avoid running short during application.",
  },
  ratioTable: {
    caption:
      "Typical material consumption rates for wall screeding on smooth cement plaster. Always check the packaging of the actual compound bought.",
    columns: ["Screeding Product", "Coverage per unit", "Application Context"],
    rows: [
      [
        "POP Screeding Powder",
        "0.8 to 1.2 kg per m² per coat",
        "Interior dry walls, mixed with bonding glue and water",
      ],
      [
        "White Cement Skim Coat",
        "1.0 to 1.5 kg per m² per coat",
        "Moisture-resistant interior and exterior surfaces",
      ],
      [
        "Ready-Mix Acrylic Putty",
        "1.2 to 1.8 kg per m² per coat",
        "Ready to apply fine finish on plasterboard and render",
      ],
      [
        "Acrylic Bonding Agent",
        "1 litre per 15 to 20 m²",
        "Primer coat to seal porous render and improve paste adhesion",
      ],
      [
        "Finishing Sandpaper",
        "1 sheet per 10 to 15 m²",
        "Grade 180 to 240 abrasive paper for final sanding before painting",
      ],
    ],
  },
  faqs: [
    {
      question: "How thick should wall screeding be applied?",
      answer:
        "Wall screeding should be applied in thin coats between 1 mm and 2 mm per pass. Applying screed too thick causes surface shrinkage cracks, bubbling, and prolonged drying times. If a wall is severely out of plumb or pitted, float it straight with cement plaster first before applying screed.",
    },
    {
      question: "How many bags of screeding paste are needed for a standard room?",
      answer:
        "A typical 3.5 m by 3.5 m bedroom with a 2.7 m ceiling has about 32 m² of net wall area after deducting the door and window. At two coats, you need approximately 42 kg of material, which equates to two or three 20 kg bags depending on plaster texture.",
    },
    {
      question: "Should I apply primer before or after screeding?",
      answer:
        "Both stages benefit from priming. An acrylic bonding agent or primer applied to raw cement plaster prevents the dry wall from sucking moisture out of the screed paste before it cures. After sanding the cured screed, a stabilizing wall primer must be applied before painting to bind dust.",
    },
    {
      question: "Can I apply screeding compound directly onto raw blockwork?",
      answer:
        "No. Screeding is a delicate finishing coat, not a structural masonry leveller. Raw blockwork joints and hollows require a standard 12 mm to 15 mm cement and sand render first. Screeding directly on blocks results in cracking and excessive material wastage.",
    },
    {
      question: "How long must screeding dry before I can paint?",
      answer:
        "Allow 24 to 48 hours of drying in well-ventilated conditions before dry-sanding. Painting over damp screed traps moisture, which leads to peeling, blistering, and mould growth behind emulsion paint.",
    },
  ],
  limits:
    "This calculator provides material estimates for wall screeding and skim coating only. It cannot inspect wall plumbness, diagnose rising damp, or include mason labour, scaffolding, and disposal of sanding dust. Always confirm container coverage with the supplier.",
};
