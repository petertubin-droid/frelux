import type { LongFormArticle } from "@/config/faq-longform";

export const INTERIORS_LONGFORM: Record<string, LongFormArticle> = {
  "wallpaper-calculator": {
    description: `A wallpaper order begins with a measured wall, but the quantity depends on more than its area. The product has a usable width and length, each drop has to reach the wall height, and a repeated design may require extra length so adjoining drops meet. A quantity based only on square metres misses those constraints.

The calculator treats a roll as a set of cuts. It works out the full height drops needed across each wall, applies the waste allowance you choose, adjusts cut length for the trim and pattern repeat, then packs those cuts against the usable length of a roll. It rounds up to whole rolls or whole priced packages. Fixed mural panels use their printed dimensions and are counted as panels instead of continuous drops.

Openings are deducted from the displayed net wall area, but they do not automatically reduce the full height drop count. Their location and the shape of reusable offcuts affect whether material can be recovered, and the calculator does not have a cutting layout that can prove that recovery. This conservative distinction keeps the area summary from implying an order quantity that the layout cannot support.`,
    functions: [
      "Measures each wall from its entered width and height and subtracts the door and window areas from the net area display.",
      "Counts full height drops from wall width divided by usable product width, rounded up for each wall.",
      "Applies the selected allowance to the drop count, then determines cut length from wall height, trim and match repeat.",
      "Packs the required cuts within each usable roll length and reports stock units and whole priced packages.",
      "Counts mural panels from panel dimensions and the number of panels in a priced set, without treating them as roll goods.",
      "Calculates material, paste and installation costs only from the prices and coverage inputs the user provides.",
    ],
    worked: `Suppose a room has two measured walls with different widths and heights, and the chosen product has a stated usable width and roll length. The calculator counts drops on each wall separately, adds the chosen allowance, and calculates a cut for each drop. If the design has a repeat, the cut length rounds up to a matching repeat so the pattern can align. It then tests how many of those cuts fit into each roll and rounds the stock order to the package size entered. If a door is added, the net area decreases, but the full height drop count remains, because a drawing of the opening position and offcut reuse is needed to show that a complete drop can be recovered. A mural selection follows a different path: it counts fixed panels and priced sets. The resulting estimate can be checked against the product label and installer layout before an order is placed.`,
    advantages: [
      "Roll geometry, wall geometry and cost are separate, which makes each assumption easier to verify.",
      "Pattern repeat changes the cut length only when the product match requires it.",
      "The opening deduction is shown without claiming that every offcut can replace a full width drop.",
      "Rolls, priced packages and fixed mural panels have distinct counting rules.",
      "Manual supplier and labour quotes remain local user inputs and are not presented as live prices.",
    ],
    limits: [
      "The calculator does not generate a room elevation or a precise cutting schedule for each roll.",
      "It cannot determine which offcuts are reusable without the opening positions and a complete layout.",
      "It does not validate a product label, batch number, substrate, paste choice or installation method.",
      "Pattern direction and matching instructions must be checked on the selected product.",
      "Prices, tax and fitting rates are not verified by this calculator; confirm them with the supplier and installer.",
    ],
    answers: [
      `It estimates full height drops for each measured wall, then calculates the cut length of each drop from the wall height, trim allowance and pattern repeat. The cuts are packed into the usable roll length, and the result is rounded to whole stock units and priced packages. The displayed net area is a separate summary; it does not decide whether a particular offcut can replace a drop.`,
      `Yes. A preset can start the estimate, or you can enter the usable dimensions printed on the product. For a priced package, enter how many physical rolls or mural panels it contains. Package names differ between suppliers and markets, so the package dimensions and count should come from the label you are buying, not from a regional assumption.`,
      `The material selection identifies the product type, while the calculation uses its dimensions and the pattern details you provide. It does not add a coverage multiplier because a product is described as vinyl, textile or non-woven. The label does not establish the paste, preparation or hanging method, so follow the product maker's instructions.`,
      `Free match does not add a repeat offset. Straight match rounds the cut to the repeat you enter. Half drop alternates a half repeat offset on alternate cuts. The estimator represents these rules in a simplified cut length calculation, and it is not a complete layout that checks every strip against the roll and pattern sequence.`,
      `The measured door and window areas reduce the net area display. The roll takeoff still plans full height drops across the wall because the openings' positions and surrounding geometry determine whether offcuts can be reused. Check the layout with the installer before ordering if you want to rely on offcut recovery.`,
      `No. Material and installation costs use the amounts you type in the selected currency. They are manual quotes for planning and are not verified or live supplier data. Changing the market does not convert an entered price into a different currency, so update the inputs using a local supplier quote.`,
      `Paste packs are estimated only when paste is required and use the coverage per pack that you enter. Self adhesive and peel and stick selections do not add separate paste packs. Product instructions determine the suitable adhesive and its coverage, so verify those details for the chosen product and wall surface.`,
    ],
  },
};
