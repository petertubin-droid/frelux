/**
 * Circular/Reuse Engine (Future Engine 9)
 *
 * Computes recovered, reused, recycled and landfilled quantities
 * for a demolition or strip-out, plus landfill-diversion rate and
 * reclaimed-material value — entirely from admin-configured
 * material_reuse_factors. Deterministic, pure, no I/O.
 *
 * House rules, identical to every other Frelux engine:
 *  - A material without a configured factor is REFUSED with a
 *    clear warning. The engine never assumes a recovery rate.
 *  - A factor with fractions outside [0, 1] or reuse + recycle > 1
 *    is REFUSED. Never clamped, never guessed.
 *  - A missing reuse value (unit_value_naira null) is reported
 *    honestly as "value not configured", never invented.
 *  - The diversion target is the admin-configured rule; if it is
 *    missing the verdict is omitted, not defaulted.
 */

export interface MaterialReuseFactorInput {
  recovery_rate: number;
  reuse_fraction: number;
  recycle_fraction: number;
  unit_value_naira: number | null;
}

export interface CircularReuseRule {
  rule_key: string;
  rule_value: Record<string, unknown>;
}

export interface CircularReuseInput {
  category: string;
  quantity: number;
  factors: Record<string, MaterialReuseFactorInput>;
  rules: CircularReuseRule[];
}

export interface CircularReuseStep {
  label: string;
  detail: string;
}

export interface CircularReuseResult {
  ok: boolean;
  warnings: string[];
  steps: CircularReuseStep[];
  unit: string | null;
  recovered_qty: number | null;
  reused_qty: number | null;
  recycled_qty: number | null;
  landfill_qty: number | null;
  diversion_percent: number | null;
  meets_diversion_target: boolean | null;
  reuse_value_naira: number | null;
}

