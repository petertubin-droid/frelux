import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BoreholeWaterSystemAnimation from "./BoreholeWaterSystemAnimation";
import { calculateBoreholeWaterSystem } from "@/lib/estimation/borehole-water-system-engine";

const result = calculateBoreholeWaterSystem({
  drillingDepthMeters: 60,
  staticWaterLevelMeters: 12,
  expectedYieldM3PerHour: 2.5,
  householdOccupants: 6,
  marketCode: "NG",
});

describe("BoreholeWaterSystemAnimation layout", () => {
  it("keeps the stage write up out of the drawing on phones", () => {
    render(<BoreholeWaterSystemAnimation result={result} />);

    const mobile = screen.getByTestId("cutaway-notes-mobile");
    expect(mobile.className).toContain("md:hidden");
    expect(mobile.closest(".absolute")).toBeNull();
    expect(mobile.textContent).toContain("Stage 1 of 7");

    const desktop = screen.getByTestId("cutaway-notes-desktop");
    expect(desktop.className).toContain("hidden");
    expect(desktop.className).toContain("md:block");
    expect(desktop.closest(".absolute")).not.toBeNull();
  });

  it("follows the active stage in the notes that stay in the flow", () => {
    render(<BoreholeWaterSystemAnimation result={result} />);
    fireEvent.click(screen.getByRole("button", { name: "Step 7" }));
    expect(screen.getByTestId("cutaway-notes-mobile").textContent).toContain(
      "Stage 7 of 7",
    );
    expect(screen.getByTestId("cutaway-notes-mobile").textContent).toContain(
      "QA Gate:",
    );
  });
});
