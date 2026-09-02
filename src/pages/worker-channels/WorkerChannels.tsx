import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  MessageSquare,
  TrendingUp,
  Send,
  Users,
  MapPin,
  Shield,
  Trash2,
  Hash,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchChannels,
  fetchChannelBySlug,
  joinChannel,
  isMember,
  fetchMessages,
  sendMessage,
  deleteMessage,
  toggleReaction,
  subscribeToChannelMessages,
  fetchChannelCategories,
  fetchModerationConfig,
  isWorkerAccount,
  getUserVerificationTier,
  canAccessChannels,
  fetchChatUserProfile,
  type ChatUserProfile,
} from "@/lib/worker-channels";
import type {
  DbWorkerChannel,
  DbWorkerChannelCategory,
  DbWorkerChannelMessage,
  DbWorkerModerationConfig,
} from "@/types/worker-channels";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "📈", "🇳🇬", "💰"];

export default function WorkerChannels() {
  const { channelSlug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<DbWorkerChannel[]>([]);
  const [_categories, setCategories] = useState<DbWorkerChannelCategory[]>([]);
  const [activeChannel, setActiveChannel] = useState<DbWorkerChannel | null>(
    null,
  );
  const [messages, setMessages] = useState<DbWorkerChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [verificationTier, setVerificationTier] = useState(0);
  const [tierChecked, setTierChecked] = useState(false);
  const [modConfig, setModConfig] = useState<DbWorkerModerationConfig | null>(
    null,
  );
  const [viewingProfile, setViewingProfile] = useState<ChatUserProfile | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState("");
  const [showPriceUpdate, setShowPriceUpdate] = useState(false);
  const [priceForm, setPriceForm] = useState({
    item: "",
    amount: "",
    location: "",
    store: "",
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<ReturnType<
    typeof subscribeToChannelMessages
  > | null>(null);

  // Check if user has a worker account + verification tier
  useEffect(() => {
    if (!user) return;
    (async () => {
      const worker = await isWorkerAccount(user.id);
      setIsWorker(worker);
      const tier = await getUserVerificationTier(user.id);
      setVerificationTier(tier);
      setTierChecked(true);
    })();
  }, [user]);

  // Fetch user profile when viewing
  async function handleViewProfile(userId: string) {
    setProfileLoading(true);
    const profile = await fetchChatUserProfile(userId);
    setViewingProfile(profile);
    setProfileLoading(false);
  }

  function openReportModal(userId: string) {
    setReportingUserId(userId);
    setShowReportModal(true);
    setReportReason("");
    setReportDesc("");
    setReportResult("");
  }

  async function handleSubmitReport() {
    if (!user || !reportingUserId || !reportReason) return;
    setReportSubmitting(true);
    setReportResult("");
    const { error } = await supabase.from("worker_reports").insert({
      reporter_id: user.id,
      reported_user_id: reportingUserId,
      channel_id: activeChannel?.id ?? null,
      reason: reportReason,
      description: reportDesc.trim() || null,
    });
    setReportSubmitting(false);
    if (error) {
      setReportResult(getSafeError(error));
    } else {
      setReportResult("Report submitted. An admin will review it shortly.");
      setTimeout(() => {
        setShowReportModal(false);
        setViewingProfile(null);
      }, 2000);
    }
  }

  // Load categories
  useEffect(() => {
    fetchChannelCategories().then(setCategories);
  }, []);

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!user) return;
    const chs = await fetchChannels(user.id);
    setChannels(chs);
    setLoading(false);
    if (!channelSlug && chs.length > 0) {
      navigate(`/worker-channels/${chs[0].slug}`, { replace: true });
    }
  }, [user, channelSlug, navigate]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Load active channel + messages
  useEffect(() => {
    if (!channelSlug || !user) return;
    (async () => {
      const ch = await fetchChannelBySlug(channelSlug);
      if (!ch) {
        navigate("/worker-channels", { replace: true });
        return;
      }
      setActiveChannel(ch);

      const member = await isMember(ch.id, user.id);
      if (!member) {
        if (isWorker || profile?.account_type === "pro_worker") {
          await joinChannel(ch.id, user.id);
        }
      }

      const msgs = await fetchMessages(ch.id);
      setMessages(msgs);
      scrollToBottom();
    })();
  }, [channelSlug, user, isWorker, profile, navigate]);

  // Realtime subscription
  useEffect(() => {
    if (!activeChannel || !user) return;

    realtimeRef.current = subscribeToChannelMessages(
      activeChannel.id,
      (msg) => {
        if (msg.id === "__reaction_update__") {
          fetchMessages(activeChannel.id).then(setMessages);
          return;
        }
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      },
    );

    return () => {
      realtimeRef.current?.unsubscribe();
    };
  }, [activeChannel, user]);

  // Load moderation config
  useEffect(() => {
    fetchModerationConfig().then(setModConfig);
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function getAuthorName(msg: DbWorkerChannelMessage): string {
    if (msg.message_type === "system" || msg.message_type === "moderation")
      return "FRELUX";
    return msg.author_name ?? "Worker";
  }

  function getTierBadge(tier: number): { label: string; color: string } | null {
    if (tier === 3)
      return { label: "FRELUX Pro", color: "text-amber-500 bg-amber-500/10" };
    if (tier === 2)
      return { label: "Verified", color: "text-emerald-500 bg-emerald-500/10" };
    if (tier === 1)
      return {
        label: "Contact Verified",
        color: "text-blue-500 bg-blue-500/10",
      };
    return null;
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !activeChannel || !user || sending) return;
    setSending(true);
    const msg = await sendMessage({
      channelId: activeChannel.id,
      userId: user.id,
      content: newMessage.trim(),
      replyTo: replyingTo,
    });
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      try {
        await supabase.functions.invoke("moderate-worker-message", {
          body: {
            messageId: msg.id,
            content: msg.content,
            channelId: activeChannel.id,
            userId: user.id,
          },
        });
      } catch {
        // Moderation failure is silent
      }
    }
    setNewMessage("");
    setReplyingTo(null);
    setSending(false);
  }

  async function handleSendPriceUpdate() {
    if (!priceForm.item.trim() || !priceForm.amount || !activeChannel || !user)
      return;
    setSending(true);
    const content = `📊 PRICE UPDATE: ${priceForm.item} — ₦${Number(priceForm.amount).toLocaleString()}${priceForm.location ? ` in ${priceForm.location}` : ""}${priceForm.store ? ` (${priceForm.store})` : ""}`;
    const msg = await sendMessage({
      channelId: activeChannel.id,
      userId: user.id,
      content,
      messageType: "price_update",
      priceItem: priceForm.item.trim(),
      priceAmount: Number(priceForm.amount),
      priceCurrency: "NGN",
      priceLocation: priceForm.location.trim() || undefined,
      priceStore: priceForm.store.trim() || undefined,
    });
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      try {
        await supabase.functions.invoke("moderate-worker-message", {
          body: {
            messageId: msg.id,
            content: msg.content,
            channelId: activeChannel.id,
            userId: user.id,
          },
        });
      } catch {
        // Silent failure
      }
    }
    setPriceForm({ item: "", amount: "", location: "", store: "" });
    setShowPriceUpdate(false);
    setSending(false);
  }

  async function handleReaction(messageId: string, emoji: string) {
    if (!user) return;
    await toggleReaction(messageId, user.id, emoji);
    if (activeChannel) {
      const msgs = await fetchMessages(activeChannel.id);
      setMessages(msgs);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    await deleteMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // Not logged in
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-brand-purple" />
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Worker Channels
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          You need to sign in with a worker account to access the nationwide
          worker channels.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Not a worker account
  if (!loading && !isWorker && profile?.account_type !== "pro_worker") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Shield aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Worker Access Only
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          These channels are exclusive to FRELUX worker accounts. Register as a
          professional to join the conversation.
        </p>
        <Link
          to="/pro-connect/register"
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Become a Professional
        </Link>
      </div>
    );
  }

  // Worker but not verified (tier < 2)
  if (tierChecked && isWorker && !canAccessChannels(verificationTier)) {
    const tierLabels: Record<number, string> = {
      0: "Unverified",
      1: "Contact Verified",
    };
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Shield aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
          Verification Required
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          Worker Channels are available to <strong>FRELUX Verified</strong>{" "}
          (Tier 2) and <strong>FRELUX Pro</strong> (Tier 3) members only.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current tier:{" "}
          <span className="font-semibold text-amber-500">
            {tierLabels[verificationTier] ?? "Tier " + verificationTier}
          </span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
          Complete mobile number verification and NIN (National ID) verification
          to reach Tier 2 and unlock channel access.
        </p>
        <Link
          to="/pro-connect/register"
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Complete Verification
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Worker Channels"
        subtitle="Connect with fellow workers nationwide. Share price updates, market intel, and professional tips."
      />

      {modConfig?.is_enabled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-purple/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground dark:text-muted-foreground/80">
          <Shield aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          <span>
            AI moderation is active. Messages are automatically checked for
            spam, offensive content, and misinformation.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Channel List Sidebar */}
        <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border border-border/40 bg-white/60 p-3 dark:border-white/10 dark:bg-background-mid/40 lg:max-h-[calc(100vh-220px)]">
          <div className="mb-2 flex items-center gap-2 px-2">
            <Hash className="h-4 w-4 text-brand-purple" />
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
              Channels
            </span>
          </div>
          {channels.map((ch) => (
            <Button
              key={ch.id}
              onClick={() => navigate(`/worker-channels/${ch.slug}`)}
              className={classNames(
                "flex items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                channelSlug === ch.slug
                  ? "bg-primary/10 text-brand-purple font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5",
              )}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs">
                {ch.is_official ? "✓" : "#"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{ch.name.trim()}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" /> {ch.member_count ?? 0}
                  </span>
                  {ch.region && (
                    <span className="flex items-center gap-0.5">
                      <MapPin aria-hidden="true" className="h-3 w-3" /> {ch.region}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="flex flex-col rounded-xl border border-border/40 bg-white/60 dark:border-white/10 dark:bg-background-mid/40 lg:max-h-[calc(100vh-220px)]">
          {activeChannel ? (
            <>
              {/* Channel Header */}
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 dark:border-white/10">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
                    {activeChannel.name.trim()}
                  </h2>
                  {activeChannel.description && (
                    <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground">
                      {activeChannel.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{activeChannel.member_count ?? 0} members</span>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 space-y-3 overflow-y-auto p-4"
              >
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    <div>
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>
                        No messages yet. Be the first to start the conversation!
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    currentUserId={user.id}
                    authorName={getAuthorName(msg)}
                    onReact={handleReaction}
                    onDelete={handleDeleteMessage}
                    onReply={(id) => setReplyingTo(id)}
                    onProfileView={() =>
                      msg.user_id && handleViewProfile(msg.user_id)
                    }
                    replyTo={replyingTo}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply indicator */}
              {replyingTo && (
                <div className="flex items-center justify-between border-t border-border/40 bg-muted/50 px-4 py-2 dark:border-white/10 dark:bg-white/5">
                  <span className="text-xs text-muted-foreground">
                    Replying to a message
                  </span>
                  <Button
                    onClick={() => setReplyingTo(null)}
                    className="text-xs text-brand-purple"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Input area */}
              <div className="border-t border-border/40 p-3 dark:border-white/10">
                {showPriceUpdate ? (
                  <div className="space-y-3 rounded-lg border border-brand-purple/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-purple">
                      <TrendingUp className="h-4 w-4" />
                      Share Price Update
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Item (e.g. 20L Premium Paint)"
                        className="input-field"
                        value={priceForm.item}
                        onChange={(e) =>
                          setPriceForm({ ...priceForm, item: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Price (₦)"
                        className="input-field"
                        value={priceForm.amount}
                        onChange={(e) =>
                          setPriceForm({ ...priceForm, amount: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        placeholder="Location (e.g. Lagos Mainland)"
                        className="input-field"
                        value={priceForm.location}
                        onChange={(e) =>
                          setPriceForm({
                            ...priceForm,
                            location: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        placeholder="Store/Market (optional)"
                        className="input-field"
                        value={priceForm.store}
                        onChange={(e) =>
                          setPriceForm({ ...priceForm, store: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowPriceUpdate(false)}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted dark:hover:bg-white/5"
                      >
                        Cancel
                      </Button>
                      <Button variant="default"
                        onClick={handleSendPriceUpdate}
                        disabled={
                          sending || !priceForm.item.trim() || !priceForm.amount
                        }
                        className="rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                      >
                        Share Price
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowPriceUpdate(true)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-brand-purple transition-colors hover:bg-primary/5 dark:border-white/10"
                      title="Share price update"
                    >
                      <TrendingUp className="h-5 w-5" />
                    </Button>
                    <input
                      type="text"
                      placeholder={`Message ${activeChannel.name.trim()}...`}
                      className="input-field flex-1"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                    />
                    <Button size="icon" variant="default"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all hover:/90 disabled:opacity-50"
                    >
                      <Send aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center text-center">
              <div>
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/80 dark:text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a channel to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {profileLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setProfileLoading(false)}
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
        </div>
      )}
      {viewingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewingProfile(null)}
        >
          <div
            className="max-w-md rounded-2xl bg-card p-6 shadow-2xl dark:bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {viewingProfile.profile_image_url ? (
                  <img
                    src={viewingProfile.profile_image_url}
                    alt={viewingProfile.display_name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-brand-purple">
                    {viewingProfile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
                    {viewingProfile.display_name}
                  </h3>
                  {viewingProfile.business_name && (
                    <p className="text-sm text-muted-foreground">
                      {viewingProfile.business_name}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setViewingProfile(null)}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(() => {
                const badge = getTierBadge(viewingProfile.verification_tier);
                if (badge)
                  return (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  );
                return null;
              })()}
              {viewingProfile.category_name && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-brand-purple">
                  {viewingProfile.category_name}
                </span>
              )}
            </div>

            {viewingProfile.bio && (
              <p className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground/80">
                {viewingProfile.bio}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {viewingProfile.years_experience != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-semibold text-foreground dark:text-primary-foreground">
                    {viewingProfile.years_experience} years
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Phone Verified</p>
                <p className="font-semibold {viewingProfile.phone_verified ? 'text-emerald-500' : 'text-muted-foreground'}">
                  {viewingProfile.phone_verified ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NIN Verified</p>
                <p
                  className={`font-semibold ${viewingProfile.nin_verified ? "text-emerald-500" : "text-muted-foreground"}`}
                >
                  {viewingProfile.nin_verified ? "✓ Yes" : "✗ No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mobile OTP</p>
                <p
                  className={`font-semibold ${viewingProfile.mobile_otp_verified ? "text-emerald-500" : "text-muted-foreground"}`}
                >
                  {viewingProfile.mobile_otp_verified ? "✓ Yes" : "✗ No"}
                </p>
              </div>
            </div>

            <Link
              to={`/pro-connect/${viewingProfile.slug}`}
              onClick={() => setViewingProfile(null)}
              className="mt-5 block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              View Full Profile
            </Link>
            {viewingProfile.id && (
              <Button
                onClick={() =>
                  viewingProfile && openReportModal(viewingProfile.id)
                }
                className="mt-2 w-full rounded-lg border border-red-200 py-2 text-center text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
              >
                Report This User
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Report User Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="max-w-md rounded-2xl bg-card p-6 shadow-2xl dark:bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
              Report User
            </h3>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              Report inappropriate behavior. The user's NIN and verification
              data will be referenced during admin review.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                  Reason *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="scam">Scam / Fraud</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="offensive">Offensive Content</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                  Description (optional)
                </label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Provide additional details..."
                  rows={3}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background"
                />
              </div>

              {reportResult && (
                <p
                  className={`text-sm ${reportResult.startsWith("Error") ? "text-red-500" : "text-emerald-500"}`}
                >
                  {reportResult}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting || !reportReason}
                  className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// Message Bubble Component
// =========================================================
function MessageBubble({
  message,
  currentUserId,
  authorName,
  onReact,
  onDelete,
  onReply,
  onProfileView,
  replyTo,
}: {
  message: DbWorkerChannelMessage;
  currentUserId: string;
  authorName: string;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (messageId: string) => void;
  onProfileView: () => void;
  replyTo: string | null;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const isOwn = message.user_id === currentUserId;
  const isSystem =
    message.message_type === "system" || message.message_type === "moderation";
  const isPriceUpdate = message.message_type === "price_update";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 px-4 py-1.5 text-xs text-brand-purple">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        "group relative flex gap-2",
        isOwn && "flex-row-reverse",
      )}
    >
      <div
        className={classNames(
          "max-w-[75%] rounded-2xl px-3.5 py-2.5",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted dark:bg-white/5 dark:text-muted-foreground/40",
        )}
      >
        {!isOwn && (
          <Button
            onClick={onProfileView}
            className="mb-0.5 text-xs font-semibold text-brand-purple hover:underline"
          >
            {authorName}
          </Button>
        )}

        {message.reply_to && replyTo !== message.reply_to && (
          <div
            className={classNames(
              "mb-1 rounded-md px-2 py-1 text-xs opacity-60",
              isOwn ? "bg-white/10" : "bg-muted dark:bg-white/5",
            )}
          >
            Replying to a message
          </div>
        )}

        {isPriceUpdate && message.price_item && (
          <div
            className={classNames(
              "mb-2 rounded-lg p-2.5",
              isOwn ? "bg-white/10" : "bg-primary/5",
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>PRICE UPDATE</span>
            </div>
            <div className="mt-1 text-sm font-bold">{message.price_item}</div>
            {message.price_amount != null && (
              <div className="text-lg font-bold">
                ₦{Number(message.price_amount).toLocaleString()}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs opacity-80">
              {message.price_location && (
                <span>📍 {message.price_location}</span>
              )}
              {message.price_store && <span>🏪 {message.price_store}</span>}
            </div>
          </div>
        )}

        <div className="text-sm">{message.content}</div>

        <div
          className={classNames(
            "mt-1 text-[10px]",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {new Date(message.created_at).toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          onClick={() => setShowReactions(!showReactions)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground dark:hover:bg-white/5"
          title="React"
        >
          <span className="text-xs">😊</span>
        </Button>
        <Button
          onClick={() => onReply(message.id)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground dark:hover:bg-white/5"
          title="Reply"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
        {isOwn && (
          <Button
            onClick={() => onDelete(message.id)}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="absolute z-10 flex gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg dark:border-white/10 dark:bg-card">
          {QUICK_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactions(false);
              }}
              className="rounded p-1 text-lg hover:bg-muted dark:hover:bg-white/5"
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Existing reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 self-end">
          {Object.entries(
            message.reactions.reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([emoji, count]) => (
            <Button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs dark:bg-white/5"
            >
              {emoji} <span className="text-muted-foreground">{count}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
