import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE CODING STUDIO
//
// The page is a thin wrapper over the shared StudioWorkbench
// and CodeIntelligencePanel — verify the wrapper routes
// between the two surfaces without duplicating them.
// =========================================================

const Workbench = vi.fn(() => <div data-testid="workbench" />);
const Intelligence = vi.fn(() => <div data-testid="intelligence" />);

vi.mock("@/components/studio/StudioWorkbench", () => ({
  default: () => Workbench(),
}));
vi.mock("@/components/archie/CodeIntelligencePanel", () => ({
  default: () => Intelligence(),
}));

import AdminArchieStudio from "./AdminArchieStudio";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminArchieStudio", () => {
  it("shows the Coding Studio surface by default", () => {
    render(<AdminArchieStudio />);
    expect(screen.getByTestId("workbench")).toBeTruthy();
    expect(screen.queryByTestId("intelligence")).toBeNull();
    expect(screen.getByText("Coding Studio")).toBeTruthy();
  });

  it("switches to the Code Intelligence surface on demand", () => {
    render(<AdminArchieStudio />);
    fireEvent.click(screen.getByText("Code Intelligence"));
    expect(screen.getByTestId("intelligence")).toBeTruthy();
    expect(screen.queryByTestId("workbench")).toBeNull();
  });

  it("switches back to the Coding Studio surface", () => {
    render(<AdminArchieStudio />);
    fireEvent.click(screen.getByText("Code Intelligence"));
    fireEvent.click(screen.getByText("Coding Studio"));
    expect(screen.getByTestId("workbench")).toBeTruthy();
  });

  it("mounts exactly ONE workbench at a time — never both surfaces", () => {
    render(<AdminArchieStudio />);
    fireEvent.click(screen.getByText("Code Intelligence"));
    expect(Workbench).toHaveBeenCalledTimes(1); // default render only
    expect(Intelligence).toHaveBeenCalledTimes(1);
  });
});
