// =========================================================
// FRELUX ARCHIE — EARS (AUDIO INTELLIGENCE) TESTS
//
// Hermetic: the Supabase client is mocked, the browser's
// MediaRecorder/getUserMedia are stubbed. These tests lock
// in the honesty invariants of the Ears subsystem:
//   * failures are typed, never silently swallowed
//   * an empty transcription is NEVER fabricated into text
//   * the microphone is only ever turned on via the
//     owner-initiated startListening()
// =========================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: async () => ({
    functions: { invoke: invokeMock },
  }),
}));

import {
  startListening,
  transcribeAudio,
  detectEarSupport,
  EarsError,
} from "@/lib/archie/ears";

// ---- Browser stubs ----
class MockRecorder {
  static instances: MockRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((ev: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor(_stream: MediaStream, _opts?: unknown) {
    MockRecorder.instances.push(this);
  }
  start() {
    this.started = true;
    this.ondataavailable?.({ data: new Blob(["chunk"]) });
  }
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.onstop?.();
  }
}

function stubMicDevice(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
}

let originalMediaRecorder: unknown;
let originalMediaDevices: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  MockRecorder.instances = [];
  invokeMock.mockReset();
  originalMediaRecorder = (globalThis as Record<string, unknown>)[
    "MediaRecorder"
  ];
  originalMediaDevices = (navigator as unknown as Record<string, unknown>)[
    "mediaDevices"
  ];
  vi.stubGlobal("MediaRecorder", MockRecorder);
  stubMicDevice(
    async () =>
      ({
        getTracks: () => [{ stop: () => {} }],
      }) as unknown as MediaStream,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", {
    value: originalMediaDevices,
    configurable: true,
  });
  (globalThis as Record<string, unknown>)["MediaRecorder"] =
    originalMediaRecorder;
});

// ---------------------------------------------------------
// Support detection — honest about the browser
// ---------------------------------------------------------
describe("detectEarSupport", () => {
  it("reports false when MediaRecorder is missing", () => {
    (globalThis as Record<string, unknown>)["MediaRecorder"] = undefined;
    expect(detectEarSupport()).toBe(false);
  });

  it("reports true when mic + MediaRecorder exist", () => {
    expect(detectEarSupport()).toBe(true);
  });
});

// ---------------------------------------------------------
// Recording lifecycle — explicit, owner-initiated only
// ---------------------------------------------------------
describe("startListening", () => {
  it("throws UNSUPPORTED when the browser has no MediaRecorder", async () => {
    (globalThis as Record<string, unknown>)["MediaRecorder"] = undefined;
    await expect(startListening()).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
  });

  it("throws PERMISSION_DENIED when the owner refuses the mic", async () => {
    stubMicDevice(() =>
      Promise.reject(new DOMException("denied", "NotAllowedError")),
    );
    await expect(startListening()).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });

  it("throws NO_MIC when no input device exists", async () => {
    stubMicDevice(() =>
      Promise.reject(new DOMException("not found", "NotFoundError")),
    );
    await expect(startListening()).rejects.toMatchObject({ code: "NO_MIC" });
  });

  it("records only after startListening, and stop() returns the real audio", async () => {
    const rec = await startListening();
    const recorderInstance = MockRecorder.instances[0];
    expect(recorderInstance.started).toBe(true);
    expect(MockRecorder.instances).toHaveLength(1);

    const recording = await rec.stop();
    expect(recorderInstance.stopped).toBe(true);
    expect(recording.blob).toBeInstanceOf(Blob);
    expect(recording.blob.size).toBeGreaterThan(0);
    expect(recording.durationSec).toBeGreaterThanOrEqual(0);
    expect(recording.capped).toBe(false);
  });

  it("rejects NOT_RECORDED when nothing was captured", async () => {
    // a recorder that produces no chunks at all
    class EmptyRecorder extends MockRecorder {
      start() {
        this.started = true; // no ondataavailable fired
      }
    }
    vi.stubGlobal("MediaRecorder", EmptyRecorder);
    const rec = await startListening();
    await expect(rec.stop()).rejects.toMatchObject({ code: "NOT_RECORDED" });
  });
});

// ---------------------------------------------------------
// Transcription — real service, honest results
// ---------------------------------------------------------
describe("transcribeAudio", () => {
  it("returns the transcript, detected language and duration", async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        transcript: "what is the paint coverage per litre",
        speech_detected: true,
        language: "en",
        duration_sec: 4.2,
      },
      error: null,
    });
    const result = await transcribeAudio({
      blob: new Blob(["audio"], { type: "audio/webm" }),
      languageHint: "en",
      contextPrompt: "previous reply",
    });
    expect(result.transcript).toBe("what is the paint coverage per litre");
    expect(result.speechDetected).toBe(true);
    expect(result.language).toBe("en");
    expect(result.durationSec).toBe(4.2);
    // context + language hint travel to the service
    const form = invokeMock.mock.calls[0][1].body as FormData;
    expect(form.get("language_hint")).toBe("en");
    expect(form.get("context_prompt")).toBe("previous reply");
    expect(form.get("audio")).toBeInstanceOf(File);
  });

  it("NEVER fabricates text when no speech was detected", async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        transcript: "",
        speech_detected: false,
        language: null,
      },
      error: null,
    });
    const result = await transcribeAudio({ blob: new Blob(["silence"]) });
    expect(result.transcript).toBe("");
    expect(result.speechDetected).toBe(false);
    expect(result.language).toBeNull();
  });

  it("maps an unconfigured deployment to SERVICE_UNAVAILABLE", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, code: "EARS_UNCONFIGURED", error: "not configured" },
      error: null,
    });
    await expect(
      transcribeAudio({ blob: new Blob(["x"]) }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("maps provider failures to PROVIDER_ERROR", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, code: "EARS_PROVIDER_QUOTA", error: "quota" },
      error: null,
    });
    await expect(
      transcribeAudio({ blob: new Blob(["x"]) }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("throws SERVICE_UNAVAILABLE when the edge function is unreachable", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error("FunctionsHttpError: 502"),
    });
    await expect(
      transcribeAudio({ blob: new Blob(["x"]) }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("throws SERVICE_UNAVAILABLE when the response is not an object", async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    await expect(
      transcribeAudio({ blob: new Blob(["x"]) }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("surfaces EarsError instances (never raw strings)", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, code: "RATE_LIMITED", error: "slow down" },
      error: null,
    });
    try {
      await transcribeAudio({ blob: new Blob(["x"]) });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(EarsError);
      expect((e as EarsError).code).toBe("RATE_LIMITED");
      expect((e as EarsError).message).toContain("slow down");
    }
  });
});
