/**
 * Front elevation geometry for a TV console or media unit.
 *
 * This module exists so every console drawing on the site is derived from the
 * same numbers the estimator uses, rather than a photograph of somebody else's
 * furniture. Nothing here draws: it resolves the carcass, dividers, shelves,
 * drawer stack and overlay doors into millimetre rectangles, and the renderer
 * scales them into an SVG viewBox. Because the rectangles are in millimetres,
 * the drawing is to scale: a 2400 mm unit is twice as wide as a 1200 mm one.
 *
 * The rules are deliberately plain and stated so they can be checked:
 *
 * - The carcass is four panels of the entered thickness framing the interior.
 * - Dividers split the interior into `dividers + 1` bays of equal width.
 * - The drawer bank sits in the first bay, stacked up from the base, and is
 *   capped by how many fronts of the entered height actually fit.
 * - Shelves are spread evenly through each bay that is not the drawer bank.
 * - Overlay doors cover one bay each, from the right hand side, inset by the
 *   reveal on every edge.
 */

export interface ConsoleLayoutInput {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  shelves: number;
  dividers: number;
  drawers: number;
  drawerFrontHeightMm: number;
  doors: number;
  revealMm: number;
}

export type ElevationPartKind =
  "carcass" | "divider" | "shelf" | "drawer" | "door";

export interface ElevationPart {
  kind: ElevationPartKind;
  /** Millimetres from the left edge of the unit. */
  xMm: number;
  /** Millimetres from the top edge of the unit. */
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface ConsoleElevation {
  /** Outline of the unit, in millimetres. */
  widthMm: number;
  heightMm: number;
  /** Panel thickness actually used, after clamping to the body. */
  thicknessMm: number;
  bays: number;
  bayWidthMm: number;
  shelfCount: number;
  drawerCount: number;
  doorCount: number;
  parts: ElevationPart[];
}

const MAX_BAYS = 13;
const MAX_STACK = 40;
/** The shortest drawer front that can still be drawn and read. */
const MIN_DRAWER_FRONT_MM = 60;

const clampInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
};

const positive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Resolve a configuration into drawable parts. Never returns NaN: dimensions
 * that cannot describe a carcass fall back to the smallest one that can, so a
 * half-typed form still renders a truthful outline instead of a broken shape.
 */
export function buildConsoleElevation(
  input: ConsoleLayoutInput,
): ConsoleElevation {
  const widthMm = positive(input.widthMm, 1200);
  const heightMm = positive(input.heightMm, 400);
  // A board cannot be thicker than a third of the smaller body dimension.
  const thicknessMm = Math.min(
    positive(input.thicknessMm, 18),
    Math.max(1, Math.min(widthMm, heightMm) / 3),
  );

  const innerWidthMm = Math.max(widthMm - 2 * thicknessMm, 1);
  const innerHeightMm = Math.max(heightMm - 2 * thicknessMm, 1);

  // Dividers are boards too. A body that is mostly divider thickness cannot
  // hold thirteen bays, so the count is capped by the interior it must leave.
  const dividerWidthLimit = Math.max(
    0,
    Math.min(MAX_BAYS - 1, Math.floor(innerWidthMm / (thicknessMm * 2))),
  );
  const dividers = clampInt(input.dividers, 0, dividerWidthLimit);
  const bays = dividers + 1;
  // Dividers stand inside the interior, so they eat into the bay widths.
  const bayWidthMm = Math.max(
    (innerWidthMm - dividers * thicknessMm) / bays,
    1,
  );

  const revealMm = Math.min(
    Math.max(Number.isFinite(input.revealMm) ? input.revealMm : 2, 0),
    Math.min(bayWidthMm, innerHeightMm) / 4,
  );

  const parts: ElevationPart[] = [
    { kind: "carcass", xMm: 0, yMm: 0, widthMm, heightMm: thicknessMm },
    {
      kind: "carcass",
      xMm: 0,
      yMm: heightMm - thicknessMm,
      widthMm,
      heightMm: thicknessMm,
    },
    { kind: "carcass", xMm: 0, yMm: 0, widthMm: thicknessMm, heightMm },
    {
      kind: "carcass",
      xMm: widthMm - thicknessMm,
      yMm: 0,
      widthMm: thicknessMm,
      heightMm,
    },
  ];

  // Dividers: vertical panels between the top and bottom rails.
  for (let i = 0; i < dividers; i += 1) {
    const xMm = thicknessMm + bayWidthMm * (i + 1) + thicknessMm * i;
    parts.push({
      kind: "divider",
      xMm,
      yMm: thicknessMm,
      widthMm: thicknessMm,
      heightMm: innerHeightMm,
    });
  }

  // Drawer bank: the first bay, stacked from the base.
  const requestedDrawers = clampInt(input.drawers, 0, MAX_STACK);
  const frontHeightMm = Math.max(
    positive(input.drawerFrontHeightMm, 180),
    MIN_DRAWER_FRONT_MM,
  );
  const drawerCapacity = Math.floor(innerHeightMm / frontHeightMm);
  const drawerCount = Math.min(requestedDrawers, Math.max(drawerCapacity, 0));
  const bankHeightMm = drawerCount * frontHeightMm;

  for (let i = 0; i < drawerCount; i += 1) {
    parts.push({
      kind: "drawer",
      xMm: thicknessMm,
      yMm: heightMm - thicknessMm - frontHeightMm * (i + 1),
      widthMm: bayWidthMm,
      heightMm: frontHeightMm,
    });
  }

  // Shelves: evenly spaced in the bays the drawer bank does not occupy.
  const requestedShelves = clampInt(input.shelves, 0, 12);
  const shelfBays = drawerCount > 0 ? bays - 1 : bays;
  const usableHeightMm = Math.max(innerHeightMm - bankHeightMm, 0);
  let shelfCount = 0;
  if (requestedShelves > 0 && shelfBays > 0 && usableHeightMm > 0) {
    const topMm =
      drawerCount > 0 ? heightMm - thicknessMm - bankHeightMm : thicknessMm;
    for (let bay = drawerCount > 0 ? 1 : 0; bay < bays; bay += 1) {
      const xMm = thicknessMm + bayWidthMm * bay + thicknessMm * bay;
      for (let s = 1; s <= requestedShelves; s += 1) {
        const yMm = topMm - (usableHeightMm * s) / (requestedShelves + 1);
        parts.push({
          kind: "shelf",
          xMm,
          yMm,
          widthMm: bayWidthMm,
          heightMm: thicknessMm,
        });
        shelfCount += 1;
      }
    }
  }

  // Overlay doors: one bay each, taken from the right hand side.
  const requestedDoors = clampInt(input.doors, 0, MAX_STACK);
  const doorCount = Math.min(requestedDoors, bays);
  for (let i = 0; i < doorCount; i += 1) {
    const bay = bays - 1 - i;
    const xMm = thicknessMm + bayWidthMm * bay + thicknessMm * bay;
    parts.push({
      kind: "door",
      xMm: xMm + revealMm / 2,
      yMm: revealMm / 2,
      widthMm: Math.max(bayWidthMm - revealMm, 1),
      heightMm: Math.max(heightMm - revealMm, 1),
    });
  }

  return {
    widthMm,
    heightMm,
    thicknessMm,
    bays,
    bayWidthMm,
    shelfCount,
    drawerCount,
    doorCount,
    parts,
  };
}
