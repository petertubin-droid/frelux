import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EnginePreviewLock } from "@/components/premium/EnginePreviewLock";
import { premiumEngineFor } from "@/config/premium-engines";

const engine = premiumEngineFor("/concrete-takeoff-calculator")!;

describe("EnginePreviewLock", () => {
  it("counts the lines the plan would add", () => {
    render(
      <MemoryRouter>
        <EnginePreviewLock engine={engine} hiddenLines={6} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/6 more lines on a plan/)).toBeInTheDocument();
  });

  it("reads correctly when a single line is withheld", () => {
    render(
      <MemoryRouter>
        <EnginePreviewLock engine={engine} hiddenLines={1} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/1 more line on a plan/)).toBeInTheDocument();
  });

  it("says what the plan adds, in the trade's words", () => {
    render(
      <MemoryRouter>
        <EnginePreviewLock engine={engine} hiddenLines={0} />
      </MemoryRouter>,
    );
    for (const item of engine.unlocks) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /See the plans/ })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
