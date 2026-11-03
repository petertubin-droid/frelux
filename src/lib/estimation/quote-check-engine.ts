/**
 * Quote Check engine — a contractor or supplier quote measured against the
 * FRELUX price book.
 *
 * Why this exists: every competitor that offers a quote tool (ConstructionAll's
 * Quote Analyzer is the closest) compares a quote against *their* default rate
 * table and calls the difference an overprice. That hides which number is
 * evidence and which is arithmetic. Here the reference rate is supplied by the
 * caller from the market price book together with its evidence class, and the
 * engine does nothing but arithmetic on it.
 *
 * Rules the engine enforces:
 * - No reference price means no verdict. The line is reported as
 *   `no_reference` and contributes nothing to any total or saving figure.
 * - A unit mismatch is not comparable, so it is reported as `unit_mismatch`
 *   rather than converted behind the user's back.
 * - A zero or negative reference rate is not a price; it is `no_reference`.
 * - Money never appears here. Amounts are plain numbers in the quote's own
 *   currency, and the caller formats them.
 *
 * PURE module: no I/O, no Supabase, no currency, no market assumptions.
 */

export type QuoteLineStatus =
  "fair" | "over" | "under" | "no_reference" | "unit_mismatch" | "invalid";

export interface QuoteReference {
  /** Reference rate per unit, from the market price book. */
  rate: number;
  /** Unit the reference rate is expressed in, e.g. "bag", "m2". */
  unit: string;
  /** Market whose price book supplied the rate. */
  market: string;
  /** Material name as the price book holds it. */
  name: string;
  /** Evidence class of the reference price. */
  evidence: string;
}

export interface QuoteLineInput {
  /** Stable key so the UI can map results back to its rows. */
  key: string;
  description: string;
  /** Quantity quoted. Must be > 0 to take part in totals. */
  quantity: number;
  unit: string;
  /** Rate per unit as quoted by the supplier or contractor. */
  quotedRate: number;
  reference?: QuoteReference | null;
}

export interface QuoteLineResult {
  key: string;
  description: string;
  quantity: number;
  unit: string;
  quotedRate: number;
  /** quantity x quotedRate, 0 when the line is invalid. */
  quotedAmount: number;
  referenceRate: number | null;
  referenceAmount: number | null;
  /** quotedRate - referenceRate, null when there is nothing to compare. */
  rateDelta: number | null;
  /** rateDelta / referenceRate, null when there is nothing to compare. */
  rateDeltaFraction: number | null;
  /** (quoted - reference) x quantity, null when there is nothing to compare. */
  amountDelta: number | null;
  status: QuoteLineStatus;
  /** Plain sentence explaining the status. */
  note: string;
  reference: QuoteReference | null;
}

export interface QuoteCheckResult {
  lines: QuoteLineResult[];
  /** Total of every valid line, including lines without a reference. */
  quotedTotal: number;
  /** Total of the lines that could be compared, at quoted rates. */
  comparableQuotedTotal: number;
  /** Total of the same lines at reference rates. */
  comparableReferenceTotal: number;
  /** comparableQuotedTotal - comparableReferenceTotal. Positive = quoted above market. */
  comparableDelta: number;
  /** Sum of positive amount deltas on `over` lines. Never includes uncomparable lines. */
  overpricedAmount: number;
  counts: {
    total: number;
    fair: number;
    over: number;
    under: number;
    noReference: number;
    unitMismatch: number;
    invalid: number;
  };
  /** One plain sentence for the result panel. */
  verdict: string;
}

export interface QuoteCheckOptions {
  /**
   * Band either side of the reference rate that still counts as fair.
   * 0.1 means a quoted rate within 10% of market is fair.
   */
  fairBandFraction?: number;
}

const DEFAULT_FAIR_BAND = 0.1;

const isPositive = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

const round = (value: number): number => Math.round(value * 100) / 100;

const normaliseUnit = (unit: string): string =>
  unit.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * A unit is comparable only when the two strings agree once case and spacing
 * are removed. Aliases are deliberately NOT guessed here: "m2" and "sqm" are
 * different strings, and silently treating them as equal is how a comparison
 * tool reports a saving that does not exist.
 */
const unitsComparable = (a: string, b: string): boolean =>
  normaliseUnit(a) === normaliseUnit(b);

