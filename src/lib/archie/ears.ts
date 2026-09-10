// =========================================================
// FRELUX ARCHIE — EARS / AUDIO INTELLIGENCE (CLIENT)
//
// The browser side of ARCHIE's audio perception:
//
//   MICROPHONE → EARS ENGINE → STT (archie-ears edge fn)
//     → TRANSCRIPT + LANGUAGE → ARCHIE PERCEPTION →
//     COGNITIVE ENGINE (archie-core) → RESPONSE
//
// Honesty rules (spec §§3, 16, 19):
//   * Every failure is typed and surfaced — permission
//     denial, missing microphone, unsupported format, no
//     speech detected, unavailable service. Nothing is
//     faked, nothing is "best-effort" transcribed locally.
//   * An empty transcript is reported as speech_detected:
//     false — the engine NEVER invents text.
//   * Recording is explicit: it starts when the owner asks
//     and stops when the owner stops it (or the hard
//     duration cap trips). ARCHIE never listens silently.
// =========================================================

import { getSupabase } from "@/lib/supabase-lazy";

export type EarsErrorCode =
  | "UNSUPPORTED" // browser cannot record audio at all
  | "PERMISSION_DENIED" // owner (or browser policy) denied the microphone
  | "NO_MIC" // no input device exists
  | "RECORD_FAILED" // MediaRecorder failed mid-recording
  | "NOT_RECORDED" // stop() called before anything was captured
  | "SERVICE_UNAVAILABLE" // network / edge function unreachable
  | "PROVIDER_ERROR" // provider failed (auth, quota, unavailable)
  | "FILE_TOO_LARGE" // over the provider size limit
  | "UNSUPPORTED_FORMAT" // mime not accepted server-side
  | "RATE_LIMITED" // too many audio requests
  | "FORBIDDEN" // non-owner attempted EARS
  | "NO_SPEECH"; // audio processed, nothing intelligible

export class EarsError extends Error {
  code: EarsErrorCode;
  constructor(code: EarsErrorCode, message: string) {
    super(message);
    this.name = "EarsError";
    this.code = code;
  }
}

export const EARS_MAX_DURATION_MS = 30_000; // hard cap per utterance
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/aac",
];

/** Can this browser record microphone audio at all? */
export function detectEarSupport(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function"
  );
}

