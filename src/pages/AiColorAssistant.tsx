import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Palette,
  Upload,
  MessageSquare,
  Image as ImageIcon,
  Info,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  RefreshCw,
  XCircle,
  ArrowRight,
  Gift,
  Lock,
  Clock,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { track } from "@/lib/analytics";
import { logAnalyticsEvent } from "@/lib/queries";
import { requestColorConsultation, AiConsultError } from "@/lib/ai";
import { isValidHexColor, normalizeHex, readableTextColor } from "@/lib/colors";
import { fetchColorCombinations, fetchPaintColors } from "@/lib/queries";
import { useSeo } from "@/lib/seo";
import {
  fetchAiAccessConfig,
  getAiUsageStatus,
  checkAiAccess,
  requestRewardedAccess,
  type AiAccessConfig,
  type AiUsageStatus,
  type AiAccessDecision,
} from "@/lib/ai-access";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";
import type {
  AiRecommendation,
  AiConsultMode,
  AiRequestStatus,
} from "@/types/ai";
import type { DbColorCombination, DbPaintColor } from "@/types/database";
import { trackRecentTool } from "@/lib/smart-defaults";

import {
  FaqSection,
  RelatedTools,
  CALC_LINKS,
} from "@/components/seo/SeoSections";
import { AiColorAssistantSeo } from "@/components/seo/SeoContent";
import { SITE_URL } from "@/lib/seo";
import AdSlot from "@/components/ui/AdSlot";
import { getSafeError } from "@/lib/safeError";
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

type View = "choose" | "text" | "image";

