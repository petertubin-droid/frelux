// =========================================================
// ARCHIE NATIVE ENGINE — EARS (SPEECH PERCEPTION CORE)
// supabase/functions/_shared/archie-ai/native-engine/ears.ts
//
// The REAL transcription core of ARCHIE's ears subsystem:
// microphone audio → OpenAI Whisper STT → transcript +
// detected language. This module is the single source of
// truth for the ears anatomy binding — it is used by the
// archie-ears edge function (the HTTP front door) and
// dynamically imported by the anatomy health runner to
// prove the subsystem's engine is real and loadable.
//
// Honesty rules (spec §§3, 16, 19):
//   * No API key → typed EARS_UNCONFIGURED. Never a fake
//     transcript, never a claim that audio was understood.
//   * Provider failures map to typed codes. The caller
//     decides how to report; nothing is softened here.
//   * Empty result is reported as speech_detected:false —
//     the transcript is then exactly "".
//
// Node/Deno compatible: fetch + FormData + no runtime APIs
// at import time (so the anatomy probe can load it in any
// JavaScript environment).
// =========================================================

// Provider limits (documented OpenAI audio constraints).
export const EARS_MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
export const EARS_MAX_CONTEXT_PROMPT_CHARS = 400;
export const EARS_STT_MODEL = "whisper-1";

/** Mime types the STT provider accepts and that browsers
 *  actually produce for microphone recordings. Anything
 *  else is rejected as unsupported — never silently ignored. */
export const EARS_SUPPORTED_MIME_PREFIXES = [
  "audio/webm",
  "video/webm", // MediaRecorder on some browsers reports video/webm for opus audio
  "audio/ogg",
  "audio/mp4",
  "video/mp4", // iOS Safari records .m4a as video/mp4
  "audio/mpeg",
  "audio/mpeg3",
  "audio/x-mpeg-3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
];

export type EarsValidation =
  { ok: true } | { ok: false; code: string; message: string };

/** Structural validation of an incoming audio file —
 *  type, emptiness and provider size cap. */
export function validateAudioFile(file: {
  size: number;
  type?: string;
}): EarsValidation {
  const mime = (file.type ?? "").toLowerCase();
  if (!EARS_SUPPORTED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    return {
      ok: false,
      code: "EARS_UNSUPPORTED_FORMAT",
      message: `Unsupported audio format${mime ? `: ${mime}` : " (no type)"}. ARCHIE did not process it.`,
    };
  }
  if (file.size <= 0) {
    return {
      ok: false,
      code: "EMPTY_AUDIO",
      message: "The audio file is empty.",
    };
  }
  if (file.size > EARS_MAX_AUDIO_BYTES) {
    return {
      ok: false,
      code: "EARS_FILE_TOO_LARGE",
      message: "Audio is larger than the 25 MB limit.",
    };
  }
  return { ok: true };
}

/** Trim an optional conversation-context prompt (the
 *  previous ARCHIE reply) to the provider-safe size. */
export function sanitizeContextPrompt(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim().slice(0, EARS_MAX_CONTEXT_PROMPT_CHARS);
}

/** Optional ISO 639-1 (-variant) language hint from the live
 *  ARCHIE language registry. Anything malformed is dropped. */
export function sanitizeLanguageHint(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return /^[a-z]{2}(-[A-Za-z0-9-]{2,8})?$/.test(v) ? v : null;
}

export type EarsSttResult =
  | {
      ok: true;
      transcript: string;
      speechDetected: boolean;
      language: string | null;
      durationSec: number | null;
      model: string;
    }
  | {
      ok: false;
      /** HTTP status for the caller to surface. */
      status: number;
      code: string;
      message: string;
      /** Truncated provider error text, for audit logs. */
      detail?: string;
    };

/**
 * REAL speech → text through the STT provider. The API key
 * lives only in the edge-function environment; it is passed
 * in by the caller and never stored here.
 */
export async function transcribeWithWhisper(input: {
  file: File;
  apiKey: string;
  languageHint?: string | null;
  contextPrompt?: string | null;
}): Promise<EarsSttResult> {
  if (!input.apiKey) {
    return {
      ok: false,
      status: 503,
      code: "EARS_UNCONFIGURED",
      message:
        "Speech transcription is not configured on this deployment. No transcript was produced.",
    };
  }

  const form = new FormData();
  form.append("file", input.file, input.file.name || "speech.webm");
  form.append("model", EARS_STT_MODEL);
  form.append("response_format", "verbose_json");
  if (input.languageHint) form.append("language", input.languageHint);
  if (input.contextPrompt) form.append("prompt", input.contextPrompt);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}` },
      body: form,
    });
  } catch {
    return {
      ok: false,
      status: 503,
      code: "EARS_PROVIDER_UNAVAILABLE",
      message:
        "The speech service is unreachable right now. No transcript was produced.",
    };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const code =
      res.status === 400
        ? "EARS_UNSUPPORTED_FORMAT"
        : res.status === 401
          ? "EARS_PROVIDER_AUTH"
          : res.status === 403 || res.status === 429
            ? "EARS_PROVIDER_QUOTA"
            : "EARS_PROVIDER_UNAVAILABLE";
    const message =
      code === "EARS_UNSUPPORTED_FORMAT"
        ? "The speech service rejected this audio format. No transcript was produced."
        : code === "EARS_PROVIDER_AUTH"
          ? "Speech provider authentication failed. No transcript was produced."
          : code === "EARS_PROVIDER_QUOTA"
            ? "Speech provider quota reached. No transcript was produced."
            : "The speech service failed. No transcript was produced.";
    return {
      ok: false,
      status: 502,
      code,
      message,
      detail: errText.slice(0, 300),
    };
  }

  let payload: { text?: string; language?: string; duration?: number };
  try {
    payload = await res.json();
  } catch {
    return {
      ok: false,
      status: 502,
      code: "EARS_PROVIDER_UNAVAILABLE",
      message:
        "The speech service returned an unreadable response. No transcript was produced.",
    };
  }

  const transcript = (payload.text ?? "").trim();
  return {
    ok: true,
    transcript,
    speechDetected: transcript.length > 0,
    language: payload.language ?? null,
    durationSec: payload.duration ?? null,
    model: EARS_STT_MODEL,
  };
}
