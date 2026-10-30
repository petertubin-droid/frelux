// Copying a result is part of the estimate, not a nicety: people paste these
// into WhatsApp threads with clients and suppliers. Plain text, one row per
// line, and the units are always included so a number can never be read as
// the wrong measurement.

export interface CopyLine {
  label: string;
  value: string;
}

export interface CopyBlock {
  title: string;
  subtitle?: string;
  lines: CopyLine[];
  /** Optional closing line, for example a total with its currency. */
  total?: string;
  /**
   * The same total in another currency. Pasted alongside the original, never
   * instead of it, and always with the rate and its timestamp.
   */
  conversion?: {
    amount: string;
    currency: string;
    rateLine: string;
    note: string;
  };
  /** Where the estimate came from, so a pasted result stays attributable. */
  sourceUrl?: string;
  note?: string;
}

/**
 * Renders a copy block as plain text. Deliberately unadorned: no bullets, no
 * markdown, nothing that looks broken when pasted into a chat.
 */
export function buildCopyText(block: CopyBlock): string {
  const rows: string[] = [block.title];
  if (block.subtitle) rows.push(block.subtitle);
  rows.push("");
  block.lines.forEach((line) => {
    rows.push(`${line.label.trim()}: ${line.value.trim()}`);
  });
  if (block.total) {
    rows.push("");
    rows.push(block.total);
  }
  if (block.conversion) {
    rows.push("");
    rows.push(
      `Also in ${block.conversion.currency}: ${block.conversion.amount}`,
    );
    rows.push(`${block.conversion.rateLine}. ${block.conversion.note}`);
  }
  if (block.note) {
    rows.push("");
    rows.push(block.note);
  }
  if (block.sourceUrl) {
    rows.push("");
    rows.push(block.sourceUrl);
  }
  return rows.join("\n");
}

export type CopyOutcome = "copied" | "unsupported" | "failed";

/**
 * Writes text to the clipboard, reporting what happened rather than assuming
 * success. Older browsers and insecure origins have no clipboard API, and a
 * silent failure would tell someone their estimate was copied when it was not.
 */
export async function copyText(text: string): Promise<CopyOutcome> {
  if (!text) return "failed";
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    return "failed";
  }
  return "unsupported";
}

/** Confirmation text for the button, kept in one place so it reads the same. */
export function copyConfirmationText(outcome: CopyOutcome): string {
  if (outcome === "copied") return "Copied to clipboard";
  if (outcome === "unsupported") return "Copy is not available in this browser";
  return "Could not copy, please select the text";
}
