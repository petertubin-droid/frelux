import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument } from "@cantoo/pdf-lib";
import * as fontkitNs from "fontkit";
import {
  PAGE,
  buildArabicBoqPdf,
  sealArabicBoqPdf,
  isArabicDocument,
  mirror,
  shapedWidth,
  wrapShaped,
} from "./pdf-arabic";
import { compileBoq } from "./compile";
import { createEmptyDocument, type BoqStudioDocument } from "./types";

const fontkit: any = (fontkitNs as any).default ?? fontkitNs;
const font = fontkit.create(
  readFileSync(
    resolve(process.cwd(), "public/fonts/pdf/NotoNaskhArabic-Regular.ttf"),
  ),
);

const NOW = new Date("2026-11-24T00:00:00Z");

function doc(over: Partial<BoqStudioDocument> = {}): BoqStudioDocument {
  const base = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "QS Team",
  });
  return {
    ...base,
    title: "فيلا في لكي",
    reference: "BOQ-2026-AR-001",
    description: "أعمال الخرسانة المسلحة والبناء لمبنى من طابقين.",
    client: { name: "ع. العميل", address: "لكي، لاغوس" },
    contractor: { name: "فريلكس" },
    assumptions: ["الأسعار سارية لمدة ثلاثين يوماً."],
    exclusions: ["أعمال الصرف الخارجي غير مشمولة."],
    sections: [
      {
        id: "s1",
        code: "05",
        title: "أعمال الخرسانة",
        notes: "",
        items: Array.from({ length: 12 }, (_, i) => ({
          id: `i${i}`,
          item_number: `05.${String(i + 1).padStart(2, "0")}`,
          description: `خرسانة مسلحة للقواعد والأسقف، بند رقم ${i + 1}`,
          specification: "Grade 20",
          unit: "م³",
          quantity: 10 + i,
          material_rate: 90000,
          labour_rate: 25000,
          plant_rate: 0,
          notes: "",
          rates_include_waste: false,
          sort_order: i,
        })),
      },
    ],
    ...over,
  } as BoqStudioDocument;
}

async function build(document = doc()) {
  const compiled = compileBoq(document);
  const bytes = await buildArabicBoqPdf(compiled.standard, compiled.document, {
    font,
    now: NOW,
  });
  return bytes;
}

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(Buffer.from(bytes)).digest("hex");

describe("script detection", () => {
  it("claims Arabic and leaves Latin to the jsPDF renderer", () => {
    expect(isArabicDocument("أعمال الخرسانة")).toBe(true);
    expect(isArabicDocument("Concrete works")).toBe(false);
    // Arabic-Indic digits are Arabic script; ASCII digits are not.
    expect(isArabicDocument("٣٤٥")).toBe(true);
    expect(isArabicDocument("BOQ-2026 345")).toBe(false);
  });
});

describe("mirroring", () => {
  it("leaves a left-to-right box where it was", () => {
    expect(mirror(34, 100, false)).toBe(34);
  });

  it("puts the first column on the right for a right-to-left page", () => {
    const left = mirror(34, 100, true);
    expect(left).toBe(PAGE.width - 34 - 100);
    // The first logical column must now sit to the right of the second.
    expect(left).toBeGreaterThan(mirror(34 + 100, 100, true));
  });
});

describe("shaped wrapping", () => {
  it("keeps every line inside the column, measured not counted", () => {
    const text =
      "خرسانة مسلحة للقواعد والأسقف والكمرات مع التسليح والشدات والصب والمعالجة الكاملة حسب المواصفات";
    const maxWidth = 200;
    const lines = wrapShaped(font, text, 8, maxWidth);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(shapedWidth(font, line, 8)).toBeLessThanOrEqual(maxWidth);
    }
    expect(lines.join(" ")).toBe(text);
  });
});

describe("Arabic BOQ PDF", () => {
  it("is a real PDF on the same landscape sheet as the jsPDF export", async () => {
    const bytes = await build();
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    const [first] = pdf.getPages();
    expect(Math.round(first.getWidth())).toBe(PAGE.width);
    expect(Math.round(first.getHeight())).toBe(PAGE.height);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("hashes to the same file every time it is built from the same document", async () => {
    expect(sha(await build())).toBe(sha(await build()));
  });

  it("embeds no font program: the glyphs travel as outlines", async () => {
    const bytes = await build();
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).not.toContain("/FontFile2");
    expect(raw).not.toContain("/FontFile3");
    // The full Naskh face is 197 kB; a document that shipped it would be larger.
    expect(bytes.byteLength).toBeLessThan(150_000);
  });

  it("adds pages instead of running off the sheet", async () => {
    const small = await build();
    const many = await build(
      doc({
        sections: Array.from({ length: 6 }, (_, s) => ({
          id: `s${s}`,
          code: String(5 + s).padStart(2, "0"),
          title: `أعمال القسم ${s + 1}`,
          notes: "",
          items: Array.from({ length: 25 }, (_, i) => ({
            id: `i${s}-${i}`,
            item_number: `${String(5 + s).padStart(2, "0")}.${String(i + 1).padStart(2, "0")}`,
            description: `بند تنفيذي رقم ${i + 1} يشمل التوريد والتركيب والاختبار`,
            specification: "",
            unit: "م²",
            quantity: 10 + i,
            material_rate: 12000,
            labour_rate: 4000,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
            sort_order: i,
          })),
        })),
      }),
    );
    const smallPages = (await PDFDocument.load(small)).getPageCount();
    const manyPages = (await PDFDocument.load(many)).getPageCount();
    expect(manyPages).toBeGreaterThan(smallPages);
    expect(manyPages).toBeGreaterThan(3);
  });

  it("renders a Latin document through the same path without mirroring", async () => {
    const bytes = await build(
      doc({
        title: "Duplex at Lekki",
        description: "Reinforced concrete duplex, two floors.",
        client: { name: "A. Client", address: "Lekki Phase 1, Lagos" },
        contractor: { name: "FRELUX Builders" },
        assumptions: ["Rates valid for 30 days."],
        exclusions: ["External drainage excluded."],
        sections: [
          {
            id: "s1",
            code: "05",
            title: "Concrete Works",
            notes: "",
            items: [
              {
                id: "i1",
                item_number: "05.01",
                description: "Reinforced concrete in foundation",
                specification: "Grade 20",
                unit: "m3",
                quantity: 12,
                material_rate: 90000,
                labour_rate: 25000,
                plant_rate: 0,
                notes: "",
                rates_include_waste: false,
              },
            ],
          },
        ],
      }),
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("reports the SHA-256 of the exact bytes it hands over", async () => {
    const compiled = compileBoq(doc());
    const { bytes, hash } = await sealArabicBoqPdf(
      compiled.standard,
      compiled.document,
      { font, now: NOW },
    );
    // Anyone holding the file can recompute this and get the same string.
    expect(sha(bytes)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
