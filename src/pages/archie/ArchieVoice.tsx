// =========================================================
// FRELUX ARCHIE PWA — VOICE BANK (mobile)
//
// The owner records their own voice; ARCHIE derives a
// deterministic pitch/pace profile (pure math, NO cloud AI,
// NO paid service) and speaks with it. Samples are stored
// owner-only (private bucket + RLS) — identical backend to
// FRELUX Admin's Voice Bank (spec §1 parity, one ARCHIE).
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyProfileToUtterance,
  estimatePitchHz,
  estimateRateHint,
  mixdown,
  recomputeProfile,
  saveVoiceSample,
  type ArchieVoiceProfile,
  type VoiceSample,
} from "@/lib/archie/mobile/voice-profile";
import {
  detectEarSupport,
  startListening,
  transcribeAudio,
  EarsError,
  type EarsRecorder,
} from "@/lib/archie/ears";
import { sendChatTurn } from "@/lib/archie/stage1-client";

export default function ArchieVoice() {
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [profile, setProfile] = useState<ArchieVoiceProfile | null>(null);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  // ---- Talk to ARCHIE (EARS → cognitive pipeline → spoken reply) ----
  const talkSessionRef = useRef<string | null>(null);
  const earsRef = useRef<EarsRecorder | null>(null);
  const historyRef = useRef<
    Array<{ role: "owner" | "archie"; content: string }>
  >([]);
  const [talkRecording, setTalkRecording] = useState(false);
  const [talkBusy, setTalkBusy] = useState(false);
  const [talkError, setTalkError] = useState("");
  const [talkTurns, setTalkTurns] = useState<
    Array<{ role: "owner" | "archie"; content: string }>
  >([]);
  const [talkLanguage, setTalkLanguage] = useState<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (uid: string) => {
    setProfile(await recomputeProfile(uid));
  }, []);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function" &&
        typeof window.MediaRecorder !== "undefined",
    );
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserId(auth.user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      setIsAdmin(prof?.role === "admin");
      await refresh(auth.user.id);
      const { data } = await supabase
        .from("frelux_archie_voice_samples")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_date", { ascending: false });
      if (data) setSamples(data as VoiceSample[]);
    })().catch(() => setError("Could not load the voice bank."));
  }, [refresh]);

  async function startRecording() {
    setError("");
    setNotice("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) =>
        e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone permission denied, ARCHIE cannot record.");
    }
  }

  async function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setBusy(true);
    setError("");
    try {
      const blob: Blob = await new Promise((resolve) => {
        rec.onstop = () =>
          resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
        rec.stop();
      });
      if (blob.size < 2000)
        throw new Error("Sample too short, speak for a few seconds.");
      // Deterministic on-device analysis, nothing leaves this device unencrypted.
      const ctx = new AudioContext();
      const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
      const pcm = mixdown(audio);
      const pitchHz = estimatePitchHz(pcm, audio.sampleRate);
      const rateHint = estimateRateHint(pcm, audio.sampleRate);
      await ctx.close();
      if (pitchHz === 0)
        throw new Error("No voiced speech detected, try again.");
      const saved = await saveVoiceSample(userId, blob, {
        pitchHz,
        rateHint,
        durationSec: Math.round(audio.duration * 10) / 10,
      });
      setSamples((s) => [saved, ...s]);
      await refresh(userId);
      setNotice("Sample saved. ARCHIE now speaks with your pitch and pace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the sample.");
    } finally {
      setBusy(false);
    }
  }

  if (!userId)
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-400">
        Sign in required.
      </div>
    );
  if (!isAdmin)
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-400">
        Owner access only.
      </div>
    );

  // Hands-free voice interaction. Every spoken turn:
  //    mic → archie-ears (real transcription + language detection)
  //        → sendChatTurn (the NORMAL cognitive pipeline)
  //        → reply spoken with the owner's voice profile.
  // Nothing is invented: transcription failures stop the turn
  // honestly, and the transcript is shown before ARCHIE acts.
  async function toggleTalk() {
    setTalkError("");
    if (talkRecording) {
      setTalkRecording(false);
      setTalkBusy(true);
      try {
        const recorded = await earsRef.current?.stop();
        if (!recorded) {
          setTalkError("No audio was captured.");
          return;
        }
        const last = historyRef.current[historyRef.current.length - 1] ?? null;
        const lastReply = last && last.role === "archie" ? last.content : null;
        const { transcript, speechDetected, language } = await transcribeAudio({
          blob: recorded.blob,
          languageHint: talkLanguage,
          contextPrompt: lastReply ? lastReply.slice(0, 300) : null,
        });
        if (!speechDetected) {
          setTalkError("No speech detected — nothing was sent to ARCHIE.");
          return;
        }
        if (language) setTalkLanguage(language);
        setTalkTurns((prev) => [
          ...prev,
          { role: "owner", content: transcript },
        ]);

        // Session conversation id (reused across turns → the
        // core keeps this voice session in one conversation).
        if (!talkSessionRef.current) {
          talkSessionRef.current =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `voice-${Date.now()}`;
        }
        const result = await sendChatTurn({
          conversationId: talkSessionRef.current,
          message: transcript,
          history: historyRef.current.slice(-10),
        });
        if (!result.ok) {
          setTalkError(
            result.error ?? "ARCHIE core error — nothing was spoken.",
          );
          return;
        }
        const reply = result.reply ?? "";
        historyRef.current = [
          ...historyRef.current,
          { role: "owner", content: transcript },
          { role: "archie", content: reply },
        ];
        setTalkTurns((prev) => [...prev, { role: "archie", content: reply }]);

        // Spoken reply through the voice bank profile.
        if (
          reply &&
          typeof window !== "undefined" &&
          "speechSynthesis" in window
        ) {
          const utterance = new SpeechSynthesisUtterance(reply);
          applyProfileToUtterance(utterance, profile);
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        if (e instanceof EarsError) setTalkError(e.message);
        else setTalkError("Voice interaction failed — nothing was sent.");
      } finally {
        setTalkBusy(false);
      }
      return;
    }
    try {
      earsRef.current = await startListening();
      setTalkRecording(true);
    } catch (e) {
      if (e instanceof EarsError) setTalkError(e.message);
      else setTalkError("Microphone permission denied or unavailable.");
    }
  }

  return (
    <div className="archie-fade-up mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
        Voice
      </h1>
      <p className="text-xs text-slate-400">
        Record your voice; ARCHIE derives a deterministic pitch/pace profile —
        pure math, no cloud AI. Samples stay owner-only (private bucket + RLS).
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}

      {/* ── Profile ── */}
      {profile && (
        <div className="mt-4 rounded-xl archie-panel p-3">
          <p className="text-xs font-medium text-slate-200">Current profile</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="archie-title-gradient text-lg font-semibold md:text-xl">
                {Math.round(profile.pitchHz)} Hz
              </p>
              <p className="text-[10px] text-slate-500">Pitch</p>
            </div>
            <div>
              <p className="archie-title-gradient text-lg font-semibold md:text-xl">
                {profile.rateHint}
              </p>
              <p className="text-[10px] text-slate-500">Pace hint</p>
            </div>
            <div>
              <p className="archie-title-gradient text-lg font-semibold md:text-xl">
                {samples.length}
              </p>
              <p className="text-[10px] text-slate-500">Samples</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recorder ── */}
      <div className="mt-4 rounded-xl archie-panel p-3">
        {!supported ? (
          <p className="text-xs text-slate-400">
            This device/browser does not support audio recording.
          </p>
        ) : recording ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-300">
              ● Recording… {seconds}s — speak naturally
            </p>
            <button
              onClick={() => void stopRecording()}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Stop &amp; save
            </button>
          </div>
        ) : (
          <button
            onClick={() => void startRecording()}
            disabled={busy}
            className="w-full rounded-lg bg-brand-purple px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Analyzing…" : "Record a voice sample"}
          </button>
        )}
      </div>

      {/* ── Samples ── */}
      <div className="mt-6">
        <p className="text-xs font-medium text-slate-300">Saved samples</p>
        <ul className="mt-2 space-y-1.5">
          {samples.map((s) => (
            <li key={s.id} className="rounded-lg archie-panel px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm text-slate-200">
                  {s.pitch_hz ? `${Math.round(s.pitch_hz)} Hz` : "—"} ·{" "}
                  {s.duration_sec?.toFixed(1) ?? "?"}s
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(s.created_date).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
          {!samples.length && (
            <li className="py-4 text-center text-xs text-slate-500">
              No samples yet — record your first one above.
            </li>
          )}
        </ul>
      </div>

      {/* ── Talk to ARCHIE (EARS) ── */}
      <div className="mt-6 rounded-xl archie-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Talk to ARCHIE
          </h2>
          {talkLanguage && (
            <span className="text-[10px] uppercase tracking-wider text-amber-300/80">
              Detected: {talkLanguage}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Hands-free voice interaction. Speech is transcribed by ARCHIE's ears
          (never faked), sent through the normal cognitive pipeline, and the
          reply is spoken with your voice profile. Transcripts are shown exactly
          as heard.
        </p>
        {!detectEarSupport() ? (
          <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
            This browser cannot record audio — voice interaction needs
            microphone support.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleTalk}
              disabled={talkBusy}
              className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                talkRecording
                  ? "bg-red-500/20 text-red-200 shadow-[0_0_18px_-2px_rgba(239,68,68,0.45)]"
                  : "archie-btn-primary bg-amber-400/90 text-slate-950"
              } disabled:opacity-50`}
              aria-label={talkRecording ? "Stop talking" : "Talk to ARCHIE"}
            >
              {talkRecording
                ? "● Listening — tap to send"
                : talkBusy
                  ? "Thinking…"
                  : "🎙 Talk to ARCHIE"}
            </button>
            {talkError && (
              <p
                role="alert"
                className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {talkError}
              </p>
            )}
            {talkTurns.length > 0 && (
              <ul className="mt-3 space-y-2">
                {talkTurns.map((t, i) => (
                  <li
                    key={i}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      t.role === "owner"
                        ? "archie-panel border border-amber-400/30 text-amber-100"
                        : "archie-panel text-slate-200"
                    }`}
                  >
                    <span className="mr-1 text-[9px] uppercase tracking-wider text-slate-500">
                      {t.role === "owner" ? "You (spoken)" : "ARCHIE (spoken)"}
                    </span>
                    {t.content}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        Voice samples are analyzed on-device with deterministic math and stored
        encrypted in the owner-only voice bucket. ARCHIE never sends your voice
        to a cloud AI provider, and this profile is shared with FRELUX Admin —
        one voice bank, one ARCHIE.
      </p>
    </div>
  );
}
