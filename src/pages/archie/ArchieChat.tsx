// =========================================================
// FRELUX ARCHIE STAGE 1 — ARCHIE CHAT CENTER (PRIMARY SCREEN)
//
// The Owner's conversational front door to the REAL ARCHIE
// Intelligence Core (archie-core edge function). Not an
// isolated chatbot: tool results, learning initiation and
// system status flow through the same core.
//
// Multimodal (explicitly selected content ONLY — spec §7):
//  - images: camera / gallery / screenshots
//  - audio: voice recording (MediaRecorder)
//  - documents: PDF / plain text
// "Teach ARCHIE" stores owner-taught knowledge directly (owner
// directive 2026-09-14: learning needs no approval step).
// =========================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  startListening,
  recognizeSpeech,
  reportTranscription,
  EarsError,
  type EarsRecorder,
  type TranscriptionResult,
} from "@/lib/archie/ears";
import {
  createVoiceSession,
  type VoiceSession,
  type VoiceSessionState,
} from "@/lib/archie/voice-session";
import { speakArchie, stopArchieVoice } from "@/lib/archie/mobile/voice";
import { loadProfileLocally } from "@/lib/archie/mobile/voice-profile";
import {
  fetchConsents,
  loadCachedConsents,
  grantCapability,
  revokeCapability,
} from "@/lib/archie/mobile/consent";
import type {
  ArchieConsent,
  ArchieMobileCapability,
} from "@/lib/archie/mobile/types";
import { getSupabase } from "@/lib/supabase-lazy";
import {
  createConversation,
  listConversations,
  listMessages,
  archiveConversation,
  renameConversation,
  sendChatTurn,
  uploadAttachment,
  validateAttachment,
  MAX_ATTACHMENT_BYTES,
  recordAuditEvent,
  type ArchieAttachment,
  type ArchieConversation,
  type ArchieMessage,
} from "@/lib/archie/stage1-client";
import {
  fetchActiveLanguages,
  resolveSessionLanguage,
  setSelectedLanguage,
  clearSelectedLanguage,
  type LanguageRegistryRow,
  type SessionLanguageResolution,
} from "@/lib/archie/stage2-language-client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type PendingUpload = { file: File; error?: string };

function ToolResultChip({
  tool,
  ok,
  summary,
}: {
  tool: string;
  ok: boolean;
  summary: string;
}) {
  return (
    <div
      className={`mt-1.5 rounded-lg border px-3 py-2 text-xs ${
        ok
          ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200/90"
          : "border-red-400/20 bg-red-400/5 text-red-200/90"
      }`}
    >
      <span className="font-medium tracking-wide">
        {ok ? "✓" : "✗"} {tool.replace(/_/g, " ")}
      </span>
      <p className="mt-0.5 text-slate-300">{summary}</p>
    </div>
  );
}

