/**
 * Site sequence text for the animated build diagrams.
 *
 * Quantities are passed in from the engine result, so a step can only show a
 * number the estimate has actually produced. Nothing here calculates anything.
 */
import type { BuildStep } from "@/components/tools/AnimatedBuildSequence";

export type ConcreteElementType = "slab" | "beam" | "column" | "footing";

export interface ConcreteSequenceArgs {
  elementType: ConcreteElementType;
  volumeM3: number;
  volumeWithWasteM3: number;
  cementBags: number;
  sandM3: number;
  aggregateM3: number;
  rebarKg: number | null;
  lengthM: number;
  widthM: number;
  depthM: number;
}

const fmt = (n: number, dp = 2) =>
  Number.isFinite(n) ? n.toFixed(dp).replace(/\.00$/, "") : "-";

export function concreteElementSequence(
  args: ConcreteSequenceArgs,
): BuildStep[] {
  const mix = `${fmt(args.volumeWithWasteM3, 3)} m³ of concrete (${fmt(args.cementBags, 0)} bags cement, ${fmt(args.sandM3, 2)} m³ sand, ${fmt(args.aggregateM3, 2)} m³ aggregate), including waste`;
  const steel =
    args.rebarKg === null
      ? "Rebar is not calculated for this element: no engineer's schedule was entered, so no bar length is claimed."
      : `${fmt(args.rebarKg, 1)} kg of reinforcement, from the schedule entered`;

  if (args.elementType === "slab") {
    return [
      {
        id: "set-out",
        title: "Set out and level the area",
        detail: `Mark the ${fmt(args.lengthM)} x ${fmt(args.widthM)} m slab outline and set the finished level from the DPC of the surrounding walls.`,
        check: "Diagonals equal and the level transferred from a single datum.",
        quantity: `${fmt(args.lengthM * args.widthM, 2)} m²`,
      },
      {
        id: "subgrade",
        title: "Excavate and compact the subgrade",
        detail:
          "Strip topsoil, cut to formation level, then compact in layers until the surface is firm and uniform.",
        check: "No soft spots, no ponding water after rain.",
      },
      {
        id: "blinding",
        title: "Blind the surface",
        detail:
          "Lay and compact a thin blinding layer so the slab sits on a clean, level bed and the membrane is not punctured.",
        check: "Level within 10 mm, surface free of stones.",
      },
      {
        id: "rebar",
        title: "Place the mesh or bars",
        detail: `${steel}. Set it on chairs so it finishes inside the slab, not on the ground.`,
        check: "Cover maintained, laps tied, chairs not walked out of place.",
      },
      {
        id: "concrete",
        title: "Place and finish the concrete",
        detail: `Place ${mix} in one continuous run, screed to level, then trowel the finish the floor needs.`,
        check: "No cold joints, edges formed, curing started before it dries.",
      },
      {
        id: "cure",
        title: "Cure before loading",
        detail:
          "Keep it damp or covered for at least seven days, and keep site traffic off until it has taken load.",
        check: "No cracking at re-entrant corners or along service trenches.",
      },
    ];
  }

  if (args.elementType === "footing") {
    return [
      {
        id: "excavate",
        title: "Excavate the footing",
        detail: `Excavate to the founding depth for a ${fmt(args.lengthM)} x ${fmt(args.widthM)} m footing, leaving working space on all sides.`,
        check: "Firm stratum reached at the base, sides trimmed vertical.",
      },
      {
        id: "blinding",
        title: "Blind and set out the steel",
        detail:
          "Blind the base, then mark the footing centre lines and the column or wall position on it.",
        check: "Centre lines square to each other and matched to the grid.",
      },
      {
        id: "rebar",
        title: "Fix the bottom mat",
        detail: `${steel}. Keep the bars off the blinding and set the starter bars while the steel is open.`,
        check: "Cover on all faces, starters plumb and at the right spacing.",
      },
      {
        id: "concrete",
        title: "Pour the footing",
        detail: `Pour ${mix}, compact it properly around the starters, and finish the top level.`,
        check: "No honeycombing at the starter bars.",
      },
      {
        id: "column",
        title: "Start the column or wall",
        detail:
          "Set the column or wall starter cage out of the footing, with the laps long enough to reach the next pour.",
        check: "Column position within tolerance, vertical on both axes.",
      },
    ];
  }

  if (args.elementType === "column") {
    return [
      {
        id: "base",
        title: "Prepare the base",
        detail:
          "Clear the footing top, roughen it for bond, and set out the column faces from the grid.",
        check: "Column centre matches the grid in both directions.",
      },
      {
        id: "rebar",
        title: "Fix the cage",
        detail: `${steel}. Tie main bars to the starters, then fit the links at the spacing on the drawing.`,
        check: "Links tight, cover blocks on every face, laps staggered.",
      },
      {
        id: "shutter",
        title: "Erect the shutters",
        detail:
          "Set and prop the formwork plumb, with a clean-out opening at the base of the lift.",
        check:
          "Plumb both ways, props secure, joints tight enough not to grout away.",
      },
      {
        id: "concrete",
        title: "Pour the lift",
        detail: `Place ${mix} in lifts shallow enough to compact, and vibrate each layer into the one below.`,
        check: "No voids at the base, shutters not bulging.",
      },
      {
        id: "cure",
        title: "Cure and strike",
        detail:
          "Leave the shutters on for the curing period, then strike carefully and make good the surface.",
        check:
          "No blowholes over the reinforcement, no honeycomb at the lift joint.",
      },
    ];
  }

  return [
    {
      id: "supports",
      title: "Prepare the supports",
      detail: `Set the bearings for a ${fmt(args.lengthM)} m span so the beam sits at the right level at each end.`,
      check: "Bearing levels match, no packing loose under the ends.",
    },
    {
      id: "rebar",
      title: "Fix the reinforcement",
      detail: `${steel}. Main bars follow the drawing, links wrap the full section.`,
      check: "Cover maintained top and bottom, laps in the low-stress zone.",
    },
    {
      id: "shutter",
      title: "Erect soffit and sides",
      detail:
        "Prop the soffit to line and level, then fix the sides. Props stay until the concrete has taken its own weight.",
      check: "Camber and level correct, props on firm bearing.",
    },
    {
      id: "concrete",
      title: "Pour the beam",
      detail: `Place ${mix}, working along the span so the concrete does not heap in one place.`,
      check: "Fully compacted under the links, no segregation.",
    },
    {
      id: "cure",
      title: "Cure, then strike and prop",
      detail:
        "Cure for at least seven days, strike the sides earlier than the soffit, and leave props under long spans as specified.",
      check: "No deflection visible at midspan after striking.",
    },
  ];
}

