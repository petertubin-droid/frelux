// =========================================================
// price-alert-digest — the weekly material price alert body
//
// The weekly digest used to email newsletter subscribers the
// general material list, whatever market they were in. The
// intelligence dashboard has carried a per-user market and a
// price-move threshold since it shipped, and nothing read them:
// a visitor who asked for alerts only when a material moved
// 5% still received every week, and a visitor in the UK was
// shown Nigerian prices.
//
// This module holds the decisions, so they can be tested
// without a live mailbox:
//   - which rows belong to the recipient's market;
//   - whether a change is knowable at all (it is not, when
//     either the previous or the current price is missing);
//   - which moves cross the recipient's threshold;
//   - how a price is written in a currency we may not have a
//     symbol for.
//
// Deliberately pure: no Deno globals, no network, no database.
// The caller fetches, this decides.
// =========================================================

export interface MarketPriceRow {
  material_slug: string;
  product_name?: string | null;
  unit?: string | null;
  currency?: string | null;
  current_price?: number | null;
  previous_price?: number | null;
  price_change_percent?: number | null;
  verification_status?: string | null;
  supplier_name?: string | null;
  last_verified_at?: string | null;
  market?: string | null;
}

export interface AlertPrice {
  slug: string;
  name: string;
  unit: string;
  currency: string | null;
  price: number;
  previousPrice: number | null;
  /** Null when the change cannot be known, never zero. */
  changePct: number | null;
  /** "verified" | "unverified" | "stale" | "no_data" | null */
  verification: string | null;
  supplier: string | null;
  lastVerifiedAt: string | null;
}

export interface DigestSplit {
  moved: AlertPrice[];
  steady: AlertPrice[];
  /** Rows that had no usable price and were left out of the email. */
  unusable: number;
}

const MAX_ROWS = 40;

function finite(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/**
 * Keeps rows that belong to the market and carry a real price.
 *
 * A row priced at zero or missing a price is not a price of nothing: it is an
 * unpriced material, and emailing it would read as free. Those are counted so
 * the email can say how many were left out instead of quietly hiding them.
 */
export function marketAlertRows(
  rows: MarketPriceRow[],
  market: string,
): { prices: AlertPrice[]; unusable: number } {
  const wanted = market.trim().toUpperCase();
  const prices: AlertPrice[] = [];
  let unusable = 0;

  for (const row of rows) {
    if (row.market && row.market.trim().toUpperCase() !== wanted) continue;
    const price = finite(row.current_price);
    if (price === null || price <= 0) {
      unusable += 1;
      continue;
    }
    const previous = finite(row.previous_price);
    const recorded = finite(row.price_change_percent);
    // A recorded percentage is preferred, but it must agree with the two
    // prices; when it does not, the prices win, because they are what the
    // visitor can check against the tracker.
    const computed =
      previous !== null && previous > 0
        ? ((price - previous) / previous) * 100
        : null;
    const changePct =
      computed !== null
        ? round1(computed)
        : recorded !== null
          ? round1(recorded)
          : null;

    prices.push({
      slug: row.material_slug,
      name: (row.product_name ?? row.material_slug).trim(),
      unit: (row.unit ?? "").trim(),
      currency: row.currency ? row.currency.trim().toUpperCase() : null,
      price,
      previousPrice: previous,
      changePct,
      verification: row.verification_status ?? null,
      supplier: row.supplier_name ?? null,
      lastVerifiedAt: row.last_verified_at ?? null,
    });
  }

  prices.sort(
    (a, b) => Math.abs(b.changePct ?? -1) - Math.abs(a.changePct ?? -1),
  );
  return { prices: prices.slice(0, MAX_ROWS), unusable };
}

/**
 * Splits the market's prices into the moves worth reporting and the rest.
 *
 * A threshold of zero or less means "tell me about anything that moved", so a
 * known change of any size counts. A change that cannot be known is never
 * reported as a move, and is never reported as steady either: it goes in
 * neither list, so the email does not imply a material held its price.
 */
export function splitByThreshold(
  prices: AlertPrice[],
  thresholdPct: number,
): DigestSplit {
  const threshold =
    Number.isFinite(thresholdPct) && thresholdPct > 0 ? thresholdPct : 0;
  const moved: AlertPrice[] = [];
  const steady: AlertPrice[] = [];

  for (const price of prices) {
    if (price.changePct === null) continue;
    if (Math.abs(price.changePct) >= threshold && price.changePct !== 0)
      moved.push(price);
    else steady.push(price);
  }
  return { moved, steady, unusable: 0 };
}

/**
 * Writes an amount in its own currency.
 *
 * The currency is whatever the row recorded. When it is missing or not a code
 * Intl accepts, the amount is written with the code beside it rather than with
 * a symbol borrowed from another market: a dollar sign on a Nigerian price is
 * worse than no symbol at all.
 */
export function formatMoney(amount: number, currency: string | null): string {
  if (!Number.isFinite(amount)) return "";
  const code = (currency ?? "").trim().toUpperCase();
  if (code) {
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        maximumFractionDigits: amount >= 1000 ? 0 : 2,
      }).format(amount);
    } catch {
      return `${code} ${amount.toLocaleString("en", { maximumFractionDigits: 2 })}`;
    }
  }
  return amount.toLocaleString("en", { maximumFractionDigits: 2 });
}

