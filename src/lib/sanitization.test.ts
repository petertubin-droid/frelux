import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  sanitizeHttpUrl,
  sanitizeMarkdownUrl,
  sanitizeCsvCell,
} from "./sanitization";

describe("escapeHtml", () => {
  it("escapes all primary HTML injection characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
    expect(escapeHtml('Hello "World" & <Friends>')).toBe(
      "Hello &quot;World&quot; &amp; &lt;Friends&gt;",
    );
  });

  it("handles null, undefined, numbers and booleans", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(1234)).toBe("1234");
    expect(escapeHtml(0)).toBe("0");
    expect(escapeHtml(true)).toBe("true");
  });
});

describe("sanitizeHttpUrl", () => {
  it("accepts valid https and http URLs", () => {
    expect(sanitizeHttpUrl("https://example.com/path?arg=1")).toBe(
      "https://example.com/path?arg=1",
    );
    expect(sanitizeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("normalizes bare domains and www prefixes to https", () => {
    expect(sanitizeHttpUrl("www.example.com")).toBe("https://www.example.com/");
    expect(sanitizeHttpUrl("contractor.ng/portfolio")).toBe(
      "https://contractor.ng/portfolio",
    );
  });

  it("blocks dangerous schemes such as javascript:, data:, vbscript:", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("javascript://alert(1)")).toBeNull();
    expect(
      sanitizeHttpUrl("data:text/html,<script>alert(1)</script>"),
    ).toBeNull();
    expect(sanitizeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects invalid or empty inputs", () => {
    expect(sanitizeHttpUrl("")).toBeNull();
    expect(sanitizeHttpUrl(null)).toBeNull();
    expect(sanitizeHttpUrl(undefined)).toBeNull();
    expect(sanitizeHttpUrl("not a url")).toBeNull();
    expect(sanitizeHttpUrl("//evil.com")).toBeNull();
  });
});

describe("sanitizeMarkdownUrl", () => {
  it("allows safe relative and internal links", () => {
    expect(sanitizeMarkdownUrl("/learn/wall-finishing")).toBe(
      "/learn/wall-finishing",
    );
    expect(sanitizeMarkdownUrl("#faq-section")).toBe("#faq-section");
    expect(sanitizeMarkdownUrl("./subpath")).toBe("./subpath");
  });

  it("allows valid http, https, mailto, and tel", () => {
    expect(sanitizeMarkdownUrl("https://example.com")).toBe(
      "https://example.com",
    );
    expect(sanitizeMarkdownUrl("mailto:support@frelux.com")).toBe(
      "mailto:support@frelux.com",
    );
    expect(sanitizeMarkdownUrl("tel:+2348012345678")).toBe(
      "tel:+2348012345678",
    );
  });

  it("blocks javascript: and other dangerous schemes", () => {
    expect(sanitizeMarkdownUrl("javascript:alert(1)")).toBe("");
    expect(
      sanitizeMarkdownUrl(
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      ),
    ).toBe("");
    expect(sanitizeMarkdownUrl("//evil.com")).toBe("");
  });
});

describe("sanitizeCsvCell", () => {
  it("preserves legitimate text and numbers", () => {
    expect(sanitizeCsvCell("Cement 50kg")).toBe("Cement 50kg");
    expect(sanitizeCsvCell(8500)).toBe("8500");
    expect(sanitizeCsvCell(-42.5)).toBe("-42.5");
    expect(sanitizeCsvCell("+100")).toBe("+100");
  });

  it("neutralizes formula injection characters (=, @, +, -, tab, cr)", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe(`"'=SUM(A1:A10)"`);
    expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe(`"'=cmd|' /C calc'!A0"`);
    expect(sanitizeCsvCell("@SUM(A1:A5)")).toBe(`"'@SUM(A1:A5)"`);
    expect(sanitizeCsvCell("+cmd|")).toBe(`"'+cmd|"`);
    expect(sanitizeCsvCell("-cmd|")).toBe(`"'-cmd|"`);
    expect(sanitizeCsvCell("\tmalicious")).toBe(`"'\tmalicious"`);
  });

  it("escapes quotes and delimiters according to RFC 4180", () => {
    expect(sanitizeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(sanitizeCsvCell("Lagos, Nigeria")).toBe('"Lagos, Nigeria"');
    expect(sanitizeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("handles null and undefined", () => {
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
  });
});
