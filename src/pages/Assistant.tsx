// =========================================================
// FRELUX PHASE 8b, ARCHIE MOBILE ASSISTANT (FREE TIER)
//
// The mobile front door to ARCHIE. Four surfaces:
//   ASSISTANT    , voice, camera, photos, files, location,
//                   clipboard, links, calculators and free
//                   on-device generation
//   CAPABILITIES , explicit per-capability consent; nothing
//                   is used without permission
//   VAULT        , protect important FRELUX data (AES-256-GCM
//                   on-device, encrypted cloud backup, versions)
//   SECURITY     , device sessions & revocation (stolen-phone
//                   defense), security feed, optional paid
//                   capabilities (OFF by default), owner
//                   authorization for production changes
// =========================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Mic,
  Camera,
  Image as ImageIcon,
  FileText,
  MapPin,
  Bell,
  Clipboard,
  ExternalLink,
  Calculator,
  Shield,
  Lock,
  AlertTriangle,
  Check,
  Loader2,
  Smartphone,
  History,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";
import {
  MOBILE_CAPABILITIES,
  FREE_CAPABILITY_KEYS,
  checkCapabilityConsent,
  isCapabilitySupported,
  isSafeLink,
} from "@/lib/archie/mobile/capabilities";
import {
  fetchConsents,
  loadCachedConsents,
  grantCapability,
  revokeCapability,
} from "@/lib/archie/mobile/consent";
import {
  PAID_CAPABILITIES,
  PAID_CAPABILITY_KEYS,
  fetchPaidActivations,
  activatePaidCapability,
  deactivatePaidCapability,
} from "@/lib/archie/mobile/paid-services";
import { speakArchie, stopArchieVoice } from "@/lib/archie/mobile/voice";
import { createConversation, sendChatTurn } from "@/lib/archie/stage1-client";
import {
  createVoiceSession,
  type VoiceSession,
  type VoiceSessionState,
} from "@/lib/archie/voice-session";
import {
  deleteEnrollment,
  disableEnrollment,
  enrollSample,
  fetchEnrollmentStatus,
  finalizeEnrollment,
  recordEnrollmentSample,
  resetEnrollment,
  type EnrollmentStatus,
} from "@/lib/archie/mobile/voice-enrollment";
import { loadProfileLocally } from "@/lib/archie/mobile/voice-profile";
import { detectEarSupport } from "@/lib/archie/ears";
import {
  registerCurrentSession,
  fetchSessions,
  revokeSession,
  revokeAllOtherSessions,
  validateCurrentSession,
} from "@/lib/archie/mobile/device-sessions";
import {
  fetchSecurityEvents,
  markSecurityEventsRead,
  requestNotificationPermission,
  notifyUserDevice,
} from "@/lib/archie/mobile/security-events";
import {
  protectItem,
  listProtectedItems,
  recoverProtectedItem,
  clearLocalProtectedCache,
} from "@/lib/archie/mobile/vault";
import {
  checkOwnerCredential,
  setOwnerSecret,
  authorizeOwnerChange,
  listOwnerAuthorizations,
  purgeTranscriptsForAuthorization,
} from "@/lib/archie/mobile/owner-authorization";
import {
  OWNER_CHANGE_POLICY,
  HIGH_RISK_CHANGE_KINDS,
} from "@/lib/archie/mobile/owner-policy";
import type {
  ArchieMobileCapability,
  ArchiePaidCapability,
  ArchieConsent,
  ProtectedItem,
  SecurityEvent,
  ArchieSession,
  OwnerChangeKind,
  OwnerAuthorizationRecord,
} from "@/lib/archie/mobile/types";

type Tab = "assistant" | "capabilities" | "vault" | "security";

const TABS: { key: Tab; label: string; icon: typeof Brain }[] = [
  { key: "assistant", label: "Assistant", icon: Brain },
  { key: "capabilities", label: "Capabilities", icon: Check },
  { key: "vault", label: "Vault", icon: Lock },
  { key: "security", label: "Security", icon: Shield },
];

function deviceLabel(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Device";
  if (/android/i.test(ua)) return "Android phone";
  if (/iphone|ipad/i.test(ua)) return "iPhone / iPad";
  return "Web browser";
}

interface Msg {
  role: "user" | "archie" | "system";
  text: string;
}

