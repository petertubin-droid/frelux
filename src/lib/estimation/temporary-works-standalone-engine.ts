/** Preliminary quantity takeoff for formwork and access scaffold components. Never a structural safety design. */
export interface FormworkElement {
  type: "slab" | "beam" | "column" | "wall";
  lengthM: number;
  widthM: number;
  depthOrHeightM: number;
  quantity?: number;
}
export interface TemporaryWorksInput {
  marketCode: string;
  elements: FormworkElement[];
  formworkReuseCycles?: number;
  formworkWastePercent?: number;
  scaffoldRunLengthM?: number;
  scaffoldWorkingHeightM?: number;
  scaffoldBayLengthM?: number;
  scaffoldLiftHeightM?: number;
  scaffoldDeckWidthM?: number;
  scaffoldFrameStockLengthM?: number;
}
export interface TemporaryWorksResult {
  marketCode: string;
  formContactAreaM2: number;
  grossFormworkSheetAreaM2: number;
  reusableFormworkSheetEquivalentM2: number;
  scaffoldStandards: number;
  scaffoldLedgers: number;
  scaffoldTransoms: number;
  scaffoldDeckAreaM2: number;
  scaffoldGuardrailLengthM: number;
  safetyNotice: string;
  assumptions: string[];
}
export function calculateTemporaryWorksTakeoff(
  input: TemporaryWorksInput,
): TemporaryWorksResult {
  const marketCode = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const contact = input.elements.reduce((total, e) => {
    const q = Math.max(0, e.quantity ?? 1),
      l = Math.max(0, e.lengthM),
      w = Math.max(0, e.widthM),
      d = Math.max(0, e.depthOrHeightM);
    const area =
      e.type === "slab"
        ? l * w
        : e.type === "beam"
          ? l * (2 * d + w)
          : e.type === "column"
            ? 2 * (l + w) * d
            : 2 * l * d;
    return total + area * q;
  }, 0);
  const waste = Math.max(0, input.formworkWastePercent ?? 10);
  const cycles = Math.max(1, Math.floor(input.formworkReuseCycles ?? 1));
  const grossFormworkSheetAreaM2 = contact * (1 + waste / 100);
  const reusableFormworkSheetEquivalentM2 = grossFormworkSheetAreaM2 / cycles;
  const run = Math.max(0, input.scaffoldRunLengthM ?? 0),
    height = Math.max(0, input.scaffoldWorkingHeightM ?? 0);
  const bay = Math.max(0.1, input.scaffoldBayLengthM ?? 2),
    lift = Math.max(0.1, input.scaffoldLiftHeightM ?? 2),
    deck = Math.max(0, input.scaffoldDeckWidthM ?? 0.6);
  const bays = Math.ceil(run / bay),
    lifts = Math.ceil(height / lift);
  const standards = (bays + 1) * (lifts + 1);
  const ledgers = bays * (lifts + 1) * 2;
  const transoms = bays * lifts * 2;
  return {
    marketCode,
    formContactAreaM2: Number(contact.toFixed(2)),
    grossFormworkSheetAreaM2: Number(grossFormworkSheetAreaM2.toFixed(2)),
    reusableFormworkSheetEquivalentM2: Number(
      reusableFormworkSheetEquivalentM2.toFixed(2),
    ),
    scaffoldStandards: standards,
    scaffoldLedgers: ledgers,
    scaffoldTransoms: transoms,
    scaffoldDeckAreaM2: Number((bays * bay * deck * lifts).toFixed(2)),
    scaffoldGuardrailLengthM: Number((bays * bay * lifts * 2).toFixed(2)),
    safetyNotice:
      "Quantity estimate only. Scaffold stability, ties, foundations, access, edge protection, load class and erection sequence must be designed/checked by a competent person under applicable local requirements.",
    assumptions: [
      "Formwork areas are geometric contact areas; no allowance for propping, bracing, ties, walers, joints, corners or engineered falsework is included.",
      "Scaffold member counts are a simplified bay/lift grid and are not a safe scaffold design or a complete bill of materials.",
    ],
  };
}