export function checkQuote(
  lines: QuoteLineInput[],
  options: QuoteCheckOptions = {},
): QuoteCheckResult {
  const band =
    options.fairBandFraction !== undefined && options.fairBandFraction >= 0
      ? options.fairBandFraction
      : DEFAULT_FAIR_BAND;

  const results: QuoteLineResult[] = lines.map((line) => {
    const quantity = Number(line.quantity);
    const quotedRate = Number(line.quotedRate);
    const reference = line.reference ?? null;
    const base: Omit<
      QuoteLineResult,
      | "referenceRate"
      | "referenceAmount"
      | "rateDelta"
      | "rateDeltaFraction"
      | "amountDelta"
      | "status"
      | "note"
    > = {
      key: line.key,
      description: line.description,
      quantity: isPositive(quantity) ? quantity : 0,
      unit: line.unit,
      quotedRate: isPositive(quotedRate) ? quotedRate : 0,
      quotedAmount: 0,
      reference,
    };

    if (!isPositive(quantity) || !isPositive(quotedRate)) {
      return {
        ...base,
        quotedAmount: 0,
        referenceRate: null,
        referenceAmount: null,
        rateDelta: null,
        rateDeltaFraction: null,
        amountDelta: null,
        status: "invalid",
        note: "Enter a quantity and a rate above zero. This line is not counted.",
      };
    }

    const quotedAmount = round(quantity * quotedRate);

    if (!reference || !isPositive(reference.rate)) {
      return {
        ...base,
        quotedAmount,
        referenceRate: null,
        referenceAmount: null,
        rateDelta: null,
        rateDeltaFraction: null,
        amountDelta: null,
        status: "no_reference",
        note: "No price book rate for this item, so the quote cannot be judged. Confirm it directly with suppliers.",
      };
    }

    if (!unitsComparable(line.unit, reference.unit)) {
      return {
        ...base,
        quotedAmount,
        referenceRate: null,
        referenceAmount: null,
        rateDelta: null,
        rateDeltaFraction: null,
        amountDelta: null,
        status: "unit_mismatch",
        note: `The price book holds this at ${reference.unit} but the quote is per ${line.unit}. Convert one of them before comparing.`,
      };
    }

    const referenceRate = round(reference.rate);
    const referenceAmount = round(quantity * referenceRate);
    const rateDelta = round(quotedRate - referenceRate);
    const rateDeltaFraction = rateDelta / referenceRate;
    const amountDelta = round(quotedAmount - referenceAmount);

    if (Math.abs(rateDeltaFraction) <= band) {
      return {
        ...base,
        quotedAmount,
        referenceRate,
        referenceAmount,
        rateDelta,
        rateDeltaFraction,
        amountDelta,
        status: "fair",
        note: "Within the fair band of the market rate.",
      };
    }

    const over = rateDeltaFraction > 0;
    return {
      ...base,
      quotedAmount,
      referenceRate,
      referenceAmount,
      rateDelta,
      rateDeltaFraction,
      amountDelta,
      status: over ? "over" : "under",
      note: over
        ? "Quoted above the market rate by more than the fair band."
        : "Quoted below the market rate by more than the fair band. Check the specification before accepting.",
    };
  });

  const counts = {
    total: results.length,
    fair: results.filter((line) => line.status === "fair").length,
    over: results.filter((line) => line.status === "over").length,
    under: results.filter((line) => line.status === "under").length,
    noReference: results.filter((line) => line.status === "no_reference")
      .length,
    unitMismatch: results.filter((line) => line.status === "unit_mismatch")
      .length,
    invalid: results.filter((line) => line.status === "invalid").length,
  };

  const comparable = results.filter(
    (line) =>
      line.status === "fair" ||
      line.status === "over" ||
      line.status === "under",
  );

  const quotedTotal = round(
    results.reduce((total, line) => total + line.quotedAmount, 0),
  );
  const comparableQuotedTotal = round(
    comparable.reduce((total, line) => total + line.quotedAmount, 0),
  );
  const comparableReferenceTotal = round(
    comparable.reduce((total, line) => total + (line.referenceAmount ?? 0), 0),
  );
  const comparableDelta = round(
    comparableQuotedTotal - comparableReferenceTotal,
  );
  const overpricedAmount = round(
    comparable
      .filter((line) => line.status === "over")
      .reduce((total, line) => total + (line.amountDelta ?? 0), 0),
  );

  return {
    lines: results,
    quotedTotal,
    comparableQuotedTotal,
    comparableReferenceTotal,
    comparableDelta,
    overpricedAmount,
    counts,
    verdict: buildVerdict({
      counts,
      overpricedAmount,
      comparableDelta,
      comparableReferenceTotal,
      band,
    }),
  };
}

function buildVerdict(input: {
  counts: QuoteCheckResult["counts"];
  overpricedAmount: number;
  comparableDelta: number;
  comparableReferenceTotal: number;
  band: number;
}): string {
  const {
    counts,
    overpricedAmount,
    comparableDelta,
    comparableReferenceTotal,
  } = input;
  const bandPct = Math.round(input.band * 100);

  if (counts.total === 0) {
    return "Add the lines from the quote to compare them with the price book.";
  }

  const parts: string[] = [];
  if (counts.over > 0 && overpricedAmount > 0) {
    parts.push(
      `${counts.over} line${counts.over === 1 ? "" : "s"} above the fair band, worth ${overpricedAmount.toFixed(2)} at the quoted quantities`,
    );
  }
  if (counts.under > 0) {
    parts.push(
      `${counts.under} line${counts.under === 1 ? "" : "s"} below the band`,
    );
  }
  if (counts.fair > 0) {
    parts.push(`${counts.fair} within ${bandPct}% of the market rate`);
  }
  if (counts.noReference > 0) {
    parts.push(`${counts.noReference} with no price book rate`);
  }
  if (counts.unitMismatch > 0) {
    parts.push(
      `${counts.unitMismatch} in a different unit from the price book`,
    );
  }
  if (counts.invalid > 0) {
    parts.push(`${counts.invalid} incomplete`);
  }

  if (counts.fair + counts.over + counts.under === 0) {
    const blocked = parts.length > 0 ? `${parts.join(", ")}.` : "";
    return `There is no verdict yet. ${blocked}`.trim();
  }

  const direction =
    comparableDelta > 0
      ? "above"
      : comparableDelta < 0
        ? "below"
        : "level with";
  const deltaPct =
    comparableReferenceTotal > 0
      ? Math.round((Math.abs(comparableDelta) / comparableReferenceTotal) * 100)
      : 0;

  const lead =
    comparableDelta === 0
      ? "The comparable lines are level with the market rate overall."
      : `The comparable lines come to ${Math.abs(comparableDelta).toFixed(2)}, ${deltaPct}% ${direction} the market rate overall.`;

  return `${lead} ${parts.length > 0 ? `${parts.join(", ")}.` : ""}`.trim();
}
