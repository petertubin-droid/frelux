import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "owner-1" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role: "admin" }, error: null }),
          order: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  },
}));

const recomputeProfile = vi.fn();
const saveVoiceSample = vi.fn();

vi.mock("@/lib/archie/mobile/voice-profile", () => ({
  estimatePitchHz: () => 120,
  estimateRateHint: () => "steady",
  mixdown: () => new Blob([]),
  recomputeProfile: (...a: unknown[]) => recomputeProfile(...a),
  saveVoiceSample: (...a: unknown[]) => saveVoiceSample(...a),
}));

// happy-dom has no MediaRecorder — stub it so the primary recording path renders.
class MockMediaRecorder {
  start() {}
  stop() {}
}
vi.stubGlobal("MediaRecorder", MockMediaRecorder);
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) },
  configurable: true,
});

import ArchieVoice from "@/pages/archie/ArchieVoice";

beforeEach(() => {
  vi.clearAllMocks();
  recomputeProfile.mockResolvedValue(null);
  saveVoiceSample.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieVoice />);
}

describe("ArchieVoice", () => {
  it("renders the Voice bank page with the record action", async () => {
    renderPage();
    expect(await screen.findByText("Voice")).toBeTruthy();
    expect(await screen.findByText("Record a voice sample")).toBeTruthy();
  });

  it("mounts without crashing while the profile is unresolved", () => {
    recomputeProfile.mockReturnValue(new Promise(() => null));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
