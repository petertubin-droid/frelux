/**
 * Room context for a TV console elevation: the screen above it, the panelled
 * wall behind, and how the unit meets the floor.
 *
 * The audit behind this module (2026-11-09): every preset drew as bare shelving
 * because the elevation showed the carcass and nothing else. A "marble media
 * wall" and a "fluted panelled wall" produced the same picture, so the drawing
 * could not tell the customer what they were buying. The fix is not decoration:
 * the screen, the panelling and the mounting are all part of the quote, so they
 * are derived here from numbers and drawn to the same millimetre scale as the
 * carcass.
 *
 * Rules, stated so they can be checked:
 *
 * - A screen is sized from its diagonal at the broadcast 16:9 ratio:
 *   width = diagonal × 0.8716, height = diagonal × 0.4903.
 * - The screen is centred on the unit and its bottom edge sits
 *   SCREEN_CLEARANCE_MM above the console top (a soundbar or shelf gap).
 * - The panelled band starts at the console top and rises the entered height;
 *   it is as wide as the unit unless a wall width is given, in which case it is
 *   centred on the unit.
 * - Fluting is a run of vertical members at a fixed pitch; slats use a wider
 *   pitch and a wider member. Stone and marble panels carry vein lines instead.
 * - Floating units show a shadow gap, plinths are recessed, legs are set in
 *   from each end. The floor line is the bottom of whichever applies.
 */

export type WallTreatment = "none" | "fluted" | "slatted" | "marble" | "stone";
export type ConsoleMounting = "floating" | "plinth" | "legs";

export interface MediaContextInput {
  /** Console width, mm. The screen and wall band are centred on this. */
  widthMm: number;
  /** Console height, mm. The wall band and screen are placed from its top. */
  heightMm: number;
  /** Screen diagonal in inches. Omit or 0 for no screen. */
  tvInches?: number;
  wallTreatment?: WallTreatment;
  /** Height of the panelled band above the console, mm. 0 or absent = none. */
  wallPanelHeightMm?: number;
  /** Optional wall width when the panelling runs wider than the unit. */
  wallPanelWidthMm?: number;
  mounting?: ConsoleMounting;
  /** Length of LED profile specified, in metres. Drives the drawn LED line. */
  ledProfileMetres?: number;
}

