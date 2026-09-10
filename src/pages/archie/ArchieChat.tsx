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
// "Teach ARCHIE" queues a learning candidate into the real
// pipeline (AWAITING_APPROVAL — never auto-promoted).
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
  transcribeAudio,
  EarsError,
  type EarsRecorder,
} from "@/lib/archie/ears";
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
  const [conversations, setConversations] = useState<ArchieConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ArchieMessage[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
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
  const [earsBusy, setEarsBusy] = useState(false);
  const [earsNotice, setEarsNotice] = useState("");
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

  // ---- voice recording → EARS (real speech perception) ----
  // The voice note is attached AND transcribed by the
  // archie-ears edge function. The transcript lands in the
  // draft so the spoken command goes through the NORMAL
  // cognitive pipeline (the owner reviews before sending —
  // audio never auto-sends). Transcription failure is honest:
  // the voice note stays attached, nothing is invented.
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
        // Conversation context: bias recognition toward the
        // current conversation (the last ARCHIE reply).
        const lastReply = [...messages]
          .reverse()
          .find((m) => m.role === "archie");
        const { transcript, speechDetected, language } = await transcribeAudio({
          blob: recorded.blob,
          contextPrompt: lastReply ? lastReply.content.slice(0, 300) : null,
        });
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
          setEarsNotice(`Detected language: ${language} — edit if wrong.`);
        }
      } catch (e) {
        if (e instanceof EarsError) {
          setError(`${e.message} The voice note is still attached.`);
        } else {
          setError("Transcription failed. The voice note is still attached.");
        }
      } finally {
        setEarsBusy(false);
      }
      return;
    }
    // start listening — explicit, owner-initiated only
    try {
      earsRef.current = await startListening();
      setRecording(true);
      setEarsNotice("");
    } catch (e) {
      if (e instanceof EarsError) setError(e.message);
      else setError("Microphone permission denied or unavailable.");
    }
  }

  // ---- send a chat turn through the REAL ARCHIE core ----
  async function handleSend() {
    const text = draft.trim();
    if ((!text && pending.length === 0) || sending || !activeId) return;

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
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        return;
      }

      // reload the real persisted thread (source of truth)
      const fresh = await listMessages(activeId);
      setMessages(fresh);
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
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
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
    <div className="flex h-[calc(100vh-57px)] md:h-[calc(100vh-57px-1.5rem)]">
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
                className="mx-auto h-16 w-16 rounded-2xl"
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
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
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
              </div>
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

        {/* teach mode banner */}
        {teachMode && (
          <div className="mx-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Teach ARCHIE active — your next message becomes a learning candidate
            that you approve before it becomes knowledge.
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
          {(earsNotice || earsBusy) && (
            <p
              className="mb-1 px-1 text-[10px] uppercase tracking-wider text-amber-300/80"
              role="status"
            >
              {earsBusy ? "Transcribing…" : earsNotice}
            </p>
          )}
          <div className="flex items-end gap-1.5">
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
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
