import { describe, it, expect, vi } from "vitest";
import {
  FRELUX_PDF_MARK,
  drawFreluxMark,
  drawFreluxWatermark,
} from "@/lib/pdf-logo";

/** Records the drawing calls a real jsPDF instance would make. */
function fakeDoc(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args });
    };
  const doc = {
    calls,
    addImage: vi.fn(record("addImage")),
    rect: vi.fn(record("rect")),
    setFillColor: vi.fn(record("setFillColor")),
    saveGraphicsState: vi.fn(record("saveGraphicsState")),
    restoreGraphicsState: vi.fn(record("restoreGraphicsState")),
    setGState: vi.fn(record("setGState")),
    GState: class {
      constructor(public parameters: { opacity: number }) {}
    },
    ...overrides,
  };
  return doc;
}

describe("FRELUX PDF mark", () => {
  it("ships a PNG data URL with the art's proportion", () => {
    expect(FRELUX_PDF_MARK.dataUrl.startsWith("data:image/png;base64,")).toBe(
      true,
    );
    expect(FRELUX_PDF_MARK.dataUrl.length).toBeGreaterThan(1000);
    expect(FRELUX_PDF_MARK.aspect).toBeGreaterThan(1.5);
    expect(FRELUX_PDF_MARK.aspect).toBeLessThan(1.75);
  });

  it("prints the mark in the right header corner and returns its bounds", () => {
    const doc = fakeDoc();
    const mark = drawFreluxMark(doc as never, {
      pageWidth: 210,
      margin: 15,
      heightMm: 10,
    });
    expect(mark).not.toBeNull();
    expect(mark!.height).toBe(10);
    expect(mark!.width).toBeCloseTo(10 * FRELUX_PDF_MARK.aspect, 5);
    expect(mark!.x + mark!.width).toBeCloseTo(210 - 15, 5);
    expect(doc.addImage).toHaveBeenCalledTimes(1);
    const args = doc.addImage.mock.calls[0];
    expect(args[0]).toBe(FRELUX_PDF_MARK.dataUrl);
    expect(doc.rect).not.toHaveBeenCalled();
  });

  it("honours left and centre alignment", () => {
    const left = drawFreluxMark(fakeDoc() as never, {
      pageWidth: 210,
      margin: 15,
      heightMm: 10,
      align: "left",
    });
    expect(left!.x).toBe(15);
    const centre = drawFreluxMark(fakeDoc() as never, {
      pageWidth: 210,
      margin: 15,
      heightMm: 10,
      align: "center",
    });
    expect(centre!.x + centre!.width / 2).toBeCloseTo(105, 5);
  });

  it("lays a white plate behind the mark on a dark band", () => {
    const doc = fakeDoc();
    drawFreluxMark(doc as never, {
      pageWidth: 297,
      heightMm: 7.5,
      plate: true,
    });
    expect(doc.setFillColor).toHaveBeenCalledWith(255, 255, 255);
    expect(doc.rect).toHaveBeenCalledTimes(1);
    expect(doc.calls.map((c) => c.op)).toEqual([
      "setFillColor",
      "rect",
      "addImage",
    ]);
  });

  it("survives a document that refuses the image", () => {
    const doc = fakeDoc({
      addImage: vi.fn(() => {
        throw new Error("bad image");
      }),
    });
    expect(
      drawFreluxMark(doc as never, { pageWidth: 210, heightMm: 10 }),
    ).toBeNull();
    expect(
      drawFreluxWatermark(doc as never, { pageWidth: 210, pageHeight: 297 }),
    ).toBe(false);
  });
});

describe("FRELUX watermark", () => {
  it("draws a centred, faint mark inside the opacity limit", () => {
    const doc = fakeDoc();
    expect(
      drawFreluxWatermark(doc as never, {
        pageWidth: 210,
        pageHeight: 297,
        opacity: 0.5,
      }),
    ).toBe(true);
    const state = doc.setGState.mock.calls[0][0] as {
      parameters: { opacity: number };
    };
    expect(state.parameters.opacity).toBe(0.1);
    expect(doc.saveGraphicsState).toHaveBeenCalledTimes(1);
    expect(doc.restoreGraphicsState).toHaveBeenCalledTimes(1);

    const [, , , , width, height] = doc.addImage.mock.calls[0] as number[];
    expect(doc.addImage.mock.calls[0][0]).toBe(FRELUX_PDF_MARK.dataUrl);
    expect(width).toBeCloseTo(210 * 0.62, 5);
    expect(height).toBeCloseTo(width / FRELUX_PDF_MARK.aspect, 5);
  });

  it("never prints darker than the floor it promises", () => {
    const doc = fakeDoc();
    drawFreluxWatermark(doc as never, {
      pageWidth: 210,
      pageHeight: 297,
      opacity: 0.001,
    });
    const state = doc.setGState.mock.calls[0][0] as {
      parameters: { opacity: number };
    };
    expect(state.parameters.opacity).toBe(0.02);
  });

  it("still restores the graphics state when the image fails", () => {
    const doc = fakeDoc({
      addImage: vi.fn(() => {
        throw new Error("no image");
      }),
    });
    expect(
      drawFreluxWatermark(doc as never, { pageWidth: 210, pageHeight: 297 }),
    ).toBe(false);
    expect(doc.restoreGraphicsState).toHaveBeenCalledTimes(1);
  });
});
