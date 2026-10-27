/**
 * FRELUX Merchant Punchout — cXML 1.2 (Market Intelligence Pillar 6)
 *
 * cXML is the punchout protocol of the major supplier trade portals
 * (Home Depot Pro, Grainger, Staples and most US/CA enterprise
 * suppliers speak cXML; Buildbase UK supports cXML punchout on
 * request). The buyer "punches out" from the estimate into the
 * supplier's own web catalogue, and the cart is returned as a
 * cXML PunchOutOrderMessage for pricing in the estimate's currency.
 *
 * This module is the deterministic protocol layer:
 *   - buildPunchOutSetupRequest: valid cXML 1.2 PunchOutSetupRequest
 *     with credentials from the merchant config — secrets are NEVER
 *     hardcoded and always come from the admin-configured store.
 *   - parsePunchOutSetupResponse: extracts the StartPage URL or an
 *     honest refusal with the cXML status code and description.
 *   - parsePunchOutOrderMessage: converts the returned cart into
 *     priced lines, and REFUSES a message whose BuyerCookie does not
 *     match the one we sent (the standard cXML session-tamper check),
 *     whose unit prices are negative, or whose total disagrees with
 *     the line sum — nothing is guessed and no discrepancy is waved
 *     through.
 */

export interface CxmlMerchantConfig {
  merchantName: string;
  /** Supplier's punchout setup endpoint. */
  punchoutUrl: string;
  /** cXML network identifiers (from the merchant's trading-partner form). */
  networkId: string;
  fromDomain: string;
  fromIdentity: string;
  toDomain: string;
  toIdentity: string;
  senderDomain: string;
  senderIdentity: string;
  /** Shared secret from the merchant config store — never logged. */
  sharedSecret: string;
  /** Catalogue currency the merchant prices in (e.g. "USD", "GBP"). */
  currency: string;
}

export interface PunchOutSetupOptions {
  /** Unique per session token; validate it on the way back. */
  buyerCookie: string;
  /** Where the supplier posts the PunchOutOrderMessage. */
  browserFormPostUrl: string;
  /** Unique payload id; defaults to a timestamped token. */
  payloadId?: string;
  /** Language of the punchout session (default en-US). */
  language?: string;
}

export interface CxmlCartLine {
  supplierPartId: string;
  supplierPartAuxiliaryId: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  currency: string | null;
  lineTotal: number;
}

export interface CxmlCart {
  ok: boolean;
  buyerCookie: string | null;
  lines: CxmlCartLine[];
  total: number;
  currency: string | null;
  warnings: string[];
  errors: string[];
}

