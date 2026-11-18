/**
 * Optional transportation on an estimate.
 *
 * Deliveries are real money and were missing from every quotation: a client
 * read a grand total that silently excluded haulage to site. This module owns
 * the one honest rule set for adding it:
 *
 *  - it is off unless the user turns it on, so no figure is invented;
 *  - an enabled line with no amount yet is shown as "(to be agreed)" rather
 *    than as a zero, which would read as "free delivery";
 *  - the grand total only grows when there is a real amount AND the caller
 *    supplied the numeric base to add it to. When the base is unknown the
 *    document says "excl. transportation" instead of quietly leaving it out.
 */

export interface TransportationChoice {
  enabled: boolean;
  /** Amount in the estimate's own currency. */
  amount: number;
}

export const TRANSPORTATION_LABEL = "Transportation";
export const TRANSPORTATION_TO_AGREE = "(to be agreed)";

export const NO_TRANSPORTATION: TransportationChoice = {
  enabled: false,
  amount: 0,
};

/** A usable amount: finite, never negative, rounded to the currency's cent. */
export function cleanTransportAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Whether the choice adds a line the reader should see. */
export function showsTransportation(
  choice: TransportationChoice | null | undefined,
): boolean {
  return Boolean(choice?.enabled);
}

/** The amount that may be added to a total, or 0 when there is none yet. */
export function transportationAmount(
  choice: TransportationChoice | null | undefined,
): number {
  return choice?.enabled ? cleanTransportAmount(choice.amount) : 0;
}

/** Base total plus transportation, in the same currency. */
export function totalWithTransportation(
  base: number,
  choice: TransportationChoice | null | undefined,
): number {
  const safeBase = Number.isFinite(base) ? base : 0;
  return Math.round((safeBase + transportationAmount(choice)) * 100) / 100;
}

export interface TransportationRow {
  label: string;
  value: string;
}

/** The line a quotation or a results card shows for transportation. */
export function transportationRow(
  choice: TransportationChoice | null | undefined,
  format: (n: number) => string,
): TransportationRow | null {
  if (!showsTransportation(choice)) return null;
  const amount = transportationAmount(choice);
  return {
    label: TRANSPORTATION_LABEL,
    value: amount > 0 ? format(amount) : TRANSPORTATION_TO_AGREE,
  };
}

/**
 * The honest label for the total row: it says what the figure includes.
 */
export function grandTotalLabel(
  choice: TransportationChoice | null | undefined,
  baseKnown: boolean,
): string {
  if (!showsTransportation(choice)) return "Grand total";
  const amount = transportationAmount(choice);
  if (baseKnown && amount > 0) return "Grand total (incl. transportation)";
  return "Grand total (excl. transportation)";
}
