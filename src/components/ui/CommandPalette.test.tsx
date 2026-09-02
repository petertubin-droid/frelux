import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/components/ui/CommandPalette";

vi.mock("@/lib/smart-defaults", () => ({
  getRecentTools: vi.fn(() => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPalette(overrides?: Record<string, unknown>) {
  const onClose = vi.fn();
  return {
    onClose,
    ...render(
      <MemoryRouter>
        <CommandPalette open={true} onClose={onClose} {...overrides} />
      </MemoryRouter>,
    ),
  };
}

describe("CommandPalette", () => {
  it("renders search input when open", () => {
    renderPalette();
    expect(screen.getByPlaceholderText(/search|type/i)).toBeTruthy();
  });

  it("renders calculator commands", () => {
    renderPalette();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Screeding Calculator")).toBeTruthy();
  });

  it("filters results based on search query", () => {
    renderPalette();
    const input = screen.getByPlaceholderText(/search|type/i);
    fireEvent.change(input, { target: { value: "tile" } });
    expect(screen.getAllByText(/tile/i).length).toBeGreaterThan(0);
    // Paint calculator should not be visible
    expect(screen.queryByText("Paint Calculator")).toBeNull();
  });

  it("does not render when closed", () => {
    const { container } = renderPalette({ open: false });
    expect(container.innerHTML).toBe("");
  });
});
