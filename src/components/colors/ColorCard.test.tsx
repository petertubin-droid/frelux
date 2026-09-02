import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ColorCard from "@/components/colors/ColorCard";

const mockColor = {
  id: "color-1",
  slug: "fire-red",
  hex_code: "#FF0000",
  name: "Fire Red",
  brand: "Dulux",
  is_trending: false,
  is_featured: false,
} as any;

function renderCard(props: Partial<Parameters<typeof ColorCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ColorCard color={mockColor} {...props} />
    </MemoryRouter>,
  );
}

describe("ColorCard", () => {
  it("renders color name and hex code", () => {
    renderCard();
    expect(screen.getByText("#FF0000")).toBeTruthy();
  });

  it("links to color detail page", () => {
    renderCard();
    const links = screen.getAllByRole("link");
    const link = links[0];
    expect(link.getAttribute("href")).toBe("/colors/paint/fire-red");
  });

  it("shows trending badge when is_trending", () => {
    renderCard({ color: { ...mockColor, is_trending: true } as any });
    expect(screen.getByText("Trending")).toBeTruthy();
  });

  it("shows featured badge when is_featured and not trending", () => {
    renderCard({ color: { ...mockColor, is_featured: true } as any });
    expect(screen.getByText("Featured")).toBeTruthy();
  });

  it("does not show featured badge when trending", () => {
    renderCard({
      color: { ...mockColor, is_trending: true, is_featured: true } as any,
    });
    expect(screen.queryByText("Featured")).toBeNull();
  });

  it("does not show favorite button when no onToggleFavorite", () => {
    renderCard();
    expect(screen.queryByLabelText(/favorites/i)).toBeNull();
  });

  it("shows favorite button when onToggleFavorite provided", () => {
    renderCard({ onToggleFavorite: vi.fn() });
    expect(screen.getByLabelText("Add to favorites")).toBeTruthy();
  });

  it("shows remove label when favorited", () => {
    renderCard({ onToggleFavorite: vi.fn(), isFavorited: true });
    expect(screen.getByLabelText("Remove from favorites")).toBeTruthy();
  });

  it("calls onToggleFavorite with color id when clicked", () => {
    const handler = vi.fn();
    renderCard({ onToggleFavorite: handler });
    fireEvent.click(screen.getByLabelText("Add to favorites"));
    expect(handler).toHaveBeenCalledWith("color-1");
  });
});
