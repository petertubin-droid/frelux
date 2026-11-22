import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  TrendingUp,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Download,
  Users,
  Timer,
  Play,
  XCircle,
  ExternalLink,
} from "lucide-react";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminInput,
  AdminSelect,
  StateMessage,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import {
  fetchCampaigns,
  fetchSubscriberStats,
  fetchSubscribers,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendTestEmail,
  sendCampaignNow,
  fetchDynamicPreviewData,
  type NewsletterCampaign,
  type NewsletterSubscriber,
  type SubscriberStats,
  type CampaignType,
  type CampaignStatus,
  type CreateCampaignInput,
  type DynamicPreviewData,
} from "@/lib/broadcasts/broadcast-client";

// Format helper for countdown timer
function formatCountdown(targetDate: string): {
  label: string;
  isPast: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return {
      label: "Due now",
      isPast: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return {
    label: parts.join(" "),
    isPast: false,
    days,
    hours,
    minutes,
    seconds,
  };
}

export default function AdminBroadcasts() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [stats, setStats] = useState<SubscriberStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
  });
  const [dynamicData, setDynamicData] = useState<DynamicPreviewData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "subscribers" | "templates"
  >("campaigns");

  // Timer tick for real-time countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create");
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    null,
  );

  // Form Fields
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>(
    "weekly_price_update",
  );
  const [contentText, setContentText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [includePriceSnapshot, setIncludePriceSnapshot] = useState(false);
  const [includeRecentUpdates, setIncludeRecentUpdates] = useState(false);

  // Timing
  const [dispatchTiming, setDispatchTiming] = useState<
    "immediate" | "scheduled"
  >("immediate");
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  // Test Email
  const [testEmailAddress, setTestEmailAddress] = useState(
    user?.email || "freluxtools@gmail.com",
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Preview / Detail Modal
  const [previewCampaign, setPreviewCampaign] =
    useState<NewsletterCampaign | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cList, sStats, dynData] = await Promise.all([
        fetchCampaigns(),
        fetchSubscriberStats(),
        fetchDynamicPreviewData().catch(() => null),
      ]);
      setCampaigns(cList);
      setStats(sStats);
      if (dynData) setDynamicData(dynData);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to load broadcast data",
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Subscribers when tab switched
  useEffect(() => {
    if (activeTab === "subscribers") {
      setSubscribersLoading(true);
      fetchSubscribers(0, 100, undefined, subscriberSearch)
        .then(({ subscribers }) => setSubscribers(subscribers))
        .catch((e) => showError(e.message))
        .finally(() => setSubscribersLoading(false));
    }
  }, [activeTab, subscriberSearch, showError]);

  // Scheduled Campaigns list
  const scheduledCampaigns = useMemo(() => {
    return campaigns.filter((c) => c.status === "scheduled" && c.scheduled_for);
  }, [campaigns]);

  // Open Composer with Template Pre-fill
  const openComposerWithTemplate = (type: CampaignType) => {
    setComposerMode("create");
    setEditingCampaignId(null);
    setCampaignType(type);

    if (type === "weekly_price_update") {
      setTitle("Weekly Material Price Update");
      setSubject("Weekly Construction Material Prices & Market Digest");
      setPreviewText(
        "Check the latest wholesale material price movements across major markets.",
      );
      setContentText(
        "Here is your weekly summary of key construction material prices, inflation trends, and wholesale updates.\n\nPrices continue to adjust across cement, steel, and finishing products. Review the latest figures below before placing supplier purchase orders.",
      );
      setIncludePriceSnapshot(true);
      setIncludeRecentUpdates(false);
      setCtaLabel("View Live Price Index");
      setCtaUrl("https://freluxtools.com/price-index");
    } else if (type === "new_feature") {
      setTitle("New Tools & Calculator Launch");
      setSubject("New in Frelux: Expanded Estimator Engines & Tools");
      setPreviewText(
        "We've launched new calculation engines to help you estimate faster and more accurately.",
      );
      setContentText(
        "We are excited to announce new additions to the Frelux suite of estimation tools.\n\nOur latest release includes enhanced multi-market support, refined quantity estimation algorithms, and streamlined reporting.\n\nTry out the new calculators today to keep your projects on budget.",
      );
      setIncludePriceSnapshot(false);
      setIncludeRecentUpdates(true);
      setCtaLabel("Explore New Calculators");
      setCtaUrl("https://freluxtools.com/calculators");
    } else if (type === "improvement") {
      setTitle("Engine Performance & Accuracy Improvements");
      setSubject(
        "Platform Improvements: Faster Calculations & Regional Calibration",
      );
      setPreviewText(
        "Summary of recent engine optimizations and accuracy improvements.",
      );
      setContentText(
        "Our engineering team has rolled out significant performance upgrades across all 23 estimation engines.\n\nKey highlights include:\n- Faster calculation speeds and reduced page load times\n- Refined material coverage formulas\n- Localized regional baseline price adjustments\n\nAll tools are automatically updated and ready for your next project.",
      );
      setIncludePriceSnapshot(true);
      setIncludeRecentUpdates(true);
      setCtaLabel("Open Estimator Studio");
      setCtaUrl("https://freluxtools.com");
    } else {
      setTitle("General Community Announcement");
      setSubject("Important Update from Frelux Construction Intelligence");
      setPreviewText(
        "An update regarding our tools and construction intelligence platform.",
      );
      setContentText(
        "Greetings from the Frelux team.\n\nWe wanted to share an important platform update with our community.",
      );
      setIncludePriceSnapshot(false);
      setIncludeRecentUpdates(false);
      setCtaLabel("Visit Frelux");
      setCtaUrl("https://freluxtools.com");
    }

    setDispatchTiming("immediate");
    setScheduledDateTime("");
    setIsComposerOpen(true);
  };

  // Open Composer for existing campaign
  const handleEditCampaign = (c: NewsletterCampaign) => {
    setComposerMode("edit");
    setEditingCampaignId(c.id);
    setTitle(c.title);
    setSubject(c.subject);
    setPreviewText(c.preview_text || "");
    setCampaignType(c.campaign_type);
    setContentText(c.content_text);
    setCtaLabel(c.cta_label || "");
    setCtaUrl(c.cta_url || "");
    setIncludePriceSnapshot(c.include_price_snapshot);
    setIncludeRecentUpdates(c.include_recent_updates);

    if (c.status === "scheduled" && c.scheduled_for) {
      setDispatchTiming("scheduled");
      // Format as local YYYY-MM-DDTHH:mm
      const d = new Date(c.scheduled_for);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledDateTime(localIso);
    } else {
      setDispatchTiming("immediate");
      setScheduledDateTime("");
    }

    setIsComposerOpen(true);
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testEmailAddress.trim() || !testEmailAddress.includes("@")) {
      showError("Please provide a valid test recipient email address.");
      return;
    }

    try {
      setIsSendingTest(true);
      await sendTestEmail({
        test_email: testEmailAddress.trim(),
        title: title || subject || "Frelux Update",
        subject: subject || "Test Broadcast",
        preview_text: previewText,
        campaign_type: campaignType,
        content_text: contentText,
        cta_label: ctaLabel || undefined,
        cta_url: ctaUrl || undefined,
        include_price_snapshot: includePriceSnapshot,
        include_recent_updates: includeRecentUpdates,
      });
      showSuccess(
        `Test preview sent to ${testEmailAddress.trim()}! Check your inbox.`,
      );
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to send test email",
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save / Dispatch Campaign
  const handleSaveCampaign = async () => {
    if (!title.trim() || !subject.trim() || !contentText.trim()) {
      showError("Please fill in the title, subject line, and message content.");
      return;
    }

    if (dispatchTiming === "scheduled") {
      if (!scheduledDateTime) {
        showError(
          "Please choose a target date and time for the scheduled broadcast.",
        );
        return;
      }
      const targetTime = new Date(scheduledDateTime).getTime();
      if (targetTime <= Date.now() + 60000) {
        showError("Scheduled time must be at least 1 minute in the future.");
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload: CreateCampaignInput = {
        title: title.trim(),
        subject: subject.trim(),
        preview_text: previewText.trim() || undefined,
        campaign_type: campaignType,
        content_text: contentText.trim(),
        cta_label: ctaLabel.trim() || undefined,
        cta_url: ctaUrl.trim() || undefined,
        include_price_snapshot: includePriceSnapshot,
        include_recent_updates: includeRecentUpdates,
        scheduled_for:
          dispatchTiming === "scheduled" && scheduledDateTime
            ? new Date(scheduledDateTime).toISOString()
            : null,
      };

      let saved: NewsletterCampaign;
      if (composerMode === "edit" && editingCampaignId) {
        saved = await updateCampaign(editingCampaignId, {
          ...payload,
          status: dispatchTiming === "scheduled" ? "scheduled" : "draft",
        });
        showSuccess("Campaign updated successfully.");
      } else {
        saved = await createCampaign(payload);
        showSuccess(
          dispatchTiming === "scheduled"
            ? "Broadcast scheduled successfully with automated timer!"
            : "Broadcast draft created.",
        );
      }

      // If immediate dispatch chosen, execute now!
      if (dispatchTiming === "immediate") {
        const confirmSend = window.confirm(
          `Are you sure you want to broadcast "${subject}" to all ${stats.active} active subscribers now?`,
        );
        if (confirmSend) {
          const res = await sendCampaignNow(saved.id);
          showSuccess(`Broadcast sent to ${res.successful} subscribers!`);
        }
      }

      setIsComposerOpen(false);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate send from history table
  const handleSendNow = async (campaign: NewsletterCampaign) => {
    const confirmSend = window.confirm(
      `Send "${campaign.subject}" immediately to all ${stats.active} active subscribers?`,
    );
    if (!confirmSend) return;

    try {
      const res = await sendCampaignNow(campaign.id);
      showSuccess(
        `Broadcast dispatched! Delivered to ${res.successful} subscribers.`,
      );
      await loadData();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to dispatch broadcast",
      );
    }
  };

  // Cancel scheduled campaign
  const handleCancelScheduled = async (campaign: NewsletterCampaign) => {
    try {
      await updateCampaign(campaign.id, {
        status: "cancelled",
        scheduled_for: null,
      });
      showSuccess("Scheduled broadcast has been cancelled.");
      await loadData();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to cancel schedule",
      );
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this broadcast?"))
      return;
    try {
      await deleteCampaign(id);
      showSuccess("Broadcast deleted.");
      await loadData();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete campaign",
      );
    }
  };

  // Export Subscribers to CSV
  const handleExportSubscribers = () => {
    if (subscribers.length === 0) {
      showError("No subscribers to export.");
      return;
    }
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Email,Status,Source,Joined At"]
        .concat(
          subscribers.map(
            (s) =>
              `"${s.email}","${s.status}","${s.source || "organic"}","${new Date(s.created_at).toISOString()}"`,
          ),
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `frelux_subscribers_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Exported subscribers to CSV.");
  };

  const statusBadgeVariant = (st: CampaignStatus) => {
    switch (st) {
      case "sent":
        return "success";
      case "scheduled":
        return "warning";
      case "sending":
        return "info";
      case "failed":
        return "danger";
      case "cancelled":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Subscriber Broadcasts & Scheduling"
        subtitle="Compose, schedule, and broadcast email updates to active subscribers for weekly price changes, new features, and platform improvements."
        action={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={loadData}
              icon={RefreshCw}
              loading={loading}
            >
              Refresh
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => openComposerWithTemplate("weekly_price_update")}
              icon={Send}
            >
              New Broadcast
            </AdminButton>
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard compact>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Active Subscribers
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {stats.active.toLocaleString()}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  / {stats.total.toLocaleString()} total
                </span>
              </h3>
            </div>
          </div>
        </AdminCard>

        <AdminCard compact>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Scheduled Queue
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {scheduledCampaigns.length}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  active timers
                </span>
              </h3>
            </div>
          </div>
        </AdminCard>

        <AdminCard compact>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Broadcasts Delivered
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {campaigns.filter((c) => c.status === "sent").length}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  campaigns
                </span>
              </h3>
            </div>
          </div>
        </AdminCard>

        <AdminCard compact>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Tracked Prices
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {dynamicData?.material_prices.length || 0}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ready to attach
                </span>
              </h3>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* ACTIVE SCHEDULED BROADCASTS WITH REAL-TIME COUNTDOWN TIMER */}
      {scheduledCampaigns.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-pulse text-amber-500" />
              <h2 className="text-base font-semibold text-foreground">
                Scheduled Broadcasts ({scheduledCampaigns.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Automated pg_cron runner checks every 5 minutes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {scheduledCampaigns.map((sc) => {
              const countdown = formatCountdown(sc.scheduled_for!);
              return (
                <div
                  key={sc.id}
                  className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-amber-500/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {sc.campaign_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                        <Timer className="h-4 w-4" />
                        {countdown.label}
                      </div>
                    </div>

                    <h3 className="mt-2 font-semibold text-foreground line-clamp-1">
                      {sc.subject}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {sc.preview_text || sc.content_text}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Fires at:{" "}
                        {new Date(sc.scheduled_for!).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => handleCancelScheduled(sc)}
                      className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Cancel Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditCampaign(sc)}
                      className="rounded px-2.5 py-1 text-xs font-medium text-brand-purple hover:bg-brand-purple/10"
                    >
                      Edit
                    </button>
                    <AdminButton
                      variant="primary"
                      onClick={() => handleSendNow(sc)}
                      icon={Play}
                      className="text-xs"
                    >
                      Send Now
                    </AdminButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "campaigns"
              ? "border-brand-purple text-brand-purple"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Broadcast History ({campaigns.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "templates"
              ? "border-brand-purple text-brand-purple"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Campaign Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subscribers")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "subscribers"
              ? "border-brand-purple text-brand-purple"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Subscribers Directory ({stats.total})
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS HISTORY */}
      {activeTab === "campaigns" && (
        <AdminCard>
          {loading ? (
            <StateMessage
              type="loading"
              title="Loading campaigns"
              message="Fetching email history..."
            />
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                No Broadcasts Yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create and schedule your first email update to notify
                subscribers of material prices, new features, or platform
                improvements.
              </p>
              <div className="mt-5">
                <AdminButton
                  variant="primary"
                  onClick={() =>
                    openComposerWithTemplate("weekly_price_update")
                  }
                  icon={Send}
                >
                  Create Weekly Price Update
                </AdminButton>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Campaign Subject</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Timing / Sent</th>
                    <th className="px-3 py-3 text-right">Recipients</th>
                    <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="py-3 pl-4 pr-3 font-medium text-foreground">
                        <div>{c.subject}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {c.title}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        <span className="capitalize">
                          {c.campaign_type.replace(/_/g, " ")}
                        </span>
                        {c.include_price_snapshot && (
                          <span className="ml-1 text-[10px] text-brand-purple">
                            [+Prices]
                          </span>
                        )}
                        {c.include_recent_updates && (
                          <span className="ml-1 text-[10px] text-blue-500">
                            [+Features]
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {c.status === "scheduled" && c.scheduled_for ? (
                          <div className="font-mono text-amber-600 dark:text-amber-400">
                            {formatCountdown(c.scheduled_for).label}
                          </div>
                        ) : c.sent_at ? (
                          new Date(c.sent_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          "Draft"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {c.status === "sent" ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {c.successful_sends} / {c.total_recipients}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewCampaign(c);
                              setIsPreviewModalOpen(true);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Preview Email"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {c.status !== "sent" && (
                            <button
                              type="button"
                              onClick={() => handleEditCampaign(c)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit Campaign"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          {c.status !== "sent" && (
                            <button
                              type="button"
                              onClick={() => handleSendNow(c)}
                              className="rounded p-1 text-brand-purple hover:bg-brand-purple/10"
                              title="Send Immediately"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(c.id)}
                            className="rounded p-1 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                            title="Delete Campaign"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}

      {/* TAB 2: TEMPLATES & QUICK STARTERS */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Weekly Price Updates
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Automatically embeds live prices for cement, sand, gravel,
                blocks, and steel with market trend summaries.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>• Live material price table snapshot</li>
                <li>• Week-over-week trend insights</li>
                <li>• Direct link to price index calculator</li>
              </ul>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <AdminButton
                variant="primary"
                onClick={() => openComposerWithTemplate("weekly_price_update")}
                className="w-full text-xs"
              >
                Use Weekly Price Template
              </AdminButton>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                New Features & Tools
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Announce new calculator engines, mobile tools, or professional
                directory features to re-engage users.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>• Feature showcase highlights</li>
                <li>• Embedded changelog summary</li>
                <li>• Direct CTA to try the new tools</li>
              </ul>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <AdminButton
                variant="primary"
                onClick={() => openComposerWithTemplate("new_feature")}
                className="w-full text-xs"
              >
                Use Feature Launch Template
              </AdminButton>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Platform Improvements
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Inform subscribers of calculation speed boosts, regional
                precision tuning, and mobile usability fixes.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>• Bug fix and calculation accuracy recap</li>
                <li>• Updated regional formulas</li>
                <li>• Call for user feedback</li>
              </ul>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <AdminButton
                variant="primary"
                onClick={() => openComposerWithTemplate("improvement")}
                className="w-full text-xs"
              >
                Use Improvements Template
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIBERS DIRECTORY */}
      {activeTab === "subscribers" && (
        <AdminCard>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                aria-label="Search subscriber email"
                placeholder="Search subscriber email..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:border-brand-purple focus:outline-none"
              />
            </div>
            <AdminButton
              variant="secondary"
              onClick={handleExportSubscribers}
              icon={Download}
            >
              Export CSV
            </AdminButton>
          </div>

          {subscribersLoading ? (
            <StateMessage
              type="loading"
              title="Loading subscribers"
              message="Querying subscriber records..."
            />
          ) : subscribers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No subscribers found matching your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Subscriber Email</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="py-3 pl-3 pr-4 text-right">
                      Subscribed Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="py-3 pl-4 pr-3 font-medium text-foreground">
                        {s.email}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {s.source || "Site Footer"}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}

      {/* COMPOSER & SCHEDULER MODAL */}
      <AdminModal
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title={
          composerMode === "create" ? "Compose New Broadcast" : "Edit Broadcast"
        }
        description="Craft an email campaign for your subscribers with real-time test preview and automated scheduling timer."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          {/* Basics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="broadcast-campaign-title"
                className="text-xs font-medium text-foreground"
              >
                Internal Campaign Title
              </label>
              <AdminInput
                id="broadcast-campaign-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Nov 2026 Price Surge Digest"
              />
            </div>
            <div>
              <label
                htmlFor="broadcast-campaign-category"
                className="text-xs font-medium text-foreground"
              >
                Campaign Category
              </label>
              <AdminSelect
                id="broadcast-campaign-category"
                value={campaignType}
                onChange={(e) =>
                  setCampaignType(e.target.value as CampaignType)
                }
              >
                <option value="weekly_price_update">Weekly Price Update</option>
                <option value="new_feature">New Features & Tools</option>
                <option value="improvement">Platform Improvements</option>
                <option value="general_announcement">
                  General Announcement
                </option>
                <option value="custom">Custom Broadcast</option>
              </AdminSelect>
            </div>
          </div>

          <div>
            <label htmlFor="broadcast-subject" className="text-xs font-medium text-foreground">
              Email Subject Line
            </label>
            <AdminInput
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekly Material Prices: Cement & Steel Price Shifts"
            />
          </div>

          <div>
            <label htmlFor="broadcast-preview" className="text-xs font-medium text-foreground">
              Inbox Preview Text (Preheader)
            </label>
            <AdminInput
              id="broadcast-preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short teaser shown in inbox before opening"
            />
          </div>

          <div>
            <label htmlFor="broadcast-body" className="text-xs font-medium text-foreground">
              Message Body
            </label>
            <textarea
              id="broadcast-body"
              rows={6}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Write your email body here. Double line breaks create separate paragraphs."
              className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground focus:border-brand-purple focus:outline-none"
            />
          </div>

          {/* Dynamic Content Inclusion */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Dynamic Content Attachments
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePriceSnapshot}
                  onChange={(e) => setIncludePriceSnapshot(e.target.checked)}
                  className="rounded border-border text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-xs text-foreground font-medium">
                  Attach Current Material Prices Snapshot
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (Pulls active wholesale rates for Dangote Cement, Putty,
                  Sandpaper, Blocks)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRecentUpdates}
                  onChange={(e) => setIncludeRecentUpdates(e.target.checked)}
                  className="rounded border-border text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-xs text-foreground font-medium">
                  Attach Recent Product Updates & Changelog
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (Pulls latest shipped features and improvements)
                </span>
              </label>
            </div>
          </div>

          {/* CTA Link */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="broadcast-cta-label" className="text-xs font-medium text-foreground">
                Call to Action Button Label
              </label>
              <AdminInput
                id="broadcast-cta-label"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="e.g. Check Live Price Index"
              />
            </div>
            <div>
              <label htmlFor="broadcast-cta-url" className="text-xs font-medium text-foreground">
                Call to Action URL
              </label>
              <AdminInput
                id="broadcast-cta-url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://freluxtools.com/..."
              />
            </div>
          </div>

          {/* Timing / Scheduling with Timer */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-purple" />
              Dispatch Timing & Scheduling Timer
            </h4>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="timing"
                  value="immediate"
                  checked={dispatchTiming === "immediate"}
                  onChange={() => setDispatchTiming("immediate")}
                  className="text-brand-purple focus:ring-brand-purple"
                />
                Send Immediately
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="timing"
                  value="scheduled"
                  checked={dispatchTiming === "scheduled"}
                  onChange={() => setDispatchTiming("scheduled")}
                  className="text-brand-purple focus:ring-brand-purple"
                />
                Schedule with Timer
              </label>
            </div>

            {dispatchTiming === "scheduled" && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="datetime-local"
                    aria-label="Scheduled send date and time"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-purple focus:outline-none"
                  />
                  {scheduledDateTime && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Timer className="h-4 w-4" />
                      <span>
                        Countdown: {formatCountdown(scheduledDateTime).label}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The automated background dispatcher will fire this broadcast
                  once the countdown reaches zero.
                </p>
              </div>
            )}
          </div>

          {/* Test Send Section */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label
                htmlFor="broadcast-test-email"
                className="text-xs font-medium text-foreground"
              >
                Send Test Preview to Admin
              </label>
              <input
                id="broadcast-test-email"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-brand-purple focus:outline-none"
              />
            </div>
            <div className="sm:self-end">
              <AdminButton
                variant="secondary"
                onClick={handleSendTest}
                loading={isSendingTest}
                icon={Mail}
                className="text-xs"
              >
                Send Test Email
              </AdminButton>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
          <AdminButton
            variant="secondary"
            onClick={() => setIsComposerOpen(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleSaveCampaign}
            loading={isSaving}
            icon={dispatchTiming === "scheduled" ? Clock : Send}
          >
            {dispatchTiming === "scheduled"
              ? "Save & Schedule Timer"
              : "Save & Broadcast"}
          </AdminButton>
        </div>
      </AdminModal>

      {/* EMAIL PREVIEW MODAL */}
      {previewCampaign && (
        <AdminModal
          open={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={`Email Preview: ${previewCampaign.subject}`}
          description={`Category: ${previewCampaign.campaign_type} • Status: ${previewCampaign.status}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Branded Email Preview Card */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm font-sans">
              <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-brand-purple tracking-tight">
                    FRELUX
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground uppercase tracking-wider">
                    Intelligence
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  noreply@freluxtools.com
                </span>
              </div>

              <h2 className="text-xl font-bold text-foreground">
                {previewCampaign.subject}
              </h2>
              {previewCampaign.preview_text && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  {previewCampaign.preview_text}
                </p>
              )}

              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {previewCampaign.content_text}
              </div>

              {previewCampaign.cta_label && previewCampaign.cta_url && (
                <div className="mt-6 text-center">
                  <a
                    href={previewCampaign.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple px-5 py-2.5 text-xs font-semibold text-white shadow hover:opacity-95"
                  >
                    {previewCampaign.cta_label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
                <p>Frelux Construction Intelligence • Estimator Suite</p>
                <p className="mt-1 text-[11px] underline">
                  Unsubscribe from weekly updates
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <AdminButton
              variant="secondary"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              Close
            </AdminButton>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
