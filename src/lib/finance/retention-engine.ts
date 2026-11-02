/**
 * FRELUX Retention, Retention Bonds & Defect Liability Period Engine
 * (Commercial Pillar 4)
 *
 * Contractual cash retention for construction contracts, computed the
 * way standard forms (JCT, FIDIC, NEC) apply it:
 *
 *  - Retention is withheld from EVERY interim payment at the retention
 *    rate (typically 5% of each payment).
 *  - Half of the retention pot is released at Practical Completion.
 *  - The remaining retention is released after the Defects Liability
 *    Period (typically 12 months from Practical Completion).
 *  - A retention BOND replaces the cash withholding: the contractor is
 *    paid in full and a surety bond (typically 5% of contract value,
 *    premium priced separately) stands behind the employer instead.
 *
 * House rules, identical to every other Frelux engine:
 *  - Nothing is invented. An invalid rate, a missing contract amount
 *    or a nonsensical release share is REFUSED with a warning, never
 *    silently defaulted.
 *  - Rounding is penny-exact: the ledger balances to the last kobo, with
 *    any rounding remainder carried on the DLP release (the final event).
 */

import { addMonthsIso } from "../shared/dates";

export { addMonthsIso };

export interface RetentionConfig {
  /** Retention withheld from each payment, in percent. Default 5. */
  retentionPercent?: number;
  /**
   * Share of the retention pot released at Practical Completion, in
   * percent of the withheld total. Default 50 (the typical 2.5% of the
   * 5% withheld).
   */
  releaseAtPcPercent?: number;
  /** Defects Liability Period, months from Practical Completion. Default 12. */
  dlpMonths?: number;
  /** A retention bond replaces cash retention: payments stay gross. */
  retentionBond?: boolean;
  /** Bond premium as percent of contract value (informational; priced separately). */
  bondPremiumPercent?: number;
}

export interface RetentionEvent {
  label: string;
  date: string | null;
  amount: number;
  /** True for the two release events, false for the withheld pot summary. */
  isRelease: boolean;
}

