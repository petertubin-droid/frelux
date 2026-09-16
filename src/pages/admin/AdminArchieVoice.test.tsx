import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE VOICE BANK
//
// Verifies the honest admin gate (non-admins see Access
// denied, never the recorder), the unsupported-browser
// disclosure, and that samples + profile load through the
// real supabase calls (mocked at the client boundary).
// =========================================================

const getUser = vi.fn();
const profilesSelect = vi.fn();
const samplesSelect = vi.fn();

vi.mock("@/lib/supabase", () => {
  const profileChain: Record<string, unknown> = {};
  profileChain.select = vi.fn(() => profileChain);
  profileChain.eq = vi.fn(() => profileChain);
  profileChain.single = vi.fn(() => profilesSelect());
  const sampleChain: Record<string, unknown> = {};
  sampleChain.select = vi.fn(() => sampleChain);
  sampleChain.eq = vi.fn(() => sampleChain);
  sampleChain.order = vi.fn(() => samplesSelect());
  return {
    supabase: {
      auth: { getUser: (...a: unknown[]) => getUser(...a) },
      from: vi.fn((table: string) =>
        table === "profiles" ? profileChain : sampleChain,
      ),
    },
  };
});

const recomputeProfile = vi.fn();
vi.mock("@/lib/archie/mobile/voice-profile", () => ({
  recomputeProfile: (...a: unknown[]) => recomputeProfile(...a),
  estimatePitchHz: vi.fn(() => 0),
  estimateRateHint: vi.fn(() => 0),
  mixdown: vi.fn(() => new Float32Array(0)),
  saveVoiceSample: vi.fn(),
  deleteVoiceSample: vi.fn(),
  createSamplePlayUrl: vi.fn(() => null),
  applyProfileToUtterance: vi.fn(),
}));

import AdminArchieVoice from "./AdminArchieVoice";

function mockAdminSession(role: string) {
  getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
  profilesSelect.mockResolvedValue({ data: { role } });
  samplesSelect.mockResolvedValue({ data: [] });
  recomputeProfile.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminSession("admin");
});

describe("AdminArchieVoice — access gate", () => {
  it("denies non-admins honestly — the recorder never mounts", async () => {
    mockAdminSession("user");
    render(<AdminArchieVoice />);
    expect(
      await screen.findByText("Admin access required.", { exact: false }),
    ).toBeTruthy();
    expect(screen.queryByText("Record a sample")).toBeNull();
  });

  it("mounts the recorder for admins", async () => {
    render(<AdminArchieVoice />);
    expect(
      await screen.findByText(/Record a sample|Stop & save/),
    ).toBeTruthy();
  });
});

describe("AdminArchieVoice — browser support disclosure", () => {
  it("discloses when the browser cannot record, and disables the record button", async () => {
    // happy-dom has no MediaRecorder → supported=false path
    render(<AdminArchieVoice />);
    expect(
      await screen.findByText("This browser cannot record audio."),
    ).toBeTruthy();
    const btn = screen.getByRole("button", { name: /Record a sample/ });
    expect(btn.getAttribute("disabled")).not.toBeNull();
  });
});

describe("AdminArchieVoice — loading through the real client calls", () => {
  it("loads the voice bank and profile for the signed-in owner", async () => {
    render(<AdminArchieVoice />);
    await waitFor(() => expect(recomputeProfile).toHaveBeenCalledWith("owner-1"));
    await waitFor(() => expect(samplesSelect).toHaveBeenCalled());
  });

  it("surfaces an honest error when the bank cannot be loaded", async () => {
    samplesSelect.mockRejectedValue(new Error("network"));
    render(<AdminArchieVoice />);
    expect(
      await screen.findByText("Could not load the voice bank."),
    ).toBeTruthy();
  });
});
