import type {
  ConsoleMounting,
  WallTreatment,
} from "@/lib/tv-console/media-context";

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
  /**
   * Room context. These are quoted, not decorative: the panelling above and
   * beside the unit is a priced line, and the screen size sets the clearance
   * the unit is designed to. Omitted values draw the unit on its own.
   */
  tvInches?: number;
  wallTreatment?: WallTreatment;
  /** Height of the panelled band above the console, mm. */
  wallPanelHeightMm?: number;
  mounting?: ConsoleMounting;
  /** LED profile length in metres, when the design specifies it. */
  ledProfileMetres?: number;
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
 * Twenty editable concept presets.
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
    tvInches: 55,
    mounting: "floating",
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
    tvInches: 65,
    mounting: "floating",
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
    tvInches: 65,
    mounting: "floating",
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
    tvInches: 50,
    mounting: "floating",
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
    tvInches: 55,
    mounting: "legs",
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
    tvInches: 65,
    mounting: "floating",
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
    tvInches: 65,
    mounting: "floating",
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
    tvInches: 55,
    mounting: "plinth",
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
    tvInches: 65,
    mounting: "floating",
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
    tvInches: 43,
    mounting: "floating",
  },
  {
    id: "marble-gold-flanks",
    name: "Marble & Gold Feature Wall",
    widthMm: 2600,
    heightMm: 420,
    depthMm: 380,
    material: "Bookmatched marble-look panel + fluted charcoal flanks",
    feature:
      "Centred stone panel with brass inlay lines, fluted returns, floating drawer bank",
    layout: layout({
      shelves: 0,
      dividers: 2,
      drawers: 3,
      drawerFrontHeightMm: 120,
    }),
    tvInches: 65,
    wallTreatment: "marble",
    wallPanelHeightMm: 1600,
    mounting: "floating",
    ledProfileMetres: 2.6,
  },
  {
    id: "walnut-wave-curve",
    name: "Walnut Wave Curved Wall",
    widthMm: 2800,
    heightMm: 420,
    depthMm: 400,
    material: "Walnut veneer fluted panels on a curved batten frame",
    feature:
      "Flowing full-height flutes with warm LED wash and a floated three-door console",
    layout: layout({ shelves: 1, dividers: 3, doors: 3 }),
    tvInches: 75,
    wallTreatment: "fluted",
    wallPanelHeightMm: 1700,
    mounting: "floating",
    ledProfileMetres: 2.8,
  },
  {
    id: "bookmatched-stone",
    name: "Bookmatched Stone Console",
    widthMm: 2400,
    heightMm: 400,
    depthMm: 420,
    material: "Honed stone-look board with matched centre joint",
    feature:
      "Stone face matched at the centre, two push-to-open drawers and twin cupboards",
    layout: layout({
      shelves: 1,
      dividers: 3,
      drawers: 2,
      drawerFrontHeightMm: 150,
      doors: 2,
    }),
    tvInches: 65,
    wallTreatment: "stone",
    wallPanelHeightMm: 1200,
    mounting: "floating",
  },
  {
    id: "fluted-oak-fullwall",
    name: "Full-Height Fluted Oak Wall",
    widthMm: 3000,
    heightMm: 450,
    depthMm: 400,
    material: "Oak veneer fluted battens with concealed cabinet section",
    feature:
      "Floor-to-ceiling flutes, recessed console niche, screened cabinet behind a push catch",
    layout: layout({ shelves: 1, dividers: 3, doors: 2 }),
    tvInches: 85,
    wallTreatment: "fluted",
    wallPanelHeightMm: 2100,
    mounting: "floating",
    ledProfileMetres: 3,
  },
  {
    id: "steel-oak-lattice",
    name: "Black Steel & Oak Lattice",
    widthMm: 2200,
    heightMm: 500,
    depthMm: 380,
    material: "Powder-coated steel frame with solid oak shelves",
    feature: "Open lattice frame on slender legs, four bays, no back panel",
    layout: layout({ shelves: 2, dividers: 3, thicknessMm: 16 }),
    tvInches: 65,
    mounting: "legs",
  },
  {
    id: "tambour-curve",
    name: "Tambour Curve Sideboard",
    widthMm: 2000,
    heightMm: 480,
    depthMm: 420,
    material: "Slatted tambour front on a rounded carcass",
    feature: "Rolling tambour doors over a rounded body, raised on turned legs",
    layout: layout({
      shelves: 1,
      dividers: 2,
      doors: 2,
      thicknessMm: 16,
      revealMm: 3,
    }),
    tvInches: 55,
    mounting: "legs",
  },
  {
    id: "marble-plinth-classic",
    name: "Marble Plinth Classic",
    widthMm: 1800,
    heightMm: 520,
    depthMm: 450,
    material: "Stone top over hardwood veneer carcass",
    feature: "Recessed plinth base, three framed doors, brass pull rail",
    layout: layout({
      shelves: 1,
      dividers: 3,
      doors: 3,
      thicknessMm: 20,
      revealMm: 4,
    }),
    tvInches: 55,
    wallTreatment: "marble",
    wallPanelHeightMm: 900,
    mounting: "plinth",
  },
  {
    id: "led-shadowgap-float",
    name: "LED Shadow-Gap Float",
    widthMm: 2400,
    heightMm: 350,
    depthMm: 400,
    material: "Matte lacquer board, handleless",
    feature:
      "Perimeter LED shadow gap, two wide push-open drawers, no visible fixing",
    layout: layout({
      shelves: 0,
      dividers: 2,
      drawers: 2,
      drawerFrontHeightMm: 150,
    }),
    tvInches: 65,
    mounting: "floating",
    ledProfileMetres: 2.4,
  },
  {
    id: "niche-recessed-stone",
    name: "Recessed Stone Niche",
    widthMm: 2000,
    heightMm: 450,
    depthMm: 380,
    material: "Stone surround with lacquered cabinet insert",
    feature:
      "Unit set into a stone-lined niche, twin cupboards and a media drawer",
    layout: layout({
      shelves: 1,
      dividers: 2,
      drawers: 1,
      drawerFrontHeightMm: 140,
      doors: 2,
    }),
    tvInches: 65,
    wallTreatment: "stone",
    wallPanelHeightMm: 1500,
    mounting: "floating",
  },
  {
    id: "slatted-divider",
    name: "Slatted Room Divider",
    widthMm: 1800,
    heightMm: 600,
    depthMm: 350,
    material: "Slatted ash battens on an open frame",
    feature:
      "Free-standing slatted divider with console base, open shelving above",
    layout: layout({ shelves: 2, dividers: 2 }),
    tvInches: 55,
    wallTreatment: "slatted",
    wallPanelHeightMm: 1800,
    mounting: "floating",
    ledProfileMetres: 1.8,
  },
];