/** Slab strata for the layer drawing, bottom to top. */
export const SLAB_LAYERS = [
  { id: "subgrade", label: "Compacted subgrade", thickness: "" },
  { id: "blinding", label: "Blinding", thickness: "" },
  { id: "concrete", label: "Reinforced slab", thickness: "" },
];

/** Roof framing: wall plate, trusses, purlins, bracing, sheets. */
export const ROOF_TRUSS_SEQUENCE: BuildStep[] = [
  {
    id: "wall-plate",
    title: "Fix the wall plate",
    detail:
      "Bed and strap the wall plate level around the top of the walls. Every truss foot bears on it, so it carries the whole roof.",
    check: "Level within 10 mm all round, strapped to the blockwork.",
  },
  {
    id: "trusses",
    title: "Erect the trusses",
    detail:
      "Stand each truss on the plate at the spacing on the drawing, prop and plumb it, then brace it before the next one goes up.",
    check: "Spacing even, trusses plumb, temporary bracing in place.",
  },
  {
    id: "purlins",
    title: "Fix the purlins",
    detail:
      "Run purlins across the trusses at the gauge the sheeting needs, so a sheet always lands on a purlin at both edges.",
    check:
      "Gauge consistent to the ridge, purlins straight and fixed at every truss.",
  },
  {
    id: "bracing",
    title: "Brace the roof plane",
    detail:
      "Fit diagonal and longitudinal bracing so the roof acts as one stiff plane under wind. This is what keeps the trusses upright.",
    check:
      "Both slopes braced, fixings through the truss, not just the purlin.",
  },
  {
    id: "sheet",
    title: "Sheet and finish",
    detail:
      "Lay sheets from the leeward eave up to the ridge with the specified side lap, then fit ridge capping, flashing and gutters.",
    check:
      "Laps consistent, fixings on the crest or pan as specified, ridge sealed.",
  },
];

/** Paving strata, bottom to top, used by the paving diagram. */
export const PAVING_LAYERS = [
  { id: "subgrade", label: "Compacted subgrade", thickness: "150 mm" },
  { id: "sub-base", label: "Sub-base", thickness: "100 mm" },
  { id: "bedding", label: "Bedding sand", thickness: "30-50 mm" },
  { id: "pavers", label: "Pavers", thickness: "60-80 mm" },
  { id: "jointing", label: "Jointing sand", thickness: "brushed in" },
];

export const PAVING_SEQUENCE: BuildStep[] = [
  {
    id: "subgrade",
    title: "Strip and compact the subgrade",
    detail:
      "Remove topsoil and soft spots, then compact the formation until it is firm and falls away from the building.",
    check: "No soft spots and water runs off, not into, the paving.",
  },
  {
    id: "sub-base",
    title: "Lay and compact the sub-base",
    detail:
      "Spread the sub-base in layers no deeper than 100 mm and compact each layer before the next goes down.",
    check: "Level within 10 mm over a 3 m straight edge.",
  },
  {
    id: "bedding",
    title: "Screed the bedding sand",
    detail:
      "Lay a screeded bedding layer at a consistent thickness so every paver beds down evenly rather than rocking.",
    check: "Bedding never used to correct a bad sub-base.",
  },
  {
    id: "pavers",
    title: "Lay the pavers",
    detail:
      "Lay from a fixed string line and work off the laid course, keeping joints even and cutting against edges.",
    check: "Joints even, bond followed, cuts at edges only.",
  },
  {
    id: "jointing",
    title: "Brush in jointing sand and compact",
    detail:
      "Brush dry jointing sand into the joints, then plate compact so the sand is drawn in and the pavers interlock.",
    check: "Joints full, surface flush, no lipping between pavers.",
  },
];

