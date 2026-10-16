export type ConstructionOperation = "board_material" | "wall_finishing" | "reinforcement" | "temporary_concrete_support";
export type TerminologyMarket = "US" | "GB" | "NG";
export const CONSTRUCTION_TERMINOLOGY: Readonly<Record<ConstructionOperation, Readonly<Record<TerminologyMarket, string>>>> = {
 board_material: { US: "Drywall", GB: "Plasterboard", NG: "Gypsum Board / Ceiling Sheet" },
 wall_finishing: { US: "Mudding / Taping", GB: "Skimming", NG: "Screeding" },
 reinforcement: { US: "Rebar", GB: "Reinforcement Bar", NG: "Iron Rods" },
 temporary_concrete_support: { US: "Formwork", GB: "Shuttering", NG: "Wood Boarding / Carpentry Box" },
};
export function getConstructionTerm(operation: ConstructionOperation, marketCode: string, fallback?: string): string {
 return CONSTRUCTION_TERMINOLOGY[operation][marketCode.toUpperCase() as TerminologyMarket] ?? fallback ?? operation.replace(/_/g, " ");
}
