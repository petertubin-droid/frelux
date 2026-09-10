import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/archie/stage2-terminology-client", () => ({
  TERMINOLOGY_DOMAINS: ["construction"],
  createTerminology: vi.fn(),
  deleteTerminology: vi.fn(),
  setVerification: vi.fn(),
  listTerminology: vi.fn().mockResolvedValue([]),
}));

import ArchieTerminology from "@/pages/archie/ArchieTerminology";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArchieTerminology — language registry", () => {
  it("renders the real seed language registry", async () => {
    render(<ArchieTerminology />);
    expect(await screen.findByText("Language registry")).toBeTruthy();
    expect(await screen.findByText("English")).toBeTruthy();
  });

  it("resolves the session language from a location suggestion", async () => {
    render(<ArchieTerminology />);
    await screen.findByText("Language registry");
    await userEvent.click(screen.getByText("Resolve session language"));
    expect(
      await screen.findByText(/LOCATION_SUGGESTION/, { exact: false }),
    ).toBeTruthy();
    expect(screen.getByText(/authoritative: false/)).toBeTruthy();
  });

  it("a user selection is authoritative and validated against the registry", async () => {
    render(<ArchieTerminology />);
    await screen.findByText("Language registry");
    await userEvent.type(
      screen.getByLabelText("User language selection"),
      "zz",
    );
    await userEvent.click(screen.getByText("Resolve session language"));
    expect(await screen.findByText(/not registered\/active/i)).toBeTruthy();
  });
});
