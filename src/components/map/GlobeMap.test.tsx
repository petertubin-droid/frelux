import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// MapLibre needs WebGL, so the module is replaced with a constructor that
// fails the way a browser without hardware acceleration does. The component
// must degrade to its readable fallback instead of throwing.
vi.mock("maplibre-gl", () => ({
  default: class {
    constructor() {
      throw new Error("WebGL context unavailable");
    }
  },
}));

describe("GlobeMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back gracefully when the 3D canvas cannot start", async () => {
    const { GlobeMap } = await import("@/components/map/GlobeMap");
    render(
      <MemoryRouter>
        <GlobeMap points={[]} label="Professionals map" />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("application", { name: "Professionals map" }),
    ).toBeTruthy();
    expect(await screen.findByText(/needs WebGL/i)).toBeTruthy();
  });
});
