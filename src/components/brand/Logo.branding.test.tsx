import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

const branding = {
  website_name: "FRELUX SMART CALC",
  website_tagline: "Every Trade. Every Cost. One Platform.",
  light_logo_url: "",
  dark_logo_url: "",
};

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ branding }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

import Logo, { usableBrandLogo } from "@/components/brand/Logo";

describe("branding logo formats", () => {
  it("accepts formats that carry transparency", () => {
    expect(usableBrandLogo("https://cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png",
    );
    expect(usableBrandLogo("https://cdn.example.com/logo.svg?v=2")).toBe(
      "https://cdn.example.com/logo.svg?v=2",
    );
    expect(usableBrandLogo("https://cdn.example.com/logo.webp")).toBe(
      "https://cdn.example.com/logo.webp",
    );
  });

  it("rejects JPEG uploads, which cannot carry transparency", () => {
    expect(usableBrandLogo("https://cdn.example.com/1758-logo.jpg")).toBeNull();
    expect(usableBrandLogo("https://cdn.example.com/logo.jpeg?x=1")).toBeNull();
  });

  it("rejects nothing at all", () => {
    expect(usableBrandLogo(null)).toBeNull();
    expect(usableBrandLogo(undefined)).toBeNull();
    expect(usableBrandLogo("")).toBeNull();
  });

  it("falls back to the bundled mark when branding is a JPEG", () => {
    branding.light_logo_url =
      "https://nfgaaohweygwydoelxnf.supabase.co/storage/v1/object/public/media/user-uploads/1-hrdunl.jpg";
    const { container } = render(<Logo />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/brand/frelux-mark.png");
  });

  it("uses a transparent upload when one is available", () => {
    branding.light_logo_url = "https://cdn.example.com/brand-logo.png";
    const { container } = render(<Logo />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "https://cdn.example.com/brand-logo.png",
    );
    branding.light_logo_url = "";
  });
});