export default function AiColorAssistant() {
  useSeo({
    title: "Smart Color Assistant: Get Personalized Paint Color Ideas",
    description:
      "Describe your room or upload a photo and get AI color recommendations tailored to your space, lighting, and furniture. Practical, specific paint color suggestions.",
    canonicalPath: "/ai-color-assistant",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX Smart Color Assistant",
      description:
        "Describe your room or upload a photo and get AI color recommendations tailored to your space, lighting, and furniture.",
      url: `${SITE_URL}/ai-color-assistant`,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    },
  });

  const { user } = useAuth();
  useEffect(() => {
    trackRecentTool("/ai-color-assistant", "AI Color Assistant", "Bot");
  });
  const [view, setView] = useState<View>("choose");
  const [config, setConfig] = useState<AiAccessConfig | null>(null);
  const [usage, setUsage] = useState<AiUsageStatus | null>(null);

  useEffect(() => {
    track("ai_assistant_opened", {});
    logAnalyticsEvent("ai_assistant_opened", {});
    refreshAccessState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check usage when auth state changes (login/logout)
  useEffect(() => {
    refreshAccessState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function refreshAccessState() {
    const cfg = await fetchAiAccessConfig();
    setConfig(cfg);
    if (cfg) {
      const u = await getAiUsageStatus(cfg, user?.id ?? null);
      setUsage(u);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Smart Tool"
        title="Smart Color Assistant"
        subtitle="Describe your space or share a photo and get personalized color ideas tailored to your room."
        breadcrumbs={[
          { label: "Color Library", path: "/colors" },
          { label: "Smart Color Assistant" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <DisclaimerBanner />

        {config && usage && <UsageBanner config={config} usage={usage} />}

        {view === "choose" && <ChooseView onSelect={setView} config={config} />}

        {view !== "choose" && (
          <div className="mb-6 flex flex-wrap gap-2">
            <ViewTab
              active={view === "text"}
              onClick={() => setView("text")}
              icon={MessageSquare}
              label="Describe my space"
            />
            <ViewTab
              active={view === "image"}
              onClick={() => setView("image")}
              icon={ImageIcon}
              label="Upload a room image"
            />
          </div>
        )}

        {view === "text" && (
          <TextConsultation
            config={config}
            usage={usage}
            onUsageConsumed={refreshAccessState}
          />
        )}
        {view === "image" && (
          <ImageConsultation
            config={config}
            usage={usage}
            onUsageConsumed={refreshAccessState}
          />
        )}
      </div>
      <AiColorAssistantSeo />
      <FaqSection
        faqs={[
          {
            question: "How does the Smart Color Assistant work?",
            answer: (
              <span>
                Describe your room, lighting, furniture, and the mood you want.
                The AI analyzes your description and suggests paint colors and
                combinations that suit your space.
              </span>
            ),
          },
          {
            question: "Is the Smart Color Assistant free?",
            answer: (
              <span>
                Yes, the Smart Color Assistant is free to use. You can describe
                your room and get AI-powered color recommendations without
                signing up.
              </span>
            ),
          },
          {
            question: "Can I see the recommended colors in the library?",
            answer: (
              <span>
                Yes. Each recommendation includes color names and codes that you
                can look up in the FRELUX Color Library for detailed views and
                comparisons.
              </span>
            ),
          },
        ]}
      />
      <RelatedTools
        links={[
          CALC_LINKS.colors,
          CALC_LINKS.compareColors,
          CALC_LINKS.paintCalculator,
          CALC_LINKS.buildToRoof,
          CALC_LINKS.buildToRoof,
          CALC_LINKS.imageEstimator,
        ]}
      />{" "}
      <AdSlot slotKey="ai_feature" className="mt-8" />
    </>
  );
}

function DisclaimerBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 p-4 text-sm text-neutral-700">
      <Info
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan"
      />
      <p>
        AI recommendations are AI suggestions for inspiration only, not
        professional design advice. They may vary depending on image quality,
        lighting, and screen settings. Always test a physical paint sample
        before purchase. See our{" "}
        <Link
          to="/ai-disclaimer"
          className="font-semibold text-brand-purple underline"
        >
          AI Disclaimer
        </Link>
        .
      </p>
    </div>
  );
}

function UsageBanner({
  config,
  usage,
}: {
  config: AiAccessConfig;
  usage: AiUsageStatus;
}) {
  if (!config.aiEnabled || config.accessMode === "disabled") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
        <p>AI features are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid text-sm">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-brand-purple" />
        <span className="font-semibold text-brand-navy dark:text-white">
          {usage.remaining} uses remaining today
        </span>
      </div>
      <span className="text-neutral-500">·</span>
      <span className="text-neutral-500">Daily limit: {usage.limit}</span>
      <span className="text-neutral-500">·</span>
      <span className="text-neutral-500">Resets: {usage.resetPeriod}</span>
      <span className="text-neutral-500">·</span>
      <span className="text-neutral-500">
        Mode: {config.accessMode.replace("_", " + ")}
      </span>
      <span className="text-neutral-500">·</span>
      <span className="text-neutral-500">
        {usage.isAuthenticated ? "Signed in" : "Anonymous"}
      </span>
    </div>
  );
}

function ChooseView({
  onSelect,
  config,
}: {
  onSelect: (v: View) => void;
  config: AiAccessConfig | null;
}) {
  const disabled =
    config && (!config.aiEnabled || config.accessMode === "disabled");
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelect("text")}
        disabled={!!disabled}
        className="group flex flex-col items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid text-left transition-all hover:-translate-y-1 hover:border-brand-purple/40 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:p-8"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple transition-colors group-hover:bg-brand-purple group-hover:text-white">
          <MessageSquare className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">
            Describe my space
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Tell us about your room, furniture, lighting, and the mood you want.
            The AI suggests a tailored color palette.
          </p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
          Start describing <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelect("image")}
        disabled={!!disabled}
        className="group flex flex-col items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid text-left transition-all hover:-translate-y-1 hover:border-accent-orange/40 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:p-8"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-orange/10 text-accent-orange transition-colors group-hover:bg-accent-orange group-hover:text-white">
          <ImageIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand-navy dark:text-white">
            Upload a room image
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Share a photo of your room. The AI analyzes wall color, furniture,
            and lighting to recommend colors.
          </p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent-orange">
          Upload a photo <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
        active
          ? "border-brand-purple bg-brand-purple text-white"
          : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-white/5 dark:text-neutral-300 dark:hover:border-white/10",
      )}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────
// Access gate component
// ─────────────────────────────────────────

function AccessGate({
  decision,
  config,
  onRewarded,
  isAuthenticated,
}: {
  decision: AiAccessDecision;
  config: AiAccessConfig | null;
  onRewarded: () => void;
  isAuthenticated: boolean;
}) {
  if (decision.allowed) return null;

  if (decision.reason === "disabled") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>AI features are currently disabled.</p>
      </div>
    );
  }

  if (decision.reason === "limit_reached") {
    return (
      <div className="mb-4 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-4 text-sm text-neutral-700">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-yellow" />
          <div>
            <p className="font-semibold text-brand-navy dark:text-white">
              You've used all your free AI recommendations for today.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Your daily allowance resets tomorrow.
            </p>
            {decision.nextAction === "rewarded" && config?.rewardedEnabled && (
              <button
                type="button"
                onClick={onRewarded}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent-orange/30 bg-white px-4 py-2 dark:border-accent-orange/30 dark:bg-brand-navy-mid text-sm font-semibold text-accent-orange hover:bg-accent-orange/5"
              >
                <Gift className="h-4 w-4" />
                Unlock with rewarded access
              </button>
            )}
            {decision.nextAction === "rewarded" && !config?.rewardedEnabled && (
              <p className="mt-2 text-xs text-neutral-500">
                Rewarded access is not available right now. Please check back
                later.
              </p>
            )}
            {decision.nextAction === "paid" && (
              <p className="mt-2 text-xs text-neutral-500">
                Paid AI access will be available in the future.
              </p>
            )}
            {!isAuthenticated && (
              <p className="mt-3 text-xs text-neutral-500">
                <Link
                  to="/login?redirect=/ai-color-assistant"
                  className="font-semibold text-brand-purple hover:underline"
                >
                  Sign in or create an account
                </Link>{" "}
                to track your usage across devices.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────
// Text consultation
// ─────────────────────────────────────────

function TextConsultation({
  config,
  usage,
  onUsageConsumed,
}: {
  config: AiAccessConfig | null;
  usage: AiUsageStatus | null;
  onUsageConsumed: () => void;
}) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<AiRequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(
    null,
  );
  const [colors, setColors] = useState<DbColorCombination[]>([]);
  const [paintColors, setPaintColors] = useState<DbPaintColor[]>([]);
  const [matchedColor, setMatchedColor] = useState<DbColorCombination | null>(
    null,
  );
  const [matchedPaintColors, setMatchedPaintColors] = useState<DbPaintColor[]>(
    [],
  );
  const [rewardedState, setRewardedState] = useState<
    "idle" | "requesting" | "denied"
  >("idle");
  const submittedRef = useRef(false);

  useEffect(() => {
    fetchColorCombinations().then(({ data }) => setColors(data));
    fetchPaintColors({ pageSize: 500 }).then(({ data }) =>
      setPaintColors(data),
    );
  }, []);

  const decision: AiAccessDecision =
    config && usage
      ? checkAiAccess(config, usage)
      : { allowed: true, reason: "free" };
  const canSubmit =
    description.trim().length >= 10 &&
    status !== "preparing" &&
    status !== "generating" &&
    decision.allowed;

  async function handleRewarded() {
    setRewardedState("requesting");
    track("rewarded_access_requested", { mode: "text" });
    logAnalyticsEvent("rewarded_access_requested", { mode: "text" });
    const result = await requestRewardedAccess();
    if (result.granted) {
      track("rewarded_access_verified", { mode: "text" });
      logAnalyticsEvent("rewarded_access_verified", { mode: "text" });
      setRewardedState("idle");
    } else {
      setRewardedState("denied");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submittedRef.current) return;
    submittedRef.current = true;
    setStatus("preparing");
    setError(null);
    setRecommendation(null);
    setMatchedColor(null);
    setMatchedPaintColors([]);

    track("text_consultation_submitted", { length: description.length });
    logAnalyticsEvent("text_consultation_submitted", {
      length: description.length,
    });

    try {
      setStatus("generating");
      const rec = await requestColorConsultation({ mode: "text", description });
      setRecommendation(rec);
      setStatus("success");
      // Usage is consumed server-side by the edge function on success only.
      onUsageConsumed();
      track("ai_recommendation_generated", {
        mode: "text",
        colorCount: rec.colors.length,
      });
      logAnalyticsEvent("ai_recommendation_generated", {
        mode: "text",
        colorCount: rec.colors.length,
      });
      setMatchedColor(findMatchingColor(rec, colors));
      setMatchedPaintColors(findMatchingPaintColors(rec, paintColors));
    } catch (err) {
      const message =
        err instanceof AiConsultError
          ? err.message
          : "Something went wrong. Please try again.";
      const code = err instanceof AiConsultError ? err.code : "UNKNOWN";
      setError(message);
      setStatus("error");
      // Failed requests do NOT consume usage
      if (code === "USAGE_LIMIT_REACHED") {
        track("ai_usage_limit_reached", { mode: "text" });
        logAnalyticsEvent("ai_usage_limit_reached", { mode: "text" });
        onUsageConsumed();
      }
      track("ai_request_failed", { mode: "text", code });
      logAnalyticsEvent("ai_request_failed", { mode: "text", code });
    } finally {
      submittedRef.current = false;
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setRecommendation(null);
    setMatchedColor(null);
    setMatchedPaintColors([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="card p-6 sm:p-8 lg:col-span-3">
        {!decision.allowed && (
          <AccessGate
            decision={decision}
            config={config}
            onRewarded={handleRewarded}
            isAuthenticated={!!user}
          />
        )}
        {rewardedState === "denied" && (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-3 text-xs text-neutral-500">
            No rewarded access provider is currently configured. Please check
            back later.
          </div>
        )}

        <h2 className="text-lg font-bold text-brand-navy dark:text-white">
          Describe your space
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          The more detail you give, the better the recommendation. Mention room
          type, furniture, current colors, lighting, and the mood or style you
          want.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <label className="block">
            <span className="block text-sm font-semibold text-neutral-700">
              Your description
            </span>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (status === "error" || status === "success") reset();
              }}
              rows={6}
              className="input-field dark:bg-brand-navy-mid dark:border-white/10 mt-1.5 resize-y"
              placeholder="I have a small living room with grey furniture and limited natural light. I want it to feel brighter and more spacious."
              disabled={status === "generating" || !decision.allowed}
            />
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            {description.trim().length} characters · minimum 10
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary disabled:opacity-50"
            >
              {status === "generating" || status === "preparing" ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  Generating…
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4" />
                  Get color ideas
                </>
              )}
            </button>
            {(status === "success" || status === "error") && (
              <button type="button" onClick={reset} className="btn-secondary">
                <RefreshCw className="h-4 w-4" />
                Start over
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-2">
        <ResultPanel
          status={status}
          error={error}
          recommendation={recommendation}
          matchedColor={matchedColor}
          matchedPaintColors={matchedPaintColors}
          mode="text"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Image consultation
// ─────────────────────────────────────────

function ImageConsultation({
  config,
  usage,
  onUsageConsumed,
}: {
  config: AiAccessConfig | null;
  usage: AiUsageStatus | null;
  onUsageConsumed: () => void;
}) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<AiRequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(
    null,
  );
  const [colors, setColors] = useState<DbColorCombination[]>([]);
  const [paintColors, setPaintColors] = useState<DbPaintColor[]>([]);
  const [matchedColor, setMatchedColor] = useState<DbColorCombination | null>(
    null,
  );
  const [matchedPaintColors, setMatchedPaintColors] = useState<DbPaintColor[]>(
    [],
  );
  const [rewardedState, setRewardedState] = useState<
    "idle" | "requesting" | "denied"
  >("idle");
  const submittedRef = useRef(false);

  useEffect(() => {
    fetchColorCombinations().then(({ data }) => setColors(data));
    fetchPaintColors({ pageSize: 500 }).then(({ data }) =>
      setPaintColors(data),
    );
  }, []);

  const decision: AiAccessDecision =
    config && usage
      ? checkAiAccess(config, usage)
      : { allowed: true, reason: "free" };

  const onFile = useCallback((f: File | undefined) => {
    if (!f) return;
    setFileError(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFileError(
        "Unsupported file type. Please upload a JPG, PNG, or WebP image.",
      );
      track("image_upload_invalid", { reason: "type", type: f.type });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 5 MB.");
      track("image_upload_invalid", { reason: "size", bytes: f.size });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    track("image_upload_started", { name: f.name, bytes: f.size });
    logAnalyticsEvent("image_upload_started", { name: f.name, bytes: f.size });
  }, []);

  function clearFile() {
    setFile(null);
    setPreview(null);
    setFileError(null);
  }

  const canSubmit =
    !!file &&
    !!preview &&
    status !== "uploading" &&
    status !== "analyzing" &&
    decision.allowed;

  async function handleRewarded() {
    setRewardedState("requesting");
    track("rewarded_access_requested", { mode: "image" });
    logAnalyticsEvent("rewarded_access_requested", { mode: "image" });
    const result = await requestRewardedAccess();
    if (result.granted) {
      track("rewarded_access_verified", { mode: "image" });
      logAnalyticsEvent("rewarded_access_verified", { mode: "image" });
      setRewardedState("idle");
    } else {
      setRewardedState("denied");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submittedRef.current) return;
    submittedRef.current = true;
    setStatus("uploading");
    setError(null);
    setRecommendation(null);
    setMatchedColor(null);
    setMatchedPaintColors([]);

    track("image_analysis_started", {
      hasDescription: description.trim().length > 0,
    });
    logAnalyticsEvent("image_analysis_started", {
      hasDescription: description.trim().length > 0,
    });

    try {
      setStatus("analyzing");
      const rec = await requestColorConsultation({
        mode: "image",
        description: description.trim() || undefined,
        imageDataUrl: preview ?? undefined,
      });
      setRecommendation(rec);
      setStatus("success");
      // Usage is consumed server-side by the edge function on success only.
      onUsageConsumed();
      track("ai_recommendation_generated", {
        mode: "image",
        colorCount: rec.colors.length,
      });
      logAnalyticsEvent("ai_recommendation_generated", {
        mode: "image",
        colorCount: rec.colors.length,
      });
      setMatchedColor(findMatchingColor(rec, colors));
      setMatchedPaintColors(findMatchingPaintColors(rec, paintColors));
    } catch (err) {
      const message =
        err instanceof AiConsultError
          ? err.message
          : "Something went wrong. Please try again.";
      const code = err instanceof AiConsultError ? err.code : "UNKNOWN";
      setError(message);
      setStatus("error");
      if (code === "USAGE_LIMIT_REACHED") {
        track("ai_usage_limit_reached", { mode: "image" });
        logAnalyticsEvent("ai_usage_limit_reached", { mode: "image" });
        onUsageConsumed();
      }
      track("ai_request_failed", { mode: "image", code });
      logAnalyticsEvent("ai_request_failed", { mode: "image", code });
    } finally {
      submittedRef.current = false;
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setRecommendation(null);
    setMatchedColor(null);
    setMatchedPaintColors([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="card p-6 sm:p-8 lg:col-span-3">
        {!decision.allowed && (
          <AccessGate
            decision={decision}
            config={config}
            onRewarded={handleRewarded}
            isAuthenticated={!!user}
          />
        )}
        {rewardedState === "denied" && (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-white/5 p-3 text-xs text-neutral-500">
            No rewarded access provider is currently configured. Please check
            back later.
          </div>
        )}

        <h2 className="text-lg font-bold text-brand-navy dark:text-white">
          Upload a room image
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Share a clear photo of your room. JPG, PNG, or WebP up to 5 MB. You
          can optionally add a description for better results.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          {!preview ? (
            <ImageDropzone onFile={onFile} disabled={!decision.allowed} />
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-neutral-200">
              <img
                src={preview}
                alt="Room preview"
                className="max-h-72 w-full object-contain bg-neutral-50 dark:bg-brand-navy"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow hover:bg-white dark:bg-brand-navy/90 dark:text-neutral-300 dark:hover:bg-brand-navy-mid"
                aria-label="Remove image"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}

          {fileError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{fileError}</p>
            </div>
          )}

          {file && !fileError && (
            <p className="mt-2 text-xs text-neutral-500">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}

          <label className="mt-4 block">
            <span className="block text-sm font-semibold text-neutral-700">
              Add a description (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (status === "error" || status === "success") reset();
              }}
              rows={3}
              className="input-field dark:bg-brand-navy-mid dark:border-white/10 mt-1.5 resize-y"
              placeholder="e.g. I want this bedroom to feel calm and relaxing."
              disabled={status === "analyzing" || !decision.allowed}
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary disabled:opacity-50"
            >
              {status === "uploading" || status === "analyzing" ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  Analyzing…
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4" />
                  Analyze image
                </>
              )}
            </button>
            {(status === "success" || status === "error") && (
              <button type="button" onClick={reset} className="btn-secondary">
                <RefreshCw className="h-4 w-4" />
                Start over
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-2">
        <ResultPanel
          status={status}
          error={error}
          recommendation={recommendation}
          matchedColor={matchedColor}
          matchedPaintColors={matchedPaintColors}
          mode="image"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Image dropzone (with drag + drop + mobile camera)
// ─────────────────────────────────────────

function ImageDropzone({
  onFile,
  disabled,
}: {
  onFile: (f: File | undefined) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFile(e.dataTransfer.files?.[0]);
      }}
      className={classNames(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "",
        dragging
          ? "border-brand-purple bg-brand-purple/5"
          : "border-neutral-200 hover:border-neutral-300",
      )}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        capture="environment"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        <Upload className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-brand-navy dark:text-white">
        Tap to upload or take a photo
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        JPG, PNG, or WebP · up to 5 MB
      </p>
    </div>
  );
}

// ─────────────────────────────────────────
// Result panel
// ─────────────────────────────────────────

function ResultPanel({
  status,
  error,
  recommendation,
  matchedColor,
  matchedPaintColors,
  mode,
}: {
  status: AiRequestStatus;
  error: string | null;
  recommendation: AiRecommendation | null;
  matchedColor: DbColorCombination | null;
  matchedPaintColors: DbPaintColor[];
  mode: AiConsultMode;
}) {
  if (
    status === "idle" ||
    (status !== "error" &&
      status !== "success" &&
      status !== "generating" &&
      status !== "analyzing" &&
      status !== "uploading" &&
      status !== "preparing")
  ) {
    return (
      <div className="card sticky top-20 p-6 text-center text-sm text-neutral-500">
        <Palette className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-3">Your color recommendations will appear here.</p>
      </div>
    );
  }

  if (
    status === "preparing" ||
    status === "generating" ||
    status === "uploading" ||
    status === "analyzing"
  ) {
    const label =
      status === "uploading"
        ? "Uploading image…"
        : status === "analyzing"
          ? "Analyzing image…"
          : status === "preparing"
            ? "Preparing request…"
            : "Generating recommendations…";
    return (
      <div className="card sticky top-20 p-8 text-center">
        <Loader2
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin text-brand-purple"
        />
        <p className="mt-4 text-sm font-semibold text-brand-navy dark:text-white">
          {label}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card sticky top-20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
          />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Couldn't generate recommendations
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {error ?? "An unexpected error occurred."}
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              You can try again. If the problem persists, the AI service may be
              temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="card sticky top-20 overflow-hidden">
      <div className="bg-brand-navy p-5 text-white">
        <div className="flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Your palette
          </span>
        </div>
        <p className="mt-2 text-sm text-white/80">
          {recommendation?.paletteSummary}
        </p>
      </div>

      <div className="space-y-3 p-5">
        {recommendation?.colors.map((c) => (
          <ColorSwatch key={c.role + c.hex} color={c} />
        ))}
      </div>

      {recommendation?.finishSuggestion && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Suggested finish
          </p>
          <p className="mt-1 text-sm text-neutral-700">
            {recommendation.finishSuggestion}
          </p>
        </div>
      )}

      {recommendation?.whyItWorks && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Why these colors work
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            {recommendation.whyItWorks}
          </p>
        </div>
      )}

      {recommendation?.additionalSuggestions && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Additional suggestions
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            {recommendation.additionalSuggestions}
          </p>
        </div>
      )}

      {matchedColor && (
        <div className="border-t border-neutral-100 bg-brand-purple/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-purple">
            Similar FRELUX color
          </p>
          <Link
            to={`/colors/${matchedColor.slug}`}
            onClick={() => {
              track("color_recommendation_clicked", {
                slug: matchedColor.slug,
                mode,
              });
              logAnalyticsEvent("color_recommendation_clicked", {
                slug: matchedColor.slug,
                mode,
              });
            }}
            className="mt-2 flex items-center gap-3 rounded-lg border border-brand-purple/20 bg-white p-3 dark:border-brand-purple/20 dark:bg-brand-navy-mid transition-colors hover:border-brand-purple/40"
          >
            <div className="flex gap-1">
              {[
                matchedColor.main_color_code,
                matchedColor.secondary_color_code,
                matchedColor.accent_color_code,
              ].map((hex) => (
                <div
                  key={hex}
                  className="h-8 w-8 rounded ring-1 ring-black/10"
                  style={{ background: hex }}
                />
              ))}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-navy dark:text-white">
                {matchedColor.title}
              </p>
              <p className="text-xs text-neutral-500">
                View this color combination
              </p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 text-brand-purple"
            />
          </Link>
        </div>
      )}

      {matchedPaintColors.length > 0 && (
        <div className="border-t border-neutral-100 bg-accent-green/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-green">
            Matching FRELUX paint colors
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Closest matches from our color library, tap to view full details.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {matchedPaintColors.map((pc) => (
              <Link
                key={pc.id}
                to={`/colors/paint/${pc.slug}`}
                onClick={() => {
                  track("color_recommendation_clicked", {
                    slug: pc.slug,
                    mode,
                    source: "paint_color",
                  });
                  logAnalyticsEvent("color_recommendation_clicked", {
                    slug: pc.slug,
                    mode,
                    source: "paint_color",
                  });
                }}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 dark:border-white/5 dark:bg-brand-navy-mid transition-colors hover:border-accent-green/40"
              >
                <div
                  className="h-8 w-8 shrink-0 rounded ring-1 ring-black/10"
                  style={{ background: pc.hex_code }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-navy dark:text-white">
                    {pc.name}
                  </p>
                  <p className="text-[10px] text-neutral-500">{pc.hex_code}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-xs text-neutral-500 dark:border-white/5 dark:bg-white/5 dark:text-neutral-500">
        AI suggestions are for inspiration only. Test a physical paint sample
        before deciding.
      </div>
    </div>
  );
}

function ColorSwatch({
  color,
}: {
  color: { name: string; hex: string; role: string };
}) {
  const valid = isValidHexColor(color.hex);
  const hex = valid ? normalizeHex(color.hex) : "#CCCCCC";
  const textColor = readableTextColor(hex);
  const roleLabel =
    color.role === "main"
      ? "Main color"
      : color.role === "secondary"
        ? "Secondary color"
        : "Accent color";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/5 dark:bg-brand-navy-mid">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10"
        style={{ background: hex, color: textColor }}
      >
        <span className="text-[10px] font-bold">{valid ? "Aa" : "!"}</span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          {roleLabel}
        </p>
        <p className="text-sm font-bold text-brand-navy dark:text-white">
          {color.name}
        </p>
        <p className="font-mono text-xs text-neutral-500">
          {valid ? hex : "Invalid color"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Gallery matching
// ─────────────────────────────────────────

function findMatchingColor(
  rec: AiRecommendation,
  colors: DbColorCombination[],
): DbColorCombination | null {
  if (!rec.colors.length || colors.length === 0) return null;
  const recHexes = rec.colors.map((c) => normalizeHex(c.hex).toLowerCase());
  let best: DbColorCombination | null = null;
  let bestScore = 0;
  for (const combo of colors) {
    const comboHexes = [
      combo.main_color_code,
      combo.secondary_color_code,
      combo.accent_color_code,
    ]
      .filter(Boolean)
      .map((h) => normalizeHex(h as string).toLowerCase());
    let score = 0;
    for (const rh of recHexes) {
      for (const ch of comboHexes) {
        if (colorDistance(rh, ch) < 30) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = combo;
    }
  }
  return bestScore >= 2 ? best : null;
}

function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function findMatchingPaintColors(
  rec: AiRecommendation,
  paintColors: DbPaintColor[],
): DbPaintColor[] {
  if (!rec.colors.length || paintColors.length === 0) return [];
  const recHexes = rec.colors.map((c) => normalizeHex(c.hex).toLowerCase());
  const scored = paintColors.map((pc) => {
    const pcHex = pc.hex_code.toLowerCase();
    let minDist = Infinity;
    for (const rh of recHexes) {
      const dist = colorDistance(rh, pcHex);
      if (dist < minDist) minDist = dist;
    }
    return { color: pc, dist: minDist };
  });
  return scored
    .filter((s) => s.dist < 40)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map((s) => s.color);
}