export interface RetentionSchedule {
  ok: boolean;
  retentionPercent: number;
  releaseAtPcPercent: number;
  dlpMonths: number;
  /** Total cash withheld across the schedule (0 when bonded). */
  withheldTotal: number;
  /** Cash released at Practical Completion. */
  releaseAtPc: number;
  /** Cash released at the end of the Defects Liability Period. */
  releaseAfterDlp: number;
  /** Practical Completion date (explicit or derived). */
  practicalCompletionDate: string | null;
  /** DLP end date = Practical Completion + dlpMonths. */
  dlpEndDate: string | null;
  /** Retained-with-bond marker and premium when bonded. */
  retentionBond: boolean;
  bondPremiumPercent: number | null;
  notes: string[];
  warnings: string[];
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Add whole months to an ISO date, clamping month-overflow. */


/**
 * Compute a retention schedule for a contract. `withheldTotal` is supplied
 * either directly (a contract-level pot) or built payment-by-payment by the
 * cash-flow escalation helper below; this function only decides how the pot
 * splits and when it releases.
 */
export function computeRetention(params: {
  /** Total retention cash withheld (the pot to release). */
  withheldTotal?: number;
  /** Contract value; used for the bond premium disclosure. */
  contractAmount?: number;
  /** Practical Completion date. Required for release dates. */
  practicalCompletionDate?: string | null;
  config?: RetentionConfig;
}): RetentionSchedule {
  const cfg = params.config ?? {};
  const warnings: string[] = [];
  const notes: string[] = [];

  const retentionPercent = cfg.retentionPercent ?? 5;
  const releaseAtPcPercent = cfg.releaseAtPcPercent ?? 50;
  const dlpMonths = cfg.dlpMonths ?? 12;
  const retentionBond = cfg.retentionBond === true;

  let ok = true;
  if (!Number.isFinite(retentionPercent) || retentionPercent < 0 || retentionPercent > 100) {
    warnings.push(
      `Retention percent must be between 0 and 100 (received ${retentionPercent}); no retention schedule can be computed.`,
    );
    ok = false;
  }
  if (!Number.isFinite(releaseAtPcPercent) || releaseAtPcPercent < 0 || releaseAtPcPercent > 100) {
    warnings.push(
      `Release-at-PC share must be between 0 and 100 (received ${releaseAtPcPercent}); no retention schedule can be computed.`,
    );
    ok = false;
  }
  if (!Number.isFinite(dlpMonths) || dlpMonths < 0) {
    warnings.push(
      `DLP months must be zero or more (received ${dlpMonths}); no retention schedule can be computed.`,
    );
    ok = false;
  }
  if (!ok) {
    return {
      ok: false,
      retentionPercent,
      releaseAtPcPercent,
      dlpMonths,
      withheldTotal: 0,
      releaseAtPc: 0,
      releaseAfterDlp: 0,
      practicalCompletionDate: null,
      dlpEndDate: null,
      retentionBond,
      bondPremiumPercent: null,
      notes,
      warnings,
    };
  }

  const pot =
    params.withheldTotal !== undefined && Number.isFinite(params.withheldTotal)
      ? Math.max(0, params.withheldTotal)
      : 0;
  const pcDate = params.practicalCompletionDate ?? null;
  if (pcDate && Number.isNaN(new Date(pcDate).getTime())) {
    warnings.push(
      "Practical Completion date is not a valid ISO date; release amounts are computed but the release DATES are omitted.",
    );
  }
  const validPc = pcDate && !Number.isNaN(new Date(pcDate).getTime()) ? pcDate : null;
  if (!validPc && pot > 0) {
    warnings.push(
      "No Practical Completion date was supplied: the retention split is computed but the release dates cannot be scheduled.",
    );
  }
  const dlpEndDate = validPc ? addMonthsIso(validPc, dlpMonths) : null;

  // Bond replaces cash retention: the pot is not withheld in cash.
  if (retentionBond) {
    const premium = Number.isFinite(cfg.bondPremiumPercent)
      ? (cfg.bondPremiumPercent as number)
      : null;
    if (params.contractAmount && premium !== null) {
      notes.push(
        `Retention bond of ${retentionPercent}% of contract value replaces cash withholding; the indicative premium at ${premium}% of contract value is ${round2(params.contractAmount * (premium / 100)).toFixed(2)} — priced by the surety, never by this engine.`,
      );
    } else {
      notes.push(
        `Retention bond of ${retentionPercent}% replaces cash withholding: interim payments are gross and the surety stands behind the employer.`,
      );
    }
    if (premium === null) {
      notes.push("No bond premium percent was supplied, so no premium figure is shown.");
    }
    return {
      ok: true,
      retentionPercent,
      releaseAtPcPercent,
      dlpMonths,
      withheldTotal: 0,
      releaseAtPc: 0,
      releaseAfterDlp: 0,
      practicalCompletionDate: validPc,
      dlpEndDate,
      retentionBond: true,
      bondPremiumPercent: premium,
      notes,
      warnings,
    };
  }

  const releaseAtPc = round2(pot * (releaseAtPcPercent / 100));
  // Rounding remainder rides on the final event so the ledger balances.
  const releaseAfterDlp = round2(pot - releaseAtPc);

  notes.push(
    `Retention of ${retentionPercent}% is withheld from every interim payment; ${releaseAtPcPercent}% of the withheld pot (${releaseAtPc.toFixed(2)}) is released at Practical Completion${validPc ? ` (${validPc})` : ""}.`,
  );
  notes.push(
    `The remaining retention (${releaseAfterDlp.toFixed(2)}) is released after the ${dlpMonths}-month Defects Liability Period${dlpEndDate ? ` (ends ${dlpEndDate})` : ""}.`,
  );
  notes.push("Withheld + released amounts balance exactly; rounding remainder is carried on the DLP release.");

  return {
    ok: true,
    retentionPercent,
    releaseAtPcPercent,
    dlpMonths,
    withheldTotal: round2(pot),
    releaseAtPc,
    releaseAfterDlp,
    practicalCompletionDate: validPc,
    dlpEndDate,
    retentionBond: false,
    bondPremiumPercent: null,
    notes,
    warnings,
  };
}

/**
 * Withhold retention from ONE interim payment. Gross in, net + withheld out,
 * penny-rounded.
 */
export function withholdFromPayment(
  grossAmount: number,
  config: RetentionConfig = {},
): { gross: number; retained: number; net: number } {
  const pct = config.retentionPercent ?? 5;
  const gross = Number.isFinite(grossAmount) ? Math.max(0, grossAmount) : 0;
  const retained = round2(gross * (pct / 100));
  return { gross: round2(gross), retained, net: round2(gross - retained) };
}

export interface RetentionPayment {
  label: string;
  date: string;
  gross: number;
  retained: number;
  net: number;
}

export interface RetentionEscalatedSchedule {
  ok: boolean;
  payments: RetentionPayment[];
  /** The two release events (PC and DLP end) with their dates and amounts. */
  releases: { atPc: number; atDlp: number; pcDate: string | null; dlpEndDate: string | null };
  withheldTotal: number;
  netTotal: number;
  releasedTotal: number;
  /** net + released == gross total, to the kobo. */
  balances: boolean;
  schedule: RetentionSchedule;
  notes: string[];
  warnings: string[];
}

/**
 * Cash-flow S-Curve escalation: apply retention withholding to a milestone
 * schedule and append the retention release events. Payments shrink by the
 * retention rate; the withheld pot releases at Practical Completion and at
 * the end of the Defects Liability Period. The schedule balances to the
 * kobo: every naira paid is accounted for as net payment or release.
 */
export function escalateCashFlowWithRetention(params: {
  payments: { label: string; date: string; amount: number }[];
  /** Practical Completion. Defaults to the LAST payment date (documented inference). */
  practicalCompletionDate?: string | null;
  config?: RetentionConfig;
}): RetentionEscalatedSchedule {
  const cfg = params.config ?? {};
  const warnings: string[] = [];
  const notes: string[] = [];
  const payments: RetentionPayment[] = [];
  const round2b = (v: number) => Math.round(v * 100) / 100;

  if (cfg.retentionBond === true) {
    // Bonded: payments stay gross; the schedule documents the bond.
    let cumulativeGross = 0;
    for (const p of params.payments) {
      cumulativeGross += p.amount;
      payments.push({
        label: p.label,
        date: p.date,
        gross: round2b(p.amount),
        retained: 0,
        net: round2b(p.amount),
      });
    }
    const schedule = computeRetention({
      withheldTotal: 0,
      contractAmount: cumulativeGross,
      practicalCompletionDate:
        params.practicalCompletionDate ??
        params.payments[params.payments.length - 1]?.date ??
        null,
      config: cfg,
    });
    notes.push(
      "Retention bond replaces cash retention: every milestone is disbursed gross and no retention release events are scheduled.",
    );
    return {
      ok: schedule.ok,
      payments,
      releases: { atPc: 0, atDlp: 0, pcDate: schedule.practicalCompletionDate, dlpEndDate: schedule.dlpEndDate },
      withheldTotal: 0,
      netTotal: round2b(cumulativeGross),
      releasedTotal: 0,
      balances: true,
      schedule,
      notes,
      warnings: [...schedule.warnings],
    };
  }

  let grossTotal = 0;
  let withheldTotal = 0;
  for (const p of params.payments) {
    const { gross, retained, net } = withholdFromPayment(p.amount, cfg);
    grossTotal = round2b(grossTotal + gross);
    withheldTotal = round2b(withheldTotal + retained);
    payments.push({ label: p.label, date: p.date, gross, retained, net });
  }

  const pcDate =
    params.practicalCompletionDate ??
    params.payments[params.payments.length - 1]?.date ??
    null;
  if (pcDate && !params.practicalCompletionDate) {
    notes.push(
      `Practical Completion is inferred from the final milestone date (${pcDate}); supply an explicit date when the contract fixes another.`,
    );
  }

  const schedule = computeRetention({
    withheldTotal,
    practicalCompletionDate: pcDate,
    config: cfg,
  });

  const netTotal = round2b(grossTotal - withheldTotal);
  const releasedTotal = round2b(schedule.releaseAtPc + schedule.releaseAfterDlp);
  const balances = round2b(netTotal + releasedTotal) === grossTotal;
  if (!balances) {
    warnings.push(
      "Retention ledger does not balance to the kobo; this is an engine defect and must be reported, not a rounding guess.",
    );
  }
  notes.push(
    `S-Curve escalation: ${payments.length} milestones withhold ${cfg.retentionPercent ?? 5}% each (total ${withheldTotal.toFixed(2)}); net disbursements total ${netTotal.toFixed(2)}.`,
  );
  notes.push(
    `Retention releases return ${releasedTotal.toFixed(2)} to the contractor: ${schedule.releaseAtPc.toFixed(2)} at Practical Completion and ${schedule.releaseAfterDlp.toFixed(2)} at DLP end.`,
  );

  return {
    ok: schedule.ok && balances,
    payments,
    releases: {
      atPc: schedule.releaseAtPc,
      atDlp: schedule.releaseAfterDlp,
      pcDate: schedule.practicalCompletionDate,
      dlpEndDate: schedule.dlpEndDate,
    },
    withheldTotal,
    netTotal,
    releasedTotal,
    balances,
    schedule,
    notes,
    warnings: [...schedule.warnings, ...warnings],
  };
}
