/**
 * Shared calendar-month arithmetic for schedule/retention engines.
 *
 * Adds whole months to an ISO date, clamping the day-of-month to the last
 * day of the target month (Jan 31 + 1 month => Feb 28/29). Invalid input
 * is returned unchanged rather than shifted.
 */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const target = new Date(d.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}
