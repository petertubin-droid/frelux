// =========================================================
// FRELUX ARCHIE STAGE 1, CHAT CENTER (PRIMARY SCREEN)
//
// Full conversational front door to the real ARCHIE Core:
//   * persistent, searchable, owner-private conversations
//   * multimodal composer (text, image, camera, voice, docs)
//   * tool runs rendered with replies (auditable)
//   * "Teach ARCHIE": sends a conversation turn through the
//     REAL learning pipeline (extraction, structuring,
//     validation) and shows the Owner what ARCHIE believes it
//     learned before anything is promoted.
// =========================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  GraduationCap,
  X,
  Wrench,
  Menu,
} from "lucide-react";
import {
  listConversations,
  searchConversations,
  createConversation,
  listMessages,
  sendMessage,
  type ArchieConversation,
  type ArchieMessage,
} from "@/lib/archie/chat-client";
import {
  createArchieIngestion,
  fetchArchieDomains,
  fetchMyContributor,
} from "@/lib/archie/archie-client";
import type { ArchieContributor, ArchieDomain } from "@/lib/archie/types";
import ChatComposer from "@/components/archie/ChatComposer";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";

interface TeachState {
  message: ArchieMessage | null;
  domains: ArchieDomain[];
  domainKey: string;
  running: boolean;
  result: { ok: boolean; text: string } | null;
  contributor: ArchieContributor | null;
}

