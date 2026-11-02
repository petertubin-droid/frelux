import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmail, renderEmailHtml } from "./kit";

const base = {
  preheader: "Preview line",
  heading: "Welcome to Frelux",
  paragraphs: ["Your account is ready."],
};

describe("email kit", () => {
  it("renders a light scheme shell with the wordmark and a preheader", () => {
    const { html } = renderEmail(base);
    expect(html).toContain('content="light"');
    expect(html).toContain("FRELUX");
    expect(html).toContain("Preview line");
    expect(html).toContain("Welcome to Frelux");
    expect(html).toContain("max-width:600px");
    expect(html).toContain("https://freluxtools.com");
  });

  it("escapes every caller string", () => {
    const { html } = renderEmail({
      ...base,
      heading: 'Hi <script>alert("x")</script>',
      paragraphs: ["5 > 3 & counting"],
      details: [{ label: "Name", value: "<b>Chibuike</b>" }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("5 &gt; 3 &amp; counting");
    expect(html).toContain("&lt;b&gt;Chibuike&lt;/b&gt;");
  });

  it("drops a CTA that is not https and keeps a real one", () => {
    expect(
      renderEmailHtml({
        ...base,
        cta: { label: "Go", href: "javascript:alert(1)" },
      }),
    ).not.toContain(">Go<");
    const html = renderEmailHtml({
      ...base,
      cta: { label: "Start", href: "https://freluxtools.com/paint-calculator" },
    });
    expect(html).toContain('href="https://freluxtools.com/paint-calculator"');
  });

  it("never writes the long dashes the house style forbids", () => {
    const { html, text } = renderEmail({
      ...base,
      paragraphs: ["Paint \u2014 then tile \u2013 then roof"],
    });
    expect(html.includes("\u2014")).toBe(false);
    expect(html.includes("\u2013")).toBe(false);
    expect(text).toContain("Paint - then tile - then roof");
  });

  it("mirrors the content in plain text for clients that strip html", () => {
    const { text } = renderEmail({
      ...base,
      bullets: ["Run an estimate", "Read the guide"],
      details: [{ label: "Total users", value: "16" }],
      cta: { label: "Start", href: "https://freluxtools.com/" },
      note: "Sent because you have an account.",
    });
    expect(text).toContain("Welcome to Frelux");
    expect(text).toContain("- Run an estimate");
    expect(text).toContain("Total users: 16");
    expect(text).toContain("Start: https://freluxtools.com/");
    expect(text).toContain("Sent because you have an account.");
  });

  it("leaves the text twin free of markup", () => {
    expect(escapeHtml("<a>")).toBe("&lt;a&gt;");
    const { text } = renderEmail({ ...base, heading: "A & B" });
    expect(text.startsWith("A & B")).toBe(true);
  });
});
