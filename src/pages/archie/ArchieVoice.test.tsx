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
  applyProfileToUtterance: () => {},
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

// happy-dom has no native speech recognition — stub the
// browser/OS recognition engine (Talk section renders).
class MockSpeechRecognition {
  lang = "en";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult = null;
  onerror = null;
  onend = null;
  start() {}
  stop() {}
  abort() {}
}
vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);

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

  it("renders the Talk to ARCHIE (EARS) hands-free section", async () => {
    renderPage();
    expect(
      await screen.findByRole("button", { name: "Talk to ARCHIE" }),
    ).toBeTruthy();
    expect(screen.getByText(/understood by ARCHIE's ears/i)).toBeTruthy();
    expect(screen.getByText(/no OpenAI/i)).toBeTruthy();
  });

  it("is honest when the browser has no native speech recognition", async () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    renderPage();
    expect(
      await screen.findByText(/cannot understand speech natively/i),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Talk to ARCHIE" })).toBeNull();
  });
});