export default function ArchieChat() {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<ArchieConversation[]>([]);
  const [active, setActive] = useState<ArchieConversation | null>(null);
  const [messages, setMessages] = useState<ArchieMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [teach, setTeach] = useState<TeachState>({
    message: null,
    domains: [],
    domainKey: "",
    running: false,
    result: null,
    contributor: null,
  });

  const threadRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async (term?: string) => {
    setLoadingList(true);
    try {
      const list = term
        ? await searchConversations(term)
        : await listConversations();
      setConversations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversations");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    setLoadingThread(true);
    listMessages(active.id)
      .then(setMessages)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load messages"),
      )
      .finally(() => setLoadingThread(false));
  }, [active]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function handleNew() {
    setError(null);
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActive(conv);
      setListOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create conversation",
      );
    }
  }

  async function handleSend(
    text: string,
    attachments: { name: string; type: string; uri?: string }[],
  ) {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const history = messages.slice(-20).map((m) => ({
        role: m.role === "owner" ? ("owner" as const) : ("archie" as const),
        content: m.content,
      }));
      const { ownerMessage, archieMessage } = await sendMessage(
        active,
        text,
        attachments,
        history,
      );
      setMessages((prev) => [...prev, ownerMessage, archieMessage]);
      refreshList();
    } finally {
      setBusy(false);
    }
  }

  async function openTeach(message: ArchieMessage) {
    setTeach({
      message,
      domains: [],
      domainKey: "",
      running: false,
      result: null,
      contributor: null,
    });
    try {
      const domains = await fetchArchieDomains();
      const contributor = await fetchMyContributor(
        isAdmin,
        user?.id ?? "",
        user?.email ?? "Owner",
      );
      setTeach((s) => ({
        ...s,
        domains,
        domainKey: domains[0]?.key ?? "",
        contributor,
      }));
    } catch {
      setTeach((s) => ({
        ...s,
        result: { ok: false, text: "Could not load knowledge domains" },
      }));
    }
  }

  async function runTeach() {
    const { message, domainKey, contributor } = teach;
    if (!message || !domainKey || !contributor) return;
    setTeach((s) => ({ ...s, running: true, result: null }));
    try {
      const res = await createArchieIngestion({
        input_type: "TEXT",
        title: `From ARCHIE chat: ${message.content.slice(0, 60)}`,
        domain: domainKey,
        text: message.content,
        source_ref: `archie-chat:${message.conversation_id}`,
        contributor,
        user_confirmed: true,
      });
      if (res.ok) {
        const count = res.candidates?.length ?? 0;
        setTeach((s) => ({
          ...s,
          running: false,
          result: {
            ok: true,
            text:
              count > 0
                ? `ARCHIE prepared ${count} learning candidate(s) from this message. They are now in the Learning pipeline for review. Nothing was promoted to knowledge without Owner approval.`
                : "ARCHIE could not structure any knowledge candidate from this message.",
          },
        }));
      } else {
        setTeach((s) => ({
          ...s,
          running: false,
          result: {
            ok: false,
            text: res.error ?? "The learning pipeline rejected this input",
          },
        }));
      }
    } catch (e) {
      setTeach((s) => ({
        ...s,
        running: false,
        result: {
          ok: false,
          text: e instanceof Error ? e.message : "Learning pipeline failed",
        },
      }));
    }
  }

  return (
    <div
      className="flex h-[calc(100dvh-8.5rem)] flex-col md:h-[calc(100dvh-5.5rem)]"
      data-testid="archie-chat"
    >
      <div className="flex items-center justify-between gap-2 pb-2 md:hidden">
        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          className="rounded-lg border border-border p-2 text-muted-foreground"
          aria-label="Toggle conversations"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="font-display text-sm font-semibold text-foreground">
          ARCHIE Chat Center
        </p>
        <span className="w-8" />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Conversations panel */}
        <aside
          className={classNames(
            "w-64 shrink-0 flex-col border-r border-border pr-2 md:flex",
            listOpen
              ? "flex absolute inset-y-0 left-0 z-40 bg-background p-2 md:relative"
              : "hidden",
          )}
          aria-label="Conversations"
        >
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                refreshList(e.target.value.trim() || undefined);
              }}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={handleNew}
            className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New conversation
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />{" "}
                Loading…
              </p>
            ) : conversations.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(c);
                        setListOpen(false);
                      }}
                      className={classNames(
                        "group w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active?.id === c.id
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60",
                      )}
                    >
                      <span className="line-clamp-1 font-medium text-foreground">
                        {c.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.last_message_at).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border bg-card"
          aria-label="Conversation thread"
        >
          <div
            ref={threadRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
          >
            {!active ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  A
                </div>
                <h1 className="font-display text-lg font-bold text-foreground">
                  ARCHIE is ready
                </h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Start a conversation or pick one from the list. ARCHIE
                  connects to the real intelligence core, so what it knows comes
                  from production data, not decoration.
                </p>
              </div>
            ) : loadingThread ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                Loading conversation…
              </p>
            ) : messages.length === 0 ? (
              <p className="pt-8 text-center text-sm text-muted-foreground">
                New conversation. Say anything to ARCHIE.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={classNames(
                    "flex flex-col",
                    m.role === "owner" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={classNames(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                      m.role === "owner"
                        ? "bg-primary text-primary-foreground"
                        : m.role === "archie"
                          ? "bg-muted text-foreground"
                          : "border border-border text-muted-foreground",
                    )}
                  >
                    {m.content}
                    {m.attachments?.length > 0 && (
                      <span className="mt-1.5 block border-t border-border/40 pt-1.5 text-[11px] opacity-80">
                        {m.attachments.map((a) => a.name).join(", ")}
                      </span>
                    )}
                  </div>

                  {m.role === "archie" && m.engine === "external-adapter" && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      External development adapter, not ARCHIE-native inference
                    </p>
                  )}

                  {m.role === "archie" && m.tool_runs?.length > 0 && (
                    <details className="mt-1 max-w-[85%] rounded-lg border border-border bg-background px-2.5 py-1.5">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Wrench className="h-3 w-3" aria-hidden="true" />
                        {m.tool_runs.length} tool run(s)
                      </summary>
                      <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                        {m.tool_runs.map((t, i) => (
                          <li key={i}>
                            <span className="font-semibold text-foreground">
                              {t.tool}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {m.role === "owner" && (
                    <button
                      type="button"
                      onClick={() => openTeach(m)}
                      className="mt-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Send this message to the ARCHIE learning pipeline"
                    >
                      <GraduationCap className="h-3 w-3" aria-hidden="true" />{" "}
                      Teach ARCHIE
                    </button>
                  )}
                </div>
              ))
            )}
            {busy && (
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                ARCHIE is thinking…
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> {error}
            </p>
          )}

          {active && <ChatComposer onSend={handleSend} busy={busy} />}
          {!active && (
            <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
              Select or create a conversation to talk to ARCHIE.
            </p>
          )}
        </section>
      </div>

      {/* Teach ARCHIE modal */}
      {teach.message && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Teach ARCHIE"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">
                Teach ARCHIE
              </h2>
              <button
                type="button"
                onClick={() =>
                  setTeach({
                    message: null,
                    domains: [],
                    domainKey: "",
                    running: false,
                    result: null,
                    contributor: null,
                  })
                }
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mb-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground line-clamp-4">
              {teach.message.content}
            </p>
            <label
              htmlFor="teach-domain"
              className="mb-1 block text-xs font-semibold text-foreground"
            >
              Knowledge domain
            </label>
            <select
              id="teach-domain"
              value={teach.domainKey}
              onChange={(e) =>
                setTeach((s) => ({ ...s, domainKey: e.target.value }))
              }
              disabled={teach.running}
              className="mb-3 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {teach.domains.length === 0 && (
                <option value="">Loading domains…</option>
              )}
              {teach.domains.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="mb-3 text-[11px] text-muted-foreground">
              ARCHIE will extract, structure and validate a learning candidate,
              then show you the result. Nothing becomes knowledge without your
              approval in the Learning pipeline.
            </p>
            <button
              type="button"
              onClick={runTeach}
              disabled={teach.running || !teach.domainKey}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {teach.running ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />{" "}
                  Learning…
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" aria-hidden="true" /> Run
                  learning pipeline
                </>
              )}
            </button>
            {teach.result && (
              <p
                role="status"
                className={classNames(
                  "mt-3 rounded-lg p-2.5 text-xs",
                  teach.result.ok
                    ? "bg-primary/10 text-foreground"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {teach.result.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