export default function Assistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("assistant");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "archie",
      text: "Hi, I'm ARCHIE, your FRELUX assistant. Free tier: voice, camera, photos, files, calculators and on-device generation. Nothing on your phone is touched until you enable it in Capabilities.",
    },
  ]);
  const [input, setInput] = useState("");
  // Voice session state — all real states surfaced (§20)
  const [voiceState, setVoiceState] = useState<VoiceSessionState | "IDLE">(
    "IDLE",
  );
  const [interim, setInterim] = useState("");
  const [speakerNote, setSpeakerNote] = useState("");
  const [enrollStatus, setEnrollStatus] = useState<EnrollmentStatus | null>(
    null,
  );
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Msg[]>(messages);
  messagesRef.current = messages;
  const voiceBufferRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [consents, setConsents] = useState<Record<
    ArchieMobileCapability,
    ArchieConsent
  > | null>(null);
  const [paidActivations, setPaidActivations] = useState<
    Partial<Record<ArchiePaidCapability, boolean>>
  >({});
  const [sessions, setSessions] = useState<ArchieSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [items, setItems] = useState<ProtectedItem[]>([]);
  const [ownerHasCredential, setOwnerHasCredential] = useState<boolean | null>(
    null,
  );

  // vault form
  const [vLabel, setVLabel] = useState("");
  const [vType, setVType] = useState<
    "PROJECT" | "ESTIMATE" | "REPORT" | "DOCUMENT" | "PLAN" | "OTHER"
  >("PROJECT");
  const [vText, setVText] = useState("");
  const [vPass, setVPass] = useState("");
  const [recoverPass, setRecoverPass] = useState("");
  const [recovered, setRecovered] = useState<string | null>(null);

  // owner auth form
  const [authKind, setAuthKind] = useState<OwnerChangeKind>("CODE_CHANGE");
  const [authTarget, setAuthTarget] = useState("");
  const [authReason, setAuthReason] = useState("");
  const [authBefore, setAuthBefore] = useState("{}");
  const [authAfter, setAuthAfter] = useState("{}");
  const [authTests, setAuthTests] = useState(false);
  const [authEngReview, setAuthEngReview] = useState(false);
  const [authSecret, setAuthSecret] = useState("");
  const [newOwnerSecret, setNewOwnerSecret] = useState("");
  const [authTrail, setAuthTrail] = useState<OwnerAuthorizationRecord[]>([]);

  const userId = user?.id;
  const refresh = useCallback(async () => {
    if (!userId) return;
    const [c, p, s, e, i] = await Promise.all([
      fetchConsents(userId),
      fetchPaidActivations(userId),
      fetchSessions(userId),
      fetchSecurityEvents(userId),
      listProtectedItems(userId),
    ]);
    setConsents(c);
    setPaidActivations(p);
    setSessions(s);
    setEvents(e);
    setItems(i);
    const enroll = await fetchEnrollmentStatus();
    setEnrollStatus(enroll);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setBusy(true);
      try {
        const cached = loadCachedConsents(userId);
        if (cached) setConsents(cached);
        // Stolen-phone check FIRST: a remotely revoked device signs
        // out and loses its protected cache immediately.
        const check = await validateCurrentSession(userId);
        if (check.revoked) {
          setError(
            "This device was revoked. You have been signed out and local protected data was removed.",
          );
          return;
        }
        await registerCurrentSession(userId, deviceLabel());
        await refresh();
        const cred = await checkOwnerCredential();
        setOwnerHasCredential(cred.hasCredential ?? false);
        const trail = await listOwnerAuthorizations();
        setAuthTrail(
          (trail.authorizations ?? []) as OwnerAuthorizationRecord[],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "ARCHIE could not start on this device.",
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [userId, refresh]);

  function consentGate(cap: ArchieMobileCapability): boolean {
    if (!consents) return false;
    const gate = checkCapabilityConsent(cap, consents[cap]);
    if (!gate.ok) {
      pushArchie(gate.error!);
      return false;
    }
    return true;
  }

  function pushArchie(text: string) {
    setMessages((m) => [...m, { role: "archie", text }]);
    // ARCHIE's voice: speaks ONLY with an explicit VOICE_OUTPUT consent.
    // speakArchie refuses (and returns a hint) when consent is absent.
    const spoken = speakArchie(text, consents?.VOICE_OUTPUT);
    if (!spoken.ok && spoken.error) {
      // Non-blocking hint in the transcript, voice stays off until enabled.
      setMessages((m) => [...m, { role: "system", text: spoken.error! }]);
    }
  }

  // -------------------------------------------------------
  // Assistant actions
  // -------------------------------------------------------
  /** The REAL ARCHIE cognitive engine (archie-core) — one
   *  pipeline for text and voice. No scripted/fake answers. */
  async function ensureConversation(): Promise<string> {
    if (conversationIdRef.current) return conversationIdRef.current;
    const conv = await createConversation("Assistant conversation");
    conversationIdRef.current = conv.id;
    return conv.id;
  }

  function chatHistory(): Array<{ role: "owner" | "archie"; content: string }> {
    return messagesRef.current
      .filter((m) => m.role === "user" || m.role === "archie")
      .slice(-12)
      .map((m) => ({
        role: m.role === "user" ? ("owner" as const) : ("archie" as const),
        content: m.text,
      }));
  }

  async function runEngineTurn(text: string): Promise<string> {
    const conversationId = await ensureConversation();
    const turn = await sendChatTurn({
      conversationId,
      message: text,
      history: chatHistory(),
      language: { language_code: "en", source: "USER_SELECTION" },
    });
    if (!turn.ok || !turn.reply) {
      throw new Error(
        turn.error ?? "ARCHIE's core could not process the request.",
      );
    }
    return turn.reply;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    stopArchieVoice();
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      // Voice/text may INITIATE an authorization workflow…
      if (/authoriz|approve|deploy|production change/i.test(text)) {
        purgeTranscriptsForAuthorization(voiceBufferRef.current);
        pushArchie(
          "Owner authorization must be completed in Security → Owner Authorization, the secret is typed into a password field and verified server-side. Opening it now.",
        );
        setTab("security");
        return;
      }
      // …everything else runs the REAL cognitive engine.
      const reply = await runEngineTurn(text);
      pushArchie(reply);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text:
            err instanceof Error
              ? `ARCHIE's core reported a failure: ${err.message}`
              : "ARCHIE's core reported a failure.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /** Conversational voice session — the REAL pipeline:
   *  LISTEN → HEAR → AUDIT → SPEAKER SIGNAL → THINK
   *  (archie-core) → SPEAK → LISTEN AGAIN. Tapping the mic
   *  while active STOPS the session (manual stop, §11). */
  async function startVoice() {
    stopArchieVoice();
    // toggle off: the owner asked to stop talking
    if (voiceSessionRef.current) {
      voiceSessionRef.current.stop("manual");
      return;
    }
    if (!consentGate("VOICE_INPUT")) return;
    if (!detectEarSupport()) {
      pushArchie(
        "Voice recognition is not supported in this browser. ARCHIE's ears need a browser/OS speech engine — text input remains fully available.",
      );
      return;
    }
    setBusy(true);
    try {
      const conversationId = await ensureConversation();
      const bankProfile = loadProfileLocally();
      const created = await createVoiceSession(
        {
          voiceInputConsent: consents?.VOICE_INPUT ?? null,
          voiceOutputConsent: consents?.VOICE_OUTPUT ?? null,
          continuous: true,
          sessionTimeoutMs: 10 * 60_000,
          utteranceTimeoutMs: 15_000,
          languageCode: "en",
          bankPitchHz: bankProfile?.pitchHz ?? null,
          conversationId,
          history: () => chatHistory(),
        },
        {
          onState: (state) => {
            setVoiceState(state);
            if (state === "STOPPED") {
              voiceSessionRef.current = null;
              setInterim("");
            }
          },
          onHearing: (text) => setInterim(text),
          onUserTranscript: ({ transcript, speaker }) => {
            setInterim("");
            setMessages((m) => [...m, { role: "user", text: transcript }]);
            if (speaker && speaker.determinable) {
              setSpeakerNote(
                speaker.match
                  ? "Owner voice recognized — a similarity signal, not proof of identity."
                  : "Speaker not recognized against the owner voice profile.",
              );
            }
          },
          onArchieReply: (reply, spoken) => {
            // The session already SPOKE it (mouth pipeline); here
            // the text transcript is shown — never spoken twice.
            setMessages((m) => [...m, { role: "archie", text: reply }]);
            if (!spoken && consents?.VOICE_OUTPUT?.granted) {
              setMessages((m) => [
                ...m,
                {
                  role: "system",
                  text: "Voice output was muted for this reply.",
                },
              ]);
            }
          },
          onError: (kind, message) => {
            if (kind === "NO_SPEECH" && voiceState === "LISTENING") return;
            setMessages((m) => [
              ...m,
              {
                role: "system",
                text: message,
              },
            ]);
          },
          onAuthorizationRequired: (transcript) => {
            purgeTranscriptsForAuthorization(voiceBufferRef.current);
            setMessages((m) => [
              ...m,
              { role: "user", text: transcript },
              {
                role: "archie",
                text: "I understood the request, but this action requires Owner authorization — it is completed in Security → Owner Authorization with the secret typed into a password field and verified server-side. Voice can initiate it, never complete it. Opening it now.",
              },
            ]);
            setTab("security");
          },
        },
      );
      if (!created.ok) {
        pushArchie(created.message);
        return;
      }
      voiceSessionRef.current = created.session;
      await created.session.start();
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text:
            err instanceof Error
              ? `Voice session failed to start: ${err.message}`
              : "Voice session failed to start.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /** Owner voice enrollment (deliberate, §7-8). */
  async function handleEnrollSample() {
    setBusy(true);
    try {
      const rec = await recordEnrollmentSample();
      if (!rec.ok) {
        setMessages((m) => [
          ...m,
          { role: "system", text: `Enrollment sample refused: ${rec.error}` },
        ]);
        return;
      }
      const res = await enrollSample(rec.vector);
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "system", text: `Enrollment refused: ${res.error}` },
        ]);
        return;
      }
      setEnrollStatus(await fetchEnrollmentStatus());
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: `Voice sample ${res.sample_count}/${res.required_samples} enrolled. Speak naturally for a few seconds each time.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalizeEnrollment() {
    setBusy(true);
    try {
      const res = await finalizeEnrollment();
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: res.ok
            ? `Owner voice profile complete (${res.sample_count} samples). Speaker recognition is a similarity signal — it never unlocks protected actions.`
            : `Enrollment not completed: ${res.error}`,
        },
      ]);
      setEnrollStatus(await fetchEnrollmentStatus());
    } finally {
      setBusy(false);
    }
  }

  async function handleEnrollmentLifecycle(
    action: "disable" | "reset" | "delete",
  ) {
    setBusy(true);
    try {
      const ok =
        action === "disable"
          ? await disableEnrollment()
          : action === "reset"
            ? await resetEnrollment()
            : await deleteEnrollment();
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: ok
            ? `Voice profile ${action === "delete" ? "deleted" : action === "reset" ? "reset — re-enroll from scratch" : "disabled — matching refuses until re-enabled"}.`
            : "The voice-profile change was refused.",
        },
      ]);
      setEnrollStatus(await fetchEnrollmentStatus());
    } finally {
      setBusy(false);
    }
  }

  async function handleCamera() {
    if (!consentGate("CAMERA")) return;
    photoInputRef.current?.setAttribute("capture", "environment");
    photoInputRef.current?.click();
  }

  async function handlePhotoSelected(f: File | undefined) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      pushArchie("That image is too large (max 25 MB).");
      return;
    }
    pushArchie(
      `Photo received (${f.name}, ${(f.size / 1024).toFixed(0)} KB). Ready to use with FRELUX calculators or ARCHIE training.`,
    );
  }

  async function handleFileSelected(f: File | undefined) {
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) {
      pushArbie_safe();
      return;
    }
    pushArchie(
      `File received (${f.name}). Use it with ARCHIE Training or protect it in the Vault.`,
    );
  }
  function pushArbie_safe() {
    pushArchie("That file is too large (max 100 MB).");
  }

  async function handleLocation() {
    if (!consentGate("LOCATION")) return;
    if (!navigator.geolocation) {
      pushArchie("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pushArchie(
          `Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)} m). Used only for regional intelligence.`,
        );
      },
      () =>
        pushArchie(
          "Location permission was denied, FRELUX works fine without it.",
        ),
      { timeout: 10000 },
    );
  }

  async function handleNotifications() {
    if (!consentGate("NOTIFICATIONS")) return;
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      const res = await notifyUserDevice(
        "ARCHIE enabled",
        "You'll get security alerts here.",
      );
      pushArchie(
        res.shown
          ? "Notifications enabled."
          : (res.reason ?? "Notifications could not be shown."),
      );
    } else {
      pushArchie(
        "Notification permission was denied, FRELUX works fine without it.",
      );
    }
  }

  async function handleClipboardPaste() {
    if (!consentGate("CLIPBOARD")) return;
    try {
      const text = await navigator.clipboard.readText();
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    } catch {
      pushArchie(
        "Clipboard permission was denied, FRELUX works fine without it.",
      );
    }
  }

  async function handleClipboardCopy(text: string) {
    if (!consentGate("CLIPBOARD")) return;
    try {
      await navigator.clipboard.writeText(text);
      pushArchie("Copied to clipboard.");
    } catch {
      pushArchie("Clipboard permission was denied.");
    }
  }

  function openLink(url: string) {
    if (!consentGate("OPEN_LINKS")) return;
    if (!isSafeLink(url)) {
      pushArchie("That link is not allowed.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // -------------------------------------------------------
  // Vault actions
  // -------------------------------------------------------
  async function handleProtect() {
    if (!user) return;
    setError("");
    setNotice("");
    if (!vLabel.trim() || !vText.trim() || vPass.length < 12) {
      setError(
        "Label, content and a passphrase of at least 12 characters are required.",
      );
      return;
    }
    setBusy(true);
    try {
      await protectItem(user.id, {
        label: vLabel.trim(),
        itemType: vType,
        plaintext: vText,
        passphrase: vPass,
      });
      setNotice(
        `"${vLabel.trim()}" is encrypted and backed up, the phone is not the only copy.`,
      );
      setVLabel("");
      setVText("");
      setVPass("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Protection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover(item: ProtectedItem) {
    if (!user) return;
    setError("");
    setRecovered(null);
    if (recoverPass.length < 12) {
      setError("Enter the passphrase (min 12 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await recoverProtectedItem(user.id, item.id, recoverPass);
      setRecovered(res.plaintext);
      setNotice(
        `Decrypted "${item.label}" (v${res.version.version}), authenticated recovery complete.`,
      );
      setRecoverPass("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Recovery failed, wrong passphrase?",
      );
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------------------------
  // Security actions
  // -------------------------------------------------------
  async function handleToggleCapability(cap: ArchieMobileCapability) {
    if (!user || !consents) return;
    setBusy(true);
    try {
      if (consents[cap]?.granted) await revokeCapability(user.id, cap);
      else await grantCapability(user.id, cap);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update the capability.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePaid(cap: ArchiePaidCapability) {
    if (!user) return;
    setBusy(true);
    try {
      if (paidActivations[cap]) await deactivatePaidCapability(user.id, cap);
      else await activatePaidCapability(user.id, cap);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(sessionId: string) {
    if (!user) return;
    setBusy(true);
    try {
      await revokeSession(user.id, sessionId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeAll() {
    if (!user) return;
    setBusy(true);
    try {
      const n = await revokeAllOtherSessions(user.id);
      setNotice(
        `${n} other device session(s) revoked. A stolen phone is now locked out.`,
      );
      await notifyUserDevice(
        "Sessions revoked",
        "All other devices were signed out.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSetOwnerSecret() {
    setError("");
    setNotice("");
    purgeTranscriptsForAuthorization(voiceBufferRef.current);
    const res = await setOwnerSecret(newOwnerSecret);
    if (!res.ok) {
      setError(res.error ?? "Could not set the owner secret.");
      return;
    }
    setOwnerHasCredential(true);
    setNewOwnerSecret("");
    setNotice(
      "Owner credential stored server-side as a salted hash. The secret is never stored, logged or echoed.",
    );
  }

  async function handleAuthorize() {
    setError("");
    setNotice("");
    if (!authTarget.trim()) {
      setError("A change target is required.");
      return;
    }
    if (!authReason.trim()) {
      setError("The reason/context for this change is required.");
      return;
    }
    purgeTranscriptsForAuthorization(voiceBufferRef.current);
    let before: Record<string, unknown>, after: Record<string, unknown>;
    try {
      before = JSON.parse(authBefore || "{}");
      after = JSON.parse(authAfter || "{}");
    } catch {
      setError("Before/after state must be valid JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await authorizeOwnerChange({
        changeKind: authKind,
        target: authTarget.trim(),
        reason: authReason.trim(),
        beforeState: before,
        afterState: after,
        testsPassed: authTests,
        rollbackRef: `rollback:${Date.now()}`,
        secret: authSecret,
        engineeringReviewCompleted: authEngReview,
      });
      if (!res.ok) {
        setError(res.error ?? "Authorization failed.");
        return;
      }
      setNotice(
        "Change authorized, audit recorded with before/after state, versions, tests and a rollback reference.",
      );
      setAuthSecret("");
      setAuthTarget("");
      const trail = await listOwnerAuthorizations();
      setAuthTrail((trail.authorizations ?? []) as OwnerAuthorizationRecord[]);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <Brain className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-bold">ARCHIE Mobile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to use the ARCHIE assistant, protected vault and security
          center.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">ARCHIE Mobile</h1>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Free tier
        </span>
      </div>

      {(error || notice) && (
        <div
          className={classNames(
            "mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm",
            error
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
          )}
        >
          {error ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{error || notice}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1"
        role="tablist"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setError("");
              setNotice("");
            }}
            className={classNames(
              "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {busy && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Working…
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* ASSISTANT */}
      {/* ------------------------------------------------- */}
      {tab === "assistant" && (
        <div className="mt-4 space-y-3" data-testid="archie-assistant">
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border bg-card p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={classNames(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : m.role === "system"
                      ? "w-full bg-transparent px-0 py-0 text-center text-xs italic text-muted-foreground"
                      : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <ActionButton
              icon={Mic}
              label={
                voiceState === "IDLE" || voiceState === "STOPPED"
                  ? "Voice"
                  : voiceState === "LISTENING"
                    ? "Listening…"
                    : voiceState === "HEARING"
                      ? "Hearing…"
                      : voiceState === "PROCESSING"
                        ? "Processing…"
                        : voiceState === "THINKING"
                          ? "Thinking…"
                          : voiceState === "SPEAKING"
                            ? "Speaking — tap to stop"
                            : voiceState === "INTERRUPTED"
                              ? "Interrupted"
                              : "Voice"
              }
              onClick={startVoice}
              active={voiceState !== "IDLE" && voiceState !== "STOPPED"}
            />
            <ActionButton icon={Camera} label="Camera" onClick={handleCamera} />
            <ActionButton
              icon={ImageIcon}
              label="Photos"
              onClick={() => {
                photoInputRef.current?.removeAttribute("capture");
                photoInputRef.current?.click();
              }}
            />
            <ActionButton
              icon={FileText}
              label="Files"
              onClick={() => fileInputRef.current?.click()}
            />
            <ActionButton
              icon={MapPin}
              label="Location"
              onClick={handleLocation}
            />
            <ActionButton
              icon={Bell}
              label="Alerts"
              onClick={handleNotifications}
            />
            <ActionButton
              icon={Clipboard}
              label="Paste"
              onClick={handleClipboardPaste}
            />
            <ActionButton
              icon={Calculator}
              label="Calc"
              onClick={() =>
                openLink(`${window.location.origin}/paint-calculator`)
              }
            />
          </div>

          {/* REAL interim transcript from the native engine —
              shown exactly as recognized, never invented (§20) */}
          {(voiceState === "HEARING" || voiceState === "LISTENING") && (
            <p
              className="text-xs italic text-muted-foreground"
              aria-live="polite"
            >
              {voiceState === "HEARING" && interim
                ? `“${interim}”`
                : voiceState === "LISTENING"
                  ? "Listening — speak to ARCHIE, tap the microphone to stop."
                  : ""}
            </p>
          )}
          {speakerNote && (
            <p className="text-[11px] text-muted-foreground">{speakerNote}</p>
          )}

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask ARCHIE…"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Ask ARCHIE"
            />
            <button
              onClick={handleSend}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              aria-label="Send"
            >
              <ExternalLink className="hidden" /> Send
            </button>
          </div>

          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Every reply comes from ARCHIE's real cognitive engine. Voice and
            text are the same intelligence — no scripted voice answers.
          </p>

          {/* OWNER VOICE ENROLLMENT — deliberate, explicit (§7-8).
              Only the derived feature vector transits; raw audio
              is never uploaded for recognition. */}
          {consents?.VOICE_INPUT?.granted && (
            <div
              className="rounded-xl border bg-card p-3"
              data-testid="archie-voice-enrollment"
            >
              <p className="text-sm font-medium">Owner voice profile</p>
              <p className="text-xs text-muted-foreground">
                {enrollStatus?.enrollment_state === "COMPLETE"
                  ? `Enrolled (${enrollStatus.sample_count} samples). Speaker recognition is a similarity signal for personalization — it NEVER authorizes protected actions.`
                  : enrollStatus?.enrollment_state === "ENROLLING"
                    ? `Enrolling — ${enrollStatus.sample_count}/${enrollStatus.required_samples} deliberate samples recorded.`
                    : enrollStatus?.enrollment_state === "DISABLED"
                      ? "Speaker recognition is disabled."
                      : "Not enrolled. Record 3 deliberate samples so ARCHIE can recognize your voice as a personalization signal."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {enrollStatus?.enrollment_state !== "COMPLETE" && (
                  <button
                    onClick={handleEnrollSample}
                    disabled={busy}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Record sample
                  </button>
                )}
                {enrollStatus?.enrollment_state === "ENROLLING" &&
                  (enrollStatus?.sample_count ?? 0) >=
                    (enrollStatus?.required_samples ?? 3) && (
                    <button
                      onClick={handleFinalizeEnrollment}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Finalize profile
                    </button>
                  )}
                {enrollStatus?.enrollment_state === "COMPLETE" && (
                  <button
                    onClick={() => handleEnrollmentLifecycle("disable")}
                    disabled={busy}
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Disable
                  </button>
                )}
                {(enrollStatus?.enrollment_state === "COMPLETE" ||
                  enrollStatus?.enrollment_state === "DISABLED") && (
                  <button
                    onClick={() => handleEnrollmentLifecycle("reset")}
                    disabled={busy}
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Re-enroll
                  </button>
                )}
                {enrollStatus && enrollStatus.enrollment_state !== "NONE" && (
                  <button
                    onClick={() => handleEnrollmentLifecycle("delete")}
                    disabled={busy}
                    className="rounded-lg border px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
                  >
                    Delete profile
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* CAPABILITIES */}
      {/* ------------------------------------------------- */}
      {tab === "capabilities" && consents && (
        <div className="mt-4 space-y-2" data-testid="archie-capabilities">
          <p className="text-xs text-muted-foreground">
            ARCHIE never touches a device feature without your explicit
            permission. Unsupported features stay off.
          </p>
          {FREE_CAPABILITY_KEYS.map((cap) => {
            const spec = MOBILE_CAPABILITIES[cap];
            const supported = isCapabilitySupported(cap);
            return (
              <div
                key={cap}
                className="flex items-center justify-between rounded-xl border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{spec.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {spec.description}
                  </p>
                  {!supported && (
                    <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                      Not supported on this device
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleCapability(cap)}
                  disabled={!supported || busy}
                  aria-pressed={consents[cap]?.granted}
                  className={classNames(
                    "ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    consents[cap]?.granted
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground",
                    (!supported || busy) && "opacity-50",
                  )}
                >
                  {consents[cap]?.granted ? "Allowed" : "Off"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* VAULT */}
      {/* ------------------------------------------------- */}
      {tab === "vault" && (
        <div className="mt-4 space-y-4" data-testid="archie-vault">
          <div className="rounded-xl border bg-card p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-4 w-4" /> Protect FRELUX data
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You choose what to protect. It's encrypted on this phone
              (AES-256-GCM) and only ciphertext is backed up, the passphrase is
              never stored.
            </p>
            <input
              value={vLabel}
              onChange={(e) => setVLabel(e.target.value)}
              placeholder="Label (e.g. Site measurements)"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Item label"
            />
            <select
              value={vType}
              onChange={(e) => setVType(e.target.value as typeof vType)}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Item type"
            >
              {[
                "PROJECT",
                "ESTIMATE",
                "REPORT",
                "DOCUMENT",
                "PLAN",
                "OTHER",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              value={vText}
              onChange={(e) => setVText(e.target.value)}
              rows={4}
              placeholder="Content to protect…"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Content"
            />
            <input
              type="password"
              value={vPass}
              onChange={(e) => setVPass(e.target.value)}
              placeholder="Passphrase (min 12 chars)"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              aria-label="Passphrase"
            />
            <button
              onClick={handleProtect}
              disabled={busy}
              className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              Encrypt & back up
            </button>
          </div>

          {recovered && (
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs font-semibold">Recovered content</p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs">
                {recovered}
              </pre>
              <button
                onClick={() => handleClipboardCopy(recovered)}
                className="mt-2 text-xs underline"
              >
                Copy
              </button>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Protected items ({items.length})
            </h3>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing protected yet.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.label}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {item.item_type} · v{item.latest_version}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.cipher} · {(item.size_bytes / 1024).toFixed(1)} KB ·
                  backed up {new Date(item.created_date).toLocaleDateString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    value={recoverPass}
                    onChange={(e) => setRecoverPass(e.target.value)}
                    placeholder="Passphrase"
                    aria-label={`Passphrase for ${item.label}`}
                    className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => handleRecover(item)}
                    disabled={busy}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    Decrypt
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={async () => {
                const n = await clearLocalProtectedCache(user.id);
                setNotice(
                  `Removed ${n} local protected cache(s), where Android permits.`,
                );
              }}
              className="text-xs underline text-muted-foreground"
            >
              Remove locally cached protected data
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* SECURITY */}
      {/* ------------------------------------------------- */}
      {tab === "security" && (
        <div className="mt-4 space-y-4" data-testid="archie-security">
          {/* Device sessions */}
          <section className="rounded-xl border bg-card p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="h-4 w-4" /> Devices & sessions
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A stolen phone can be locked out instantly from here. Complements
              Android's native anti-theft, never replaces it.
            </p>
            <div className="mt-2 space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {s.device_label}
                      {s.current ? " (this device)" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.revoked
                        ? "REVOKED"
                        : `Last seen ${new Date(s.last_seen).toLocaleString()}`}
                    </p>
                  </div>
                  {!s.revoked && (
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={busy}
                      className="ml-2 shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleRevokeAll}
              disabled={busy}
              className="mt-2 w-full rounded-lg bg-destructive py-2 text-xs font-semibold text-destructive-foreground"
            >
              Stolen phone? Revoke ALL other sessions
            </button>
          </section>

          {/* Paid capabilities */}
          <section className="rounded-xl border bg-card p-3">
            <h2 className="text-sm font-semibold">
              Optional paid capabilities
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Modular, optional, OFF by default. ARCHIE never silently consumes
              a paid service.
            </p>
            <div className="mt-2 space-y-2">
              {PAID_CAPABILITY_KEYS.map((cap) => (
                <div key={cap} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      {PAID_CAPABILITIES[cap].label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {PAID_CAPABILITIES[cap].provider}
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePaid(cap)}
                    disabled={busy}
                    aria-pressed={!!paidActivations[cap]}
                    className={classNames(
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      paidActivations[cap]
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {paidActivations[cap] ? "Active" : "Off"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Security feed */}
          <section className="rounded-xl border bg-card p-3">
            <h2 className="text-sm font-semibold">Security feed</h2>
            <div className="mt-2 space-y-1.5">
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No security events yet.
                </p>
              )}
              {events.slice(0, 12).map((e) => (
                <div key={e.id} className="rounded-lg border p-2">
                  <p className="text-xs font-medium">{e.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.severity} · {new Date(e.created_date).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => markSecurityEventsRead(user.id).then(refresh)}
              className="mt-1 text-xs underline text-muted-foreground"
            >
              Mark all read
            </button>
          </section>

          {/* Owner authorization */}
          <section className="rounded-xl border bg-card p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4" /> Owner authorization
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Production changes to FRELUX code, calculator engines,
              deterministic logic or high-risk config are owner-only, verified
              server-side. The secret is never stored, logged or spoken.
            </p>
            {ownerHasCredential === false && (
              <div className="mt-2">
                <input
                  type="password"
                  value={newOwnerSecret}
                  onChange={(e) => setNewOwnerSecret(e.target.value)}
                  placeholder="Set owner secret (min 12 chars)"
                  aria-label="New owner secret"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSetOwnerSecret}
                  className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
                >
                  Set owner credential
                </button>
              </div>
            )}
            {ownerHasCredential && (
              <div className="mt-2 space-y-2">
                <select
                  value={authKind}
                  onChange={(e) =>
                    setAuthKind(e.target.value as OwnerChangeKind)
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  aria-label="Change kind"
                >
                  {(Object.keys(OWNER_CHANGE_POLICY) as OwnerChangeKind[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {OWNER_CHANGE_POLICY[k].label}
                        {HIGH_RISK_CHANGE_KINDS.includes(k)
                          ? " (high-risk)"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
                <input
                  value={authTarget}
                  onChange={(e) => setAuthTarget(e.target.value)}
                  placeholder="Target (e.g. src/lib/paint/coverage.ts)"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  aria-label="Change target"
                />
                <input
                  value={authReason}
                  onChange={(e) => setAuthReason(e.target.value)}
                  placeholder="Reason/context (required, stored with the approval record)"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  aria-label="Change reason"
                />
                <input
                  value={authBefore}
                  onChange={(e) => setAuthBefore(e.target.value)}
                  placeholder="Before state (JSON)"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs"
                  aria-label="Before state"
                />
                <input
                  value={authAfter}
                  onChange={(e) => setAuthAfter(e.target.value)}
                  placeholder="After state (JSON)"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-xs"
                  aria-label="After state"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={authTests}
                    onChange={(e) => setAuthTests(e.target.checked)}
                  />
                  Test run passed (required)
                </label>
                {HIGH_RISK_CHANGE_KINDS.includes(authKind) && (
                  <label className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={authEngReview}
                      onChange={(e) => setAuthEngReview(e.target.checked)}
                    />
                    Engineering review completed (high-risk gate)
                  </label>
                )}
                <input
                  type="password"
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                  placeholder="Owner secret"
                  aria-label="Owner secret"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAuthorize}
                  disabled={busy}
                  className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
                >
                  Authorize change (server-side verification)
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {authTrail.length} authorization(s) on record, each with
                  before/after state, versions, tests and a rollback reference.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={classNames(
        "flex flex-col items-center gap-1 rounded-xl border bg-card p-2 text-[11px] font-medium transition-colors hover:bg-accent",
        active && "border-primary text-primary",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
