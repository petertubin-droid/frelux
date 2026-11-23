// =========================================================
// The FRELUX VERIFY block for printed documents.
//
// Receipts, quotations and BOQs all carry a QR that opens the verify page, but
// only the BOQ print path ever generated one, and only when a toggle that
// defaults to off was switched on. A document without its verification code is
// a trust problem, so the QR is generated once here and injected into the
// printed copy before the browser's print dialog opens.
//
// The copy is deliberately conservative: it says the reader can confirm the
// document is unaltered, and never claims a Bitcoin-anchored record unless the
// caller says the document was actually stamped.
// =========================================================
import { verifyPageUrl } from "@/lib/blockchain/verify-seal";

/** Marker replaced with the QR data URL just before printing. */
export const VERIFY_QR_TOKEN = "__FRELUX_VERIFY_QR__";

/** A QR data URL for the verify page, or "" when it cannot be rendered. */
export async function verifyQrDataUrl(width = 240): Promise<string> {
  try {
    const { default: QRCode } = await import("qrcode");
    return await QRCode.toDataURL(verifyPageUrl(), {
      margin: 1,
      width,
      errorCorrectionLevel: "M",
    });
  } catch {
    // The printed URL in the copy stays readable, so the document is still
    // verifiable by hand when the QR cannot be drawn.
    return "";
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The verify section, with a placeholder QR that the print path fills in.
 * `stamped` decides whether the copy may mention the blockchain record.
 */
export function verifySectionHtml(
  documentLabel = "document",
  stamped = false,
): string {
  const url = esc(verifyPageUrl());
  const fingerprintLine = stamped
    ? "Its SHA-256 fingerprint is compared with the anchored record."
    : "The page computes the file's SHA-256 fingerprint when you upload it.";
  return `<section class="frelux-verify">
  <div class="frelux-verify-copy">
    <h3>FRELUX VERIFY</h3>
    <p>Scan the QR code, or open ${url} and upload this ${esc(documentLabel)} to confirm it has not been altered.</p>
    <p>${fingerprintLine}</p>
  </div>
  <img class="frelux-verify-qr" data-frelux-verify-qr src="${VERIFY_QR_TOKEN}" alt="FRELUX VERIFY QR code" width="96" height="96" />
</section>
<style>
  .frelux-verify {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 22px 0 0;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    page-break-inside: avoid;
  }
  .frelux-verify-copy h3 {
    margin: 0 0 4px;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #0f172a;
  }
  .frelux-verify-copy p { margin: 2px 0; font-size: 9px; line-height: 1.35; color: #475569; }
  .frelux-verify-qr { flex: 0 0 auto; }
</style>`;
}

/** Fill the placeholder QR inside an already-written print window. */
export async function fillVerifyQr(win: Window): Promise<void> {
  const img = win.document?.querySelector?.<HTMLImageElement>(
    "[data-frelux-verify-qr]",
  );
  if (!img) return;
  const dataUrl = await verifyQrDataUrl();
  if (dataUrl) {
    img.src = dataUrl;
    return;
  }
  // No QR: drop the broken image rather than printing an empty box. The URL in
  // the copy is still there to be typed.
  img.remove();
}

/** Replace the token in a standalone HTML string (file download path). */
export async function withVerifyQr(html: string): Promise<string> {
  if (!html.includes(VERIFY_QR_TOKEN)) return html;
  const dataUrl = await verifyQrDataUrl();
  if (dataUrl) return html.replace(VERIFY_QR_TOKEN, dataUrl);
  // No QR: drop the image and stop telling the reader to scan one.
  return html
    .replace(/<img class="frelux-verify-qr"[^>]*>/, "")
    .replace("Scan the QR code, or open", "Open");
}