function pickMimeType(): string {
  if (typeof MediaRecorder.isTypeSupported !== "function") return "";
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export interface EarsRecording {
  /** The recorded audio, with the negotiated mime type. */
  blob: Blob;
  /** Wall-clock recording duration in seconds. */
  durationSec: number;
  /** True when the hard duration cap tripped the stop. */
  capped: boolean;
}

export interface EarsRecorder {
  /** Owner-initiated stop. Resolves with the recording. */
  stop(): Promise<EarsRecording>;
  /** Release the mic without waiting for the recording. */
  cancel(): void;
}

/**
 * Start listening. The microphone turns on ONLY here, with
 * the owner's explicit action behind the call. Auto-stops
 * honestly at maxDurationMs (the result is reported with
 * capped: true — the audio is real, just length-limited).
 */
export async function startListening(opts?: {
  maxDurationMs?: number;
}): Promise<EarsRecorder> {
  if (!detectEarSupport()) {
    throw new EarsError(
      "UNSUPPORTED",
      "This browser cannot record audio. ARCHIE's ears need microphone support.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: unknown) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new EarsError("NO_MIC", "No microphone was found on this device.");
    }
    throw new EarsError(
      "PERMISSION_DENIED",
      "Microphone permission was not granted. ARCHIE cannot listen without it.",
    );
  }

  const mime = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    throw new EarsError(
      "RECORD_FAILED",
      "This browser refused to start audio recording.",
    );
  }

  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let stopped = false;
  let capped = false;

  // Handlers are attached BEFORE any stop can fire so the
  // recording promise always settles, whichever side stops
  // first (owner tap or duration cap).
  const whenStopped = new Promise<EarsRecording>((resolve, reject) => {
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = recorder.mimeType || mime || "audio/webm";
      if (chunks.length === 0) {
        reject(new EarsError("NOT_RECORDED", "No audio was captured."));
        return;
      }
      resolve({
        blob: new Blob(chunks, { type }),
        durationSec: Math.round((Date.now() - startedAt) / 100) / 10,
        capped,
      });
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new EarsError("RECORD_FAILED", "Audio recording failed."));
    };
  });

  recorder.start(250); // timeslice keeps chunks flowing

  const capTimer = setTimeout(() => {
    capped = true;
    if (!stopped) {
      stopped = true;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
  }, opts?.maxDurationMs ?? EARS_MAX_DURATION_MS);

  function release() {
    if (!stopped) {
      stopped = true;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
  }

  return {
    stop: async () => {
      clearTimeout(capTimer);
      release();
      return whenStopped;
    },
    cancel: () => {
      clearTimeout(capTimer);
      release();
    },
  };
}

// ---------------------------------------------------------
// Speech → text through the real archie-ears edge function.
// The provider key lives server-side; the client only ever
// holds its own session JWT.
// ---------------------------------------------------------
export interface TranscriptionResult {
  transcript: string;
  /** ISO code reported by the provider, or null if unknown. */
  language: string | null;
  durationSec: number | null;
  /** False means the audio contained no intelligible speech.
   *  The transcript is then exactly "" — never invented. */
  speechDetected: boolean;
}

export async function transcribeAudio(input: {
  blob: Blob;
  /** ISO 639-1 hint from the live ARCHIE language registry. */
  languageHint?: string | null;
  /** Previous assistant reply — keeps recognition inside the
   *  ongoing conversation (context preservation). */
  contextPrompt?: string | null;
}): Promise<TranscriptionResult> {
  const supabase = await getSupabase();

  const form = new FormData();
  form.append(
    "audio",
    new File([input.blob], "utterance.webm", {
      type: input.blob.type || "audio/webm",
    }),
  );
  if (input.languageHint) form.append("language_hint", input.languageHint);
  if (input.contextPrompt) form.append("context_prompt", input.contextPrompt);

  const { data, error } = await supabase.functions.invoke("archie-ears", {
    body: form,
  });

  if (error) {
    throw new EarsError(
      "SERVICE_UNAVAILABLE",
      "ARCHIE's speech service could not be reached. No transcript was produced.",
    );
  }

  if (!data || typeof data !== "object") {
    throw new EarsError(
      "SERVICE_UNAVAILABLE",
      "ARCHIE's speech service returned no result. No transcript was produced.",
    );
  }

  const body = data as Record<string, unknown>;

  if (body.ok !== true) {
    const code = typeof body.code === "string" ? body.code : "UNKNOWN";
    const map: Record<string, EarsErrorCode> = {
      EARS_UNCONFIGURED: "SERVICE_UNAVAILABLE",
      EARS_PROVIDER_UNAVAILABLE: "PROVIDER_ERROR",
      EARS_PROVIDER_AUTH: "PROVIDER_ERROR",
      EARS_PROVIDER_QUOTA: "PROVIDER_ERROR",
      EARS_FILE_TOO_LARGE: "FILE_TOO_LARGE",
      EARS_UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
      RATE_LIMITED: "RATE_LIMITED",
      FORBIDDEN: "FORBIDDEN",
      NO_AUDIO: "NOT_RECORDED",
      EMPTY_AUDIO: "NOT_RECORDED",
    };
    const message =
      typeof body.error === "string" ? body.error : "Transcription failed.";
    throw new EarsError(map[code] ?? "PROVIDER_ERROR", message);
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  return {
    transcript,
    speechDetected: body.speech_detected === true,
    language: typeof body.language === "string" ? body.language : null,
    durationSec:
      typeof body.duration_sec === "number" ? body.duration_sec : null,
  };
}
