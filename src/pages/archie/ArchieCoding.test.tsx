// =========================================================
// ARCHIE PWA — CODING SURFACE (/archie/coding)
//
// One implementation, no PWA-only duplicate: the surface tabs
// into the SAME shared workbench components the admin console
// renders (StudioWorkbench, CodeIntelligencePanel,
// DevGovernance), and every tab is reachable.
// =========================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/studio/StudioWorkbench", () => ({
  default: () => <div>STUDIO WORKBENCH SURFACE</div>,
}));
vi.mock("@/components/archie/CodeIntelligencePanel", () => ({
  default: () => <div>CODE INTELLIGENCE SURFACE</div>,
}));
vi.mock("@/components/archie/DevGovernance", () => ({
  default: () => <div>DEV GOVERNANCE SURFACE</div>,
}));

import ArchieCoding from "@/pages/archie/ArchieCoding";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArchieCoding", () => {
  it("opens on the Coding Studio tab by default", () => {
    render(<ArchieCoding />);
    expect(screen.getByText("STUDIO WORKBENCH SURFACE")).toBeTruthy();
    expect(screen.queryByText("CODE INTELLIGENCE SURFACE")).toBeNull();
  });

  it("switches to Code Intelligence and Governance tabs", () => {
    render(<ArchieCoding />);
    fireEvent.click(screen.getByRole("button", { name: /code intelligence/i }));
    expect(screen.getByText("CODE INTELLIGENCE SURFACE")).toBeTruthy();
    expect(screen.queryByText("STUDIO WORKBENCH SURFACE")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /governance/i }));
    expect(screen.getByText("DEV GOVERNANCE SURFACE")).toBeTruthy();
    expect(screen.queryByText("CODE INTELLIGENCE SURFACE")).toBeNull();
  });

  it("renders all three tab controls", () => {
    render(<ArchieCoding />);
    expect(screen.getByRole("button", { name: /coding studio/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /code intelligence/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /governance/i })).toBeTruthy();
  });
});
