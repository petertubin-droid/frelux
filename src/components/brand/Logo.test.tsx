import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ branding: null }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

import Logo, { LogoMark } from "@/components/brand/Logo";

describe("Logo", () => {
  it("renders with default full variant", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("renders mark variant without text", () => {
    const { container } = render(<Logo variant="mark" />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("uses light text for dark backgrounds", () => {
    const { container } = render(<Logo light />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.querySelector(".custom-class")).toBeTruthy();
  });

  it("renders brand name from siteConfig when no branding", () => {
    render(<Logo />);
    expect(screen.getByText("FRELUX")).toBeTruthy();
  });

  it("renders tagline text", () => {
    render(<Logo />);
    expect(screen.getByText("Smart Calc")).toBeTruthy();
  });
});

describe("LogoMark", () => {
  it("renders an img element", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("accepts className", () => {
    const { container } = render(<LogoMark className="my-mark" />);
    expect(container.querySelector(".my-mark")).toBeTruthy();
  });
});
