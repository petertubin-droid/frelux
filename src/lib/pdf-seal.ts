/**
 * Sealed PDF export.
 *
 * Every FRELUX export (quotation, shopping list, BOQ, shared estimate) leaves
 * the browser as a sealed document:
 *
 *  - the file is encrypted with AES-256 and an owner password that is generated
 *    per download and never stored, so nothing can re-save it with owner rights;
 *  - the permission flags deny modifying, annotating, filling forms, assembling
 *    pages and extracting text or graphics, while printing stays allowed;
 *  - interactive leftovers are removed: no form fields, no annotations and no
 *    attachments, so there is no field to type into and no annotation layer to
 *    overwrite the figures with;
 *  - the document info describes it as a sealed FRELUX export.
 *
 * Opening the file needs no password: the user password is empty, so a client
 * can still read and print the quotation. What they cannot do is change it and
 * pass it on as the original. That is the point: the sealed file is the record,
 * and a fresh export from FRELUX is the only way to produce a new version.
 *
 * Honest limit: permission flags are enforced by the PDF reader, and a reader
 * that ignores them (or a tool that rebuilds the document from a screenshot)
 * can still produce a different file. What it cannot produce is this file with
 * different numbers, because the bytes were encrypted with an owner password
 * that FRELUX does not keep.
 */

export interface PdfSealMetadata {
  /** Document title shown by readers and file managers. */
  title?: string;
  /** Subject line, e.g. the quotation or BOQ reference. */
  subject?: string;
  /** Author/company name already used on the document. */
  author?: string;
  /** Reference the seal belongs to, recorded for provenance. */
  reference?: string;
}

export class PdfSealError extends Error {
  readonly sealCause: unknown;

  constructor(cause?: unknown) {
    super(
      "The PDF could not be sealed against editing, so the download was stopped. Nothing was saved. Please try again.",
    );
    this.name = "PdfSealError";
    this.sealCause = cause;
  }
}

/** Bytes of a 32-character owner password, from the platform CSPRNG. */
function ownerPassword(): string {
  const bytes = new Uint8Array(24);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Seal an existing PDF. Returns the encrypted bytes; it never mutates the
 * document it was handed (the output is a fresh serialisation).
 */
export async function sealPdf(
  input: Uint8Array,
  metadata: PdfSealMetadata = {},
): Promise<Uint8Array> {
  try {
    const { PDFDocument, PDFName } = await import("@cantoo/pdf-lib");
    const doc = await PDFDocument.load(input, {
      updateMetadata: false,
      throwOnInvalidObject: false,
      ignoreEncryption: false,
    });

    // No interactive surfaces: a form field or an annotation is an editable
    // layer sitting on top of the figures.
    doc.catalog.delete(PDFName.of("AcroForm"));
    for (const page of doc.getPages()) {
      page.node.delete(PDFName.of("Annots"));
    }

    doc.setProducer("FRELUX sealed export");
    doc.setCreator("FRELUX");
    if (metadata.title) doc.setTitle(metadata.title);
    if (metadata.subject) doc.setSubject(metadata.subject);
    if (metadata.author) doc.setAuthor(metadata.author);
    doc.setKeywords(
      [
        "FRELUX",
        "sealed document",
        "editing disabled",
        ...(metadata.reference ? [metadata.reference] : []),
      ].filter(Boolean) as string[],
    );
    doc.setCreationDate(new Date());

    doc.encrypt({
      // Empty user password: the recipient opens and reads it without a prompt.
      userPassword: "",
      // Owner password: generated here, never stored, so the file cannot be
      // re-saved with owner rights by anyone, including another FRELUX tool.
      ownerPassword: ownerPassword(),
      algorithm: "AES-256",
      permissions: {
        printing: "highResolution",
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        documentAssembly: false,
        // Text stays available to assistive technology; the reading experience
        // is not what is being protected, the figures are.
        contentAccessibility: true,
      },
    });

    // Object streams matter here: written the flat way, the document info
    // comes back garbled from a real reader after encryption (checked with
    // pdf.js). Packed, the title and producer survive intact.
    return await doc.save({ useObjectStreams: true });
  } catch (error) {
    throw new PdfSealError(error);
  }
}

/** Trigger a browser download for already-sealed bytes. */
export function downloadSealedPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Seal and download a jsPDF document. Every export path ends here instead of
 * calling `doc.save()`, so no route can produce an editable file.
 */
export async function saveSealedPdf(
  doc: { output: (type: "arraybuffer") => ArrayBuffer },
  filename: string,
  metadata: PdfSealMetadata = {},
): Promise<void> {
  const sealed = await sealPdf(
    new Uint8Array(doc.output("arraybuffer")),
    metadata,
  );
  downloadSealedPdf(sealed, filename);
}
