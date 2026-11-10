import { describe, expect, it, vi } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { MathematicalElevationPanel } from "./MathematicalElevationPanel";
import {
  BuildingSizeProvider,
  BUILDING_SIZE_STORAGE_KEY,
} from "@/lib/measurement/building-size-context";
import {
  draftsToSchedule,
  scheduleTotals,
} from "@/lib/measurement/building-schedule";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
    storage: {
      from: vi.fn(() => ({ upload: vi.fn(), createSignedUrl: vi.fn() })),
    },
  },
}));

// The plan-import card reads the session, so the panel needs the provider
// that wraps it in the app.
function render(ui: React.ReactElement) {
  return rtlRender(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe("MathematicalElevationPanel", () => {
  it("opens on the quick start rather than a wall of engineering fields", () => {
    render(<MathematicalElevationPanel onApplyDerivedInput={() => {}} />);
    expect(screen.getByText(/Pick the closest building/)).toBeTruthy();
    expect(screen.getByLabelText("Longest side")).toBeTruthy();
  });

  it("recomputes the headline heights when a preset is chosen", () => {
    render(<MathematicalElevationPanel onApplyDerivedInput={() => {}} />);
    const before = screen.getByText("Height to the roof peak")
      .nextElementSibling?.textContent;
    fireEvent.click(screen.getByText("4-bedroom duplex"));
    const after = screen.getByText("Height to the roof peak").nextElementSibling
      ?.textContent;
    expect(after).not.toBe(before);
  });

  it("fills the envelope from the measured building and says what it read", () => {
    const drafts = [
      {
        id: "r1",
        spaceType: "living_room" as const,
        label: "Room 1",
        length: 4.5,
        width: 3.2,
        height: 2.7,
        quantity: 1,
        doors: 1,
        windows: 1,
      },
    ];
    window.localStorage.setItem(
      BUILDING_SIZE_STORAGE_KEY,
      JSON.stringify({
        schedule: draftsToSchedule(drafts, "meters"),
        totals: scheduleTotals(draftsToSchedule(drafts, "meters")),
        label: "One room",
        unit: "meters",
        drafts,
      }),
    );
    render(
      <BuildingSizeProvider>
        <MathematicalElevationPanel onApplyDerivedInput={() => {}} />
      </BuildingSizeProvider>,
    );
    fireEvent.click(screen.getByText(/Step 2 of 3/));
    fireEvent.click(screen.getByText("Use measured building"));
    expect(
      screen.getByText(/Read from the measured building: 4.50 m x 3.20 m/),
    ).toBeTruthy();
    // Storeys are not in the schedule, so the note has to say so.
    expect(screen.getByText(/Storeys are not read from the schedule/)).toBeTruthy();
    window.localStorage.clear();
  });
});
