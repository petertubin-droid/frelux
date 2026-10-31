import type { LongFormArticle } from "@/config/faq-longform";

export const FINISHES3_LONGFORM: Record<string, LongFormArticle> = {
  "paint-comparison": {
    description: `Paint is sold in tins of different sizes at different prices with different coverage, which makes the shelf price a poor guide to the cost of a wall. The comparison puts products on one basis: cost per square metre at the coverage the tin states and the number of coats the system needs.

That basis is what makes two products genuinely comparable. A cheap tin covering six square metres a litre is not cheaper than an expensive one covering twelve, and the difference compounds over a building. Where a product has no stated coverage, the comparison reports the gap rather than assuming a figure, because an assumed coverage is what makes the arithmetic look decisive while being wrong.`,
    functions: [
      "Calculates cost per square metre for each product, from tin price, tin size, stated coverage and coat count.",
      "Normalises across tin sizes, so a five litre and a twenty litre pack are compared on the same basis.",
      "Shows the coverage each product states, so the basis of the comparison is visible.",
      "Reports a product with no stated coverage as incomparable rather than filling the gap.",
      "Calculates the quantity needed for an area you enter, so a comparison can be checked against a real job.",
      "Keeps primer and undercoat on their own lines, since a system is more than a topcoat.",
      "Reports prices exclusive of tax unless you add a rate, in which case the basis is stated.",
      "Shows the tin count a comparison implies for an area, since a part tin at the end of a job is a cost that a per square metre figure hides.",
      "Keeps the tins of each product side by side, so a difference in pack size does not distort the comparison.",
    ],
    worked:
      "Two emulsions. One costs a certain amount for five litres and covers six square metres per litre, so thirty square metres per tin. The other costs more for five litres and covers twelve, so sixty square metres. Per square metre the second is cheaper even though the tin costs more, and on a hundred and eighty square metres in two coats the difference is the price of a second tin of the cheap product. Neither figure required knowing the area in advance, which is why cost per square metre is the right basis.",
    advantages: [
      "Products are compared on cost per square metre rather than shelf price.",
      "Coverage is shown, so the basis of the comparison can be checked.",
      "Coat count is part of the arithmetic, since a system is not one coat.",
      "A missing coverage is reported rather than assumed.",
      "Primer and undercoat are separate, which keeps a system honest.",
    ],
    limits: [
      "It does not judge colour, durability or finish quality.",
      "It does not predict how many coats a particular substrate will need.",
      "It does not validate the coverage a manufacturer states.",
      "It does not include labour, which often dominates the cost.",
      "It does not include the cost of preparation, masking, protection or the time a room is out of use.",
    ],
    answers: [
      `Cost per square metre for each product, at its stated coverage and your coat count, alongside the coverage itself so the basis is visible. It also shows what an area you enter would cost, which turns a comparison into an order. Which paint to buy also depends on the substrate, the exposure, the colour, the sheen, the drying time and how it will look in three years, and none of those are in a coverage figure. The comparison gives you the part that can be calculated and leaves the part that cannot to you.`,
      `Because a tin is not a unit of work. Coverage varies by a factor of two between products in the same tin size, so the shelf price tells you what a can costs and not what a wall costs. Cost per square metre combines price, coverage and coats into the figure that actually decides a painting budget, and it is the only basis on which two products can be compared at all.`,
      `From the product record, which carries the manufacturer's stated coverage per litre and the tin sizes it is sold in. Where a product has no stated coverage, the comparison reports it as incomparable rather than using a typical figure, because a comparison built on an assumed coverage is a comparison of two guesses.`,
      `No. It tells you what each costs per square metre on the basis you set, which is a fact about price and coverage. Which paint to buy also depends on the substrate, the exposure, the colour, the sheen, the smell, the drying time and how it will look in three years, and none of those are in a coverage figure.`,
      `Prices are shown as recorded, without tax, unless a configured rule applies to your market, in which case the basis is stated on the page. That matters when comparing a trade counter price that includes tax with a supplier quote that does not, which is a comparison that produces the wrong answer if the basis is not stated.`,
    ],
  },
  "finish-estimator": {
    description: `Two finishes can cover the same wall and cost very different amounts over their lives. This comparison sets them side by side on the same area: material, preparation and the interval at which each has to be redone, so a cheaper first coat that fails in five years is shown as the more expensive choice.

The comparison is deliberately narrow. It does not judge appearance, and it does not include labour unless you enter a rate, because labour rates vary by trade and by market in a way that would swamp the comparison. What it does well is make the arithmetic of a substitution visible before the specification is fixed, which is when the decision is still free.`,
    functions: [
      "Compares two finishes on the same measured area, with material quantities calculated for each.",
      "Includes the preparation each finish requires, since a finish applied to a bad substrate is wasted.",
      "Applies the service interval you enter, so the number of applications over a horizon is comparable.",
      "Calculates the cost over that horizon, so a short lived finish is not compared on one application.",
      "Accepts a labour rate per square metre where you want it in the comparison, and leaves it out otherwise.",
      "Reports a finish without a service interval as incomparable on a life basis.",
      "Keeps the two finishes on separate lines, so the difference is attributable.",
      "Shows the number of renewals over the horizon rather than only the total, so the disruption is visible as well as the cost.",
      "Handles a third option where a specification is being narrowed down, by running the comparison twice on the same area.",
    ],
    worked:
      "A hundred square metres of wall, once in a decorative coating at one price, against a cheaper coating at a shorter interval. Over fifteen years the cheaper one is renewed three times and the dearer one twice, and the preparation before each renewal is the same. The comparison adds three applications against two and the difference reverses. Neither finish changed; the horizon did, which is why the interval is an input.",
    advantages: [
      "Material and preparation are both counted, which a product comparison alone misses.",
      "Service intervals make a life cycle comparison possible on one screen.",
      "Labour can be included at your rate or left out, and the choice is visible.",
      "The two options stay on separate lines, so the difference is attributable.",
      "A missing interval is reported rather than assumed.",
    ],
    limits: [
      "It does not judge appearance, texture or suitability for a room.",
      "It does not include access equipment or scaffolding.",
      "It does not predict failure, only the interval you specify.",
      "It does not account for patching or damage between renewals.",
      "It does not include the cost of the building being out of use, the disruption of access or the risk a finish fails early.",
    ],
    answers: [
      `Two finishes on the same area, with their material, their preparation and their renewal interval, and the cost of each over the horizon you set. That is a narrower claim than it sounds: it compares what can be measured, and it says so. Where a finish has no stated interval, the comparison reports that it cannot be put on a life basis rather than choosing one.`,
      `Because the cheapest finish to buy is often not the cheapest to keep, and the difference shows up years after the decision was made by someone else. Comparing two options on one application hides that entirely. On a rental property or a commercial wall, the finishing cost over ten years can be several times the first application, and that is a design decision rather than a maintenance one.`,
      `Material and preparation are included, and labour is optional at a rate you enter. Leaving labour out is deliberate: rates vary so widely between trades and markets that including a default would make the comparison a comparison of labour assumptions. Where you have a rate you trust, enter it and the comparison carries it. That is usually enough to settle a substitution argument, because the labour rarely differs enough between two similar finishes to overturn a material difference that compounds over fifteen years.`,
      `No. It compares the options you give it and shows the arithmetic. Which finish suits a wall depends on the substrate, the exposure, the room's use, the appearance wanted and who is paying for maintenance. The tool's job is to make sure the cost consequence of that decision is visible rather than discovered later.`,
      `Yes. The comparison works on any measured area, so a single wall in a problematic corner can be assessed on its own, which is often where the decision actually needs making. The quantities are calculated from the area you enter, so a partial area is a partial comparison rather than a scaled down whole building.`,
    ],
  },
  "increte-flooring-calculator": {
    description: `Decorative concrete flooring is a topping, not a slab, and the distinction decides the whole estimate. The topping is a thin, highly specified layer over a substrate that has already been built and cured, and it is measured separately because it is a different material applied for a different reason.

The takeoff measures the topping by area and thickness, counts the border or pattern work by length, and adds the sealing and the preparation the finish requires. The structural slab is not included, since it has its own design and its own takeoff. Where the substrate condition is unknown, the tool asks rather than assuming a prepared surface, because a topping over a bad substrate fails at the bond and takes the finish with it.`,
    functions: [
      "Calculates topping volume from the area and the thickness you specify.",
      "Adds the pigment, aggregate or additive at the rate the product states, per unit of topping.",
      "Counts border and pattern work by length, with the additional material and labour the detail implies.",
      "Calculates sealer from the area and its stated coverage, per coat.",
      "Adds surface preparation products where you specify them, at their coverage.",
      "Reports an area without a thickness as incomplete rather than assuming a topping depth.",
      "Keeps the topping separate from the slab, so a slab estimate is not double counted.",
      "Counts saw cut joints and patterns by length, because each metre of joint is a metre that has to be filled and finished.",
      "Reports the yield the product states per bag, so the bag count matches what a supplier will deliver.",
    ],
    worked:
      "A hundred and twenty square metres of topping at ten millimetres is one point two cubic metres of material, which is a bagged product at its stated yield rather than a site mix. A border of forty metres at three hundred wide is a further twelve square metres of a contrasting mix. Sealer at two coats over the whole area, at its stated coverage, is the third line. The slab underneath is not in this estimate at all, which is why the two must be measured separately rather than one derived from the other.",
    advantages: [
      "Topping is measured by area and thickness, which is how it is bought and laid.",
      "Borders and patterns are counted by length, which is where estimates go light.",
      "Sealer and preparation are priced as lines, at their own coverage.",
      "The slab stays separate, so nothing is double counted.",
      "A missing thickness is reported rather than assumed.",
    ],
    limits: [
      "It does not assess the substrate or its preparation needs.",
      "It does not design the topping mix or its reinforcement.",
      "It does not include the structural slab or its finish.",
      "It does not include grinding, polishing or burnishing labour.",
      "It does not guarantee colour or finish consistency, which depends on batches, timing and the applicator.",
    ],
    answers: [
      `The topping by area and thickness, the pigment or aggregate it carries, the border and pattern work by length, the sealer by area and coat, and the preparation products you specify. It does not measure the slab beneath, which has its own takeoff. Keeping them apart matters because a decorative topping is a separate trade, a separate order and a separate failure mode.`,
      `Because a topping is a thin layer of a specified material over a substrate, and a slab is a structural element of a different mix with a different design. Their quantities barely relate: ten millimetres of topping over a hundred square metres is one cubic metre, while the slab under it might be fifteen. Measuring one from the other is how a decorative floor estimate ends up either wildly over or missing the finish entirely.`,
      `By length, with its width, and as its own material line. A border is usually a contrasting mix, sometimes a different aggregate, and it needs its own quantity rather than being absorbed into the main area. Saw cut patterns are lengths as well, and each metre of cut is a metre of joint that has to be filled and finished.`,
      `The substrate is not included, and the preparation of it is only included where you enter it. A topping needs a sound, clean, correctly prepared substrate, and the preparation is a real cost that varies enormously with what is there. The tool asks for the preparation you specify rather than assuming a clean new slab, because the assumption is what turns a quote into a loss. A substrate that has been down for years will need grinding, filling or a primer, and each of those has a coverage and a cost that belongs in the order.`,
      `Yes, as a percentage you set. Decorative work produces waste for a reason ordinary flooring does not: colour consistency comes from the same batch, and a border that does not meet cleanly is a return visit. The percentage is a line rather than a hidden loading, so its size can be seen and agreed before the job starts.`,
    ],
  },
  "wall-finish-estimator": {
    description: `A wall finish is a thickness applied to an area, and the estimator measures both. Plaster, render, screed and the bagged alternatives all have a stated yield per millimetre, so the area alone does not tell you what to order until the thickness is fixed.

The estimator separates the surfaces by type and treats ceilings as their own surface, since a ceiling is a different mix, a different technique and often a different trade. Openings are deducted, beads and reveals are counted, and the preparation the finish requires is priced where you specify it. Where a thickness is left blank, the tool reports it rather than applying a standard coat.`,
    functions: [
      "Calculates finish volume from the wall area and the thickness you enter, per surface type.",
      "Deducts openings by dimension, so doors and windows come out of the area rather than being ignored.",
      "Treats ceilings as their own surface, with their own quantity and mix.",
      "Counts corner beads and reveals by length, from the details you list.",
      "Calculates the sand and cement, or the bags of a bagged product, at the yield stated for the thickness.",
      "Adds preparation products at their coverage where you specify them.",
      "Reports a surface without a thickness as incomplete rather than assuming one.",
      "Keeps internal and external surfaces apart, since render and plaster take different mixes and different thicknesses.",
      "Shows the volume each surface produces, so a specification change can be traced to material before it is ordered.",
    ],
    worked:
      "A room with forty two square metres of wall and fourteen of ceiling, walls at twelve millimetres and the ceiling at three, gives half a cubic metre of wall mortar and a small quantity of a bagged ceiling finish. Deduct a door and two windows from the wall area before the volume is calculated, and add twelve metres of bead at the external corner and the reveals. The two surfaces produced two different orders at two different yields, which is the reason they are measured apart.",
    advantages: [
      "Thickness is an input, so a two coat specification shows its material cost.",
      "Ceilings are measured as their own surface with their own mix.",
      "Openings are deducted by dimension before the volume is calculated.",
      "Beads and reveals follow the details rather than a rate per square metre.",
      "A missing thickness is reported instead of assumed.",
    ],
    limits: [
      "It does not assess the substrate or its suction and key.",
      "It does not design the mix or specify admixtures.",
      "It does not include floating, dubbing out or patch repairs.",
      "It does not include scaffolding or access.",
      "It does not include decoration over the finish, or the cost of protecting the finish once it is applied.",
    ],
    answers: [
      `Plaster and render by area and thickness, ceilings on their own line, beads and reveals by length, and the preparation products you specify. Screed and the bagged alternatives are handled at their own stated yields. What it does not do is decide which finish a wall needs, because that follows from the substrate, the room and the standard required.`,
      `Because material follows volume, and volume is area multiplied by thickness. Doubling the thickness doubles the sand and cement on the same wall, and the difference between a ten and an eighteen millimetre render is a lorry load rather than a rounding. Thickness also decides whether a single coat will do, which changes the labour as well as the material, and it is the first thing a specification changes when a standard is raised.`,
      `Yes, as their own surface with their own finish. A ceiling is usually a different mix from a wall, applied by a different technique, and it may be a different trade. Measuring it separately means its quantity can be ordered and priced on its own, and it also means a change to the ceiling specification does not disturb the walls.`,
      `Yes, by dimension, before the volume is calculated. A door or a window is an area removed from the wall, and the deduction happens at the area stage so the thickness is applied to what is actually covered. What is not deducted is the bead or reveal around the opening, which is counted as a length instead, since that is the detail the opening creates.`,
      `Corner beads and reveals are counted by length from the details you list, and priced as their own line. They are the part of a plastering estimate most often left out, because they are small items that follow from the geometry rather than from the area. A room with eight external corners needs eight times the bead of a room with one, and the area does not show it.`,
    ],
  },
};
