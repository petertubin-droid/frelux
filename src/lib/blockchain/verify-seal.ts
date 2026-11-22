/**
 * FRELUX VERIFY seal for exported documents (BOQ, quotation, etc).
 *
 * What the seal is:
 *  - a printed block on the exported document pointing the reader at the
 *    public /verify page, where the file is fingerprinted and compared with
 *    the Bitcoin-anchored record (OpenTimestamps);
 *  - a toggle the user controls at export time, so a draft kept in-house is
 *    not registered.
 *
 * What the seal is NOT, and never claims:
 *  - it does not print the file's own SHA-256. A document cannot contain the
 *    hash of its own final bytes: adding the hash changes the bytes. The
 *    fingerprint is computed and registered when the file is exported, and
 *    the reader verifies it by uploading the file at /verify.
 *  - finding a record by verification ID alone does not prove a file. Only
 *    a fingerprint comparison does, which is what /verify performs.
 *  - "Bitcoin anchored" is a claim about the OpenTimestamps proof. Until the
 *    proof reaches a block, the record is pending; the seal says so.
 */

export const VERIFY_PAGE_PATH = "/verify";

/** Public verification URL for the current origin (browser) or fallback. */
export function verifyPageUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://frelux.app");
  return `${base.replace(/\/+$/, "")}${VERIFY_PAGE_PATH}`;
}

export interface VerifySealCopy {
  heading: string;
  lines: string[];
}

/**
 * The exact wording printed on the document. Kept as data so it can be
 * tested and so every export prints the same honest statement.
 */
export function verifySealCopy(options: {
  origin?: string;
  documentLabel?: string;
} = {}): VerifySealCopy {
  const label = options.documentLabel ?? "document";
  return {
    heading: "FRELUX VERIFY",
    lines: [
      `This ${label} is a sealed export: editing is denied, so the figures cannot be changed after issue.`,
      `To confirm it, scan the QR code or upload this file at ${verifyPageUrl(options.origin)}. Its SHA-256 fingerprint is compared with the Bitcoin-anchored record (OpenTimestamps).`,
      "The fingerprint is registered when the file is exported. A verification ID on its own does not prove a file; only the fingerprint comparison does.",
    ],
  };
}

/** Minimal jsPDF surface the seal needs, so tests can use a fake. */
export interface SealDrawTarget {
  setFont: (family: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (width: number) => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  text: (text: string | string[], x: number, y: number) => void;
  splitTextToSize: (text: string, size: number) => string[];
  addImage: (
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
}

export const VERIFY_BLOCK_HEIGHT = 24;

/**
 * Draw the seal block. Returns the height consumed so the caller can lay
 * out around it. Caller guarantees the space exists.
 */
export async function drawVerifySeal(
  doc: SealDrawTarget,
  x: number,
  y: number,
  width: number,
  options: { origin?: string; documentLabel?: string } = {},
): Promise<number> {
  const copy = verifySealCopy(options);
  const pad = 2.5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, VERIFY_BLOCK_HEIGHT);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text(copy.heading, x + pad, y + 4.5);

  // QR code on the right: scanning it opens /verify, where the reader
  // uploads the file. The QR carries the page URL only - never a hash,
  // because the document cannot contain the fingerprint of its own bytes.
  const qrSize = VERIFY_BLOCK_HEIGHT - pad * 2;
  const textWidth = width - pad * 2 - qrSize - 3;
  try {
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(verifyPageUrl(options.origin), {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
    });
    doc.addImage(
      dataUrl,
      "PNG",
      x + width - pad - qrSize,
      y + pad,
      qrSize,
      qrSize,
    );
  } catch {
    // QR rendering is a convenience; the printed URL above stays readable.
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.setTextColor(70, 80, 95);
  let lineY = y + 8;
  for (const line of copy.lines) {
    const lines = doc.splitTextToSize(line, textWidth) as string[];
    for (const text of lines) {
      doc.text(text, x + pad, lineY);
      lineY += 2.6;
    }
  }
  return VERIFY_BLOCK_HEIGHT;
}
