import { describe, it, expect, vi } from "vitest";
import { VERIFY_QR_TOKEN, verifySectionHtml, withVerifyQr } from "./verify-qr";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async () => "data:image/png;base64,QRQR"),
  },
}));

describe("verify QR block", () => {
  it("carries a placeholder the print path fills in", () => {
    const html = verifySectionHtml("receipt");
    expect(html).toContain("FRELUX VERIFY");
    expect(html).toContain(VERIFY_QR_TOKEN);
    expect(html).toContain("data-frelux-verify-qr");
    expect(html).toContain("/verify");
  });

  it("never claims an anchored record for an unstamped document", () => {
    const plain = verifySectionHtml("quotation", false);
    expect(plain).not.toMatch(/anchored record/i);
    const stamped = verifySectionHtml("BOQ", true);
    expect(stamped).toMatch(/anchored record/i);
  });

  it("bakes the QR into a downloaded document", async () => {
    const out = await withVerifyQr(verifySectionHtml("receipt"));
    expect(out).toContain("data:image/png;base64,QRQR");
    expect(out).not.toContain(VERIFY_QR_TOKEN);
  });

  it("degrades honestly when the QR cannot be drawn", async () => {
    const { default: QRCode } = await import("qrcode");
    vi.mocked(QRCode.toDataURL).mockRejectedValueOnce(new Error("no canvas"));
    const out = await withVerifyQr(verifySectionHtml("receipt"));
    expect(out).not.toContain('<img class="frelux-verify-qr"');
    expect(out).not.toMatch(/Scan the QR code/);
    expect(out).toContain("/verify");
  });
});
