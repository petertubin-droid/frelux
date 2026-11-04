import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { PDFDocument } from "@cantoo/pdf-lib";
import { sealPdf, PdfSealError } from "@/lib/pdf-seal";

// These tests read the sealed bytes the way a client would: through a real
// reader (pdf.js), not through the library that wrote them. The point of the
// feature is what is inside the file a user downloads, so the assertions are
// about that file and nothing else.

// pdf.js v6 uses Promise.withResolvers, which Node 20 predates.
type WithResolvers = { withResolvers?: unknown };
if (typeof (Promise as unknown as WithResolvers).withResolvers !== "function") {
  (Promise as unknown as WithResolvers).withResolvers = function () {
    const box = {} as {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
    };
    const promise = new Promise((res, rej) => {
      box.resolve = res;
      box.reject = rej;
    });
    return { promise, ...box };
  };
}

async function samplePdf(
  text = "Quotation QT-2026-001 total 1250000",
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text(text, 15, 20);
  return new Uint8Array(doc.output("arraybuffer"));
}

/** Open sealed bytes the way a recipient's reader does: no password prompt. */
async function readAsClient(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    useSystemFonts: true,
  }).promise;
  const meta = await pdf.getMetadata();
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return {
    numPages: pdf.numPages,
    info: meta.info as { Title?: string; Producer?: string; Keywords?: string },
    text: content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" "),
  };
}

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

describe("sealPdf", () => {
  it("encrypts the document and hides the figures from a plain read", async () => {
    const sealed = await sealPdf(await samplePdf());

    const text = latin1(sealed);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("/Encrypt");
    // The literal amount must not survive as readable bytes in the file.
    expect(text).not.toContain("1250000");
  });

  it("still opens without a password, keeps its page, and reads the figures", async () => {
    const sealed = await sealPdf(await samplePdf());
    const { numPages, text } = await readAsClient(sealed);

    expect(numPages).toBe(1);
    // Protection stops alteration, not reading: the client can still see the
    // quotation they were sent.
    expect(text).toContain("QT-2026-001");
    expect(text).toContain("1250000");
  });

  it("denies editing, annotation, form filling, assembly and copying", async () => {
    const sealed = await sealPdf(await samplePdf());
    const text = latin1(sealed);

    // PDF permission bits: 4 print, 8 modify, 16 copy, 32 annotate, 256 fill
    // forms, 512 accessibility extraction, 1024 assemble. Only printing and
    // accessibility may be allowed; everything that could change the document
    // must be clear.
    const match = /\/P\s+(-?\d+)/.exec(text);
    expect(match).not.toBeNull();
    const permissions = Number(match![1]);
    for (const bit of [8, 16, 32, 256, 1024]) {
      expect(permissions & bit).toBe(0);
    }
    expect(permissions & 4).toBe(4);
    expect(permissions & 512).toBe(512);
  });

  it("writes AES-256 rather than a broken cipher", async () => {
    const sealed = await sealPdf(await samplePdf());
    const text = latin1(sealed);

    expect(text).toContain("/AESV3");
    expect(text).not.toContain("/RC4");
  });

  it("strips interactive layers so there is nothing to type into", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const sealed = await sealPdf(await doc.save());

    expect(latin1(sealed)).not.toContain("/AcroForm");
  });

  it("names the sealed export in the document info a reader shows", async () => {
    const sealed = await sealPdf(await samplePdf(), {
      title: "Quotation QT-2026-001",
      subject: "Project: Lekki residence",
      reference: "QT-2026-001",
    });
    const { info } = await readAsClient(sealed);

    expect(info.Title).toBe("Quotation QT-2026-001");
    expect(info.Producer).toBe("FRELUX sealed export");
  });

  it("uses a different owner password for every export", async () => {
    const [a, b] = await Promise.all([
      sealPdf(await samplePdf()),
      sealPdf(await samplePdf()),
    ]);

    const encryptionKey = (bytes: Uint8Array) => {
      const text = latin1(bytes);
      const start = text.indexOf("/Encrypt");
      return text.slice(start, start + 400);
    };
    expect(encryptionKey(a)).not.toBe(encryptionKey(b));
  });

  it("raises a typed error instead of returning an unsealed file", async () => {
    await expect(sealPdf(new Uint8Array([1, 2, 3, 4]))).rejects.toBeInstanceOf(
      PdfSealError,
    );
  });
});
