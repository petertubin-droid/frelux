import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listDevices = vi.fn();
const recordAuditEvent = vi.fn();
const fetchSystemStatus = vi.fn();
const functionsInvoke = vi.fn();

// StatusCenter (real child component) also imports fetchSystemStatus.
vi.mock("@/lib/archie/stage1-client", () => ({
  listDevices: (...a: unknown[]) => listDevices(...a),
  recordAuditEvent: (...a: unknown[]) => recordAuditEvent(...a),
  fetchSystemStatus: (...a: unknown[]) => fetchSystemStatus(...a),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...a: unknown[]) => functionsInvoke(...a),
    },
  },
}));

const fetchArchieStatus = vi.fn();

vi.mock("@/lib/archie/status", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/archie/status")>();
  return {
    ...orig,
    fetchArchieStatus: (...a: unknown[]) => fetchArchieStatus(...a),
  };
});

import ArchieControl from "@/pages/archie/ArchieControl";

/** Honest engines manifest fixture: gated capabilities on,
 * one off (construction), core cognition protected. */
function enginesFixture() {
  return {
    engines: [
      {
        id: "natural-conversation",
        description: "d",
        maturity: "OPERATIONAL",
        measuredBy: "t",
        enabled: true,
        toggleable: false,
        protected: true,
        protectedReason: "core cognition",
        platformManaged: null,
        updatedAt: null,
      },
      {
        id: "construction-calculators",
        description: "d",
        maturity: "OPERATIONAL",
        measuredBy: "t",
        enabled: false,
        toggleable: true,
        protected: false,
        protectedReason: null,
        platformManaged: null,
        updatedAt: "2026-09-14T00:00:00Z",
      },
      {
        id: "web-research",
        description: "d",
        maturity: "OPERATIONAL",
        measuredBy: "t",
        enabled: true,
        toggleable: true,
        protected: false,
        protectedReason: null,
        platformManaged: null,
        updatedAt: null,
      },
    ],
    counts: { total: 3, enabled: 2, disabled: 1 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listDevices.mockResolvedValue([]);
  recordAuditEvent.mockResolvedValue(undefined);
  fetchSystemStatus.mockResolvedValue(null);
  fetchArchieStatus.mockResolvedValue(null);
  functionsInvoke.mockResolvedValue({ data: enginesFixture() });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieControl />
    </MemoryRouter>,
  );
}

describe("ArchieControl", () => {
  it("renders the Central Control hub with the Status Center section", () => {
    renderPage();
    expect(screen.getByText("Central Control")).toBeTruthy();
    expect(screen.getByText("Status Center")).toBeTruthy();
  });

  it("mounts without crashing while device data is unresolved", () => {
    listDevices.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("links to the ARCHIE sections", () => {
    renderPage();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/archie/chat");
    expect(hrefs).toContain("/archie/devices");
    expect(hrefs).toContain("/archie/migration");
    expect(hrefs).toContain("/archie/coding");
  });

  it("no dormant cards: nothing renders a PLANNED INTERFACE badge", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByRole("switch").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("PLANNED INTERFACE")).toBeNull();
  });

  it("gated systems carry live toggle switches; core cognition does not", async () => {
    renderPage();
    // construction + calculators (construction-calculators,
    // owner-off) and web (web-research) are toggleable → 3.
    await waitFor(() => expect(screen.getAllByRole("switch").length).toBe(3));
    // Core cognition cards explain why there is no switch.
    expect(
      screen.getByText("Core cognition — no toggle by design"),
    ).toBeTruthy();
  });

  it("a capability the owner switched OFF reports DEACTIVATED on its cards", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText("DEACTIVATED").length).toBe(2),
    );
    expect(
      screen.getAllByText(/Owner-deactivated from the Engines panel/).length,
    ).toBeGreaterThan(0);
  });

  it("toggling posts the real state change to archie-engines", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("switch").length).toBe(3));
    // First switch in DOM order is Construction Intelligence —
    // owner-off, so clicking it re-activates (enabled: true).
    const sw = screen.getAllByRole("switch")[0];
    fireEvent.click(sw);
    await waitFor(() =>
      expect(functionsInvoke).toHaveBeenCalledWith("archie-engines", {
        body: { capability_id: "construction-calculators", enabled: true },
      }),
    );
  });
});
