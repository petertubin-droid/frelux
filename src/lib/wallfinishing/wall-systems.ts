// =========================================================
// FRELUX Wall Finishing - wall construction systems.
//
// Normalized structural-wall catalogue. Each country carries
// MULTIPLE systems (never a single national method). Systems
// carry substrate tags that drive material compatibility.
// =========================================================

import type { WallSystem } from "@/types/wallfinishing";

export const WALLFIN_WALL_SYSTEMS: WallSystem[] = [
  // ── Nigeria ──────────────────────────────────
  {
    id: "ng-sandcrete-block",
    countryCodes: ["NG"],
    name: "Sandcrete block wall",
    description:
      'The most common Nigerian wall: 225 mm (9") or 150 mm (6") sandcrete blocks laid in cement-sand mortar.',
    wallType: "load-bearing masonry",
    structuralMaterial: "Sandcrete block",
    typicalThickness: { min: 150, max: 225, default: 225 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "ng-interior-block-paint",
    exteriorFinishAssemblyId: "ng-exterior-block-render-paint",
    substrates: ["block", "masonry"],
    active: true,
  },
  {
    id: "ng-concrete-frame-block",
    countryCodes: ["NG"],
    name: "RC frame + block infill",
    description:
      "Reinforced-concrete frame with sandcrete block infill panels: common for multi-storey buildings.",
    wallType: "framed masonry infill",
    structuralMaterial: "Concrete frame + sandcrete block",
    typicalThickness: { min: 150, max: 225, default: 225 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "ng-interior-block-paint",
    exteriorFinishAssemblyId: "ng-exterior-block-render-paint",
    substrates: ["block", "masonry", "concrete"],
    active: true,
  },

  // ── United States ────────────────────────────
  {
    id: "us-timber-stud-drywall",
    countryCodes: ["US"],
    name: "Timber stud + drywall",
    description:
      "Wood framing (2×4 / 2×6 studs) sheathed and lined with gypsum drywall internally.",
    wallType: "timber frame",
    structuralMaterial: "Timber studs + gypsum board",
    typicalThickness: { min: 89, max: 140, default: 114 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "us-interior-drywall-paint",
    exteriorFinishAssemblyId: "us-exterior-masonry-paint",
    substrates: ["timber", "drywall"],
    active: true,
  },
  {
    id: "us-steel-stud-drywall",
    countryCodes: ["US"],
    name: "Steel stud + drywall",
    description:
      "Cold-formed steel framing lined with gypsum board: common in commercial and modern residential builds.",
    wallType: "steel frame",
    structuralMaterial: "Steel studs + gypsum board",
    typicalThickness: { min: 89, max: 152, default: 92 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "us-interior-drywall-paint",
    exteriorFinishAssemblyId: "us-exterior-masonry-paint",
    substrates: ["steel", "drywall"],
    active: true,
  },
  {
    id: "us-masonry-veneer",
    countryCodes: ["US"],
    name: "Masonry veneer over framing",
    description:
      "Brick or stone veneer over timber/steel framing with internal drywall.",
    wallType: "veneered frame",
    structuralMaterial: "Masonry veneer + frame",
    typicalThickness: { min: 100, max: 250, default: 140 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "us-interior-drywall-paint",
    exteriorFinishAssemblyId: "us-exterior-masonry-paint",
    substrates: ["brick", "timber", "drywall"],
    active: true,
  },

  // ── United Kingdom ────────────────────────────
  {
    id: "gb-brick-block",
    countryCodes: ["GB"],
    name: "Brick/block cavity wall",
    description:
      "Outer brick leaf + inner block leaf with cavity; internally plastered or drylined.",
    wallType: "cavity masonry",
    structuralMaterial: "Clay brick + concrete block",
    typicalThickness: { min: 250, max: 300, default: 275 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "gb-interior-block-skim-paint",
    exteriorFinishAssemblyId: "gb-exterior-render-paint",
    substrates: ["brick", "block", "masonry"],
    active: true,
  },
  {
    id: "gb-timber-frame-dryline",
    countryCodes: ["GB"],
    name: "Timber frame + drylining",
    description:
      "Structural timber frame lined with plasterboard on dabs or battens.",
    wallType: "timber frame",
    structuralMaterial: "Timber frame + plasterboard",
    typicalThickness: { min: 140, max: 250, default: 200 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "gb-interior-plasterboard-paint",
    exteriorFinishAssemblyId: "gb-exterior-render-paint",
    substrates: ["timber", "drywall"],
    active: true,
  },
  {
    id: "gb-solid-masonry",
    countryCodes: ["GB"],
    name: "Solid masonry wall",
    description:
      "Pre-cavity solid brick or stone wall: typical in older housing stock.",
    wallType: "solid masonry",
    structuralMaterial: "Solid brick/stone",
    typicalThickness: { min: 215, max: 325, default: 230 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "gb-interior-block-skim-paint",
    exteriorFinishAssemblyId: "gb-exterior-render-paint",
    substrates: ["brick", "masonry"],
    active: true,
  },

  // ── Germany ───────────────────────────────────
  {
    id: "de-masonry-gypsum",
    countryCodes: ["DE"],
    name: "Masonry + gypsum plaster",
    description:
      "Perforated brick, aerated concrete or blockwork finished with gypsum or lime-gypsum plaster.",
    wallType: "masonry",
    structuralMaterial: "Masonry / blockwork",
    typicalThickness: { min: 175, max: 365, default: 240 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "de-interior-masonry-paint",
    exteriorFinishAssemblyId: "de-exterior-render-paint",
    substrates: ["masonry", "block", "brick"],
    active: true,
  },
  {
    id: "de-blockwork-lime",
    countryCodes: ["DE"],
    name: "Blockwork + lime/mineral render",
    description:
      "Calcium-silicate or aerated blockwork with traditional lime or mineral render systems.",
    wallType: "masonry",
    structuralMaterial: "Aerated/calcium-silicate block",
    typicalThickness: { min: 175, max: 365, default: 300 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "de-interior-masonry-paint",
    exteriorFinishAssemblyId: "de-exterior-render-paint",
    substrates: ["block", "masonry"],
    active: true,
  },
  {
    id: "de-drywall-metal-stud",
    countryCodes: ["DE"],
    name: "Drywall (metal stud)",
    description:
      "Metal-stud drywall partitions lined with gypsum plasterboard (Rigips/Knauf systems).",
    wallType: "metal frame",
    structuralMaterial: "Steel studs + gypsum board",
    typicalThickness: { min: 100, max: 175, default: 125 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "de-interior-masonry-paint",
    exteriorFinishAssemblyId: "de-exterior-render-paint",
    substrates: ["steel", "drywall"],
    active: true,
  },

  // ── India ─────────────────────────────────────
  {
    id: "in-brick-block-plaster",
    countryCodes: ["IN"],
    name: "Brick/block masonry",
    description:
      "Fired-clay brick or concrete block masonry finished with cement-sand plaster.",
    wallType: "load-bearing masonry",
    structuralMaterial: "Clay brick / concrete block",
    typicalThickness: { min: 115, max: 230, default: 230 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "in-interior-brick-paint",
    exteriorFinishAssemblyId: "in-exterior-render-paint",
    substrates: ["brick", "block", "masonry"],
    active: true,
  },
  {
    id: "in-aac-block",
    countryCodes: ["IN"],
    name: "AAC block wall",
    description:
      "Autoclaved aerated concrete blocks: lighter and better insulated than red brick.",
    wallType: "masonry",
    structuralMaterial: "AAC block",
    typicalThickness: { min: 100, max: 200, default: 150 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "in-interior-brick-paint",
    exteriorFinishAssemblyId: "in-exterior-render-paint",
    substrates: ["block", "masonry"],
    active: true,
  },
  {
    id: "in-rcc-frame-brick",
    countryCodes: ["IN"],
    name: "RCC frame + brick infill",
    description:
      "Reinforced-cement-concrete frame with brick infill panels: the common urban multi-storey system.",
    wallType: "framed masonry infill",
    structuralMaterial: "RCC frame + clay brick",
    typicalThickness: { min: 115, max: 230, default: 230 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "in-interior-brick-paint",
    exteriorFinishAssemblyId: "in-exterior-render-paint",
    substrates: ["brick", "masonry", "concrete"],
    active: true,
  },

  // ── Canada ───────────────────────────────────
  {
    id: "ca-wood-frame-drywall",
    countryCodes: ["CA"],
    name: "Wood frame + drywall",
    description:
      "Platform framing (2×4 / 2×6) with gypsum drywall on the interior face.",
    wallType: "timber frame",
    structuralMaterial: "Wood studs + gypsum board",
    typicalThickness: { min: 89, max: 140, default: 114 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "ca-interior-drywall-paint",
    exteriorFinishAssemblyId: "ca-exterior-masonry-paint",
    substrates: ["timber", "drywall"],
    active: true,
  },
  {
    id: "ca-steel-frame-drywall",
    countryCodes: ["CA"],
    name: "Steel frame + drywall",
    description:
      "Cold-formed steel framing with gypsum board: growing in Canadian residential construction.",
    wallType: "steel frame",
    structuralMaterial: "Steel studs + gypsum board",
    typicalThickness: { min: 92, max: 152, default: 92 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "ca-interior-drywall-paint",
    exteriorFinishAssemblyId: "ca-exterior-masonry-paint",
    substrates: ["steel", "drywall"],
    active: true,
  },
  {
    id: "ca-icf",
    countryCodes: ["CA"],
    name: "ICF (insulated concrete forms)",
    description:
      "Insulated concrete forms with drywall directly on the foam interior face.",
    wallType: "concrete formwork",
    structuralMaterial: "ICF concrete core",
    typicalThickness: { min: 150, max: 250, default: 200 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "ca-interior-drywall-paint",
    exteriorFinishAssemblyId: "ca-exterior-masonry-paint",
    substrates: ["concrete", "drywall"],
    active: true,
  },

  // ── Australia ─────────────────────────────────
  {
    id: "au-brick-veneer-plasterboard",
    countryCodes: ["AU"],
    name: "Brick veneer + plasterboard",
    description:
      "The dominant Australian house wall: timber/steel frame with external brick veneer and internal plasterboard.",
    wallType: "veneered frame",
    structuralMaterial: "Brick veneer + frame + plasterboard",
    typicalThickness: { min: 240, max: 270, default: 260 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "au-interior-plasterboard-paint",
    exteriorFinishAssemblyId: "au-exterior-render-paint",
    substrates: ["brick", "timber", "drywall"],
    active: true,
  },
  {
    id: "au-double-brick",
    countryCodes: ["AU"],
    name: "Double brick (cavity masonry)",
    description:
      "Two brick leaves with cavity: common in older Perth/Sydney housing.",
    wallType: "cavity masonry",
    structuralMaterial: "Double clay brick",
    typicalThickness: { min: 220, max: 270, default: 250 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "au-interior-plasterboard-paint",
    exteriorFinishAssemblyId: "au-exterior-render-paint",
    substrates: ["brick", "masonry"],
    active: true,
  },
  {
    id: "au-light-steel-frame",
    countryCodes: ["AU"],
    name: "Light steel frame + plasterboard",
    description:
      "Light-gauge steel framing with plasterboard linings: modern Australian builds.",
    wallType: "steel frame",
    structuralMaterial: "Steel frame + plasterboard",
    typicalThickness: { min: 90, max: 150, default: 90 },
    thicknessUnit: "mm",
    interiorFinishAssemblyId: "au-interior-plasterboard-paint",
    exteriorFinishAssemblyId: "au-exterior-render-paint",
    substrates: ["steel", "drywall"],
    active: true,
  },
];

export const WALLFIN_WALL_SYSTEM_MAP: Record<string, WallSystem> =
  Object.fromEntries(WALLFIN_WALL_SYSTEMS.map((s) => [s.id, s]));

export function getWallSystem(id: string): WallSystem | null {
  return WALLFIN_WALL_SYSTEM_MAP[id] ?? null;
}

export function getWallSystemsForCountry(code: string): WallSystem[] {
  return WALLFIN_WALL_SYSTEMS.filter(
    (s) => s.active && s.countryCodes.includes(code as never),
  );
}
