import { describe, it, expect, vi } from "vitest";
import { track, whatsappUrl } from "@/lib/analytics";

describe("analytics — whatsappUrl", () => {
  it("builds a base WhatsApp URL without a message", () => {
    const url = whatsappUrl();
    expect(url).toContain("https://wa.me/");
    expect(url).not.toContain("?text=");
  });

  it("appends encoded message when provided", () => {
    const url = whatsappUrl("Hello, I need a quote");
    expect(url).toContain("?text=");
    expect(url).toContain(encodeURIComponent("Hello, I need a quote"));
  });

  it("handles special characters in message", () => {
    const url = whatsappUrl("I need paint & tiles! #urgent");
    expect(url).toContain(encodeURIComponent("I need paint & tiles! #urgent"));
    expect(url).not.toContain(" ");
  });

  it("handles empty string message", () => {
    const url = whatsappUrl("");
    // Empty string is falsy, so no text param should be added
    expect(url).not.toContain("?text=");
  });

  it("includes the configured phone number", () => {
    const url = whatsappUrl();
    expect(url).toMatch(/\d{10,}/);
  });
});

describe("analytics — track", () => {
  it("does not throw when called with valid event", () => {
    expect(() => track("calculator_started")).not.toThrow();
  });

  it("accepts params object", () => {
    expect(() =>
      track("calculator_completed", { tool: "paint", duration: 120 }),
    ).not.toThrow();
  });

  it("does not throw with undefined params", () => {
    expect(() => track("whatsapp_clicked", undefined)).not.toThrow();
  });
});
