// =========================================================
// ARCHIE PWA — ENGINES VIEW
//
// NO THEATER: toggles hit the owner-gated archie-engines
// function, core cognition is PROTECTED (no switch — it can
// never be corrupted from a panel), and toggle failures are
// surfaced honestly with a reload.
// =========================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const invokeMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import ArchieEngines from "@/pages/archie/ArchieEngines";

function engine(over: Record<string, unknown> = {}) {
  return {
    id: "weather_engine",
    description: "Live weather intelligence.",
    maturity: "OPERATIONAL",
    measuredBy: "vitest suite + live probe",
    enabled: true,
    toggleable: true,
    protected: false,
    protectedReason: null,
    platformManaged: null,
    updatedAt: "2026-09-16T00:00:00.000Z",
    ...over,
  };
}

function enginesResponse() {
  return {
    engines: [
      engine(),
      engine({
        id: "trading_engine",
        description: "Trading surface.",
        enabled: false,
        maturity: "DEVELOPING",
      }),
      engine({
        id: "core_cognition",
        description: "ARCHIE's own cognition.",
        enabled: true,
        toggleable: false,
        protected: true,
        protectedReason:
          "Core cognition can never be switched off from a panel.",
      }),
      engine({
        id: "platform_ads",
        description: "Platform managed.",
        toggleable: false,
        platformManaged: "freluxtools",
      }),
    ],
    counts: { total: 4, enabled: 2, disabled: 2 },
  };
}

function setupInvoke() {
  invokeMock.mockImplementation((_fn: string, opts?: { method?: string }) =>
    opts?.method === "GET"
      ? Promise.resolve({ data: enginesResponse(), error: null })
      : Promise.resolve({ data: { ok: true }, error: null }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupInvoke();
});

describe("ArchieEngines", () => {
  it("renders the live manifest summary and every engine honestly", async () => {
    render(<ArchieEngines />);
    expect(
      await screen.findByText(
        /2 active · 2 off · 4 engines — toggles are real/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText("weather_engine")).toBeTruthy();
    expect(screen.getByText("core_cognition")).toBeTruthy();
    // The disabled engine is visibly OFF.
    expect(screen.getByText("· OFF")).toBeTruthy();
  });

  it("renders a real switch for every toggleable engine", async () => {
    render(<ArchieEngines />);
    await screen.findByText("weather_engine");
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBe(2); // weather + trading
    expect(
      switches.find(
        (s) => s.getAttribute("aria-checked") === "true",
      ) as HTMLElement,
    ).toBeTruthy();
  });

  it("PROTECTS core cognition — no switch, marked always on", async () => {
    render(<ArchieEngines />);
    await screen.findByText("core_cognition");
    // The protected engine shows the honest no-switch label.
    expect(screen.getByText("always on")).toBeTruthy();
    expect(screen.getByText(/· protected/)).toBeTruthy();
    fireEvent.click(screen.getByText("core_cognition"));
    expect(
      screen.getByText(
        /Core cognition can never be switched off from a panel\./i,
      ),
    ).toBeTruthy();
  });

  it("marks platform-managed engines with their product surface", async () => {
    render(<ArchieEngines />);
    await screen.findByText("platform_ads");
    expect(screen.getByText("platform")).toBeTruthy();
    expect(screen.getByText(/· freluxtools/)).toBeTruthy();
  });

  it("toggles through the REAL owner-gated function with optimistic update", async () => {
    render(<ArchieEngines />);
    await screen.findByText("trading_engine");
    const switches = screen.getAllByRole("switch");
    const offSwitch = switches.find(
      (s) => s.getAttribute("aria-checked") === "false",
    ) as HTMLElement;
    fireEvent.click(offSwitch);

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("archie-engines", {
        body: { capability_id: "trading_engine", enabled: true },
      }),
    );
    // Optimistic local update: counts flip immediately.
    await screen.findByText(/3 active · 1 off · 4 engines/i);
  });

  it("surfaces a toggle failure honestly and reloads the real state", async () => {
    render(<ArchieEngines />);
    await screen.findByText("weather_engine");
    invokeMock.mockImplementation((_fn: string, opts?: { method?: string }) =>
      opts?.method === "GET"
        ? Promise.resolve({ data: enginesResponse(), error: null })
        : Promise.resolve({
            data: { error: "owner gate refused" },
            error: null,
          }),
    );
    const onSwitch = screen
      .getAllByRole("switch")
      .find((s) => s.getAttribute("aria-checked") === "true") as HTMLElement;
    fireEvent.click(onSwitch);
    // The toggle POST is refused by the owner gate...
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(3)); // GET, POST, reload-GET
    // ...and the reload restores the real server state untouched.
    await screen.findByText(/2 active · 2 off · 4 engines/i);
  });

  it("reports an honest error when the manifest cannot be loaded", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error("network gone"),
    });
    render(<ArchieEngines />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/network gone/i)).toBeTruthy();
  });
});
