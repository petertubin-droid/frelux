// =========================================================
// FRELUX PHASE 8d, ADMIN: ARCHIE'S VOICE BANK
//
// The owner records their own voice; ARCHIE derives a
// deterministic pitch/pace profile (pure math, NO cloud AI,
// NO paid service) and speaks with it in the Assistant.
// Samples are stored owner-only (private bucket + RLS).
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AdminButton,
  AdminCard,
  AdminHeader,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  type ArchieVoiceProfile,
  type VoiceSample,
  createSamplePlayUrl,
  deleteVoiceSample,
  estimatePitchHz,
  estimateRateHint,
  mixdown,
  recomputeProfile,
  saveVoiceSample,
} from "@/lib/archie/mobile/voice-profile";
import { applyProfileToUtterance } from "@/lib/archie/mobile/voice-profile";

export default function AdminArchieVoice() {
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
    const p = await recomputeProfile(uid);
    setProfile(p);
  }, []);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function" &&
        typeof window.MediaRecorder !== "undefined",
    );
    (async () => {
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
    try {
      const blob: Blob = await new Promise((resolve) => {
        rec.onstop = () =>
          resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
        rec.stop();
      });
      if (blob.size < 2000)
        throw new Error("Sample too short, speak for a few seconds.");
      // Deterministic on-device analysis, nothing leaves this browser unencrypted.
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
      setNotice(
        "Sample saved to the voice bank. ARCHIE now speaks with your pitch and pace.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(sample: VoiceSample) {
    setBusy(true);
    try {
      await deleteVoiceSample(userId, sample);
      setSamples((s) => s.filter((x) => x.id !== sample.id));
      await refresh(userId);
      setNotice("Sample removed. Profile recalculated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePlay(sample: VoiceSample) {
    try {
      const url = await createSamplePlayUrl(sample.storage_path);
      await new Audio(url).play();
    } catch {
      setError("Playback failed.");
    }
  }

  function testArchieVoice() {
    if (typeof window.speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(
      "This is ARCHIE, speaking with your saved voice profile.",
    );
    u.rate = 1;
    u.pitch = 1;
    applyProfileToUtterance(u, profile);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <div>
      <AdminHeader
        title="ARCHIE's voice"
        subtitle="Record your voice, ARCHIE saves it and speaks with your pitch and pace. Free, on-device, no cloud AI."
      />
      {!isAdmin ? (
        <StateMessage
          type="error"
          title="Access denied"
          message="Admin access required."
        />
      ) : (
        <div className="space-y-4">
          {error && (
            <StateMessage type="error" title="Problem" message={error} />
          )}
          {notice && (
            <StateMessage type="empty" title="Saved" message={notice} />
          )}
          {!supported && (
            <StateMessage
              type="error"
              title="Unsupported"
              message="This browser cannot record audio."
            />
          )}

          <AdminCard className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {recording ? (
                <AdminButton onClick={stopRecording} disabled={busy}>
                  ⏹ Stop & save ({seconds}s)
                </AdminButton>
              ) : (
                <AdminButton
                  onClick={startRecording}
                  disabled={busy || !supported}
                >
                  🎙 Record a sample
                </AdminButton>
              )}
              {busy && (
                <span className="text-sm text-muted-foreground">Working…</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Speak naturally for 5–15 seconds (e.g. a price readout or a
              greeting). Analysis is deterministic math on this device; only the
              encrypted-at-rest sample is saved to your private voice bank.
            </p>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="font-semibold text-foreground">Active profile</h2>
            {profile ? (
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{profile.pitchHz} Hz</div>
                  <div className="text-xs text-muted-foreground">
                    your pitch
                  </div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{profile.rateHint}×</div>
                  <div className="text-xs text-muted-foreground">your pace</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-lg font-bold">{profile.sampleCount}</div>
                  <div className="text-xs text-muted-foreground">samples</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No profile yet, record your first sample.
              </p>
            )}
            <div>
              <AdminButton onClick={testArchieVoice} disabled={!profile}>
                🔊 Test ARCHIE's voice
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="font-semibold text-foreground">
              Voice bank ({samples.length})
            </h2>
            {samples.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing saved yet.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="voice-samples">
                {samples.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                  >
                    <span>
                      {new Date(s.created_date).toLocaleString()} ·{" "}
                      {Number(s.pitch_hz ?? 0).toFixed(0)} Hz ·{" "}
                      {Number(s.duration_sec ?? 0).toFixed(1)}s
                    </span>
                    <span className="flex gap-2">
                      <AdminButton onClick={() => handlePlay(s)}>
                        ▶ Play
                      </AdminButton>
                      <AdminButton
                        onClick={() => handleDelete(s)}
                        disabled={busy}
                      >
                        Delete
                      </AdminButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}
