/**
 * FRELUX Merchant Punchout — SAP OCI (Market Intelligence Pillar 6)
 *
 * OCI is the URL-driven punchout dialect of SAP SRM/Ariba-style portals
 * (Bunnings Trade AU and Builders Warehouse ZA style trade portals, and
 * many UK/EU merchants on SAP stacks). The buyer appends hook parameters
 * to the merchant's catalogue URL; on checkout the merchant POSTs the
 * cart back as flat NEW_ITEM-* form pairs, one item block per line.
 *
 * Deterministic protocol layer, same house rules:
 *   - buildOciPunchoutUrl: standard OCI hook parameters; credentials
 *     come from the merchant config store and are never invented.
 *   - parseOciCartForm: NEW_ITEM-MATNR[n] / -DESCRIPTION[n] /
 *     -QUANTITY[n] / -UNITPRICE[n] / -PRICEUNIT[n] / -UNIT[n] /
 *     -CURRENCY[n] blocks; a line without a part number, quantity or
 *     price is excluded with a warning, never guessed. The parsed
 *     total must reconcile with the line sum.
 */

export interface OciMerchantConfig {
  merchantName: string;
  /** Catalogue entry URL, e.g. https://trade.example.com/sap/bbp/bb_pshopping. */
  baseUrl: string;
  /** OCI technical user the merchant issued. */
  username: string;
  /** OCI password from the merchant config store. */
  password: string;
  currency: string;
}

export interface OciPunchoutOptions {
  /** Where the merchant posts the cart at checkout (HOOK_URL). */
  hookUrl: string;
  /** HOOK_LEVEL: 1 = basket data only, 2 = basket + account assignment. */
  hookLevel?: 1 | 2;
}

export function buildOciPunchoutUrl(
  config: OciMerchantConfig,
  opts: OciPunchoutOptions,
): { ok: boolean; url: string | null; errors: string[] } {
  const errors: string[] = [];
  if (!config.baseUrl?.trim()) errors.push("Merchant OCI base URL is required.");
  if (!config.username?.trim()) errors.push("Merchant OCI username is required: credentials are never guessed.");
  if (!config.password?.trim()) errors.push("Merchant OCI password is required: credentials are never guessed.");
  if (!opts.hookUrl?.trim()) errors.push("hookUrl is required: the merchant needs a checkout target.");
  if (errors.length > 0) return { ok: false, url: null, errors };

  const base = config.baseUrl.trim();
  const joiner = base.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    username: config.username.trim(),
    password: config.password.trim(),
    HOOK_LEVEL: String(opts.hookLevel ?? 2),
    HOOK_URL: opts.hookUrl.trim(),
    "~okcode": "ADDI",
  });
  return { ok: true, url: `${base}${joiner}${params.toString()}`, errors: [] };
}

export interface OciCartLine {
  matnr: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  priceUnit: number;
  currency: string | null;
  lineTotal: number;
}

export interface OciCart {
  ok: boolean;
  lines: OciCartLine[];
  total: number;
  currency: string | null;
  warnings: string[];
  errors: string[];
}

/**
 * Parse the merchant's OCI checkout POST. Keys are the standard flat
 * NEW_ITEM-* form pairs indexed from 1: NEW_ITEM-MATNR[1], -DESCRIPTION[1],
 * -QUANTITY[1], -UNITPRICE[1], -PRICEUNIT[1] (units per price),
 * -UNIT[1], -CURRENCY[1]. Values may arrive percent-encoded; both
 * URLSearchParams-style and raw record inputs are accepted.
 */