export default function ArchieChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ArchieConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ArchieMessage[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [forwarding, setForwarding] = useState<ArchieMessage | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [teachMode, setTeachMode] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  // §16: location → language wiring
  const [languages, setLanguages] = useState<LanguageRegistryRow[]>([]);
  const [sessionLanguage, setSessionLanguage] =
    useState<SessionLanguageResolution | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const earsRef = useRef<EarsRecorder | null>(null);
  // native on-device recognition running alongside the
  // voice-note capture (no provider, no key, no OpenAI)
  const earsSpeechRef = useRef<Promise<TranscriptionResult> | null>(null);
  const [earsBusy, setEarsBusy] = useState(false);
  const [earsNotice, setEarsNotice] = useState("");
  // ---- Advanced Voice Intelligence (native layer, owner
  // directive 2026-09-10): the continuous LISTEN → THINK →
  // SPEAK session and spoken replies run on the SAME
  // cognitive engine (sendChatTurn), consents and audit
  // trail as text chat — voice is an INTERFACE to ARCHIE,
  // never a second brain. VOICE_INPUT gates listening,
  // VOICE_OUTPUT gates speaking (checked in the libraries
  // themselves — defense in depth; no caller can bypass). ----
  const [consents, setConsents] = useState<Record<
    ArchieMobileCapability,
    ArchieConsent
  > | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceSessionState | "IDLE">(
    "IDLE",
  );
  const [interim, setInterim] = useState("");
  const [speakerNote, setSpeakerNote] = useState("");
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // ---- conversations list ----
  const refreshConversations = useCallback(async () => {
    try {
      const list = await listConversations(search);
      setConversations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversations");
    }
  }, [search]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // §16: load the live registry and resolve the session language
  // (user selection authoritative; timezone suggestion advisory)
  useEffect(() => {
    let cancelled = false;
    fetchActiveLanguages()
      .then((rows) => {
        if (cancelled) return;
        setLanguages(rows);
        setSessionLanguage(resolveSessionLanguage({ languages: rows }));
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Could not load the language registry; ARCHIE stays in English.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // device-capability consents (server source of truth,
  // localStorage cache for instant open — same records the
  // consent manager everywhere else uses)
  useEffect(() => {
    if (!user?.id) return;
    const cached = loadCachedConsents(user.id);
    if (cached) setConsents(cached);
    fetchConsents(user.id)
      .then(setConsents)
      .catch(() => undefined); // consent load failure never blocks chat
  }, [user?.id]);

  // load newest conversation on first open
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations.find((c) => !c.archived)?.id ?? null);
    }
  }, [conversations, activeId]);

  // ---- messages thread ----
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    listMessages(activeId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load messages");
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, sending]);

  // ---- new conversation ----
  async function handleNewConversation() {
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setListOpen(false);
      setTeachMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start conversation");
    }
  }

  // ---- attachments (explicitly selected files only) ----
  function onFilesPicked(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const checked: PendingUpload[] = files.map((file) => {
      const sizeCheck = file.size > MAX_ATTACHMENT_BYTES;
      const typeCheck = validateAttachment(file);
      return {
        file,
        error: sizeCheck
          ? `"${file.name}" is over 20 MB.`
          : typeCheck.ok
            ? undefined
            : typeCheck.error,
      };
    });
    setPending((prev) => [...prev, ...checked].slice(0, 4));
  }

  // ---- voice recording → EARS (native speech perception) ----
  // The voice note is attached AND understood by the NATIVE
  // on-device recognition engine (no provider, no key, no
  // OpenAI — OpenAI Separation Rule). The transcript lands in
  // the draft so the spoken command goes through the NORMAL
  // cognitive pipeline (the owner reviews before sending —
  // audio never auto-sends). Transcription failure is honest:
  // the voice note stays attached, nothing is invented, and
  // every real transcript is audited through archie-ears.
  async function toggleRecording() {
    if (recording) {
      setRecording(false);
      setEarsBusy(true);
      try {
        const recorded = await earsRef.current?.stop();
        if (!recorded) {
          setError("No audio was captured.");
          return;
        }
        const type = recorded.blob.type || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        if (recorded.capped) {
          setEarsNotice("Hit the 30s cap — recording trimmed.");
        }
        setPending((prev) =>
          [
            ...prev,
            {
              file: new File(
                [recorded.blob],
                `voice-note-${Date.now()}.${ext}`,
                {
                  type,
                },
              ),
            },
          ].slice(0, 4),
        );
        // Native on-device recognition ran alongside the
        // capture; its transcript is what lands in the draft.
        const speech = earsSpeechRef.current;
        earsSpeechRef.current = null;
        if (!speech) {
          setEarsNotice(
            "Native speech recognition was unavailable — the voice note is attached.",
          );
          return;
        }
        try {
          const { transcript, speechDetected, language, durationSec } =
            await speech;
          // every real transcript is audited (owner-gated)
          void reportTranscription({
            transcript,
            speechDetected,
            languageHint: language,
            durationSec,
          }).catch(() => undefined); // audit failure never blocks the draft
          if (!speechDetected) {
            setError(
              "No speech detected in the recording — the voice note is still attached.",
            );
            return;
          }
          setDraft((prev) =>
            prev.trim() ? `${prev.trim()} ${transcript}` : transcript,
          );
          if (language && language !== "en") {
            setEarsNotice(`Recognition language: ${language} — edit if wrong.`);
          }
        } catch (e) {
          if (e instanceof EarsError) {
            setError(`${e.message} The voice note is still attached.`);
          } else {
            setError("Transcription failed. The voice note is still attached.");
          }
        }
      } catch (e) {
        if (e instanceof EarsError) {
          setError(`${e.message} The voice note is still attached.`);
        } else {
          setError("Microphone error — the voice note could not be captured.");
        }
      } finally {
        setEarsBusy(false);
      }
      return;
    }
    // start listening — explicit, owner-initiated only.
    // Capture and native recognition run in parallel.
    stopArchieVoice(); // one voice surface at a time
    try {
      earsSpeechRef.current = recognizeSpeech().catch((e) => {
        // UNSUPPORTED is honest and non-fatal: the voice note
        // can still be attached without a transcript.
        earsSpeechRef.current = null;
        if (e instanceof EarsError && e.code === "UNSUPPORTED") {
          setEarsNotice(
            "This browser has no native speech recognition — the voice note will attach without a transcript.",
          );
        }
        throw e;
      });
      earsRef.current = await startListening();
      setRecording(true);
      setEarsNotice("");
    } catch (e) {
      earsSpeechRef.current = null;
      if (e instanceof EarsError) setError(e.message);
      else setError("Microphone permission denied or unavailable.");
    }
  }

  // ── WhatsApp-style message actions (owner directive 2026-09-14) ──
  const flashNotice = useCallback((note: string) => {
    setActionNotice(note);
    window.setTimeout(() => setActionNotice(null), 2500);
  }, []);

  const copyMessage = useCallback(
    async (m: ArchieMessage) => {
      try {
        await navigator.clipboard.writeText(m.content);
        flashNotice("Copied");
      } catch {
        flashNotice("Copy failed — hold and copy manually");
      }
    },
    [flashNotice],
  );

  const toggleStar = useCallback(
    async (m: ArchieMessage) => {
      const next = !m.starred;
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, starred: next } : x)),
      );
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("frelux_archie_messages")
        .update({ starred: next })
        .eq("id", m.id);
      if (error) {
        setMessages((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, starred: !next } : x)),
        );
        flashNotice("Could not update the message");
      }
    },
    [flashNotice],
  );

  const deleteMessage = useCallback(
    async (m: ArchieMessage) => {
      if (!window.confirm("Delete this message? This cannot be undone."))
        return;
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("frelux_archie_messages")
        .delete()
        .eq("id", m.id);
      if (error) flashNotice("Could not delete the message");
    },
    [flashNotice],
  );

  // Edit (owner messages): load into the composer and remove the
  // original — the edited version is sent as a fresh turn.
  const editMessage = useCallback(
    async (m: ArchieMessage) => {
      setDraft(m.content);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      const supabase = await getSupabase();
      await supabase.from("frelux_archie_messages").delete().eq("id", m.id);
      flashNotice("Editing — send to replace it");
    },
    [flashNotice],
  );

  const forwardTo = useCallback(
    async (m: ArchieMessage, targetId: string, targetTitle: string) => {
      const supabase = await getSupabase();
      const { error } = await supabase.from("frelux_archie_messages").insert({
        conversation_id: targetId,
        role: "owner",
        content: m.content,
        attachments: m.attachments ?? [],
      });
      if (error) {
        flashNotice("Forward failed");
        return;
      }
      setForwarding(null);
      flashNotice(`Forwarded to ${targetTitle}`);
      if (targetId === activeId) {
        const fresh = await listMessages(targetId);
        setMessages(fresh);
      }
    },
    [activeId, flashNotice],
  );

  // ---- send a chat turn through the REAL ARCHIE core ----
  /** Explicit owner consent switch — the ONLY way voice
   *  output turns on. Grants/revokes through the server
   *  consent manager (frelux_archie_mobile_consents). */
  const setVoiceConsent = useCallback(
    async (cap: ArchieMobileCapability, granted: boolean) => {
      if (!user?.id) return;
      try {
        if (granted) await grantCapability(user.id, cap);
        else await revokeCapability(user.id, cap);
        setConsents(await fetchConsents(user.id));
      } catch (e) {
        setError(
          e instanceof Error
            ? `Consent change failed: ${e.message}`
            : "Consent change failed — nothing was changed.",
        );
      }
    },
    [user?.id],
  );

  /** Continuous voice session — the SAME loop as text chat:
   *  LISTEN → HEAR → AUDIT → THINK (archie-chat engine turn,
   *  persisted to this conversation) → SPEAK → LISTEN AGAIN.
   *  One microphone at a time (voice notes and sessions never
   *  overlap). High-risk spoken phrases route to the existing
   *  owner-authorization workflow — voice can initiate, it
   *  can never complete authorization. */
  async function toggleVoiceSession() {
    if (recording || earsBusy) {
      setEarsNotice("One microphone at a time — finish the voice note first.");
      return;
    }
    stopArchieVoice();
    if (voiceSessionRef.current) {
      voiceSessionRef.current.stop("manual");
      return;
    }
    if (!consents?.VOICE_INPUT?.granted) {
      setEarsNotice(
        "Voice input is switched off — tap the Voice toggle to enable it (explicit consent).",
      );
      return;
    }
    if (!activeId) return;
    const convId = activeId;
    const created = await createVoiceSession(
      {
        voiceInputConsent: consents?.VOICE_INPUT ?? null,
        voiceOutputConsent: consents?.VOICE_OUTPUT ?? null,
        continuous: true,
        sessionTimeoutMs: 10 * 60_000,
        utteranceTimeoutMs: 15_000,
        // §16: the owner's explicit language choice is
        // authoritative and flows through the language registry.
        languageCode: sessionLanguage?.language_code ?? "en",
        bankPitchHz: loadProfileLocally()?.pitchHz ?? null,
        conversationId: convId,
        history: () =>
          messages
            .filter((m) => m.role === "owner" || m.role === "archie")
            .slice(-8)
            .map((m) => ({
              role: m.role as "owner" | "archie",
              content: m.content,
            })),
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
        onUserTranscript: ({ speaker }) => {
          setInterim("");
          if (speaker?.determinable) {
            setSpeakerNote(
              speaker.match
                ? "Owner voice recognized — a similarity signal, not proof of identity."
                : "Speaker not recognized against the owner voice profile.",
            );
          }
        },
        onArchieReply: (_reply, spoken) => {
          // The session already SPOKE it through the mouth
          // pipeline; the persisted thread is reloaded from
          // the server (source of truth, same as text chat).
          listMessages(convId)
            .then(setMessages)
            .catch(() => undefined);
          if (!spoken && consents?.VOICE_OUTPUT?.granted) {
            setEarsNotice("Voice output was muted for that reply.");
          }
        },
        onError: (kind, message) => {
          if (kind === "NO_SPEECH" && voiceState === "LISTENING") return;
          setEarsNotice(message);
        },
        onAuthorizationRequired: () => {
          // Voice INITIATED a high-risk request — it can never
          // complete it. Route to the existing Owner
          // Authorization workflow (typed secret, verified
          // server-side) on the Security surface.
          setEarsNotice(
            "That request needs Owner authorization — opening Security → Owner Authorization. Voice can initiate it, never complete it.",
          );
          setVoiceSessionRefStop();
        },
      },
    );
    if (!created.ok) {
      setEarsNotice(created.message);
      return;
    }
    voiceSessionRef.current = created.session;
    await created.session.start();
  }

  /** Stop-and-route helper for the authorization event: end
   *  the session and navigate to the authorization surface. */
  function setVoiceSessionRefStop() {
    voiceSessionRef.current?.stop("manual");
    voiceSessionRef.current = null;
    setInterim("");
    navigate("/archie/security");
  }

  async function handleSend() {
    const text = draft.trim();
    if ((!text && pending.length === 0) || !activeId) return;
    if (sending) {
      // Never silently drop the owner's words while a reply is
      // still in flight (owner report 2026-09-15). The draft
      // stays in the box; say what happened.
      setError(
        "ARCHIE is still answering your last message — once that reply lands, send this one again.",
      );
      return;
    }

    stopArchieVoice(); // the owner typed — ARCHIE stops talking
    setSending(true);
    setError(null);
    const optimistic: ArchieMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeId,
      role: "owner",
      content: text,
      attachments: [],
      tool_calls: [],
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      // upload explicitly selected attachments first
      const attachments: ArchieAttachment[] = [];
      const uploadErrors: string[] = [];
      for (const p of pending) {
        if (p.error) {
          uploadErrors.push(p.error);
          continue;
        }
        const res = await uploadAttachment(user?.id ?? "", p.file);
        if (res.ok) attachments.push(res.attachment);
        else uploadErrors.push(res.error);
      }
      setPending([]);

      const history = messages
        .filter((m) => m.role === "owner" || m.role === "archie")
        .slice(-8)
        .map((m) => ({
          role: m.role as "owner" | "archie",
          content: m.content,
        }));

      const result = await sendChatTurn({
        conversationId: activeId,
        message: text,
        attachments,
        teach: teachMode,
        history,
        // §16: user selection authoritative, location advisory;
        // the server validates against the live registry.
        language: sessionLanguage
          ? {
              language_code: sessionLanguage.language_code,
              source: sessionLanguage.source,
            }
          : undefined,
      });

      if (!result.ok) {
        setError(result.error ?? "ARCHIE core error");
        await recoverFailedTurn(text, optimistic.id);
        return;
      }

      // reload the real persisted thread (source of truth)
      const fresh = await listMessages(activeId);
      setMessages(fresh);
      // MOUTH (native prosody, owner voice bank): speak the
      // reply aloud ONLY with an explicit VOICE_OUTPUT
      // consent — speakArchie re-checks it library-side; no
      // caller can bypass the gate.
      if (consents?.VOICE_OUTPUT?.granted) {
        const lastReply = [...fresh].reverse().find((m) => m.role === "archie");
        if (lastReply) speakArchie(lastReply.content, consents.VOICE_OUTPUT);
      }
      if (teachMode) {
        setTeachMode(false);
        recordAuditEvent("archie.chat.teach_submitted", "INFO", {
          conversation_id: activeId,
        }).catch(() => undefined);
      }
      if (result.warnings?.length) setError(result.warnings.join(" "));
      else if (uploadErrors.length) setError(uploadErrors.join(" "));
      refreshConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      await recoverFailedTurn(text, optimistic.id);
    } finally {
      setSending(false);
    }
  }

  // The server persists the owner's turn BEFORE inference
  // (source of truth) — a failed or timed-out reply does not
  // mean the message was never recorded. Reload the real
  // thread; only restore the draft when the turn truly isn't
  // there. The owner must never lose sight of their own words
  // (owner report 2026-09-15).
  async function recoverFailedTurn(text: string, optimisticId: string) {
    if (!activeId) return;
    const fresh = await listMessages(activeId).catch(() => null);
    if (fresh) {
      setMessages(fresh);
      const recorded = fresh.some(
        (m) => m.role === "owner" && m.content === text,
      );
      if (!recorded) setDraft(text);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
    }
  }

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function handleArchive() {
    if (!activeId) return;
    try {
      await archiveConversation(activeId);
      const next = conversations.filter((c) => c.id !== activeId);
      setConversations(next);
      setActiveId(next[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    }
  }

  async function handleRename() {
    if (!activeId || !activeConversation) return;
    const title = window.prompt(
      "Rename conversation",
      activeConversation.title,
    );
    if (!title) return;
    try {
      await renameConversation(activeId, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, title } : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] bg-[#0B0F14] text-slate-200 md:h-[calc(100vh-57px-1.5rem)]">
      {/* ---- conversation list (drawer on mobile) ---- */}
      <aside
        className={`${listOpen ? "fixed inset-x-0 bottom-16 top-[57px] z-30 bg-[#0B0F14]" : "hidden"} w-full shrink-0 overflow-y-auto border-r border-white/5 p-3 md:static md:block md:w-64`}
      >
        <button
          type="button"
          onClick={handleNewConversation}
          className="mb-3 w-full archie-btn-primary rounded-lg bg-amber-400/90 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-amber-300"
        >
          + New conversation
        </button>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className="mb-3 w-full rounded-lg archie-panel px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        />
        {conversations.length === 0 && (
          <p className="px-1 py-4 text-xs text-slate-500">
            No conversations yet. Start one — it stays private to you.
          </p>
        )}
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setListOpen(false);
                }}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                  c.id === activeId
                    ? "bg-amber-400/10 text-amber-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {c.pinned && <span className="mr-1">📌</span>}
                {c.title}
                <span className="block text-[10px] text-slate-500">
                  {c.message_count} message{c.message_count === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---- thread ---- */}
      <section
        className="flex min-w-0 flex-1 flex-col"
        aria-label="ARCHIE chat"
      >
        {/* thread header */}
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/5 md:hidden"
            aria-label="Toggle conversation list"
          >
            ☰
          </button>
          <h1 className="truncate text-sm font-medium text-slate-200">
            {activeConversation?.title ?? "ARCHIE Chat"}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={handleRename}
              disabled={!activeConversation}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 disabled:opacity-40"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={!activeConversation}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 disabled:opacity-40"
            >
              Archive
            </button>
          </div>
        </div>

        {/* messages */}
        <div
          ref={threadRef}
          className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4"
          role="log"
          aria-live="polite"
        >
          {!activeId && (
            <div className="mx-auto mt-8 max-w-md text-center">
              <img
                src="/assets/archie/archie-icon-512.png"
                alt=""
                className="archie-mascot mx-auto h-20 w-20 rounded-2xl"
                aria-hidden
              />
              <p className="mt-4 text-sm text-slate-300">
                I'm ARCHIE — your intelligence system.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ask anything, attach a photo, site drawing, PDF or voice note,
                inspect a website, or teach me something new.
              </p>
              <button
                type="button"
                onClick={handleNewConversation}
                className="mt-4 archie-btn-primary rounded-lg bg-amber-400/90 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300"
              >
                Start a conversation
              </button>
            </div>
          )}
          {loadingThread && (
            <p className="text-center text-xs text-slate-500">Loading…</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "owner" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "owner"
                    ? "archie-btn-primary bg-amber-400/90 text-slate-900 shadow-lg"
                    : m.role === "archie"
                      ? "archie-panel border border-white/10 text-slate-100 shadow-md"
                      : "bg-transparent text-slate-400 text-xs"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.attachments?.length > 0 && (
                  <p className="mt-1 text-[10px] opacity-70">
                    {m.attachments.length} attachment(s)
                  </p>
                )}
                {m.role === "archie" &&
                  m.tool_calls?.map((t, i) => (
                    <ToolResultChip key={i} {...t} />
                  ))}
                {m.starred && (
                  <span className="absolute -top-1 right-1 text-[10px] text-amber-300">
                    ★
                  </span>
                )}
              </div>
              {(m.role === "owner" || m.role === "archie") && (
                <div
                  className={`mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 ${
                    m.role === "owner" ? "justify-end" : "justify-start"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void copyMessage(m)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300"
                    title="Copy"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleStar(m)}
                    className={`rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300 ${
                      m.starred ? "text-amber-300" : ""
                    }`}
                    title="Star"
                  >
                    {m.starred ? "Unstar" : "Star"}
                  </button>
                  {m.role === "owner" && (
                    <button
                      type="button"
                      onClick={() => void editMessage(m)}
                      className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300"
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setForwarding(m)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300"
                    title="Forward"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteMessage(m)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-rose-300"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/[0.06] px-4 py-2.5">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* error line */}
        {error && (
          <p role="alert" className="px-3 pb-1 text-xs text-amber-300">
            {error}
          </p>
        )}

        {/* action notice */}
        {actionNotice && (
          <p className="px-3 pb-1 text-center text-xs text-amber-200">
            {actionNotice}
          </p>
        )}

        {/* forward dialog (WhatsApp-style) */}
        {forwarding && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 md:items-center">
            <div className="archie-panel w-full max-w-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-200">
                  Forward to…
                </h2>
                <button
                  type="button"
                  onClick={() => setForwarding(null)}
                  className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                “{forwarding.content.slice(0, 80)}”
              </p>
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                {conversations
                  .filter((c) => c.id !== forwarding.conversation_id)
                  .map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() =>
                          void forwardTo(forwarding, c.id, c.title)
                        }
                        className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                      >
                        {c.title}
                      </button>
                    </li>
                  ))}
                {conversations.filter(
                  (c) => c.id !== forwarding.conversation_id,
                ).length === 0 && (
                  <p className="px-2 py-3 text-xs text-slate-500">
                    No other conversation yet — start one first.
                  </p>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* teach mode banner */}
        {teachMode && (
          <div className="mx-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Teach ARCHIE active — your next message is learned directly and
            stored as your knowledge (correctable in the Learning Center).
            <button
              type="button"
              onClick={() => setTeachMode(false)}
              className="ml-2 underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* pending attachments */}
        {pending.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-2">
            {pending.map((p, i) => (
              <div
                key={`${p.file.name}-${i}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                  p.error
                    ? "border-red-400/30 bg-red-400/10 text-red-300"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                <span className="max-w-32 truncate">
                  {p.error ?? p.file.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPending((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove ${p.file.name}`}
                  className="text-slate-500 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* §16: language selector (user choice is authoritative,
            "Auto" uses the advisory location suggestion) */}
        <div className="relative flex items-center gap-2 border-t border-white/5 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Select ARCHIE language"
            aria-expanded={languageMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-3.5 w-3.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20Z" />
            </svg>
            {sessionLanguage
              ? `${
                  languages.find(
                    (l) => l.code === sessionLanguage.language_code,
                  )?.native_label ?? sessionLanguage.language_code
                }${sessionLanguage.authoritative ? "" : " · auto"}`
              : "Language"}
          </button>
          {sessionLanguage && (
            <span className="text-[10px] uppercase tracking-wide text-slate-600">
              {sessionLanguage.authoritative ? "your choice" : "from location"}
            </span>
          )}
          {languageMenuOpen && (
            <div className="absolute bottom-full left-2 z-20 mb-1 w-52 overflow-hidden rounded-xl archie-input/95 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  clearSelectedLanguage();
                  setSessionLanguage(
                    resolveSessionLanguage({
                      languages,
                      selectedCode: null,
                    }),
                  );
                  setLanguageMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
              >
                Auto (from location)
                <span className="block text-[10px] text-slate-500">
                  advisory suggestion; English fallback
                </span>
              </button>
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(l.code);
                    setSessionLanguage({
                      language_code: l.code,
                      source: "USER_SELECTION",
                      authoritative: true,
                    });
                    setLanguageMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs hover:bg-white/5 ${
                    sessionLanguage?.language_code === l.code &&
                    sessionLanguage?.authoritative
                      ? "bg-amber-400/10 text-amber-200"
                      : "text-slate-300"
                  }`}
                >
                  {l.native_label}
                  <span className="block text-[10px] text-slate-500">
                    {l.label} · {l.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-white/5 p-2 md:p-3">
          {(voiceState !== "IDLE" || speakerNote) && (
            <div
              className="mb-1 flex items-center gap-2 px-1 text-[10px] uppercase tracking-wider"
              role="status"
            >
              <span
                className={
                  voiceState === "LISTENING"
                    ? "text-emerald-300"
                    : voiceState === "STOPPED" || voiceState === "IDLE"
                      ? "text-slate-500"
                      : "text-amber-300/80"
                }
              >
                {voiceState === "IDLE" ? "" : voiceState}
              </span>
              {interim && (
                <span className="truncate text-[11px] normal-case text-slate-300">
                  “{interim}”
                </span>
              )}
              {speakerNote && (
                <span className="text-slate-500">{speakerNote}</span>
              )}
            </div>
          )}
          {(earsNotice || earsBusy) && (
            <p
              className="mb-1 px-1 text-[10px] uppercase tracking-wider text-amber-300/80"
              role="status"
            >
              {earsBusy ? "Transcribing…" : earsNotice}
            </p>
          )}
          <div className="flex items-end gap-1.5">
            {/* ARCHIE full logo, animated beside the chat bar.
                Desktop only — the mobile composer stays lean. */}
            <img
              src="/assets/archie/archie-logo-full.png"
              alt=""
              aria-hidden
              className={`archie-logo-live mb-0.5 hidden h-[52px] w-auto rounded-xl bg-[#0B0F14]/60 p-1 md:block ${
                sending ? "archie-mascot-busy" : ""
              }`}
            />
            <div className="flex">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
                aria-label="Attach image"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path
                    d="m21 15-4-4L7 21"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                title="Take photo"
                aria-label="Take photo"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <path d="M4 8h3l2-3h6l2 3h3v12H4Z" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleVoiceSession}
                disabled={
                  !consents?.VOICE_INPUT?.granted && voiceState === "IDLE"
                }
                title={
                  voiceState !== "IDLE"
                    ? "Stop voice session"
                    : "Voice session — talk to ARCHIE: listen, think, speak, listen again (continuous)"
                }
                aria-label={
                  voiceState !== "IDLE"
                    ? "Stop voice session"
                    : "Start voice session"
                }
                aria-pressed={voiceState !== "IDLE"}
                className={`rounded-lg p-2 ${
                  voiceState !== "IDLE"
                    ? "bg-emerald-400/20 text-emerald-300 archie-voice-pulse"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <path
                    d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 11a7 7 0 0 1-14 0M12 18v3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={earsBusy}
                title={recording ? "Stop recording" : "Record voice note"}
                aria-label={recording ? "Stop recording" : "Record voice note"}
                className={`rounded-lg p-2 ${recording ? "bg-red-400/20 text-red-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path
                    d="M5 11a7 7 0 0 0 14 0M12 18v3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                title="Attach document (PDF/text)"
                aria-label="Attach document"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
                    strokeLinejoin="round"
                  />
                  <path d="M14 2v6h6M9 13h6M9 17h6" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                title="Attach audio file"
                aria-label="Attach audio file"
                className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 sm:block"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <path d="M9 18V5l12-2v13" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft("Inspect this website: ");
                setTeachMode(false);
                composerRef.current?.focus();
              }}
              title="Inspect a website — ARCHIE fetches the live page, analyzes it and reports findings"
              className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              Inspect
            </button>
            <button
              type="button"
              onClick={() => setTeachMode((v) => !v)}
              title="Teach ARCHIE — queue a learning candidate for your approval"
              className={`shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium ${
                teachMode
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              Teach
            </button>
            <button
              type="button"
              onClick={() =>
                void setVoiceConsent(
                  "VOICE_OUTPUT",
                  !consents?.VOICE_OUTPUT?.granted,
                )
              }
              title="Speak replies aloud (on-device speech) — explicit consent, toggle anytime"
              aria-label="Speak replies aloud"
              aria-pressed={Boolean(consents?.VOICE_OUTPUT?.granted)}
              className={`shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium ${
                consents?.VOICE_OUTPUT?.granted
                  ? "bg-emerald-400/20 text-emerald-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              Speak
            </button>
            <textarea
              value={draft}
              onChange={(e) => {
                stopArchieVoice(); // typing = stop talking
                setDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              ref={composerRef}
              placeholder={
                recording
                  ? "Recording… tap to stop"
                  : "Message ARCHIE… (paste a URL to inspect a website)"
              }
              aria-label="Message ARCHIE"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl archie-panel px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={
                sending || (!draft.trim() && pending.length === 0) || !activeId
              }
              className="shrink-0 archie-btn-primary rounded-xl bg-amber-400/90 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
          {/* hidden explicit-selection inputs (never device-wide access) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            multiple
            hidden
            onChange={onFilesPicked}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onFilesPicked}
          />
          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf,text/plain"
            multiple
            hidden
            onChange={onFilesPicked}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/webm,audio/ogg,audio/mpeg,audio/mp3,audio/wav,audio/mp4"
            hidden
            onChange={onFilesPicked}
          />
        </div>
      </section>
    </div>
  );
}
