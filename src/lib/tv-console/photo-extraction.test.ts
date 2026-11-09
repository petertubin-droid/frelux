/**
 * Photo extraction helpers.
 *
 * The bug these pin: the picker allowed 6 MB photos while the edge function
 * rejected data URLs over 8,000,000 characters. Base64 costs 4/3 of the file,
 * so the biggest photo the page offered was always refused — and a phone photo
 * sits right at the line. Resizing removes the contradiction; these tests keep
 * the arithmetic honest.
 */
import { describe, expect, it } from "vitest";
import {
  extractionErrorMessage,
  isAcceptedPhoto,
  MAX_DATA_URL_CHARS,
  MAX_EDGE_PX,
  MAX_PHOTO_BYTES,
  parseVisionPayload,
  scaledDimensions,
} from "@/lib/tv-console/photo-extraction";

describe("scaledDimensions", () => {
  it("fits a phone photo inside the max edge without changing its shape", () => {
    const out = scaledDimensions(4032, 3024);
    expect(Math.max(out.width, out.height)).toBe(MAX_EDGE_PX);
    expect(out.width / out.height).toBeCloseTo(4032 / 3024, 2);
  });

  it("leaves an already small image alone", () => {
    expect(scaledDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("scales portrait images on their long edge too", () => {
    const out = scaledDimensions(3000, 4000);
    expect(out.height).toBe(MAX_EDGE_PX);
    expect(out.width).toBe(Math.round((3000 / 4000) * MAX_EDGE_PX));
  });

  it("returns zeroes for dimensions it cannot use", () => {
    expect(scaledDimensions(0, 100)).toEqual({ width: 0, height: 0 });
    expect(scaledDimensions(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe("the size contradiction that made the tool fail", () => {
  it("shows that an accepted photo's base64 exceeds the server cap without resizing", () => {
    // 6 MB was the old picker limit; base64 costs a third more again.
    const oldLimitBytes = 6 * 1024 * 1024;
    const base64Chars = Math.ceil(oldLimitBytes * (4 / 3));
    expect(base64Chars).toBeGreaterThan(8_000_000);
    // Which is why the client now keeps well under its own ceiling.
    expect(MAX_DATA_URL_CHARS).toBeLessThan(8_000_000);
  });
});

describe("parseVisionPayload", () => {
  it("reads plain JSON", () => {
    const out = parseVisionPayload('{"consoleVisible":true,"widthMm":1800}');
    expect(out).toEqual({ consoleVisible: true, widthMm: 1800 });
  });

  it("reads JSON wrapped in a markdown fence", () => {
    const out = parseVisionPayload(
      '```json\n{"consoleVisible":true,"heightMm":420}\n```',
    );
    expect(out).toEqual({ consoleVisible: true, heightMm: 420 });
  });

  it("reads JSON with a sentence in front of it", () => {
    const out = parseVisionPayload(
      'Here is the result: {"consoleVisible":false,"notes":["no console"]}',
    );
    expect(out).toEqual({ consoleVisible: false, notes: ["no console"] });
  });

  it("returns null rather than throwing on unreadable output", () => {
    expect(parseVisionPayload("")).toBeNull();
    expect(parseVisionPayload("I cannot see a console here.")).toBeNull();
    expect(parseVisionPayload("[1,2,3]")).toBeNull();
  });
});

describe("extractionErrorMessage", () => {
  it("maps every code the function can return to an actionable sentence", () => {
    expect(extractionErrorMessage("NOT_CONFIGURED")).toMatch(/vision key/i);
    expect(extractionErrorMessage("PRO_REQUIRED")).toMatch(/Pro feature/i);
    expect(extractionErrorMessage("AUTH_REQUIRED")).toMatch(/sign in/i);
    expect(extractionErrorMessage("INVALID_IMAGE")).toMatch(
      /JPEG, PNG or WebP/i,
    );
    expect(extractionErrorMessage("VISION_FAILED")).toMatch(/clearer/i);
    expect(extractionErrorMessage("GUEST_LIMIT_REACHED")).toMatch(
      /free AI operation/i,
    );
  });

  it("recognises a code embedded in a longer transport message", () => {
    expect(
      extractionErrorMessage(
        "Edge Function returned a non-2xx status: PRO_REQUIRED",
      ),
    ).toMatch(/Pro feature/i);
  });

  it("explains the not-deployed case instead of echoing fetch noise", () => {
    expect(
      extractionErrorMessage("Failed to send a request to the Edge Function"),
    ).toMatch(/not deployed/i);
  });

  it("falls back to a usable sentence when there is nothing to go on", () => {
    expect(extractionErrorMessage("")).toMatch(/enter dimensions manually/i);
    expect(extractionErrorMessage(null)).toMatch(/enter dimensions manually/i);
  });
});

describe("isAcceptedPhoto", () => {
  it("accepts the formats the vision call supports", () => {
    expect(isAcceptedPhoto({ type: "image/jpeg", size: 2_000_000 })).toBe(true);
    expect(isAcceptedPhoto({ type: "image/webp", size: 2_000_000 })).toBe(true);
  });

  it("rejects formats the model cannot read and files that are too large", () => {
    expect(isAcceptedPhoto({ type: "image/gif", size: 1000 })).toBe(false);
    expect(isAcceptedPhoto({ type: "application/pdf", size: 1000 })).toBe(
      false,
    );
    expect(isAcceptedPhoto({ type: "image/jpeg", size: 0 })).toBe(false);
    expect(
      isAcceptedPhoto({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }),
    ).toBe(false);
  });
});
