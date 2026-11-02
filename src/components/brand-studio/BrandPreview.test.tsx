import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BrandPreview", () => {
  it("keeps the PDF line-item preview reachable on narrow screens", async () => {
    const { BrandPreview } =
      await import("@/components/brand-studio/BrandPreview");
    const { container } = render(
      <BrandPreview profiles={[]} selectedProfileId={null} config={null} />,
    );

    const region = screen.getByRole("region", {
      name: "Scrollable PDF line items preview",
    });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toContain("overflow-x-auto");
    expect(container.querySelector("table")?.className).toContain(
      "min-w-[28rem]",
    );
  });
});
