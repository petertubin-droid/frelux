import { describe, expect, it } from "vitest";

// pdfjs-dist v6 uses Promise.withResolvers, which older Node builds lack.
if (!("withResolvers" in Promise)) {
  (Promise as any).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument } from "@cantoo/pdf-lib";
import * as fontkitNs from "fontkit";
import { hasUnrenderableScript } from "./fonts";
import {
  PAGE,
  buildArabicBoqPdf,
  buildOutlineBoqPdf,
  needsArabicRenderer,
  needsOutlineRenderer,
  sealArabicBoqPdf,
  sealOutlineBoqPdf,
  isArabicDocument,
  isDevanagariDocument,
  isCjkDocument,
  isOutlineDocument,
  hasMixedComplexScripts,
  segmentMixedText,
  mirror,
  shapedWidth,
  wrapShaped,
} from "./pdf-arabic";
import { compileBoq } from "./compile";
import { createEmptyDocument, type BoqStudioDocument } from "./types";

const fontkit: any = (fontkitNs as any).default ?? fontkitNs;
const FONT_BYTES = new Uint8Array(
  readFileSync(
    resolve(process.cwd(), "public/fonts/pdf/NotoNaskhArabic-Regular.ttf"),
  ),
);
const font = fontkit.create(FONT_BYTES);

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
    fontBytes: FONT_BYTES,
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

  it("draws the visible glyphs as outlines, not as embedded text", async () => {
    // With the layer off there is no font program at all: the document is the
    // outlines, which is why the shaping is exact.
    const compiled = compileBoq(doc());
    const bytes = await buildArabicBoqPdf(
      compiled.standard,
      compiled.document,
      { font, now: NOW, textLayer: false },
    );
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
      { font, fontBytes: FONT_BYTES, now: NOW },
    );
    // Anyone holding the file can recompute this and get the same string.
    expect(sha(bytes)).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("draws no text layer by default, and the reason is measured", async () => {
    const bytes = await build();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({
      data: bytes.slice(),
      disableFontFace: true,
      useSystemFonts: true,
    }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    // Latin chrome is real text; the Arabic is outlines, so it is not in the
    // text layer at all. This is the documented cost of exact shaping.
    expect(text).toContain("FRELUX");
    expect(text).not.toContain("فيلا");
  });

  it("can draw the layer, but the round trip is not faithful", async () => {
    const compiled = compileBoq(doc());
    const bytes = await buildArabicBoqPdf(
      compiled.standard,
      compiled.document,
      { font, fontBytes: FONT_BYTES, now: NOW, textLayer: true },
    );
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({
      data: bytes.slice(),
      disableFontFace: true,
      useSystemFonts: true,
    }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("");

    // The layer exists, but pdf-lib's glyph-mapped ToUnicode does not round-trip
    // a shaped run, so it is opt-in and off. The assertion is the finding: the
    // words do not come back as typed, which is why searchability is not claimed.
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain("فيلا في لكي");
    // It stays far below the 197 kB face: only used glyphs are subset in.
    expect(bytes.byteLength).toBeLessThan(FONT_BYTES.byteLength);
  });
});

describe("routing between the two engines", () => {
  it("sends an Arabic document to this renderer", () => {
    const compiled = compileBoq(doc());
    expect(needsArabicRenderer(compiled.standard, compiled.document)).toBe(
      true,
    );
  });

  it("leaves a Latin document to the jsPDF engine", () => {
    const compiled = compileBoq(
      doc({
        title: "Duplex at Lekki",
        description: "Reinforced concrete duplex.",
        client: { name: "A. Client", address: "Lagos" },
        contractor: { name: "FRELUX Builders" },
        assumptions: ["Rates valid for 30 days."],
        exclusions: ["External drainage excluded."],
        sections: [],
      }),
    );
    expect(needsArabicRenderer(compiled.standard, compiled.document)).toBe(
      false,
    );
  });

  it("still refuses Devanagari and CJK, which have no shipped font", () => {
    // These are the two scripts this renderer cannot draw: no face for them is
    // in public/fonts/pdf, so they keep the honest refusal and the Print route.
    // The fixture is an Arabic document, so every other field is replaced here
    // too: a leftover Arabic client name would send this document to the Arabic
    // renderer and the test would prove nothing about routing.
    const latinNotes = {
      assumptions: ["Rates valid for 30 days."],
      exclusions: ["External drainage excluded."],
      client: { name: "A. Client", address: "Lagos" },
      contractor: { name: "FRELUX Builders" },
    };
    const devanagari = compileBoq(
      doc({
        title: "मकान का बिल",
        sections: [],
        description: "",
        ...latinNotes,
      }),
    );
    const cjk = compileBoq(
      doc({
        title: "房屋工程量清单",
        sections: [],
        description: "",
        ...latinNotes,
      }),
    );
    expect(needsArabicRenderer(devanagari.standard, devanagari.document)).toBe(
      false,
    );
    expect(needsArabicRenderer(cjk.standard, cjk.document)).toBe(false);
    expect(hasUnrenderableScript("मकान")).toBe(true);
    expect(hasUnrenderableScript("房屋")).toBe(true);
    // Arabic stays on the jsPDF engine's refusal list on purpose: that engine
    // still cannot shape it, so any caller that skips the routing above gets an
    // honest refusal instead of a document full of disconnected letters.
    expect(hasUnrenderableScript("فيلا")).toBe(true);
  });
  it("routes Devanagari and CJK to the outline renderer so all documents are hashable", () => {
    const latinNotes = {
      assumptions: ["Rates valid for 30 days."],
      exclusions: ["External drainage excluded."],
      client: { name: "A. Client", address: "Lagos" },
      contractor: { name: "FRELUX Builders" },
    };
    const devanagari = compileBoq(
      doc({
        title: "मकान का बिल",
        sections: [],
        description: "",
        ...latinNotes,
      }),
    );
    const cjk = compileBoq(
      doc({
        title: "房屋工程量清单",
        sections: [],
        description: "",
        ...latinNotes,
      }),
    );
    expect(needsOutlineRenderer(devanagari.standard, devanagari.document)).toBe(
      true,
    );
    expect(needsOutlineRenderer(cjk.standard, cjk.document)).toBe(true);
    expect(isDevanagariDocument("मकान का बिल")).toBe(true);
    expect(isCjkDocument("房屋工程量清单")).toBe(true);
    expect(isOutlineDocument("मकान")).toBe(true);
    expect(isOutlineDocument("房屋")).toBe(true);
    expect(isOutlineDocument("فيلا")).toBe(true);
  });
});

describe("Devanagari and CJK outline BOQ PDFs", () => {
  it("renders a Devanagari document to a real hashable PDF", async () => {
    const latinNotes = {
      assumptions: ["दरें 30 दिनों के लिए मान्य हैं।"],
      exclusions: ["बाहरी जल निकासी शामिल नहीं है।"],
      client: { name: "राजेश कुमार", address: "नई दिल्ली" },
      contractor: { name: "फ्रीलक्स बिल्डर्स" },
    };
    const devDoc = doc({
      title: "मकान का बिल",
      description: "दो मंजिला इमारत का कंक्रीट कार्य।",
      ...latinNotes,
      sections: [
        {
          id: "s1",
          code: "05",
          title: "कंक्रीट कार्य",
          notes: "",
          items: [
            {
              id: "i1",
              item_number: "05.01",
              description: "नींव में प्रबलित कंक्रीट ग्रेड 20",
              specification: "Grade 20",
              unit: "m³",
              quantity: 15,
              material_rate: 85000,
              labour_rate: 20000,
              plant_rate: 0,
              notes: "",
              rates_include_waste: false,
                          },
          ],
        },
      ],
    });
    const compiled = compileBoq(devDoc);
    const bytes1 = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    const bytes2 = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });

    expect(Buffer.from(bytes1.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes1);
    expect(pdf.getPageCount()).toBe(1);
    expect(Math.round(pdf.getPages()[0].getWidth())).toBe(PAGE.width);
    expect(Math.round(pdf.getPages()[0].getHeight())).toBe(PAGE.height);

    // Deterministic hashing
    expect(sha(bytes1)).toBe(sha(bytes2));

    // Sealing produces exact matching SHA-256
    const sealed = await sealOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(sha(sealed.bytes)).toBe(sealed.hash);
    expect(sealed.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("renders a CJK document to a real hashable PDF", async () => {
    const latinNotes = {
      assumptions: ["报价有效期为30天。"],
      exclusions: ["室外排水工程除外。"],
      client: { name: "张三", address: "北京市朝阳区" },
      contractor: { name: "FRELUX 建造" },
    };
    const cjkDoc = doc({
      title: "房屋工程量清单",
      description: "二层框架结构钢筋混凝土施工。",
      ...latinNotes,
      sections: [
        {
          id: "s1",
          code: "05",
          title: "钢筋混凝土工程",
          notes: "",
          items: [
            {
              id: "i1",
              item_number: "05.01",
              description: "基础钢筋混凝土 C30 浇筑及养护",
              specification: "C30",
              unit: "m³",
              quantity: 20,
              material_rate: 450,
              labour_rate: 120,
              plant_rate: 0,
              notes: "",
              rates_include_waste: false,
                          },
          ],
        },
      ],
    });
    const compiled = compileBoq(cjkDoc);
    const bytes1 = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    const bytes2 = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });

    expect(Buffer.from(bytes1.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes1);
    expect(pdf.getPageCount()).toBe(1);
    expect(Math.round(pdf.getPages()[0].getWidth())).toBe(PAGE.width);
    expect(Math.round(pdf.getPages()[0].getHeight())).toBe(PAGE.height);

    // Deterministic hashing
    expect(sha(bytes1)).toBe(sha(bytes2));

    // Sealing produces exact matching SHA-256
    const sealed = await sealOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(sha(sealed.bytes)).toBe(sealed.hash);
    expect(sealed.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("routes documents with non-Latin reviewer metadata to outline renderer", () => {
    const docWithArabicReviewNote = compileBoq(
      doc({
        title: "Standard Commercial Warehouse",
        description: "Steel frame warehouse with insulated cladding.",
        client: { name: "Apex Logistics Ltd", address: "Dubai Industrial City" },
        contractor: { name: "Global Contracting LLC" },
        review: {
          status: "reviewed",
          reviewer_name: "John Smith",
          note: "تمت مراجعة الكميات والمواصفات واعتمادها",
        },
        sections: [],
      }),
    );
    expect(needsOutlineRenderer(docWithArabicReviewNote.standard, docWithArabicReviewNote.document)).toBe(true);

    const docWithDevanagariReviewer = compileBoq(
      doc({
        title: "Residential Villa Project",
        description: "Civil structural work.",
        client: { name: "Sunil Kumar", address: "Gurgaon" },
        contractor: { name: "Modern Infra" },
        review: {
          status: "reviewed",
          reviewer_name: "राजेश शर्मा, मुख्य अभियंता",
        },
        sections: [],
      }),
    );
    expect(needsOutlineRenderer(docWithDevanagariReviewer.standard, docWithDevanagariReviewer.document)).toBe(true);
  });

  it("renders a mixed-script document with Arabic, Devanagari, and CJK without collision or error", async () => {
    const multiScriptDoc = doc({
      title: "International Joint Venture BOQ",
      description: "مشروع مشترك دولي للبناء والتشييد", // Arabic description
      client: { name: "北京建工集团", address: "北京市朝阳区" }, // CJK client
      contractor: { name: "शर्मा कंस्ट्रक्शन प्राइवेट लिमिटेड" }, // Devanagari contractor
      review: {
        status: "reviewed",
        reviewer_name: "مهندس استشاري معتمد", // Arabic reviewer
        note: "Approved per IS 456 & GB 50010 engineering standards.",
      },
      sections: [
        {
          id: "s1",
          code: "01",
          title: "Structural Works - 结构工程",
          notes: "",
          items: [
            {
              id: "i1",
              item_number: "01.01",
              description: "M25 ग्रेड कंक्रीट ढलाई कार्य (Reinforced concrete)",
              specification: "Grade M25",
              unit: "m³",
              quantity: 50,
              material_rate: 6500,
              labour_rate: 1500,
              plant_rate: 500,
              notes: "صب خرسانة مسلحة",
              rates_include_waste: false,
            },
          ],
        },
      ],
    });

    const compiled = compileBoq(multiScriptDoc);
    expect(needsOutlineRenderer(compiled.standard, compiled.document)).toBe(true);

    const bytes = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);

    const sealed = await sealOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(sha(sealed.bytes)).toBe(sealed.hash);
    expect(sealed.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("detects and segments intra-string multi-script text across Arabic, Devanagari, and CJK", () => {
    // Single script + common characters
    expect(hasMixedComplexScripts("مشروع سكني (Villa 102)")).toBe(false);
    expect(hasMixedComplexScripts("Structural Works - 结构工程 (01)")).toBe(false);
    expect(hasMixedComplexScripts("M25 ग्रेड कंक्रीट (Concrete)")).toBe(false);

    // Multi-script text in a single string
    const mixed = "مشروع فيلا - 结构工程 - कंक्रीट कार्य";
    expect(hasMixedComplexScripts(mixed)).toBe(true);

    const segments = segmentMixedText(mixed, "arabic");
    expect(segments.length).toBe(3);
    expect(segments[0].script).toBe("arabic");
    expect(segments[0].text).toContain("مشروع");
    expect(segments[1].script).toBe("cjk");
    expect(segments[1].text).toContain("结构工程");
    expect(segments[2].script).toBe("devanagari");
    expect(segments[2].text).toContain("कंक्रीट");
  });

  it("renders documents containing intra-string mixed scripts to deterministic hashable PDFs", async () => {
    const intraMixedDoc = doc({
      title: "International Project: مشروع فيلا - 结构工程 - कंक्रीट कार्य",
      description: "Multi-national joint development: فيلا (Villa) / 商业综合体 / वाणिज्यिक भवन",
      client: { name: "Global Joint Venture (العالمية / 中建 / ग्लोबल)", address: "Dubai - Beijing - Mumbai" },
      contractor: { name: "Consortium LLC (شركة الائتلاف / 联合体 / कंसोर्टियम)" },
      review: {
        status: "reviewed",
        reviewer_name: "Lead Structural Engineer (مهندس استشاري / 主任工程师 / मुख्य अभियंता)",
        note: "Approved with cross-script validation: مطابق للمواصفات / 符合规范 / मानकों के अनुरूप",
      },
      sections: [
        {
          id: "s1",
          code: "01",
          title: "01. Foundations & Concrete - الخرسانة المسلحة - 钢筋混凝土 - प्रबलित कंक्रीट",
          notes: "Batch mixing standard IS 456 / GB 50010 / كود البناء العربي",
          items: [
            {
              id: "i1",
              item_number: "01.01",
              description: "M30 Concrete Pour (صب خرسانة جاهزة - 现浇混凝土 - कंक्रीट ढलाई)",
              specification: "High-grade structural mix",
              unit: "m³",
              quantity: 120,
              material_rate: 8500,
              labour_rate: 2200,
              plant_rate: 900,
              notes: "Test cubes required: مكعبات اختبار / 试块送检 / परीक्षण घन",
              rates_include_waste: true,
            },
          ],
        },
      ],
    });

    const compiled = compileBoq(intraMixedDoc);
    expect(needsOutlineRenderer(compiled.standard, compiled.document)).toBe(true);

    const bytes = await buildOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);

    const sealed = await sealOutlineBoqPdf(compiled.standard, compiled.document, {
      now: NOW,
    });
    expect(sha(sealed.bytes)).toBe(sealed.hash);
    expect(sealed.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
