/**
 * FRELUX Whole Life Carbon Module Alignment (Sustainability Pillar 5)
 *
 * RICS Whole Life Carbon Assessment (2nd ed.) / EN 15978 lifecycle
 * module structure for construction works:
 *
 *   A1–A3  Product stage — raw material supply, transport to factory,
 *          manufacturing (cradle to gate)
 *   A4–A5  Construction process — transport to site, site installation
 *          and construction waste
 *   B1–B7  Use stage — installed products in use (B1), maintenance (B2),
 *          repair (B3), replacement (B4), refurbishment (B5),
 *          operational energy (B6), operational water (B7)
 *   C1–C4  End of life — deconstruction (C1), transport (C2),
 *          waste processing (C3), disposal (C4)
 *   D      Beyond the system boundary — reuse, recycling and recovery
 *          benefits (may be negative: they AVOID future emissions)
 *
 * EN 15978 headline aggregates (the vocabulary tenders ask for):
 *   Upfront carbon          = A1–A5
 *   Use stage embodied      = B1–B5
 *   Operational (in use)    = B6–B7
 *   End of life             = C1–C4
 *   Total (excl. D)         = A + B + C
 *   Whole life total        = total incl. module D (D may be negative)
 *
 * House rules: an unknown module string is excluded with a warning,
 * never guessed; module D is reported on its own line so a negative
 * number can never quietly flatter a total.
 */

// ─────────────────────────────────────────────
// Lifecycle modules
// ─────────────────────────────────────────────

export type RicsModule =
  | "A1" | "A2" | "A3" | "A4" | "A5"
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7"
  | "C1" | "C2" | "C3" | "C4"
  | "D";

export type RicsModuleGroup =
  | "product_stage"      // A1–A3 (cradle to gate)
  | "construction"       // A4–A5
  | "use"                // B1–B7
  | "end_of_life"        // C1–C4
  | "beyond_boundary";   // D

export const MODULE_GROUP_LABELS: Record<RicsModuleGroup, string> = {
  product_stage: "A1–A3 Product stage (cradle to gate)",
  construction: "A4–A5 Construction process",
  use: "B1–B7 Use stage",
  end_of_life: "C1–C4 End of life",
  beyond_boundary: "D Beyond the system boundary",
};

const GROUP_OF_MODULE: Record<RicsModule, RicsModuleGroup> = {
  A1: "product_stage", A2: "product_stage", A3: "product_stage",
  A4: "construction", A5: "construction",
  B1: "use", B2: "use", B3: "use", B4: "use", B5: "use", B6: "use", B7: "use",
  C1: "end_of_life", C2: "end_of_life", C3: "end_of_life", C4: "end_of_life",
  D: "beyond_boundary",
};

export function isRicsModule(stage: string): stage is RicsModule {
  return Object.prototype.hasOwnProperty.call(GROUP_OF_MODULE, stage);
}

/** Group for a validated module; null for anything else. */
export function moduleGroup(stage: RicsModule): RicsModuleGroup {
  return GROUP_OF_MODULE[stage];
}

// ─────────────────────────────────────────────
// Assessment input / output
// ─────────────────────────────────────────────

export interface WholeLifeLineInput {
  /** Estimate/material label, for the audit narrative. */
  label: string;
  /**
   * RICS lifecycle module for this line's emission. A missing/null module on
   * a product (cradle-to-gate) factor is treated as A1–A3 product stage and
   * the assumption is stated in the warnings; an unknown string is refused.
   */
  module?: string | null;
  /** Emission in kgCO2e for the line (already quantity × factor). */
  kg_co2e: number;
}

export interface WholeLifeModuleTotal {
  module: RicsModule;
  group: RicsModuleGroup;
  kg_co2e: number;
}

export interface WholeLifeResult {
  ok: boolean;
  /** One entry per module that actually carried emissions, RICS order. */
  modules: WholeLifeModuleTotal[];
  groupTotals: Record<RicsModuleGroup, number>;
  /** EN 15978 headline aggregates. */
  upfrontCarbon: number;
  useStageEmbodied: number;
  operationalInUse: number;
  endOfLife: number;
  /** A + B + C, module D excluded. */
  totalExcludingD: number;
  /** Module D on its own: may be negative (benefits avoided future emissions). */
  moduleD: number;
  /** A + B + C + D. */
  wholeLifeTotal: number;
  /** Tender reportability disclosure. */
  disclosures: string[];
  warnings: string[];
  steps: { label: string; detail: string }[];
}

const MODULE_ORDER: RicsModule[] = [
  "A1", "A2", "A3", "A4", "A5",
  "B1", "B2", "B3", "B4", "B5", "B6", "B7",
  "C1", "C2", "C3", "C4",
  "D",
];

const round2 = (v: number) => Math.round(v * 100) / 100;