/** What the price is backed by, in the words the email uses. */
export function verificationNote(price: AlertPrice): string {
  switch ((price.verification ?? "").toLowerCase()) {
    case "verified":
      return price.lastVerifiedAt
        ? `verified ${price.lastVerifiedAt.slice(0, 10)}`
        : "verified";
    case "unverified":
      return "unverified supplier figure";
    case "stale":
      return "stale: the last check is old, confirm before you buy";
    case "no_data":
      return "no supplier data yet, this is an estimate";
    default:
      return "source not recorded";
  }
}

export interface AlertDigestEmail {
  subject: string;
  html: string;
  /** True when at least one move crossed the threshold. */
  hasMoves: boolean;
  movedCount: number;
  steadyCount: number;
}

const SITE = "https://freluxtools.com";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The weekly email for one recipient's market.
 *
 * It says what it cannot tell them: an unpriced material is counted, a change
 * that cannot be computed is left out of both lists, and a market with no
 * prices gets one honest line instead of an empty table that looks broken.
 */
export function buildAlertDigest(params: {
  market: string;
  marketName?: string | null;
  prices: AlertPrice[];
  thresholdPct: number;
  unusable?: number;
  cadence?: string | null;
}): AlertDigestEmail {
  const marketName = (params.marketName ?? "").trim() || params.market;
  const threshold =
    Number.isFinite(params.thresholdPct) && params.thresholdPct > 0
      ? params.thresholdPct
      : 0;
  const { moved, steady } = splitByThreshold(params.prices, threshold);
  const unusable = params.unusable ?? 0;

  const line = (price: AlertPrice) => {
    const change =
      price.changePct === null
        ? ""
        : ` <span style="color:${price.changePct > 0 ? "#b91c1c" : "#15803d"};font-size:12px;">(${price.changePct > 0 ? "+" : ""}${price.changePct.toFixed(1)}%)</span>`;
    const unit = price.unit ? ` per ${esc(price.unit)}` : "";
    const supplier = price.supplier ? ` · ${esc(price.supplier)}` : "";
    return `<li><strong>${esc(price.name)}</strong>: ${formatMoney(price.price, price.currency)}${unit}${change}<br><span style="color:#888;font-size:12px;">${esc(verificationNote(price))}${supplier}</span></li>`;
  };

  const thresholdText =
    threshold > 0 ? `moved ${threshold}% or more` : "moved at all";
  const subject =
    moved.length > 0
      ? `${marketName} material prices: ${moved.length} ${moved.length === 1 ? "material" : "materials"} ${thresholdText}`
      : `${marketName} material prices: nothing ${thresholdText} this week`;

  const parts: string[] = [];
  if (params.prices.length === 0) {
    parts.push(
      `<p>No tracked prices for ${esc(marketName)} yet, so there is nothing to report this week. Prices appear here as soon as suppliers in your market are being checked.</p>`,
    );
  } else if (moved.length === 0) {
    parts.push(
      `<p>No tracked material in ${esc(marketName)} ${thresholdText} this week. Your estimates should still hold.</p>`,
    );
  } else {
    parts.push(
      `<p>These materials ${thresholdText} in ${esc(marketName)} this week. Update your project prices and re-run your estimate before you buy.</p><ul style="line-height:1.9;">${moved.map(line).join("")}</ul>`,
    );
  }

  if (steady.length > 0 && moved.length > 0) {
    parts.push(
      `<p style="color:#555;font-size:13px;">${steady.length} other tracked ${steady.length === 1 ? "material" : "materials"} held or moved less than the threshold you set.</p>`,
    );
  }
  if (unusable > 0) {
    parts.push(
      `<p style="color:#888;font-size:12px;">${unusable} ${unusable === 1 ? "material is" : "materials are"} not priced in your market yet and ${unusable === 1 ? "was" : "were"} left out rather than shown at zero.</p>`,
    );
  }

  const cadence = (params.cadence ?? "").trim().toLowerCase();
  if (cadence === "instant") {
    parts.push(
      `<p style="color:#888;font-size:12px;">You asked for instant alerts. This is the weekly summary; instant moves arrive on the dashboard.</p>`,
    );
  }

  parts.push(
    `<p>Change the threshold or stop these alerts in <a href="${SITE}/intelligence/">your price alert settings</a>.</p>`,
    `<p>Build well,<br>The Frelux team</p>`,
  );

  return {
    subject,
    html: parts.join("\n"),
    hasMoves: moved.length > 0,
    movedCount: moved.length,
    steadyCount: steady.length,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
