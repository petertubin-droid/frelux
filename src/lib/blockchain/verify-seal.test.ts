import { describe, expect, it, vi } from "vitest";

import {
  HOSTED_COPY_DAYS,
  VERIFY_BLOCK_HEIGHT,
  createVerifyCopyToken,
  drawVerifySeal,
  verifyPageUrl,
  verifySealCopy,
} from "./verify-seal";

function fakeDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    splitTextToSize: (text: string) => [text],
    addImage: vi.fn(),
  };
}

describe("verifyPageUrl", () => {
  it("uses the given origin and strips trailing slashes", () => {
    expect(verifyPageUrl("https://frelux.app/")).toBe("https://frelux.app/verify");
  });

  it("falls back to a public origin when no window exists", () => {
    expect(verifyPageUrl()).toMatch(/\/verify$/);
  });

  it("carries the copy token so a scan opens the hosted copy", () => {
    expect(verifyPageUrl("https://frelux.app", "abcdefghijklmnop")).toBe(
      "https://frelux.app/verify?c=abcdefghijklmnop",
    );
  });
});

describe("createVerifyCopyToken", () => {
  it("produces an unguessable token in the accepted alphabet", () => {
    const token = createVerifyCopyToken();
    expect(token).toMatch(/^[a-z2-7]{16,32}$/);
  });

  it("does not repeat tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createVerifyCopyToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("verifySealCopy", () => {
  it("never claims the document contains its own hash", () => {
    const copy = verifySealCopy({ origin: "https://frelux.app" });
    const all = copy.lines.join(" ");
    expect(all).not.toMatch(/this file'?s (own )?hash is/i);
    expect(all).toContain("upload this file");
    expect(all).toContain("https://frelux.app/verify");
  });

  it("states the pending/lookup limit honestly", () => {
    const all = verifySealCopy().lines.join(" ");
    expect(all).toContain("does not prove a file");
    expect(all).toContain("OpenTimestamps");
  });

  it("labels the document type it is printed on", () => {
    expect(verifySealCopy({ documentLabel: "BOQ" }).lines[0]).toContain("This BOQ");
  });

  it("states the hosted copy, its retention, and that the proof survives", () => {
    const copy = verifySealCopy({
      origin: "https://frelux.app",
      documentLabel: "BOQ",
      copyToken: "abcdefghijklmnop",
    });
    const all = copy.lines.join(" ");
    expect(all).toContain("https://frelux.app/verify?c=abcdefghijklmnop");
    expect(all).toContain(`${HOSTED_COPY_DAYS} days`);
    expect(all).toContain("deleted");
    expect(all).toContain("remains verifiable");
  });

  it("promises no hosted copy when no token is printed", () => {
    const all = verifySealCopy({ origin: "https://frelux.app" }).lines.join(" ");
    expect(all).not.toContain("hosted copy");
  });
});

describe("drawVerifySeal", () => {
  it("draws the heading, the lines and returns the height used", async () => {
    const doc = fakeDoc();
    const height = await drawVerifySeal(doc, 10, 20, 120, {
      origin: "https://frelux.app",
    });
    expect(height).toBe(VERIFY_BLOCK_HEIGHT);
    expect(doc.rect).toHaveBeenCalledWith(10, 20, 120, VERIFY_BLOCK_HEIGHT);
    const printed = doc.text.mock.calls.map((c) => String(c[0])).join(" ");
    expect(printed).toContain("FRELUX VERIFY");
    expect(printed).toContain("upload this file");
    expect(printed).toContain("scan the QR code");
  });

  it("renders a QR code image inside the block", async () => {
    const doc = fakeDoc();
    await drawVerifySeal(doc, 10, 20, 120, { origin: "https://frelux.app" });
    expect(doc.addImage).toHaveBeenCalledTimes(1);
    const [data, format] = doc.addImage.mock.calls[0];
    expect(String(data)).toMatch(/^data:image\/png;base64,/);
    expect(format).toBe("PNG");
  });

  it("prints the token URL when a copy token is supplied", async () => {
    const doc = fakeDoc();
    await drawVerifySeal(doc, 10, 20, 120, {
      origin: "https://frelux.app",
      copyToken: "abcdefghijklmnop",
    });
    const printed = doc.text.mock.calls.map((c) => String(c[0])).join(" ");
    expect(printed).toContain("/verify?c=abcdefghijklmnop");
  });
});
