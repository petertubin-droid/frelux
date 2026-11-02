/**
 * Curated search listings for articles that already rank but do not get clicked.
 *
 * Selected from real Search Console data (2 - 29 Oct 2026, legacy url-prefix
 * property, which still holds the traffic): each entry here ranked between 5
 * and 10 with fewer than 2% CTR. The query language from that export drives the
 * wording, and every promise is something the article actually covers - the
 * claims come from the article's own meta description and excerpt.
 *
 * Applied to the prerendered route after the database rows are read, so the
 * static listing is what a crawler sees on first paint. The database keeps its
 * own copy; if an editor changes meta_title in the CMS this map should be
 * removed for that slug rather than left to disagree.
 */
export const ARTICLE_LISTINGS = {
  "screeding-vs-plastering-key-differences": {
    title: "Screeding vs Plastering: What's the Difference? | FRELUX",
    description:
      "Screeding levels a wall or floor; plastering is the finish coat. Compare purpose, thickness, mix and cost so you specify the right one.",
  },
  "complete-guide-pop-ceiling-installation": {
    title: "How to Install a POP Ceiling: Step-by-Step Guide | FRELUX",
    description:
      "Install a POP ceiling stage by stage: framing, board fixing, jointing and finishing, with the materials and tools each step needs.",
  },
  "how-to-apply-mineral-stone-paint-step-by-step": {
    title: "How to Apply Mineral Stone Paint: Step by Step | FRELUX",
    description:
      "Apply mineral stone paint in the right order: surface prep, priming, trowel and roller texture, layering, sealing and clean-up.",
  },
  "how-to-calculate-screeding-material-quantities": {
    title: "How to Calculate Screeding Cement, Sand & Water | FRELUX",
    description:
      "Work out screeding cement, sand and water from wall area and thickness, including wastage and a cost estimate for your market.",
  },
  "common-tiling-mistakes-and-how-to-avoid": {
    title: "Common Tiling Mistakes and How to Avoid Them | FRELUX",
    description:
      "The mistakes that ruin a tiling job: poor prep, wrong adhesive, bad layout, uneven spacing and grouting errors, with the fix for each.",
  },
  "pop-ceiling-vs-suspended-ceiling-comparison": {
    title: "POP Ceiling vs Suspended Ceiling: Which to Choose | FRELUX",
    description:
      "Compare POP and suspended grid ceilings on cost, installation, appearance, durability and maintenance before you specify one.",
  },
  "common-pop-ceiling-problems-and-solutions": {
    title: "POP Ceiling Problems: Cracks, Sagging & Fixes | FRELUX",
    description:
      "Diagnose POP ceiling cracks, sagging, water stains, joint failures and mould, with the practical fix for each problem.",
  },
  "pop-ceiling-maintenance-and-repair-tips": {
    title: "POP Ceiling Repair & Maintenance Tips | FRELUX",
    description:
      "Keep a POP ceiling clean and sound: routine cleaning, crack repair, stain removal, and when to call in a professional.",
  },
};
