import { sanitizeHttpUrl } from "@/lib/sanitization";
import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Coins,
  Check,
  CheckCheck,
  ShieldCheck,
  User,
  ExternalLink,
  Search,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import {
  getConversationById,
  getMyConversations,
  getMessages,
  sendMessage,
  markMessagesRead,
} from "@/lib/pro-connect";
import type { DbProConversation, DbProMessage } from "@/types/pro-connect";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { useLanguage } from "@/lib/i18n";
import { getCreditWallet } from "@/lib/credits";
import { uploadStoredFile } from "@/lib/storage/files";
import PageHeader from "@/components/ui/PageHeader";

const QUICK_PROMPTS = [
  "Can you provide a formal quotation for this project?",
  "When would be your earliest availability to start?",
  "Could we schedule an on-site visit and assessment?",
  "What material specifications do you recommend?",
];

function formatMessageDateGroup(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function Messages() {
  const { t } = useLanguage();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<DbProConversation[]>([]);
  const [messages, setMessages] = useState<DbProMessage[]>([]);
  const [activeConvo, setActiveConvo] = useState<DbProConversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getCreditWallet(user.id).then((wallet) => {
      if (wallet) setCreditBalance(wallet.balance);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setUnavailable(false);
      const convos = await getMyConversations();
      setConversations(convos);
      setLoading(false);

      if (conversationId) {
        const listed = convos.find((c) => c.id === conversationId);
        if (listed) {
          setActiveConvo(listed);
          loadMessages(conversationId);
        } else {
          // Direct fallback
          const direct = await getConversationById(conversationId);
          if (direct) {
            setConversations((current) =>
              current.some((c) => c.id === direct.id) ? current : [direct, ...current],
            );
            setActiveConvo(direct);
            loadMessages(conversationId);
          } else {
            setUnavailable(true);
          }
        }
      } else {
        setActiveConvo(null);
      }
    })();
  }, [user, conversationId]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pro_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as DbProMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== user.id && !newMsg.is_read) {
            markMessagesRead(conversationId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  async function loadMessages(convoId: string) {
    setLoadingMessages(true);
    const msgs = await getMessages(convoId);
    setMessages(msgs);
    setLoadingMessages(false);
    await markMessagesRead(convoId);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setSendError(t("File exceeds maximum allowed size (15MB)."));
      return;
    }
    setAttachedFile(file);
    setSendError(null);
  }

  function removeAttachedFile() {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (!messageText.trim() || !activeConvo || !user || sending) return;
    const body = messageText.trim();
    setSending(true);
    setSendError(null);

    let attachmentUrl: string | undefined = undefined;

    if (attachedFile) {
      setUploadingAttachment(true);
      try {
        const fileExt = attachedFile.name.split(".").pop() || "bin";
        const storagePath = `attachments/${activeConvo.id}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
        const uploadResult = await uploadStoredFile({
          bucket: "plan-documents",
          file: attachedFile,
          path: storagePath,
          filename: attachedFile.name,
          contentType: attachedFile.type,
        });

        if (uploadResult.publicUrl) {
          attachmentUrl = uploadResult.publicUrl;
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Attachment upload error:", err);
      } finally {
        setUploadingAttachment(false);
      }
    }

    let result: Awaited<ReturnType<typeof sendMessage>>;
    try {
      result = await sendMessage(activeConvo.id, body, attachmentUrl);
    } catch {
      setSendError("Message could not be sent. Your draft is still here; please try again.");
      setSending(false);
      return;
    }

    const msg =
      result && typeof result === "object" && "id" in result
        ? (result as { id: string; body: string; conversation_id: string })
        : null;

    if (!msg) {
      const error =
        result && typeof result === "object" && "error" in result
          ? result.error
          : "Message could not be sent. Your draft is still here; please try again.";
      setSendError(error);
      setSending(false);
      return;
    }

    setMessageText("");
    removeAttachedFile();

    // Deduplicate and append
    setMessages((current) =>
      current.some((item) => item.id === msg.id) ? current : [...current, msg as DbProMessage],
    );

    // Refresh wallet balance
    getCreditWallet(user.id).then((wallet) => {
      if (wallet) setCreditBalance(wallet.balance);
    });

    try {
      await supabase.functions.invoke("moderate-pro-message", {
        body: {
          messageId: msg.id,
          content: msg.body,
          conversationId: msg.conversation_id,
          userId: user.id,
        },
      });
    } catch {
      /* moderation is non-blocking */
    }

    await loadMessages(activeConvo.id);
    setSending(false);
  }

  function getDisplayName(convo: DbProConversation): string {
    if (convo.other_party?.display_name) return convo.other_party.display_name;
    if (convo.professional?.display_name) return convo.professional.display_name;
    if (convo.professional?.business_name) return convo.professional.business_name;
    return "Conversation";
  }

  function getAvatarUrl(convo: DbProConversation): string | null {
    if (convo.other_party?.avatar_url) return convo.other_party.avatar_url;
    if (convo.professional?.profile_image_url) return convo.professional.profile_image_url;
    return null;
  }

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter((c) => {
      const name = getDisplayName(c).toLowerCase();
      const lastMsg = (c.last_message || "").toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, searchFilter]);

  // Group messages by calendar day
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: DbProMessage[] }> = [];
    messages.forEach((msg) => {
      const dateLabel = formatMessageDateGroup(msg.created_at);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateLabel === dateLabel) {
        lastGroup.items.push(msg);
      } else {
        groups.push({ dateLabel, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          {t("Sign in to view messages")}
        </h1>
        <Link
          to="/login/?redirect=/messages"
          className="mt-4 inline-block text-brand-purple hover:underline dark:text-brand-purple-lighter"
        >
          {t("Sign in")}
        </Link>
      </div>
    );
  }

  const otherPartySlug =
    activeConvo?.other_party?.slug || activeConvo?.professional?.slug || null;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Pro Connect", path: "/pro-connect" },
          { label: "Messages" },
        ]}
        eyebrow="Pro Connect"
        title={t("Messages")}
        subtitle={t(
          "Conversations with the professionals and suppliers you contacted, kept against the job.",
        )}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 min-h-[640px]">
          {/* Conversation Sidebar (4 cols on lg) */}
          <div
            className={classNames(
              "flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm dark:border-white/10 dark:bg-card lg:col-span-4",
              conversationId ? "hidden lg:flex" : "flex",
            )}
          >
            {/* Sidebar Header & Search */}
            <div className="border-b border-border/60 p-4 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">
                  {t("Conversations")}
                </h2>
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {conversations.length}
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("Search conversations...")}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-muted/40 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40 dark:divide-white/5 max-h-[580px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl bg-muted/60 dark:bg-white/5"
                    />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("No conversations yet.")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Connect with verified architects, builders, and artisans.")}
                  </p>
                  <Link
                    to="/pro-connect/"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {t("Browse professionals")}
                  </Link>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {t("No conversations match your search.")}
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const isSelected = conversationId === convo.id;
                  const name = getDisplayName(convo);
                  const avatar = getAvatarUrl(convo);
                  const unread = convo.unread_count ? Number(convo.unread_count) : 0;

                  return (
                    <button
                      key={convo.id}
                      type="button"
                      onClick={() => navigate(`/messages/${convo.id}/`)}
                      className={classNames(
                        "flex w-full items-center gap-3.5 p-3.5 text-left transition-all hover:bg-muted/40 dark:hover:bg-white/5",
                        isSelected && "bg-primary/5 dark:bg-primary/10 border-l-4 border-primary",
                      )}
                    >
                      <div className="relative shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="h-11 w-11 rounded-full border border-border object-cover dark:border-white/10"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {name}
                          </p>
                          {convo.last_message_at && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {new Date(convo.last_message_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={classNames(
                              "truncate text-xs",
                              unread > 0
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {convo.last_message || t("No messages yet")}
                          </p>
                          {unread > 0 && (
                            <Badge className="h-5 min-w-[20px] rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Conversation Thread (8 cols on lg) */}
          <div
            className={classNames(
              "flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm dark:border-white/10 dark:bg-card lg:col-span-8",
              conversationId ? "flex" : "hidden lg:flex",
            )}
          >
            {activeConvo ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center justify-between border-b border-border/60 p-4 dark:border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/messages/")}
                      className="lg:hidden p-1.5 h-8 w-8 text-muted-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="relative shrink-0">
                      {getAvatarUrl(activeConvo) ? (
                        <img
                          src={getAvatarUrl(activeConvo)!}
                          alt={getDisplayName(activeConvo)}
                          className="h-10 w-10 rounded-full border border-border object-cover dark:border-white/10"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                          {getDisplayName(activeConvo).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold text-foreground">
                          {getDisplayName(activeConvo)}
                        </h3>
                        {activeConvo.other_party?.is_pro && (
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/10 text-primary text-[10px] px-1.5 py-0"
                          >
                            <ShieldCheck className="mr-0.5 h-3 w-3" />
                            {t("Pro")}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {activeConvo.other_party?.is_pro
                          ? activeConvo.professional?.business_name || t("Verified Professional")
                          : t("Client")}
                        {activeConvo.project_context &&
                          ` • ${(activeConvo.project_context as { service?: string }).service || "Project Inquiry"}`}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    {otherPartySlug && (
                      <Link
                        to={`/pro-connect/${otherPartySlug}/`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted dark:border-white/10 dark:text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("View Profile")}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ maxHeight: "calc(100vh - 360px)", minHeight: "360px" }}
                >
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={classNames(
                            "h-12 w-2/3 animate-pulse rounded-2xl bg-muted/60 dark:bg-white/5",
                            i % 2 === 0 ? "ml-auto" : "mr-auto",
                          )}
                        />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("Start the conversation")}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        {t(
                          "Introduce your project, state required materials, or ask for an estimate. Messages are protected and tracked.",
                        )}
                      </p>
                    </div>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.dateLabel} className="space-y-3">
                        {/* Date Divider */}
                        <div className="flex items-center justify-center my-3">
                          <span className="rounded-full bg-muted/70 px-3 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-white/5">
                            {group.dateLabel}
                          </span>
                        </div>

                        {group.items.map((msg) => {
                          const isMe = msg.sender_id === user?.id;
                          const isRemoved = (msg as { is_removed?: boolean }).is_removed;
                          const isModeration =
                            (msg as { message_type?: string }).message_type === "moderation";

                          if (isModeration) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <span className="rounded-full bg-amber-500/10 px-3.5 py-1 text-xs text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {msg.body}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={msg.id}
                              className={classNames(
                                "flex items-end gap-2",
                                isMe ? "justify-end" : "justify-start",
                              )}
                            >
                              {!isMe && (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                  {getDisplayName(activeConvo).charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div
                                className={classNames(
                                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                  isRemoved
                                    ? "border border-destructive/20 bg-destructive/10 text-destructive"
                                    : isMe
                                    ? "bg-primary text-primary-foreground rounded-br-xs"
                                    : "bg-muted/80 text-foreground border border-border/50 dark:bg-white/5 dark:border-white/10 rounded-bl-xs",
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                  {isRemoved
                                    ? "⚠️ This message was removed by moderation."
                                    : msg.body}
                                </p>

                                {!isRemoved &&
                                  msg.attachment_url &&
                                  sanitizeHttpUrl(msg.attachment_url) && (
                                    <a
                                      href={sanitizeHttpUrl(msg.attachment_url)!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={classNames(
                                        "mt-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                                        isMe
                                          ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                                          : "border-border/80 bg-background text-foreground hover:bg-muted dark:border-white/10",
                                      )}
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span className="font-medium underline truncate max-w-[200px]">
                                        {t("Download Attachment")}
                                      </span>
                                    </a>
                                  )}

                                <div
                                  className={classNames(
                                    "mt-1.5 flex items-center justify-end gap-1 text-[10px]",
                                    isMe
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  <span>
                                    {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {isMe && (
                                    msg.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5 opacity-80" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Chips */}
                {messages.length < 3 && (
                  <div className="border-t border-border/40 px-4 py-2 bg-muted/20 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {t("Suggestions:")}
                      </span>
                      {QUICK_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setMessageText(prompt);
                            setSendError(null);
                          }}
                          className="shrink-0 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-foreground/80 hover:bg-muted dark:border-white/10 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Composer */}
                <div className="border-t border-border/60 p-4 dark:border-white/10">
                  {/* Credits & Wallet Banner */}
                  <div className="mb-2.5 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span>{t("Each message costs 5 FRELUX Credits.")}</span>
                    </div>
                    {creditBalance !== null && (
                      <span className="font-medium text-foreground">
                        {t("Balance: ")}
                        <strong
                          className={
                            creditBalance < 5
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {creditBalance}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Send Error Alert */}
                  {sendError && (
                    <div
                      role="alert"
                      className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="flex-1">
                        <p>{t(sendError)}</p>
                        {sendError.includes("Credits") && (
                          <Link
                            to="/credits"
                            className="mt-1 inline-block font-semibold underline"
                          >
                            {t("Top up credits in wallet")}
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attached File Preview Pill */}
                  {attachedFile && (
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs dark:border-white/10">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate font-medium text-foreground">
                          {attachedFile.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({(attachedFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachedFile}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Input controls */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      title={t("Attach document or photo")}
                      disabled={sending || uploadingAttachment}
                      className="h-10 w-10 shrink-0 rounded-xl border-border/80 text-muted-foreground hover:text-foreground dark:border-white/10"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        setSendError(null);
                      }}
                      disabled={sending}
                      maxLength={4000}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={t("Type a message...")}
                      className="flex-1 rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none dark:border-white/10"
                    />

                    <Button
                      variant="default"
                      aria-label={t("Send message")}
                      onClick={handleSend}
                      disabled={!messageText.trim() || sending || uploadingAttachment}
                      className="h-10 rounded-xl px-4 font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {sending || uploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : loading ? (
              <div className="flex flex-1 flex-col gap-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-muted/60 dark:bg-white/5"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {unavailable
                      ? t("This conversation could not be opened")
                      : t("Select a conversation to view messages")}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {unavailable
                      ? t(
                          "It may belong to another account, or it has been removed. Open your messages to pick up an existing thread.",
                        )
                      : t(
                          "Choose a thread on the left, or start one from a professional's profile.",
                        )}
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Link
                      to="/messages/"
                      className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted dark:border-white/10 transition-colors"
                    >
                      {t("Messages")}
                    </Link>
                    <Link
                      to="/pro-connect/"
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t("Browse professionals")}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
