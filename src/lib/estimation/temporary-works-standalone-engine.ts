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
  elements?: FormworkElement[];
  formworkReuseCycles?: number;
  formworkWastePercent?: number;
  /** Plywood sheet the formwork is cut from, mm. Defaults to 2440 x 1220. */
  formworkSheetLengthMm?: number;
  formworkSheetWidthMm?: number;
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
  /** Whole sheets to buy once reuse is taken into account. */
  formworkSheets: number;
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
  const contact = (input.elements ?? []).reduce((total, e) => {
    const q = Math.max(0, Number(e.quantity ?? 1) || 0),
      l = Math.max(0, Number(e.lengthM) || 0),
      w = Math.max(0, Number(e.widthM) || 0),
      d = Math.max(0, Number(e.depthOrHeightM) || 0);
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
  // No run or no height means no scaffold: without this guard an empty input
  // still returned one frame (two standards) because ceil(0) is 0 but the
  // position count is bays + 1.
  const hasScaffold = run > 0 && height > 0;
  const bays = hasScaffold ? Math.ceil(run / bay) : 0,
    lifts = hasScaffold ? Math.ceil(height / lift) : 0;
  // A scaffold stands on two rows of standards, inner and outer, at every bay
  // position. Counting one row halved the standards while the ledgers and
  // guardrails beside them were counted in pairs.
  const standards = hasScaffold ? 2 * (bays + 1) * (lifts + 1) : 0;
  const ledgers = hasScaffold ? bays * (lifts + 1) * 2 : 0;
  const transoms = hasScaffold ? bays * lifts * 2 : 0;
  // Sheets are what a merchant sells; the area alone leaves the user to divide.
  const sheetLengthM = Math.max(0.1, (input.formworkSheetLengthMm ?? 2440) / 1000);
  const sheetWidthM = Math.max(0.1, (input.formworkSheetWidthMm ?? 1220) / 1000);
  const sheetAreaM2 = sheetLengthM * sheetWidthM;
  const formworkSheets = Math.ceil(
    reusableFormworkSheetEquivalentM2 / sheetAreaM2,
  );
  return {
    marketCode,
    formContactAreaM2: Number(contact.toFixed(2)),
    grossFormworkSheetAreaM2: Number(grossFormworkSheetAreaM2.toFixed(2)),
    reusableFormworkSheetEquivalentM2: Number(
      reusableFormworkSheetEquivalentM2.toFixed(2),
    ),
    formworkSheets,
    scaffoldStandards: standards,
    scaffoldLedgers: ledgers,
    scaffoldTransoms: transoms,
    scaffoldDeckAreaM2: Number((bays * bay * deck * lifts).toFixed(2)),
    scaffoldGuardrailLengthM: Number((bays * bay * lifts * 2).toFixed(2)),
    safetyNotice:
      "Quantity estimate only. Scaffold stability, ties, foundations, access, edge protection, load class and erection sequence must be designed/checked by a competent person under applicable local requirements.",
    assumptions: [
      "Formwork areas are geometric contact areas; no allowance for propping, bracing, ties, walers, joints, corners or engineered falsework is included.",
      "Scaffold member counts are a simplified bay/lift grid on two rows of standards, and are not a safe scaffold design or a complete bill of materials.",
      `Formwork sheets are ${input.formworkSheetLengthMm ?? 2440} x ${input.formworkSheetWidthMm ?? 1220} mm (${sheetAreaM2.toFixed(2)} m2 each), ordered after the reuse cycles are applied.`,
    ],
  };
}
