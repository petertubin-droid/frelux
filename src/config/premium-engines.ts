/**
 * Engines that sit behind a subscription.
 *
 * Structural and heavy construction tools answer questions a client pays for:
 * how big a footing, how much rebar, what the steel weighs, what the ground
 * movement costs. They are also the tools a professional runs repeatedly, which
 * is why they belong in a paid plan rather than the free set.
 *
 * Free and signed-out visitors are not shut out. They get the inputs, the
 * calculation steps and the first few result lines, enough to see the engine is
 * real and to check it against their own reading, then a locked panel that names
 * exactly what the plan unlocks. The math never changes with the plan: only how
 * much of the answer is shown.
 */

export type PremiumEngineTier = "structural" | "heavy";

export interface PremiumEngine {
  /** Route of the tool page, which is also its identity in this registry. */
  route: string;
  name: string;
  tier: PremiumEngineTier;
  /** Result lines a free visitor sees before the lock. */
  previewLines: number;
  /** What the subscription adds, written for a contractor not a marketer. */
  unlocks: string[];
}

export const PREMIUM_ENGINES: PremiumEngine[] = [
  {
    route: "/structural-calculator",
    name: "Structural and concrete design",
    tier: "structural",
    previewLines: 2,
    unlocks: [
      "The full design sheet with every check and its utilisation",
      "Concrete, cement, sand, aggregate and rebar quantities",
      "Printing or saving the design sheet as a PDF",
    ],
  },
  {
    route: "/steel-beam-calculator",
    name: "Steel beam sizing",
    tier: "structural",
    previewLines: 2,
    unlocks: [
      "The full section schedule and member weights",
      "Span checks above the free threshold",
      "Printing the beam schedule",
    ],
  },
  {
    route: "/retaining-wall-calculator",
    name: "Retaining wall design",
    tier: "structural",
    previewLines: 2,
    unlocks: [
      "Stem, footing and blockwork quantities for the whole wall",
      "Weep holes, drainage and backfill lines",
      "Printing the wall takeoff",
    ],
  },
  {
    route: "/foundation-calculator",
    name: "Foundation sizing",
    tier: "structural",
    previewLines: 2,
    unlocks: [
      "Footing and blockwork quantities beyond the preview",
      "The foundation schedule for the whole building",
      "Printing or saving the schedule",
    ],
  },
  {
    route: "/concrete-takeoff-calculator",
    name: "Concrete takeoff",
    tier: "heavy",
    previewLines: 3,
    unlocks: [
      "Every element in the takeoff, not the first few",
      "Cement bags, sand and aggregate for the full pour",
      "Printing the takeoff for the site",
    ],
  },
  {
    route: "/earthworks-cut-fill",
    name: "Earthworks cut and fill",
    tier: "heavy",
    previewLines: 2,
    unlocks: [
      "Cut and fill volumes for the whole site",
      "Bulking, compaction and haulage lines",
      "Printing the earthworks summary",
    ],
  },
  {
    route: "/reinforcement",
    name: "Reinforcement and bar weight",
    tier: "heavy",
    previewLines: 2,
    unlocks: [
      "Every bar diameter in the schedule with its weight",
      "Binding wire and cutting allowance",
      "Printing the bar bending summary",
    ],
  },
  {
    route: "/roof-framing-calculator",
    name: "Roof framing",
    tier: "heavy",
    previewLines: 2,
    unlocks: [
      "Member lengths and board feet for the whole roof",
      "Purlin and rafter schedules beyond the preview",
      "Printing the framing takeoff",
    ],
  },
  {
    route: "/build-to-roof-estimator",
    name: "Build to roof",
    tier: "heavy",
    previewLines: 3,
    unlocks: [
      "Foundation, blockwork and roof quantities together",
      "Sheet and truss counts for the roof area",
      "Printing the stage estimate",
    ],
  },
  {
    route: "/temporary-works-calculator",
    name: "Formwork and temporary works",
    tier: "heavy",
    previewLines: 2,
    unlocks: [
      "Contact area, striking time and reuse cycles",
      "The full formwork schedule by element",
      "Printing the schedule",
    ],
  },
];

const BY_ROUTE = new Map(PREMIUM_ENGINES.map((e) => [e.route, e]));

export function premiumEngineFor(route: string): PremiumEngine | null {
  const clean = route.split("?")[0].replace(/\/+$/, "") || "/";
  return BY_ROUTE.get(clean) ?? null;
}

export function isPremiumEngineRoute(route: string): boolean {
  return premiumEngineFor(route) !== null;
}