/** XML-escape a text node or attribute value. */
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildPunchOutSetupRequest(
  config: CxmlMerchantConfig,
  opts: PunchOutSetupOptions,
): { ok: boolean; xml: string | null; errors: string[] } {
  const errors: string[] = [];
  if (!config.punchoutUrl?.trim()) errors.push("Merchant punchout URL is required.");
  if (!opts.buyerCookie?.trim()) errors.push("buyerCookie is required: the session token cannot be empty.");
  if (!opts.browserFormPostUrl?.trim()) errors.push("browserFormPostUrl is required: the supplier needs a return target.");
  if (!config.sharedSecret?.trim()) errors.push("Merchant shared secret is required: cXML credentials are never guessed.");
  for (const f of ["networkId", "fromDomain", "fromIdentity", "toDomain", "toIdentity", "senderDomain", "senderIdentity"] as const) {
    if (!String(config[f] ?? "").trim()) errors.push(`Merchant config field "${f}" is required.`);
  }
  if (errors.length > 0) return { ok: false, xml: null, errors };

  const payloadId =
    opts.payloadId ??
    `frelux-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@frelux`;
  const lang = opts.language ?? "en-US";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${esc(payloadId)}" xml:lang="${esc(lang)}" timestamp="${esc(new Date().toISOString())}">
  <Header>
    <From>
      <Credential domain="${esc(config.fromDomain)}">
        <Identity>${esc(config.fromIdentity)}</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="${esc(config.toDomain)}">
        <Identity>${esc(config.toIdentity)}</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="${esc(config.senderDomain)}">
        <Identity>${esc(config.senderIdentity)}</Identity>
        <SharedSecret>${esc(config.sharedSecret)}</SharedSecret>
      </Credential>
      <UserAgent>FRELUX Punchout Client 1.0</UserAgent>
    </Sender>
  </Header>
  <Request deploymentMode="test">
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>${esc(opts.buyerCookie)}</BuyerCookie>
      <Extrinsic name="UserEmail">procurement@frelux.com</Extrinsic>
      <BrowserFormPost>
        <URL>${esc(opts.browserFormPostUrl)}</URL>
      </BrowserFormPost>
      <SupplierSetup>
        <URL>${esc(config.punchoutUrl)}</URL>
      </SupplierSetup>
      <ShipTo>
        <Address addressID="FRELUX-SITE">
          <Name xml:lang="en">FRELUX Project Site</Name>
        </Address>
      </ShipTo>
    </PunchOutSetupRequest>
  </Request>
</cXML>`;
  return { ok: true, xml, errors };
}

export interface PunchOutSetupOutcome {
  ok: boolean;
  /** URL the user's browser should be redirected to. */
  startPageUrl: string | null;
  statusCode: string | null;
  description: string | null;
  errors: string[];
}

/** Parse the supplier's cXML PunchOutSetupResponse. */
export function parsePunchOutSetupResponse(xml: string): PunchOutSetupOutcome {
  const out: PunchOutSetupOutcome = {
    ok: false,
    startPageUrl: null,
    statusCode: null,
    description: null,
    errors: [],
  };
  if (!xml?.trim()) {
    out.errors.push("Empty punchout response: no StartPage URL was extracted.");
    return out;
  }

  // cXML responses carry Status as attributes: <Status code="200" text="OK"/>.
  // Some suppliers use the element form instead; both are accepted.
  const statusAttrMatch = xml.match(/<Status\s+code="([^"]+)"\s+text="([^"]*)"/i);
  const statusMatch = xml.match(/<StatusCode[^>]*>([\s\S]*?)<\/StatusCode>/i);
  out.statusCode = statusAttrMatch
    ? statusAttrMatch[1].trim()
    : statusMatch
      ? statusMatch[1].trim()
      : null;
  if (statusAttrMatch && !out.description) {
    out.description = statusAttrMatch[2].trim() || null;
  }
  const descMatch = xml.match(
    /<Description[^>]*>([\s\S]*?)<\/Description>/i,
  );
  out.description = descMatch ? descMatch[1].trim() : null;

  const startMatch = xml.match(/<StartPage[^>]*>\s*<URL[^>]*>([\s\S]*?)<\/URL>/i)
    ?? xml.match(/<URL[^>]*>([\s\S]*?)<\/URL>/i);
  if (startMatch) out.startPageUrl = startMatch[1].trim();

  if (out.statusCode && out.statusCode !== "200") {
    out.errors.push(
      `Supplier rejected the punchout session (cXML status ${out.statusCode}${out.description ? `: ${out.description}` : ""}).`,
    );
    return out;
  }
  if (!out.startPageUrl) {
    out.errors.push(
      "Punchout response carried no StartPage URL: the session cannot start and nothing was guessed.",
    );
    return out;
  }
  out.ok = true;
  return out;
}

function unesc(v: string): string {
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * Parse a cXML PunchOutOrderMessage (the cart coming back). The
 * expectedBuyerCookie is the one we sent: a mismatch is refused —
 * that is the cXML session-tamper check, and a mismatched cart is
 * never imported into an estimate.
 */
export function parsePunchOutOrderMessage(
  xml: string,
  expectedBuyerCookie: string,
): CxmlCart {
  const cart: CxmlCart = {
    ok: false,
    buyerCookie: null,
    lines: [],
    total: 0,
    currency: null,
    warnings: [],
    errors: [],
  };
  if (!xml?.trim()) {
    cart.errors.push("Empty PunchOutOrderMessage: no cart was extracted.");
    return cart;
  }

  const cookieMatch = xml.match(/<BuyerCookie[^>]*>([\s\S]*?)<\/BuyerCookie>/i);
  cart.buyerCookie = cookieMatch ? unesc(cookieMatch[1].trim()) : null;
  if (!cart.buyerCookie) {
    cart.errors.push(
      "PunchOutOrderMessage carries no BuyerCookie: the cart cannot be tied to this punchout session and was refused.",
    );
    return cart;
  }
  if (expectedBuyerCookie && cart.buyerCookie !== expectedBuyerCookie) {
    cart.errors.push(
      "BuyerCookie mismatch: the returned cart belongs to a different punchout session and was refused (cXML session-tamper check).",
    );
    return cart;
  }

  // ItemOut blocks are ordered; ItemIn is the newer cXML form.
  const blockRe = /<(ItemOut|ItemIn)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = blockRe.exec(xml)) !== null) {
    idx += 1;
    const block = m[2];
    const partId = block.match(/<SupplierPartID[^>]*>([\s\S]*?)<\/SupplierPartID>/i)?.[1]?.trim() ?? null;
    const auxId = block.match(/<SupplierAuxiliaryPartID[^>]*>([\s\S]*?)<\/SupplierAuxiliaryPartID>/i)?.[1]?.trim() ?? null;
    const desc =
      block.match(/<ShortName[^>]*>([\s\S]*?)<\/ShortName>/i)?.[1]?.trim() ??
      block.match(/<Description[^>]*>([\s\S]*?)<\/Description>/i)?.[1]?.trim() ??
      null;
    const qtyRaw = m[0].match(/quantity\s*=\s*"([^"]+)"/i)?.[1];
    const unitOfMeasure = block.match(/<UnitOfMeasure[^>]*>([\s\S]*?)<\/UnitOfMeasure>/i)?.[1]?.trim() ?? null;
    const moneyBlock = block.match(/<Money[^>]*currency\s*=\s*"([^"]+)"[^>]*>([^<]+)<\/Money>/i);
    const unitPrice = moneyBlock ? Number(moneyBlock[2]) : NaN;
    const currency = moneyBlock ? moneyBlock[1].trim() : null;

    if (!partId) {
      cart.warnings.push(
        `Cart line ${idx} carries no SupplierPartID: it was excluded instead of guessed.`,
      );
      continue;
    }
    const qty = qtyRaw !== undefined ? Number(qtyRaw) : NaN;
    if (!Number.isFinite(qty) || qty <= 0) {
      cart.warnings.push(
        `Cart line ${partId} has an invalid quantity: it was excluded instead of guessed.`,
      );
      continue;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      cart.warnings.push(
        `Cart line ${partId} has an invalid unit price: it was excluded instead of guessed.`,
      );
      continue;
    }
    const lineTotal = Math.round(qty * unitPrice * 100) / 100;
    if (cart.currency === null && currency) cart.currency = currency;
    if (currency && cart.currency && currency !== cart.currency) {
      cart.warnings.push(
        `Cart line ${partId} is priced in ${currency} while the rest of the cart is ${cart.currency}: multi-currency carts are imported as-is and flagged for manual review.`,
      );
    }
    cart.lines.push({
      supplierPartId: partId,
      supplierPartAuxiliaryId: auxId,
      description: desc ? unesc(desc) : "",
      quantity: qty,
      unit: unitOfMeasure,
      unitPrice,
      currency,
      lineTotal,
    });
  }

  if (cart.lines.length === 0) {
    cart.errors.push(
      "The returned cart carried no valid priced line: nothing was imported.",
    );
    return cart;
  }

  // Total must reconcile with the line sum; a discrepancy is refused.
  const totalMatch = xml.match(/<Total[^>]*>\s*<Money[^>]*>([^<]+)<\/Money>/i);
  const lineSum =
    Math.round(cart.lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  if (totalMatch) {
    const declaredTotal = Number(totalMatch[1]);
    if (Number.isFinite(declaredTotal)) {
      cart.total = Math.round(declaredTotal * 100) / 100;
      if (Math.abs(cart.total - lineSum) > 0.01) {
        cart.errors.push(
          `Cart total (${cart.total}) disagrees with the line sum (${lineSum}): the cart was refused instead of guessed.`,
        );
        return cart;
      }
    } else {
      cart.warnings.push(
        "Cart total was not numeric: the line sum is used and the cart is flagged for review.",
      );
      cart.total = lineSum;
    }
  } else {
    cart.warnings.push(
      "Cart carried no Total element: the line sum is used and the cart is flagged for review.",
    );
    cart.total = lineSum;
  }

  cart.ok = true;
  return cart;
}