export interface Rect {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface VerticalMember {
  xMm: number;
  widthMm: number;
}

export interface MediaContext {
  /** Screen rectangle, or null when no screen is drawn. */
  screen: Rect | null;
  /** Panelled band rectangle, or null. */
  wall: Rect | null;
  /** Vertical flutes or battens inside the band. */
  members: VerticalMember[];
  /** Diagonal vein lines for a stone or marble face, as [x1,y1,x2,y2]. */
  veins: Array<[number, number, number, number]>;
  /** Height of the recessed plinth under the unit, mm (0 when not used). */
  plinthHeightMm: number;
  /** Leg rectangles, empty unless the unit stands on legs. */
  legs: Rect[];
  /** Shadow gap under a floating unit, mm (0 when not used). */
  shadowGapMm: number;
  /** LED line along the underside of the band, or null. */
  led: { yMm: number; widthMm: number } | null;
  /** Total drawn height above the floor, mm: floor line to top of screen/band. */
  totalHeightMm: number;
  /** Width actually drawn, mm: the widest of unit, band and screen. */
  totalWidthMm: number;
}

/** Gap between the console top and the bottom of the screen, mm. */
export const SCREEN_CLEARANCE_MM = 150;
const FLUTE_PITCH_MM = 90;
const FLUTE_MEMBER_MM = 45;
const SLAT_PITCH_MM = 150;
const SLAT_MEMBER_MM = 60;
const SHADOW_GAP_MM = 50;
const PLINTH_HEIGHT_MM = 60;
const LEG_HEIGHT_MM = 120;
const LEG_WIDTH_MM = 40;

const finite = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** Screen size in mm from a diagonal in inches, at 16:9. */
export function screenFromDiagonal(tvInches: number): {
  widthMm: number;
  heightMm: number;
} | null {
  const inches = finite(tvInches);
  if (inches <= 0) return null;
  return {
    widthMm: inches * 25.4 * 0.8716,
    heightMm: inches * 25.4 * 0.4903,
  };
}

export function buildMediaContext(input: MediaContextInput): MediaContext {
  const widthMm = Math.max(finite(input.widthMm), 0);
  const heightMm = Math.max(finite(input.heightMm), 0);
  const mounting: ConsoleMounting = input.mounting ?? "floating";
  const treatment: WallTreatment = input.wallTreatment ?? "none";

  const belowMm =
    mounting === "plinth"
      ? PLINTH_HEIGHT_MM
      : mounting === "legs"
        ? LEG_HEIGHT_MM
        : SHADOW_GAP_MM;

  const screenSize = screenFromDiagonal(input.tvInches ?? 0);
  const screen: Rect | null = screenSize
    ? {
        xMm: (widthMm - screenSize.widthMm) / 2,
        yMm: -SCREEN_CLEARANCE_MM - screenSize.heightMm,
        widthMm: screenSize.widthMm,
        heightMm: screenSize.heightMm,
      }
    : null;

  const bandHeightMm = Math.max(finite(input.wallPanelHeightMm), 0);
  const bandWidthMm = Math.max(finite(input.wallPanelWidthMm), widthMm);
  const wall: Rect | null =
    treatment !== "none" && bandHeightMm > 0
      ? {
          xMm: (widthMm - bandWidthMm) / 2,
          yMm: -bandHeightMm,
          widthMm: bandWidthMm,
          heightMm: bandHeightMm,
        }
      : null;

  const members: VerticalMember[] = [];
  const veins: Array<[number, number, number, number]> = [];
  if (wall) {
    if (treatment === "fluted" || treatment === "slatted") {
      const pitch = treatment === "fluted" ? FLUTE_PITCH_MM : SLAT_PITCH_MM;
      const member = treatment === "fluted" ? FLUTE_MEMBER_MM : SLAT_MEMBER_MM;
      const count = Math.max(Math.floor(wall.widthMm / pitch), 1);
      for (let i = 0; i < count; i += 1) {
        members.push({
          xMm: wall.xMm + i * pitch + (pitch - member) / 2,
          widthMm: member,
        });
      }
    } else {
      // Two opposing diagonals read as a book-matched stone face without
      // pretending to be a photograph of a particular slab.
      const inset = Math.min(wall.widthMm, wall.heightMm) * 0.12;
      veins.push([
        wall.xMm + inset,
        wall.yMm + wall.heightMm - inset,
        wall.xMm + wall.widthMm / 2,
        wall.yMm + wall.heightMm / 2,
      ]);
      veins.push([
        wall.xMm + wall.widthMm - inset,
        wall.yMm + inset,
        wall.xMm + wall.widthMm / 2,
        wall.yMm + wall.heightMm / 2,
      ]);
    }
  }

  const legs: Rect[] = [];
  if (mounting === "legs") {
    const inset = Math.min(widthMm * 0.08, 120);
    legs.push({
      xMm: inset,
      yMm: heightMm,
      widthMm: LEG_WIDTH_MM,
      heightMm: LEG_HEIGHT_MM,
    });
    legs.push({
      xMm: widthMm - inset - LEG_WIDTH_MM,
      yMm: heightMm,
      widthMm: LEG_WIDTH_MM,
      heightMm: LEG_HEIGHT_MM,
    });
    if (widthMm > 1800) {
      legs.push({
        xMm: (widthMm - LEG_WIDTH_MM) / 2,
        yMm: heightMm,
        widthMm: LEG_WIDTH_MM,
        heightMm: LEG_HEIGHT_MM,
      });
    }
  }

  const ledMetres = finite(input.ledProfileMetres);
  const led =
    ledMetres > 0
      ? { yMm: wall ? wall.yMm + wall.heightMm : 0, widthMm }
      : null;

  const topOfScreen = screen ? screen.yMm : 0;
  const topOfWall = wall ? wall.yMm : 0;
  const totalHeightMm =
    heightMm + belowMm - Math.min(0, topOfScreen, topOfWall);
  const totalWidthMm = Math.max(
    widthMm,
    wall?.widthMm ?? 0,
    screen?.widthMm ?? 0,
  );

  return {
    screen,
    wall,
    members,
    veins,
    plinthHeightMm: mounting === "plinth" ? PLINTH_HEIGHT_MM : 0,
    legs,
    shadowGapMm: mounting === "floating" ? SHADOW_GAP_MM : 0,
    led,
    totalHeightMm,
    totalWidthMm,
  };
}
