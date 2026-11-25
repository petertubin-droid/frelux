import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the painting calculator.
 *
 * Coverage figures are ranges, because they belong to the tin in the reader's
 * hand: manufacturers differ and a porous wall drinks more. No prices appear
 * here, and none are invented; the calculator prices from the price book.
 */
export const paintCalculatorGuide: CalculatorGuide = {
  slug: "paint-calculator",
  heading: "How the painting calculator works",
  howItWorks: [
    "Measure the surface first. For each room, add the four wall lengths together and multiply by the ceiling height. A 4 m by 3 m room with a 2.7 m ceiling has a perimeter of 14 m and a gross wall area of 37.8 m².",
    "Deduct the openings. A standard door is about 1.8 m² and a 1.2 m by 1.2 m window is about 1.5 m². Deducting them matters on a small room with a large window and barely matters on a long corridor, which is why the calculator asks for them rather than guessing.",
    "Choose the number of coats. Two coats is the normal specification, and it is what a colour change needs to cover evenly. One coat is only sensible when you are refreshing the same colour over a sound surface.",
    "Divide the painted area by the coverage printed on your tin. Emulsion is usually quoted at 10 to 12 m² per litre for one coat, gloss at 12 to 14 m², and a texture finish at 1.5 to 2.5 m² because it is applied thick.",
    "Add a waste allowance. Ten per cent is the usual planning figure for smooth plaster, and more for a rough or porous wall. Then round up to the tins actually sold, which in Nigeria are mostly 4 litre and 20 litre.",
  ],
  workedExample: {
    intro:
      "A three bedroom flat with 120 m² of gross wall area, a 2.7 m ceiling, and 18 m² of doors and windows to deduct. It is being repainted from cream to a mid tone, so it needs two coats of emulsion.",
    steps: [
      { label: "Gross wall area measured", value: "120 m²" },
      { label: "Doors and windows deducted", value: "18 m²" },
      { label: "Paintable wall area", value: "102 m²" },
      { label: "Two coats", value: "204 m²" },
      { label: "At 11 m² per litre", value: "18.5 litres" },
      { label: "Waste allowance at 10 per cent", value: "20.4 litres" },
      { label: "Bought as", value: "one 20 litre tin and one 4 litre tin" },
    ],
    result:
      "So 102 m² of paintable wall, painted twice, comes to about 20.4 litres, which you buy as a 20 litre tin plus a 4 litre tin.",
    note: "Coverage is the figure on your tin, not this page. A rough wall can take 20 per cent more, and going from a strong colour back to white often needs three coats rather than two.",
  },
  ratioTable: {
    caption:
      "Typical coverage per litre for one coat on smooth plaster. Always use the figure printed on the tin you actually buy.",
    columns: ["Product", "Coverage per litre", "Where it is used"],
    rows: [
      ["Primer or sealer", "8 to 10 m²", "First coat on new plaster"],
      [
        "Emulsion, matt or silk",
        "10 to 12 m²",
        "Walls and ceilings, two coats",
      ],
      ["Gloss or eggshell", "12 to 14 m²", "Woodwork, doors and trim"],
      ["Texture finish", "1.5 to 2.5 m²", "Decorative coat, applied thick"],
      [
        "Thinner or water",
        "Follow the tin",
        "Never thin past the maker's limit",
      ],
    ],
  },
  faqs: [
    {
      question: "Do I need one coat or two?",
      answer:
        "Two, unless you are refreshing the same colour over a sound surface. One coat over a different colour shows through in raking light, and fixing it later costs more than the extra tin.",
    },
    {
      question: "How much extra should I buy for a rough wall?",
      answer:
        "Plan on 15 to 20 per cent more than a smooth wall, because the surface absorbs paint instead of spreading it. If the wall has never been painted, add a primer coat as well, since primer is cheaper per litre than topcoat.",
    },
    {
      question: "Does the calculator include the ceiling?",
      answer:
        "Only if you enter the ceiling area. Ceilings are usually painted in the same emulsion as the walls, but they are a separate surface, so a room with a 12 m² ceiling needs that area added rather than assumed.",
    },
    {
      question: "Why does my tin cover less than the label says?",
      answer:
        "Labels quote coverage on a smooth, sealed surface. Porous plaster, a strong colour change, thinning the paint, and brushing instead of rolling all reduce it. Treat the label as a best case.",
    },
    {
      question: "Does this include labour or scaffolding?",
      answer:
        "No. The calculator estimates material only. Labour, surface repair, and access equipment for a two storey wall are separate, and a painter will quote them after seeing the rooms.",
    },
  ],
  limits:
    "This is a material estimate for painting only. It cannot see your walls, so it cannot know whether they are porous, patched or damp, and it does not price labour or access. Buy to the coverage on the tin and keep the receipt: unopened tins are usually exchangeable.",
};
