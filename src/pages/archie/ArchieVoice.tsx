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
  estimatePitchHz,
  estimateRateHint,
  mixdown,
  recomputeProfile,
  saveVoiceSample,
  type ArchieVoiceProfile,
  type VoiceSample,
} from "@/lib/archie/mobile/voice-profile";

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
        .from("frelux_users")
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

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        Voice samples are analyzed on-device with deterministic math and stored
        encrypted in the owner-only voice bucket. ARCHIE never sends your voice
        to a cloud AI provider, and this profile is shared with FRELUX Admin —
        one voice bank, one ARCHIE.
      </p>
    </div>
  );
}
