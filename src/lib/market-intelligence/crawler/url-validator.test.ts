import { describe, it, expect } from "vitest";
import { validateUrl, isUrlInDomain, isSameDomain } from "./url-validator";

describe("market-intelligence/crawler/url-validator", () => {
  it("validates a normal https URL", () => {
    const result = validateUrl("https://example.com/page");
    expect(result.valid).toBe(true);
    expect(result.domain).toBe("example.com");
    expect(result.protocol).toBe("https:");
  });

  it("validates a normal http URL", () => {
    const result = validateUrl("http://example.com");
    expect(result.valid).toBe(true);
  });

  it("rejects empty URL", () => {
    expect(validateUrl("").valid).toBe(false);
    expect(validateUrl(null as unknown as never).valid).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(validateUrl("file:///etc/passwd").valid).toBe(false);
    expect(validateUrl("ftp://example.com").valid).toBe(false);
    expect(validateUrl("gopher://example.com").valid).toBe(false);
  });

  it("rejects localhost", () => {
    expect(validateUrl("http://localhost:3000").valid).toBe(false);
  });

  it("rejects 0.0.0.0", () => {
    expect(validateUrl("http://0.0.0.0").valid).toBe(false);
  });

  it("rejects private IPv4 addresses (SSRF)", () => {
    expect(validateUrl("http://10.0.0.1").valid).toBe(false);
    expect(validateUrl("http://192.168.1.1").valid).toBe(false);
    expect(validateUrl("http://172.16.0.1").valid).toBe(false);
    expect(validateUrl("http://127.0.0.1").valid).toBe(false);
  });

  it("rejects cloud metadata endpoints", () => {
    expect(validateUrl("http://169.254.169.254").valid).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    const result = validateUrl("http://user:pass@example.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("credentials");
  });

  it("rejects malformed URLs", () => {
    expect(validateUrl("not a url").valid).toBe(false);
    expect(validateUrl(":::broken").valid).toBe(false);
  });

  it("accepts public IP addresses", () => {
    const result = validateUrl("https://8.8.8.8");
    expect(result.valid).toBe(true);
  });

  it("returns sanitized URL", () => {
    const result = validateUrl("https://example.com/path?query=1");
    expect(result.valid).toBe(true);
    expect(result.sanitized).toContain("example.com");
  });

  it("isUrlInDomain matches exact domain", () => {
    expect(
      isUrlInDomain("https://shop.example.com/page", "shop.example.com"),
    ).toBe(true);
  });

  it("isUrlInDomain matches subdomain", () => {
    expect(isUrlInDomain("https://blog.example.com/page", "example.com")).toBe(
      true,
    );
  });

  it("isUrlInDomain rejects different domain", () => {
    expect(isUrlInDomain("https://other.com/page", "example.com")).toBe(false);
  });

  it("isUrlInDomain returns false for invalid URL", () => {
    expect(isUrlInDomain("not a url", "example.com")).toBe(false);
  });

  it("isSameDomain returns true for same domain", () => {
    expect(isSameDomain("https://a.com/page1", "https://a.com/page2")).toBe(
      true,
    );
  });

  it("isSameDomain returns false for different domains", () => {
    expect(isSameDomain("https://a.com", "https://b.com")).toBe(false);
  });

  it("isSameDomain returns false for invalid URLs", () => {
    expect(isSameDomain("not a url", "https://a.com")).toBe(false);
  });
});