export function parseOciCartForm(
  form: URLSearchParams | Record<string, string>,
): OciCart {
  const cart: OciCart = {
    ok: false,
    lines: [],
    total: 0,
    currency: null,
    warnings: [],
    errors: [],
  };

  const get = (key: string): string | null => {
    if (form instanceof URLSearchParams) return form.get(key);
    return Object.prototype.hasOwnProperty.call(form, key)
      ? (form as Record<string, string>)[key]
      : null;
  };
  const keys =
    form instanceof URLSearchParams
      ? Array.from(new Set(form.keys()))
      : Object.keys(form);

  // Gather the item indexes actually present.
  const indexes = new Set<number>();
  for (const k of keys) {
    const m = k.match(/^NEW_ITEM-MATNR\[(\d+)\]$/i);
    if (m) indexes.add(Number(m[1]));
  }
  if (indexes.size === 0) {
    cart.errors.push(
      "No NEW_ITEM-MATNR entries in the OCI checkout: the cart carried no line data and nothing was imported.",
    );
    return cart;
  }

  const idxRe = (field: string, i: number) =>
    new RegExp(`^${field}\\[${i}\\]$`, "i");

  for (const i of Array.from(indexes).sort((a, b) => a - b)) {
    const find = (field: string) => keys.find((k) => idxRe(field, i).test(k));
    const val = (field: string) => {
      const k = find(field);
      return k ? get(k) : null;
    };

    const matnr = (val("NEW_ITEM-MATNR") ?? "").trim();
    if (!matnr) {
      cart.warnings.push(
        `OCI cart line ${i} carries no material number: it was excluded instead of guessed.`,
      );
      continue;
    }
    const qtyRaw = val("NEW_ITEM-QUANTITY");
    const qty = qtyRaw !== null ? Number(qtyRaw) : NaN;
    if (!Number.isFinite(qty) || qty <= 0) {
      cart.warnings.push(
        `OCI line ${matnr} has an invalid quantity: it was excluded instead of guessed.`,
      );
      continue;
    }
    const priceRaw = val("NEW_ITEM-UNITPRICE");
    const price = priceRaw !== null ? Number(priceRaw.replace(",", ".")) : NaN;
    if (!Number.isFinite(price) || price < 0) {
      cart.warnings.push(
        `OCI line ${matnr} has an invalid unit price: it was excluded instead of guessed.`,
      );
      continue;
    }
    // PRICEUNIT = how many units the price covers (e.g. price per 100).
    const priceUnitRaw = val("NEW_ITEM-PRICEUNIT");
    const priceUnit =
      priceUnitRaw !== null && Number(priceUnitRaw) > 0 ? Number(priceUnitRaw) : 1;
    const currency = (val("NEW_ITEM-CURRENCY") ?? "").trim() || null;
    if (cart.currency === null && currency) cart.currency = currency;
    if (currency && cart.currency && currency !== cart.currency) {
      cart.warnings.push(
        `OCI line ${matnr} is priced in ${currency} while the rest of the cart is ${cart.currency}: flagged for manual review.`,
      );
    }
    const lineTotal =
      Math.round(((qty / priceUnit) * price) * 100) / 100;
    cart.lines.push({
      matnr,
      description: (val("NEW_ITEM-DESCRIPTION") ?? "").trim(),
      quantity: qty,
      unit: (val("NEW_ITEM-UNIT") ?? "").trim() || null,
      unitPrice: price,
      priceUnit,
      currency,
      lineTotal,
    });
  }

  if (cart.lines.length === 0) {
    cart.errors.push(
      "Every OCI line was invalid or unidentifiable: the cart was refused and nothing was imported.",
    );
    return cart;
  }

  const lineSum =
    Math.round(cart.lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const totalRaw = get("NEW_ITEM-TOTALPRICE");
  if (totalRaw !== null) {
    const declared = Number(totalRaw.replace(",", "."));
    if (Number.isFinite(declared)) {
      cart.total = Math.round(declared * 100) / 100;
      if (Math.abs(cart.total - lineSum) > 0.01) {
        cart.errors.push(
          `OCI cart total (${cart.total}) disagrees with the line sum (${lineSum}): the cart was refused instead of guessed.`,
        );
        return cart;
      }
    } else {
      cart.warnings.push(
        "OCI cart total was not numeric: the line sum is used and the cart is flagged for review.",
      );
      cart.total = lineSum;
    }
  } else {
    cart.warnings.push(
      "OCI checkout carried no total: the line sum is used and the cart is flagged for review.",
    );
    cart.total = lineSum;
  }

  cart.ok = true;
  return cart;
}