export const MASONRY_COURSE_SEQUENCE: BuildStep[] = [
  {
    id: "set-out",
    title: "Set out the wall and the first course",
    detail:
      "Mark the wall line, set the corners to a square, then lay the first course dry to check the bond before any mortar is mixed.",
    check: "Diagonals equal and the bond closes without a cut at the corner.",
  },
  {
    id: "foundation",
    title: "Build off a level foundation",
    detail:
      "The first course beds onto a foundation that is level and cured, because every course above it inherits any error in that line.",
    check: "Foundation level within 10 mm over the wall length.",
  },
  {
    id: "mortar",
    title: "Bed each course on a full mortar joint",
    detail:
      "Spread a full bed joint, never a furrowed or spot bed, so the load is carried evenly along the wall rather than at points.",
    check: "Joint thickness consistent and fully filled.",
  },
  {
    id: "courses",
    title: "Build up course by course, staggered",
    detail:
      "Run each course staggered against the one below so vertical joints never line up, which is what gives a block wall its strength.",
    check: "No continuous vertical joint over the wall height.",
  },
  {
    id: "openings",
    title: "Form openings and add reinforcement",
    detail:
      "Hold window and door openings to width with a level, and place bed-joint reinforcement or lintels where the opening weakens the wall.",
    check: "Openings plumb and lintels bearing at both ends.",
  },
  {
    id: "cure",
    title: "Protect and cure the wall",
    detail:
      "Keep the wall damp and shaded for at least three days and keep scaffolding loads off the green mortar.",
    check: "No cracking along bed joints or at corners.",
  },
];

export const REBAR_CAGE_SEQUENCE: BuildStep[] = [
  {
    id: "schedule",
    title: "Read the bar schedule",
    detail:
      "Every bar size, length and shape comes from the engineer's schedule. This tool reports weight only when a schedule was entered.",
    check: "Bar marks and lengths match the drawing revision on site.",
  },
  {
    id: "bend",
    title: "Cut and bend to the schedule",
    detail:
      "Cut and bend main bars and links to the stated dimensions, keeping the bend diameter the code requires for that bar size.",
    check: "Bends not cracked and hooks the correct length.",
  },
  {
    id: "verticals",
    title: "Place the main bars",
    detail:
      "Set the main bars at the correct spacing and lap them as scheduled, tying them so they hold position while links are added.",
    check: "Spacing even and laps staggered, not all at one level.",
  },
  {
    id: "links",
    title: "Tie the links",
    detail:
      "Space links at the scheduled pitch, closer together near supports where shear is highest, with the hooks alternating.",
    check: "Pitch as scheduled and every link tied, not loose.",
  },
  {
    id: "cover",
    title: "Set cover with spacers",
    detail:
      "Fix spacers so the steel sits inside the concrete with the cover the exposure condition needs, not resting on the formwork.",
    check: "Cover gauged at several points along the member.",
  },
  {
    id: "inspect",
    title: "Inspect before the pour",
    detail:
      "Check bar sizes, counts, spacing, laps and cover against the schedule and record what was checked before concrete goes in.",
    check: "Signed off before the pour, with no bars cut after inspection.",
  },
];

/** Slab build-up, shared by the takeoff diagram and its HowTo schema. */
export const SLAB_BUILD_SEQUENCE: BuildStep[] = [
  {
    id: "set-out",
    title: "Set out and level the area",
    detail:
      "Mark the slab outline and transfer the finished floor level from a single datum before any excavation starts.",
    check: "Diagonals equal and the level taken from one datum.",
  },
  {
    id: "subgrade",
    title: "Excavate and compact the subgrade",
    detail:
      "Strip topsoil, cut to formation level, then compact in layers until the surface is firm and uniform.",
    check: "No soft spots and no ponding after rain.",
  },
  {
    id: "blinding",
    title: "Blind the surface",
    detail:
      "Lay and compact a thin blinding layer so the slab sits on a clean, level bed and any membrane is not punctured.",
    check: "Level within 10 mm and free of loose stones.",
  },
  {
    id: "rebar",
    title: "Place the mesh or bars",
    detail:
      "Set the reinforcement on chairs so it finishes inside the slab, with laps tied and cover maintained.",
    check: "Cover maintained and chairs not walked out of place.",
  },
  {
    id: "concrete",
    title: "Place and finish the concrete",
    detail:
      "Place the mixed concrete in one continuous run, screed to level, then trowel the finish the floor needs.",
    check: "No cold joints and curing started before it dries.",
  },
  {
    id: "cure",
    title: "Cure before loading",
    detail:
      "Keep the slab damp or covered for at least seven days and keep site traffic off until it has taken load.",
    check: "No cracking at re-entrant corners or over service trenches.",
  },
];