export function calculateWholeLifeCarbon(
  input: { lines: WholeLifeLineInput[] },
): WholeLifeResult {
  const warnings: string[] = [];
  const steps: { label: string; detail: string }[] = [];
  const perModule = new Map<RicsModule, number>();
  const groupTotals: Record<RicsModuleGroup, number> = {
    product_stage: 0,
    construction: 0,
    use: 0,
    end_of_life: 0,
    beyond_boundary: 0,
  };

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return {
      ok: false,
      modules: [],
      groupTotals,
      upfrontCarbon: 0,
      useStageEmbodied: 0,
      operationalInUse: 0,
      endOfLife: 0,
      totalExcludingD: 0,
      moduleD: 0,
      wholeLifeTotal: 0,
      disclosures: [],
      warnings: ["No lifecycle lines provided: nothing to assess."],
      steps: [],
    };
  }

  let excluded = 0;
  let assumedProductStage = 0;
  for (const line of input.lines) {
    const kg = Number(line.kg_co2e);
    if (!Number.isFinite(kg)) {
      excluded += 1;
      warnings.push(
        `'${line.label}' has a non-numeric emission value: excluded instead of guessed.`,
      );
      continue;
    }

    let stage: string | null = line.module?.trim() || null;
    if (stage === null) {
      // Product factors are cradle-to-gate by construction (kgCO2e per unit
      // of manufactured material): A1–A3 is the documented default, stated
      // in the warnings so the assessor can confirm it.
      stage = "A1";
      assumedProductStage += 1;
    }
    if (!isRicsModule(stage)) {
      excluded += 1;
      warnings.push(
        `'${line.label}' declares unknown lifecycle module "${line.module}": the line was excluded instead of guessed. Use RICS/EN 15978 module codes (A1–A5, B1–B7, C1–C4, D).`,
      );
      continue;
    }

    perModule.set(stage, round2((perModule.get(stage) ?? 0) + kg));
    groupTotals[moduleGroup(stage)] = round2(
      groupTotals[moduleGroup(stage)] + kg,
    );
  }

  if (assumedProductStage > 0) {
    warnings.push(
      `${assumedProductStage} line${assumedProductStage === 1 ? "" : "s"} carried no lifecycle module and were assumed into the A1–A3 product stage group (bucketed at A1, cradle to gate): product factors are manufacturing-stage factors by construction. Assign explicit modules for full EN 15978 coverage.`,
    );
  }
  if (excluded > 0) {
    warnings.push(
      `${excluded} line${excluded === 1 ? " was" : "s were"} excluded from the assessment: the totals cover only validly staged lines.`,
    );
  }

  const modules: WholeLifeModuleTotal[] = MODULE_ORDER.filter((m) =>
    perModule.has(m),
  ).map((m) => ({
    module: m,
    group: moduleGroup(m),
    kg_co2e: round2(perModule.get(m) as number),
  }));

  // EN 15978 headline aggregates
  const productStage = round2(
    (perModule.get("A1") ?? 0) + (perModule.get("A2") ?? 0) + (perModule.get("A3") ?? 0),
  );
  const construction = round2((perModule.get("A4") ?? 0) + (perModule.get("A5") ?? 0));
  const b1b5 = round2(
    (perModule.get("B1") ?? 0) + (perModule.get("B2") ?? 0) +
    (perModule.get("B3") ?? 0) + (perModule.get("B4") ?? 0) + (perModule.get("B5") ?? 0),
  );
  const b6b7 = round2((perModule.get("B6") ?? 0) + (perModule.get("B7") ?? 0));
  const eol = round2(
    (perModule.get("C1") ?? 0) + (perModule.get("C2") ?? 0) +
    (perModule.get("C3") ?? 0) + (perModule.get("C4") ?? 0),
  );
  const moduleD = round2(perModule.get("D") ?? 0);

  const upfrontCarbon = round2(productStage + construction);
  const useStageEmbodied = b1b5;
  const operationalInUse = b6b7;
  const totalExcludingD = round2(upfrontCarbon + useStageEmbodied + operationalInUse + eol);
  const wholeLifeTotal = round2(totalExcludingD + moduleD);

  steps.push({
    label: "A1–A3 Product stage",
    detail: `${productStage} kgCO2e cradle to gate.`,
  });
  if (construction !== 0) {
    steps.push({
      label: "A4–A5 Construction",
      detail: `${construction} kgCO2e transport to site and installation.`,
    });
  }
  if (useStageEmbodied !== 0 || operationalInUse !== 0) {
    steps.push({
      label: "B1–B7 Use stage",
      detail: `${useStageEmbodied} kgCO2e embodied in maintenance/repair/replacement${operationalInUse !== 0 ? `; ${operationalInUse} kgCO2e operational energy and water` : ""}.`,
    });
  }
  if (eol !== 0) {
    steps.push({
      label: "C1–C4 End of life",
      detail: `${eol} kgCO2e deconstruction, processing and disposal.`,
    });
  }
  if (moduleD !== 0) {
    steps.push({
      label: "D Beyond the boundary",
      detail: `${moduleD} kgCO2e reuse/recycling/recovery benefit${moduleD < 0 ? " (a negative entry reduces the whole life total)" : ""}.`,
    });
  }
  steps.push({
    label: "Totals",
    detail: `Upfront ${upfrontCarbon}; use-stage embodied ${useStageEmbodied}; operational ${operationalInUse}; end of life ${eol}; total excluding D ${totalExcludingD}; whole life including D ${wholeLifeTotal} kgCO2e.`,
  });

  const disclosures: string[] = [
    `RICS WLCA / EN 15978 module breakdown reported per stage group (A1–A3, A4–A5, B1–B7, C1–C4, D) for UK PAS 2080, LEED v4.1 and BREEAM whole life carbon submissions.`,
    `Total excluding module D is ${totalExcludingD} kgCO2e; module D (${moduleD} kgCO2e) is disclosed separately and never merged silently, so avoided-emission claims stay auditable.`,
  ];
  if (operationalInUse === 0) {
    disclosures.push(
      "No B6–B7 operational modules were supplied: this is an embodied-only assessment, which satisfies Buy Clean Act product-stage reporting but is NOT a complete whole life assessment.",
    );
  }
  if (eol === 0 && moduleD === 0) {
    disclosures.push(
      "No C-stage or D-stage modules were supplied: end-of-life and circularity are not yet covered, as an EPD-based cradle-to-gate scope is not.",
    );
  }

  return {
    ok: true,
    modules,
    groupTotals,
    upfrontCarbon,
    useStageEmbodied,
    operationalInUse,
    endOfLife: eol,
    totalExcludingD,
    moduleD,
    wholeLifeTotal,
    disclosures,
    warnings,
    steps,
  };
}
