import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
// The calculator page is subscription-gated; page tests exercise the
// engineering logic, not the paywall, so render children directly.
vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/StructuralCalculator")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("StructuralCalculator", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the per-code capacity check on the beam tab after design", async () => {
    await renderPage();
    // Beam tab auto-designs on mount; the authoritative capacity card must
    // appear next to the legacy estimator output with a utilization row.
    expect(
      (await screen.findAllByText(/capacity check/i)).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Flexural utilization/i),
    ).toBeInTheDocument();
  });

  it("re-runs the capacity check on the slab tab with a per-metre strip", async () => {
    await renderPage();
    const slabButton = (await screen.findAllByRole("button")).find(
      (b) => b.textContent?.trim() === "Slab",
    );
    expect(slabButton).toBeTruthy();
    fireEvent.click(slabButton!);
    expect(
      (await screen.findAllByText(/capacity check/i)).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Flexural utilization/i),
    ).toBeInTheDocument();
  });

  it("runs the wind load tab: peak velocity pressure with indicative-market honesty", async () => {
    await renderPage();
    const windButton = (await screen.findAllByRole("button")).find(
      (b) => b.textContent?.trim() === "Wind",
    );
    expect(windButton).toBeTruthy();
    fireEvent.click(windButton!);
    // EN path default for NG: peak velocity pressure row must render
    expect(
      await screen.findByText(/Peak velocity pressure/i),
    ).toBeInTheDocument();
    // Indicative default must be labelled, never silent
    expect(await screen.findByText(/indicative only/i)).toBeInTheDocument();
  });

  it("runs the BBS tab: BS 8666 cutting length, mass and BVBS export", async () => {
    await renderPage();
    const bbsButton = (await screen.findAllByRole("button")).find((b) =>
      b.textContent?.toLowerCase().includes("bar schedule"),
    );
    expect(bbsButton).toBeTruthy();
    fireEvent.click(bbsButton!);
    // Default shape 21, d12, A=1000, B=400, C=200: L = 1000+400+200-24-24 = 1552
    expect(await screen.findByText(/1552\s*mm/)).toBeInTheDocument();
    expect(screen.getAllByText(/BVBS/i).length).toBeGreaterThan(0);
    // Lap card renders ACI tension development for the default inputs
    expect(await screen.findByText(/Tension development/i)).toBeInTheDocument();
  });

  it("runs the seismic detailing tab: SDC-derived detailing and notes", async () => {
    await renderPage();
    const seismicButton = (await screen.findAllByRole("button")).find((b) =>
      b.textContent?.toLowerCase().includes("earthquake"),
    );
    expect(seismicButton).toBeTruthy();
    fireEvent.click(seismicButton!);
    // NG default is the EC8 path; switch to ASCE to exercise the SDC engine
    const stdSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.change(stdSelect, { target: { value: "ACI" } });
    fireEvent.click(
      (await screen.findAllByRole("button")).find((b) =>
        b.textContent?.includes("Calculate Detailing"),
      )!,
    );
    expect(
      await screen.findByText(/Seismic Design Category/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Foundation ties/i)).toBeInTheDocument();
  });

  it("names an empty concrete dimension and keeps the cursor there", async () => {
    await renderPage();

    // The takeoff lives on its own tab; the page opens on the beam tab.
    const concreteTab = (await screen.findAllByRole("button")).find((b) =>
      b.textContent?.toLowerCase().includes("concrete volume"),
    );
    expect(concreteTab).toBeTruthy();
    fireEvent.click(concreteTab!);

    const takeoff = (await screen.findAllByRole("button")).find((b) =>
      b.textContent?.includes("Calculate concrete takeoff"),
    );
    expect(takeoff).toBeTruthy();

    // The takeoff opens with no dimensions, so a press must not produce a
    // schedule. It must name the boxes that are empty instead.
    fireEvent.click(takeoff!);

    const notice = await screen.findByTestId("missing-fields-notice");
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toMatch(/Concrete length/i);
    expect(document.activeElement?.id).toBe("takeoff-length");
    expect(
      screen.queryByText(/Material quantity schedule/i),
    ).not.toBeInTheDocument();
  });
});

describe("StructuralCalculator navigation", () => {
  it("names each tab in words a client uses, with the question it answers", async () => {
    await renderPage();
    const buttons = await screen.findAllByRole("button");
    const labels = [
      "Beam",
      "Column",
      "Slab",
      "Wind",
      "Earthquake",
      "Bar schedule",
      "Concrete volume",
    ];
    for (const label of labels) {
      expect(buttons.some((b) => b.textContent?.trim() === label)).toBe(true);
    }
    // The hint under the tabs changes with the tab, so the row of buttons reads
    // as a menu of answers rather than a list of engineering disciplines.
    expect(
      screen.getByText(/How deep and how heavily reinforced/),
    ).toBeInTheDocument();
    fireEvent.click(
      buttons.find((b) => b.textContent?.trim() === "Concrete volume")!,
    );
    expect(
      await screen.findByText(
        /How much concrete does this element actually use/,
      ),
    ).toBeInTheDocument();
  });
});