function getRuleValue(rules: CircularReuseRule[], key: string): number | null {
  for (const r of rules) {
    if (r.rule_key !== key) continue;
    const v = r.rule_value?.value;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function calculateCircularReuse(
  input: CircularReuseInput,
): CircularReuseResult {
  const warnings: string[] = [];
  const steps: CircularReuseStep[] = [];

  const refuse = (msgs: string[]): CircularReuseResult => ({
    ok: false,
    warnings: msgs,
    steps: [],
    unit: null,
    recovered_qty: null,
    reused_qty: null,
    recycled_qty: null,
    landfill_qty: null,
    diversion_percent: null,
    meets_diversion_target: null,
    reuse_value_naira: null,
  });

  const { category, quantity, factors, rules } = input;

  // ── Validation: quantity ──────────────────────────────
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return refuse([
      "Quantity must be a positive number. Enter the amount of material being stripped out.",
    ]);
  }

  // ── Validation: factor exists (never assumed) ─────────
  const factor = factors[category];
  if (!factor) {
    return refuse([
      `No recovery factor is configured for '${category}'. The engine refuses to guess recovery rates — an admin must configure one from a verifiable source (demolition audit, WRAP protocol, salvage dealer rate).`,
    ]);
  }

  const { recovery_rate, reuse_fraction, recycle_fraction, unit_value_naira } =
    factor;

  // ── Validation: fractions sane (never clamped) ────────
  if (
    !Number.isFinite(recovery_rate) ||
    recovery_rate < 0 ||
    recovery_rate > 1
  ) {
    return refuse([
      `The configured recovery rate for '${category}' (${recovery_rate}) is outside 0–1. The engine refuses to compute from an invalid factor — fix the factor in the admin config.`,
    ]);
  }
  if (
    !Number.isFinite(reuse_fraction) ||
    reuse_fraction < 0 ||
    reuse_fraction > 1
  ) {
    return refuse([
      `The configured reuse fraction for '${category}' (${reuse_fraction}) is outside 0–1. The engine refuses to compute from an invalid factor — fix the factor in the admin config.`,
    ]);
  }
  if (
    !Number.isFinite(recycle_fraction) ||
    recycle_fraction < 0 ||
    recycle_fraction > 1
  ) {
    return refuse([
      `The configured recycle fraction for '${category}' (${recycle_fraction}) is outside 0–1. The engine refuses to compute from an invalid factor — fix the factor in the admin config.`,
    ]);
  }
  if (reuse_fraction + recycle_fraction > 1) {
    return refuse([
      `The configured reuse (${reuse_fraction}) and recycle (${recycle_fraction}) fractions for '${category}' sum to more than 1. The engine refuses to compute from an invalid factor — fix the factor in the admin config.`,
    ]);
  }

  // ── Validation: rounding rule (never defaulted) ────────
  const roundRaw = getRuleValue(rules, "rounding_decimals");
  if (roundRaw === null || roundRaw < 0 || roundRaw > 6) {
    return refuse([
      "No valid 'rounding_decimals' rule is configured for this calculator. The engine refuses to report unrounded or arbitrarily-rounded numbers.",
    ]);
  }
  const round = roundRaw;
  const r = (n: number) => Number(n.toFixed(round));

  // ── Deterministic chain ───────────────────────────────
  const recovered = quantity * recovery_rate;
  const reused = recovered * reuse_fraction;
  const recycled = recovered * recycle_fraction;
  const landfill = quantity - reused - recycled;
  const diverted = reused + recycled;
  const diversionPercent = (diverted / quantity) * 100;

  steps.push({
    label: "Recoverable quantity",
    detail: `${quantity} × ${recovery_rate} (configured recovery rate) = ${r(recovered)} — recoverable from demolition.`,
  });
  steps.push({
    label: "Directly reusable",
    detail: `${r(recovered)} × ${reuse_fraction} (configured reuse fraction) = ${r(reused)} — fit for reuse without reprocessing.`,
  });
  steps.push({
    label: "Recyclable",
    detail: `${r(recovered)} × ${recycle_fraction} (configured recycle fraction) = ${r(recycled)} — fit for recycling, not direct reuse.`,
  });
  steps.push({
    label: "To landfill",
    detail: `${quantity} − ${r(reused)} − ${r(recycled)} = ${r(landfill)} — not diverted.`,
  });
  steps.push({
    label: "Landfill diversion",
    detail: `(${r(reused)} + ${r(recycled)}) / ${quantity} × 100 = ${r(diversionPercent)}% diverted from landfill.`,
  });

  // ── Diversion target verdict (admin rule, never defaulted) ──
  const target = getRuleValue(rules, "diversion_target_fraction");
  let meetsTarget: boolean | null = null;
  if (target === null || target < 0 || target > 1) {
    warnings.push(
      "No valid 'diversion_target_fraction' rule is configured, so the plan is not measured against a circular-economy target. Configure the rule in the admin config.",
    );
  } else {
    meetsTarget = diverted / quantity >= target;
    steps.push({
      label: "Against the diversion target",
      detail: `${r(diversionPercent)}% vs the configured target of ${r(target * 100)}% — ${meetsTarget ? "meets" : "does not meet"} the circular-economy target.`,
    });
  }

  // ── Reuse value (honestly null when not configured) ───
  let reuseValue: number | null = null;
  if (unit_value_naira === null || !Number.isFinite(unit_value_naira)) {
    warnings.push(
      "No reclaimed-material value is configured for this category, so no reuse value is reported. The engine does not invent material prices.",
    );
  } else if (unit_value_naira < 0) {
    warnings.push(
      "The configured reclaimed-material value is negative — it is ignored. The engine does not report a negative recovery value.",
    );
  } else {
    reuseValue = r(reused * unit_value_naira);
    steps.push({
      label: "Reuse value",
      detail: `${r(reused)} × ₦${unit_value_naira} (configured reclaimed value per unit) = ₦${reuseValue.toLocaleString("en-NG")}.`,
    });
  }

  return {
    ok: true,
    warnings,
    steps,
    unit: null,
    recovered_qty: r(recovered),
    reused_qty: r(reused),
    recycled_qty: r(recycled),
    landfill_qty: r(landfill),
    diversion_percent: r(diversionPercent),
    meets_diversion_target: meetsTarget,
    reuse_value_naira: reuseValue,
  };
}
