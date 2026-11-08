/**
 * AdSense authorised sellers (ads.txt / app-ads.txt).
 *
 * A site can authorise more than one publisher account. Each authorised account
 * needs its own `google.com, pub-…` line; they sit side by side and none of them
 * replaces another. Dropping a line withdraws that account's authorisation, which
 * is why adding a second account must never be implemented as replacing the
 * first.
 */

/** Google's certification authority ID for AdSense sellers. */
export const ADS_TXT_CERT_AUTHORITY = "f08c47fec0942fa0";

/** Google's seller account domain in an ads.txt record. */
export const ADS_TXT_EXCHANGE_DOMAIN = "google.com";

/**
 * Normalise whatever an operator types into a bare `pub-…` account ID.
 *
 * `ca-pub-123…`, `pub-123…` and `123…` all mean the same account, and AdSense
 * shows the publisher ID with the `ca-` prefix while ads.txt wants it without.
 * Returns "" when the input carries no digits, so a typo yields no line at all
 * rather than a seller record Google will reject.
 */
export function normalizePublisherAccountId(input: string): string {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(?:ca-)?pub-(\d{6,20})/i);
  if (match) return `pub-${match[1]}`;
  const digits = trimmed.replace(/[^0-9]/g, "");
  return digits.length >= 6 ? `pub-${digits}` : "";
}

/** Publisher ID in the form AdSense code expects: `ca-pub-…`. */
export function toPublisherId(input: string): string {
  const account = normalizePublisherAccountId(input);
  return account ? `ca-${account}` : "";
}

/** Split a comma, semicolon or newline separated field into publisher IDs. */
export function parsePublisherList(input: string): string[] {
  return String(input ?? "")
    .split(/[\s,;]+/)
    .map((part) => toPublisherId(part))
    .filter((id) => id !== "");
}

/**
 * ads.txt records for the given accounts, primary first, deduplicated.
 *
 * Order is stable and the primary is always included, so an operator who swaps
 * the primary in the admin keeps both accounts authorised instead of silently
 * withdrawing one.
 */
export function adsTxtRecords(
  primary: string,
  additional: readonly string[] | string,
): string[] {
  const list: readonly string[] = Array.isArray(additional)
    ? additional
    : parsePublisherList(additional as string);
  const seen = new Set<string>();
  const records: string[] = [];
  for (const candidate of [primary, ...list]) {
    const account = normalizePublisherAccountId(candidate);
    if (!account || seen.has(account)) continue;
    seen.add(account);
    records.push(
      `${ADS_TXT_EXCHANGE_DOMAIN}, ${account}, DIRECT, ${ADS_TXT_CERT_AUTHORITY}`,
    );
  }
  return records;
}

/** Full ads.txt body, trailing newline included. */
export function adsTxtBody(
  primary: string,
  additional: readonly string[] | string,
): string {
  const records = adsTxtRecords(primary, additional);
  return records.length > 0 ? `${records.join("\n")}\n` : "";
}
