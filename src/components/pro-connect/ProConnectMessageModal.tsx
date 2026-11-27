import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { getCreditWallet } from "@/lib/credits";
import { getOrCreateConversation, sendMessage } from "@/lib/pro-connect";
import { supabase } from "@/lib/supabase";
import type { DbProProfile } from "@/types/pro-connect";

interface ProConnectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DbProProfile | null;
  defaultService?: string;
  defaultProjectRef?: string;
  onMessageSent?: (conversationId: string) => void;
}

const INQUIRY_PRESETS = [
  {
    id: "quote",
    label: "Quotation Request",
    template: (name: string, biz?: string | null) =>
      `Hello ${name}${biz ? ` (${biz})` : ""}, I am requesting a detailed quotation for an upcoming construction project. Please let me know your availability to discuss scope and specifications.`,
  },
  {
    id: "availability",
    label: "Check Availability",
    template: (name: string) =>
      `Hi ${name}, I saw your verified profile on FRELUX Pro Connect and would like to confirm your earliest availability for project work.`,
  },
  {
    id: "inspection",
    label: "Site Inspection",
    template: (name: string) =>
      `Hello ${name}, we need a qualified professional to conduct an on-site inspection and assessment. Could we arrange a suitable date and time?`,
  },
  {
    id: "consultation",
    label: "Technical Consultation",
    template: (name: string) =>
      `Hi ${name}, I am looking for expert advice on material selection, compliance, and engineering approaches for my building project.`,
  },
];

export default function ProConnectMessageModal({
  isOpen,
  onClose,
  profile,
  defaultService,
  defaultProjectRef,
  onMessageSent,
}: ProConnectMessageModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messageText, setMessageText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [createdConvoId, setCreatedConvoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const isOwner = Boolean(user && profile && user.id === profile.user_id);
  const displayName = profile?.display_name || profile?.business_name || t("Professional");

  useEffect(() => {
    if (isOpen && user) {
      getCreditWallet(user.id).then((wallet) => {
        if (wallet) setCreditBalance(wallet.balance);
      });
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      setMessageText("");
      setSelectedPreset(null);
      setSending(false);
      setSendSuccess(false);
      setCreatedConvoId(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  function handleSelectPreset(preset: typeof INQUIRY_PRESETS[0]) {
    setSelectedPreset(preset.id);
    if (!messageText.trim() || INQUIRY_PRESETS.some((p) => p.template(displayName, profile?.business_name) === messageText.trim())) {
      setMessageText(preset.template(displayName, profile?.business_name));
    }
    setErrorMessage(null);
  }

  async function handleSend() {
    if (!profile) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/pro-connect/${profile.slug}`)}`);
      return;
    }
    if (isOwner) {
      setErrorMessage(t("You cannot message your own professional profile."));
      return;
    }
    const body = messageText.trim();
    if (!body) {
      setErrorMessage(t("Please type a message before sending."));
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const convo = await getOrCreateConversation(
        profile.id,
        defaultProjectRef,
        {
          service: defaultService || selectedPreset || "general_inquiry",
          inquiry_type: selectedPreset || "custom",
          source: "pro_profile_modal",
        },
      );

      if (!convo || !convo.id) {
        setErrorMessage(
          t("We could not initialize the secure conversation. Please check your network and try again."),
        );
        setSending(false);
        return;
      }

      const sendResult = await sendMessage(convo.id, body);

      if (sendResult && typeof sendResult === "object" && "id" in sendResult) {
        setCreatedConvoId(convo.id);
        setSendSuccess(true);
        if (onMessageSent) onMessageSent(convo.id);

        // Best-effort email notification
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          supabase.functions.invoke("send-email", {
            body: { type: "pro_inquiry", conversation_id: convo.id },
            headers: sessionData.session
              ? { Authorization: `Bearer ${sessionData.session.access_token}` }
              : undefined,
          });
        } catch {
          /* optional notification */
        }
      } else {
        const errorDesc =
          sendResult && typeof sendResult === "object" && "error" in sendResult
            ? sendResult.error
            : t("Message delivery failed. Please try again.");
        setErrorMessage(errorDesc);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("An unexpected error occurred. Please try again.");
      setErrorMessage(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl dark:border-white/10 dark:bg-card">
        {!user ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-7 w-7" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("Sign in to message this professional")}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Connect directly with verified professionals on FRELUX Pro Connect. Your messages and agreements are tracked securely.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="default"
                onClick={() =>
                  navigate(`/login?redirect=${encodeURIComponent(`/pro-connect/${profile?.slug || ""}`)}`)
                }
                className="w-full font-semibold"
              >
                {t("Sign In or Register")}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full">
                {t("Cancel")}
              </Button>
            </div>
          </div>
        ) : isOwner ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {t("This is your profile")}
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("You are viewing your own professional profile. To test customer messaging, use a different account.")}
            </p>
            <Button variant="outline" onClick={onClose} className="mt-6 w-full">
              {t("Close")}
            </Button>
          </div>
        ) : sendSuccess ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {t("Message Delivered!")}
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Your message was sent to")} <strong className="text-foreground">{displayName}</strong>.
              {" "}{t("They have been notified and can respond directly to your thread.")}
            </p>

            <div className="mt-6 rounded-xl border border-border/60 bg-muted/30 p-4 text-left dark:border-white/5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("Message Preview")}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-foreground/90 italic">
                "{messageText.trim()}"
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              {createdConvoId && (
                <Button
                  variant="default"
                  onClick={() => {
                    onClose();
                    navigate(`/messages/${createdConvoId}`);
                  }}
                  className="flex-1 gap-2 font-semibold"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t("Open Chat Thread")}
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="flex-1">
                {t("Done")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-3">
                {profile?.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={displayName}
                    className="h-12 w-12 rounded-full border border-border object-cover shadow-sm dark:border-white/10"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <DialogTitle className="truncate text-lg font-bold text-foreground">
                      {displayName}
                    </DialogTitle>
                    {profile?.verification_status === "verified" && (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] px-1.5 py-0">
                        <ShieldCheck className="h-3 w-3" />
                        {t("Verified")}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="truncate text-xs text-muted-foreground">
                    {profile?.business_name ? `${profile.business_name} • ` : ""}
                    {profile?.service_area_text || profile?.country || t("Professional Specialist")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Quick Topic Chips */}
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("Quick inquiry topic:")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INQUIRY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      selectedPreset === preset.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border/80 bg-background text-foreground/80 hover:bg-muted dark:border-white/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label htmlFor="pro-message-input" className="font-medium text-foreground">
                  {t("Your Message")}
                </label>
                <span>{messageText.length}/4000</span>
              </div>
              <Textarea
                id="pro-message-input"
                rows={4}
                maxLength={4000}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={sending}
                placeholder={t("Provide project details, location, timeline, and questions...")}
                className="resize-none rounded-xl border border-border bg-background p-3 text-sm focus-visible:ring-primary dark:border-white/10"
              />
            </div>

            {/* Credit Notice & Wallet */}
            <div className="mt-3.5 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("Sending costs 5 FRELUX Credits")}</span>
              </div>
              {creditBalance !== null && (
                <span className="font-medium text-foreground">
                  {t("Balance: ")}
                  <strong className={creditBalance < 5 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                    {creditBalance}
                  </strong>
                </span>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                  {errorMessage.includes("Credits") && (
                    <Link to="/credits" className="mt-1 inline-flex items-center gap-1 font-semibold underline">
                      {t("Top up credits in wallet")} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={sending}
                className="text-xs text-muted-foreground"
              >
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="gap-2 font-semibold px-5 shadow-sm"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Sending...")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t("Send Message")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
