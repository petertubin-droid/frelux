import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Container from "@/components/ui/Container";

describe("Container", () => {
  it("renders children inside a div by default", () => {
    render(<Container>Content</Container>);
    const el = screen.getByText("Content");
    expect(el.tagName).toBe("DIV");
  });

  it("renders as section when as=section", () => {
    render(<Container as="section">Content</Container>);
    expect(screen.getByText("Content").tagName).toBe("SECTION");
  });

  it("renders as main when as=main", () => {
    render(<Container as="main">Content</Container>);
    expect(screen.getByText("Content").tagName).toBe("MAIN");
  });

  it("renders as article when as=article", () => {
    render(<Container as="article">Content</Container>);
    expect(screen.getByText("Content").tagName).toBe("ARTICLE");
  });

  it("applies max-width and padding classes", () => {
    render(<Container>Content</Container>);
    const el = screen.getByText("Content");
    expect(el.className).toContain("max-w-7xl");
    expect(el.className).toContain("mx-auto");
  });

  it("applies custom className", () => {
    render(<Container className="custom-class">Content</Container>);
    expect(screen.getByText("Content").className).toContain("custom-class");
  });
});
