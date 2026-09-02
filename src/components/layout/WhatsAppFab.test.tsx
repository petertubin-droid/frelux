import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WhatsAppFab from "@/components/layout/WhatsAppFab";

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  whatsappUrl: vi.fn((msg: string) => `https://wa.me/123?text=${encodeURIComponent(msg)}`),
  track: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset scrollY
  Object.defineProperty(window, "scrollY", {
    value: 0,
    writable: true,
  });
});

function renderFab() {
  return render(
    <MemoryRouter>
      <WhatsAppFab />
    </MemoryRouter>,
  );
}

describe("WhatsAppFab", () => {
  it("renders a link with WhatsApp href", () => {
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toContain("wa.me");
  });

  it("is hidden initially (scrollY = 0)", () => {
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");
    expect(link.getAttribute("aria-hidden")).toBe("true");
    expect(link.className).toContain("opacity-0");
  });

  it("becomes visible after scrolling past 240px", () => {
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");

    Object.defineProperty(window, "scrollY", { value: 300, writable: true });
    fireEvent.scroll(window);

    expect(link.getAttribute("aria-hidden")).toBe("false");
    expect(link.className).toContain("opacity-100");
  });

  it("stays hidden when scroll is below threshold", () => {
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");

    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    fireEvent.scroll(window);

    expect(link.getAttribute("aria-hidden")).toBe("true");
  });

  it("has target=_blank and rel=noopener", () => {
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("tracks analytics on click", async () => {
    const { track } = await import("@/lib/analytics");
    renderFab();
    const link = screen.getByLabelText("Chat on WhatsApp");
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith("whatsapp_clicked", { source: "fab" });
  });
});
