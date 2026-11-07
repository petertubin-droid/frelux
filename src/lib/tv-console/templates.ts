export interface TvConsoleLayout {
  /** Carcass board thickness in millimetres. */
  thicknessMm: number;
  /** Back panel thickness; 0 means no back is fitted. */
  backThicknessMm: number;
  shelves: number;
  dividers: number;
  drawers: number;
  drawerFrontHeightMm: number;
  doors: number;
  revealMm: number;
}

export interface TvConsoleTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material: string;
  feature: string;
  /**
   * The configuration the preset applies. There is no photograph attached to a
   * preset: its picture is the elevation drawn from these numbers, so the card,
   * the estimator and the panel schedule always describe the same unit.
   */
  layout: TvConsoleLayout;
}

const layout = (
  values: Partial<TvConsoleLayout> &
    Pick<TvConsoleLayout, "shelves" | "dividers">,
): TvConsoleLayout => ({
  thicknessMm: 18,
  backThicknessMm: 6,
  drawers: 0,
  drawerFrontHeightMm: 180,
  doors: 0,
  revealMm: 2,
  ...values,
});

/**
 * Ten editable concept presets.
 *
 * Widths, heights and depths follow the ranges used for real media furniture:
 * a 1600 to 1900 mm console suits a 65 inch screen, lowboys sit at 250 to 400
 * mm, full wall units reach 600 mm, and depths run 300 to 450 mm. The bay, drawer
 * and door counts describe the layout each concept is known by, so the drawn
 * elevation matches the description in `feature`.
 */
export const TV_CONSOLE_TEMPLATES: TvConsoleTemplate[] = [
  {
    id: "japandi-slats",
    name: "Minimalist Japandi Slats",
    widthMm: 1800,
    heightMm: 400,
    depthMm: 350,
    material: "White oak veneer board",
    feature: "Fluted side panels, two open media bays",
    layout: layout({ shelves: 1, dividers: 2 }),
  },
  {
    id: "charcoal-floating",
    name: "Executive Charcoal Floating",
    widthMm: 2400,
    heightMm: 350,
    depthMm: 400,
    material: "Matte charcoal HDF-faced board",
    feature: "Concealed cable channel, push-to-open drawer bank",
    layout: layout({
      shelves: 0,
      dividers: 0,
      drawers: 3,
      drawerFrontHeightMm: 100,
    }),
  },
  {
    id: "fluted-column",
    name: "Contemporary Fluted Column",
    widthMm: 2100,
    heightMm: 450,
    depthMm: 380,
    material: "Charcoal WPC accents + cabinet board",
    feature: "Recessed drawer layout with twin cupboards",
    layout: layout({
      shelves: 1,
      dividers: 2,
      drawers: 2,
      drawerFrontHeightMm: 145,
      doors: 2,
    }),
  },
  {
    id: "scandi-floating",
    name: "Scandi Floating Unit",
    widthMm: 1600,
    heightMm: 300,
    depthMm: 300,
    material: "Light ash veneer board",
    feature: "Clean mitered edges, two flanking cupboards",
    layout: layout({ shelves: 1, dividers: 1, doors: 2 }),
  },
  {
    id: "industrial-concrete",
    name: "Industrial Concrete Block",
    widthMm: 2000,
    heightMm: 500,
    depthMm: 420,
    material: "Microcement-finish cabinet board",
    feature: "Four open bays, optional black steel support frame",
    layout: layout({ shelves: 2, dividers: 3 }),
  },
  {
    id: "marble-walnut",
    name: "Luxury Marble & Walnut",
    widthMm: 2600,
    heightMm: 400,
    depthMm: 400,
    material: "Walnut veneer + stone-look top",
    feature: "Four door fronts with a recessed LED shadow gap",
    layout: layout({ shelves: 1, dividers: 3, doors: 4 }),
  },
  {
    id: "ultra-slim-lowboy",
    name: "Ultra-Slim Lowboy",
    widthMm: 2200,
    heightMm: 250,
    depthMm: 320,
    material: "High-gloss cabinet board",
    feature: "Push-to-open doors on a 250 mm slim body",
    layout: layout({
      shelves: 0,
      dividers: 3,
      doors: 4,
      thicknessMm: 16,
      revealMm: 3,
    }),
  },
  {
    id: "framed-traditional",
    name: "Classic Framed Traditional",
    widthMm: 1800,
    heightMm: 600,
    depthMm: 450,
    material: "Hardwood or hardwood veneer",
    feature: "Glazed cabinet doors with a fixed mid shelf",
    layout: layout({
      shelves: 1,
      dividers: 2,
      doors: 3,
      thicknessMm: 20,
      revealMm: 4,
    }),
  },
  {
    id: "asymmetric-tier",
    name: "Asymmetrical Floating Tier",
    widthMm: 2400,
    heightMm: 600,
    depthMm: 350,
    material: "Textured melamine-faced board",
    feature: "Offset open display shelves above a drawer bank",
    layout: layout({
      shelves: 2,
      dividers: 2,
      drawers: 2,
      drawerFrontHeightMm: 170,
    }),
  },
  {
    id: "compact-studio",
    name: "Compact Studio Console",
    widthMm: 1200,
    heightMm: 350,
    depthMm: 300,
    material: "Paint-grade cabinet board",
    feature: "One drawer, one cupboard, cable grommet",
    layout: layout({ shelves: 1, dividers: 1, drawers: 1, doors: 1 }),
  },
];
