import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { QuoteShareButton } from "@/components/calculators/QuoteShareButton";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { useState, useCallback, useRef, useEffect, useId } from "react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { trackAiPhotoEstimatorRewards } from "@/lib/rewards-integration";
import { supabase } from "@/lib/supabase";
import { recordExtractionCorrection } from "@/lib/learning/learning-client";
import {
  ImagePlus,
  Zap,
  BadgeCheck,
  Lock,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  TrendingUp,
  ShieldCheck,
  Camera,
  Info,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { PremiumFeatureGate } from "@/components/premium/PremiumFeatureGate";
import AdSlot from "@/components/ui/AdSlot";
import {
  fetchEstimationAccessConfig,
  getEstimationUsageStatus,
  checkEstimationAccess,
} from "@/lib/estimation-access";
import { useRewardedAccess } from "@/lib/rewarded-access";
import { RewardedAdModal } from "@/components/rewarded/RewardedAdModal";
import type {
  EstimationAccessConfig,
  EstimationUsageStatus,
  EstimationAccessDecision,
  BuildingAnalysisResult,
} from "@/types/premium-estimation";
import { calculateBuildToRoof } from "@/lib/estimation/build-to-roof-engine";
import { printQuote } from "@/lib/estimation/quote-export";
import type {
  BuildToRoofInput,
  BuildToRoofResult,
} from "@/types/build-to-roof";
import { useMarket } from "@/lib/international/market-context";
import { formatArea, formatCurrency } from "@/lib/utils";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Button } from "@/components/ui/shadcn/button";
import { NumericInput } from "@/components/ui/NumericInput";

type Phase = "upload" | "analyzing" | "review" | "result" | "locked" | "error";

// ── Rotating text slide for AI features ──
function AiFeatureSlide() {
  const messages = [
    "Detects building type, roof structure, and materials from photos",
    "Estimates dimensions, floor count, and room layout automatically",
    "Generates material quantities with market pricing",
    "Identifies foundation type, block type, and structural frame",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((p) => (p + 1) % messages.length),
      3500,
    );
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="relative h-5 overflow-hidden mt-2">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center gap-2 transition-all duration-500"
          style={{
            opacity: i === index ? 1 : 0,
            transform:
              i === index
                ? "translateY(0)"
                : i < index
                  ? "translateY(-100%)"
                  : "translateY(100%)",
          }}
        >
          <span className="inline-block h-1 w-1 rounded-full bg-accent-green" />
          <span className="text-xs font-medium text-primary-foreground/70">
            {msg}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Turn the vision edge function's error body (or its absence) into a message
 * a user can act on. Previously every non-2xx was reported as "not deployed",
 * which hid real causes such as Gemini being busy.
 */
/** Field keys the extractor can ask a visitor to confirm. */
const FIELD_LABELS: Record<string, string> = {
  estimated_length: "Building length: not visible in this photo",
  estimated_width: "Building width: not visible in this photo",
  estimated_floors: "Number of storeys",
  estimated_floor_height: "Floor to floor height",
  estimated_internal_wall_length: "Internal wall run (entered as zero)",
  detected_openings: "Doors and windows (none deducted)",
  estimated_roof_pitch: "Roof pitch",
  building_type: "Building type",
  roof_type: "Roof type",
  roofing_material: "Roof covering",
  block_size: "Block size",
};

export function describeVisionFailure(
  body: {
    error?: string;
    code?: string;
    measurements?: Record<string, unknown> | null;
  } | null,
): string {
  if (body?.code === "MEASUREMENTS_INCOMPLETE") {
    const read: string[] = [];
    const m = body.measurements ?? {};
    const length = Number(m.building_length_m);
    const width = Number(m.building_width_m);
    const floors = Number(m.number_of_floors);
    if (Number.isFinite(length) && length > 0) read.push(`${length} m long`);
    if (Number.isFinite(width) && width > 0) read.push(`${width} m wide`);
    if (Number.isFinite(floors) && floors > 0) {
      read.push(floors === 1 ? "one storey" : `${floors} storeys`);
    }
    const readText = read.length > 0 ? ` It did read ${read.join(", ")}.` : "";
    return `${body.error ?? "The photo did not show every dimension."}${readText} Carry those into the Build-to-Roof Estimator and enter the missing side there.`;
  }
  switch (body?.code) {
    case "AI_BUSY":
      return "The AI vision service is busy right now. Please try again in a minute.";
    case "USAGE_LIMIT_REACHED":
      return "You have used all your free image estimations for today. Come back tomorrow!";
    case "NO_API_KEY":
      return "The AI service is not configured yet. Please check back later.";
    case "PRICE_NOT_DETERMINED":
      return (
        body?.error ??
        "Photo estimation cannot price this market yet. Use the Build-to-Roof Estimator so local prices and units are used."
      );
    case "NO_USABLE_DIMENSIONS":
      return (
        body?.error ??
        "The photo did not give a usable building dimension. Retake it square-on with a door or window in frame, or enter dimensions manually."
      );
  }
  if (body?.error) {
    return "The AI vision service hit a problem analysing this image. Please try again, or use the manual Build-to-Roof Estimator.";
  }
  return "Couldn't reach the AI vision service. Check your connection and try again, or use the manual Build-to-Roof Estimator.";
}

export default function ImageEstimator() {
  const market = useMarket().market;
  useSeo({
    title: "AI Photo Estimator, AI-Assisted Preliminary Estimation | FRELUX",
    description:
      "Upload a photo of any building for AI-assisted preliminary construction estimation. AI analyzes visible features to suggest dimensions and materials. Results are preliminary, verify with actual drawings and a qualified professional.",
    keywords:
      "AI building estimator, photo to construction cost, building image analysis, construction AI",
  });

  const { user, isAdmin, isPaid } = useAuth();
  const [phase, setPhase] = useState<Phase>("upload");
  const [config, setConfig] = useState<EstimationAccessConfig | null>(null);
  const [usage, setUsage] = useState<EstimationUsageStatus | null>(null);
  const [accessDecision, setAccessDecision] =
    useState<EstimationAccessDecision | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<{
    fieldSources: Record<string, string>;
    needsConfirmation: string[];
  } | null>(null);
  // The model call is the only slow step, so it is timed and shown rather than
  // hidden behind a spinner that claims steps finished before they start.
  const [analysisElapsed, setAnalysisElapsed] = useState(0);
  const [_imageFile, setImageFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [analysis, setAnalysis] = useState<BuildingAnalysisResult | null>(null);
  const [estimateInput, setEstimateInput] = useState<BuildToRoofInput | null>(
    null,
  );
  const [estimate, setEstimate] = useState<BuildToRoofResult | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  // The 1024px JPEG the model actually read. The result card shows this
  // instead of decoding the visitor's original, which can be several
  // megapixels, while the full-size link still opens the original.
  const [analysisPreviewUrl, setAnalysisPreviewUrl] = useState<string | null>(
    null,
  );
  const [pdfGateOpen, setPdfGateOpen] = useState(false);
  const [pdfUnlocked, setPdfUnlocked] = useState(false);

  // A new photo is a new building: the image, its provenance, the reading and
  // the priced estimate all clear, and the page returns to the upload step.
  const resetInputs = () => {
    setImageDataUrl(null);
    setAnalysisPreviewUrl(null);
    setProvenance(null);
    setAnalysis(null);
    setEstimateInput(null);
    setEstimate(null);
    setProjectName("");
    setError("");
    setSavedId(null);
    setAnalysisElapsed(0);
    setPhase("upload");
  };
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load access config on mount ──
  const mountedRef = useRef(true);
  useEffect(() => {
    async function loadAccess() {
      const cfg = await fetchEstimationAccessConfig();
      setConfig(cfg);
      if (cfg) {
        const u = await getEstimationUsageStatus(cfg, user?.id);
        setUsage(u);
        const decision = checkEstimationAccess(cfg, u, isAdmin, isPaid);
        setAccessDecision(decision);
        if (!decision.allowed) {
          setPhase("locked");
        }
      }
    }
    loadAccess();

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id, isAdmin, isPaid]);

  useEffect(() => {
    if (phase !== "analyzing") {
      setAnalysisElapsed(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setAnalysisElapsed(Math.round((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── Handle image selection ──
  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageDataUrl(dataUrl);
      setAnalysisPreviewUrl(null);
      setImageFile(file);
      setError("");
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Resize image to reasonable size for upload ──
  const resizeImage = useCallback(
    (dataUrl: string, maxSize = 1024): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height / width) * maxSize);
              width = maxSize;
            } else {
              width = Math.round((width / height) * maxSize);
              height = maxSize;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
      });
    },
    [],
  );

  // ── Run the estimation ──
  const runEstimation = useCallback(async () => {
    if (!imageDataUrl) return;

    setPhase("analyzing");
    setError("");

    try {
      const resizedImage = await resizeImage(imageDataUrl);
      setAnalysisPreviewUrl(resizedImage);
      const clientId =
        localStorage.getItem("frelux_estimation_client_id") || "unknown";
      // The rewarded-unlock client hash, the edge function checks this
      // against rewarded_unlock_log so an active ad unlock bypasses the
      // daily usage limit.
      const clientHash =
        localStorage.getItem("frelux_client_hash") || "unknown";

      // A request that never returns is worse than a failure: the visitor waits
      // with no way out. Gemini gets 28 s per attempt inside the function, so
      // anything past 75 s here is a dead connection.
      const controller = new AbortController();
      const guard = window.setTimeout(() => controller.abort(), 75_000);
      let invokeResult: {
        data: {
          analysis?: unknown;
          estimateInput?: unknown;
          savedId?: string | null;
          error?: string;
          code?: string;
          measurements?: Record<string, unknown> | null;
          fieldSources?: Record<string, string> | null;
          needsConfirmation?: string[] | null;
        } | null;
        error: unknown;
      };
      try {
        invokeResult = await supabase.functions.invoke(
          "ai-building-estimation",
          {
            signal: controller.signal,
            body: {
              imageDataUrl: resizedImage,
              clientId,
              clientHash,
              projectName: projectName || "AI-Estimated Building",
              location: location || "Nigeria",
              // The function prices from the Nigerian book only. Without the
              // market it could not tell, so every visitor was priced in naira.
              market: market?.marketCode ?? "NG",
            },
          },
        );
      } catch (invokeError) {
        const aborted =
          invokeError instanceof Error && invokeError.name === "AbortError";
        if (aborted) {
          setError(
            "The photo analysis timed out after 75 seconds. Try a smaller photo, or run the takeoff manually.",
          );
          setPhase("error");
          return;
        }
        setError("Failed to analyze image. Please try again.");
        setPhase("error");
        return;
      } finally {
        window.clearTimeout(guard);
      }

      const { data, error: fnError } = invokeResult;

      if (fnError || !data) {
        // supabase-js puts non-2xx responses in fnError.context (a Response).
        // Read the function's own JSON body so a busy/limit/config error is
        // shown as what it is, instead of always claiming "not deployed".
        const ctx = (fnError as { context?: unknown } | null)?.context;
        let body: { error?: string; code?: string } | null = null;
        if (ctx && typeof (ctx as Response).json === "function") {
          try {
            body = await (ctx as Response).clone().json();
          } catch {
            body = null;
          }
        }
        setError(describeVisionFailure(body));
        setPhase("error");
        return;
      }

      if (data.error) {
        const code = data.code ?? "PROVIDER_ERROR";
        if (code === "USAGE_LIMIT_REACHED") {
          setError(
            "You have used all your free image estimations for today. Come back tomorrow!",
          );
        } else if (code === "NOT_SUBSCRIBED") {
          setError("This feature requires a premium subscription.");
        } else if (code === "NO_API_KEY") {
          setError(
            "The AI service is not configured yet. Please check back later.",
          );
        } else if (code === "AI_DISABLED") {
          setError("Image estimation is currently disabled by FRELUX.");
        } else {
          setError(data.error);
        }
        setPhase("error");
        return;
      }

      // ── Got AI analysis ──
      const aiAnalysis = data.analysis as BuildingAnalysisResult;
      const aiInput = data.estimateInput as BuildToRoofInput;
      setAnalysis(aiAnalysis);
      setEstimateInput(aiInput);
      // Which figures are readings and which are engine defaults. The review
      // screen states this instead of presenting a default as a measurement.
      setProvenance({
        fieldSources: data.fieldSources ?? {},
        needsConfirmation: data.needsConfirmation ?? [],
      });
      // PHASE 6.5, keep the pristine AI extraction so user adjustments can
      // be recorded as Gemini learning events (AI value vs USER value).
      aiOriginalInput.current = aiInput;
      setSavedId(data.savedId ?? null);
      setPhase("review");
    } catch (err) {
      if (import.meta.env.DEV) console.error("[ImageEstimator] Error:", err);
      setError("Failed to analyze image. Please try again.");
      setPhase("error");
    }
  }, [imageDataUrl, projectName, location, resizeImage]);

  // PHASE 6.5, pristine Gemini extraction for correction learning.
  const aiOriginalInput = useRef<BuildToRoofInput | null>(null);

  // ── Generate estimate from review ──
  const generateEstimate = useCallback(() => {
    if (!estimateInput) return;
    // PHASE 6.5, Gemini learning: every adjusted field becomes a learning
    // event (AI value vs USER value). Repeated verified corrections may
    // produce a DRAFT improvement proposal; extraction logic itself never
    // changes automatically.
    const original = aiOriginalInput.current;
    if (original) {
      for (const key of Object.keys(original) as Array<
        keyof BuildToRoofInput
      >) {
        const aiValue = original[key];
        const userValue = estimateInput[key];
        if (
          typeof aiValue === "number" &&
          typeof userValue === "number" &&
          aiValue !== userValue
        ) {
          recordExtractionCorrection({
            field: String(key),
            aiValue,
            userValue,
            metadata: { origin: "ai-photo-estimator" },
          }).catch(() => {});
        }
      }
    }
    const result = monitoredCalc("AI Photo Estimator", () =>
      calculateBuildToRoof(estimateInput),
    );
    setEstimate(result);
    setPhase("result");
    trackAiPhotoEstimatorRewards();
  }, [estimateInput]);

  // ── Adjust analysis and recalculate ──
  const updateInput = useCallback(
    <K extends keyof BuildToRoofInput>(key: K, value: BuildToRoofInput[K]) => {
      setEstimateInput((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    [],
  );

  // ── Locked state ──
  if (phase === "locked" && accessDecision && !accessDecision.allowed) {
    return (
      <LockedView
        decision={accessDecision}
        config={config}
        usage={usage}
        onUnlocked={async () => {
          // Re-check access after ad unlock
          if (config) {
            const u = await getEstimationUsageStatus(config, user?.id);
            setUsage(u);
            const decision = checkEstimationAccess(config, u, isAdmin, isPaid);
            setAccessDecision(decision);
            if (decision.allowed) {
              setPhase("upload");
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Tools", path: "/construction-tools/" },
          { label: "Photo Estimator" },
        ]}
        eyebrow="Photo takeoff"
        title="Building Photo Estimator"
        subtitle="Upload site photos, extract the measurements, then let the deterministic engine price the work."
        actions={
          config && config.enabled && accessDecision?.allowed ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <PremiumBadge size="xs" />
              {accessDecision.reason === "admin_override"
                ? "Restricted access"
                : accessDecision.reason === "free"
                  ? `${usage?.remaining ?? 0} free uses remaining today`
                  : "Active"}
            </div>
          ) : undefined
        }
      />

      <Container className="max-w-5xl pb-12 pt-8">
        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}
        {/* Phase: Upload */}
        {phase === "upload" && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center hover:border-brand-purple transition-colors">
              {imageDataUrl ? (
                <div className="space-y-4">
                  <img
                    src={imageDataUrl}
                    alt="Photo selected for estimation"
                    decoding="async"
                    className="mx-auto max-h-80 rounded-lg shadow-md object-contain"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => fileRef.current?.click()}
                    className="text-sm text-brand-purple hover:text-brand-purple-dark font-medium"
                  >
                    Choose a different image
                  </Button>
                </div>
              ) : (
                <>
                  <ImagePlus className="w-16 h-16 text-muted-foreground/80 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a photo of a building
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    JPG or PNG, max 10MB. The clearer the photo, the better the
                    estimate.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Camera aria-hidden="true" className="w-4 h-4" />
                    Choose Building Photo
                  </Button>
                </>
              )}
              <input
                aria-label="Building photo"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
              />
            </div>

            {imageDataUrl && (
              <div className="rounded-2xl border border-border bg-card shadow-card p-6 space-y-4">
                <h3 className="font-semibold text-foreground">
                  Project Details
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="image-project-name"
                      className="text-sm font-medium text-muted-foreground mb-1 block"
                    >
                      Project name (optional)
                    </label>
                    <input
                      id="image-project-name"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. House on Allen Avenue"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="image-project-location"
                      className="text-sm font-medium text-muted-foreground mb-1 block"
                    >
                      Location
                    </label>
                    <input
                      id="image-project-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Lagos"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
                  <Info
                    aria-hidden="true"
                    className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-blue-700">
                    The AI will analyze your building photo to estimate visible
                    dimensions, roof type, and building type. You can review and
                    adjust the AI's estimates before generating a cost
                    breakdown. This is an{" "}
                    <strong>AI-assisted preliminary estimate</strong>, a
                    photograph cannot determine hidden construction conditions,
                    exact dimensions, or structural integrity. Always verify
                    with actual drawings, site measurements, and a qualified
                    structural engineer.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={runEstimation}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-accent-green/90 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Analyze Building & Generate Estimate
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Phase: Analyzing */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <Building2 className="w-20 h-20 text-brand-purple/20" />
              <Loader2
                aria-hidden="true"
                className="w-8 h-8 text-brand-purple absolute inset-0 m-auto animate-spin"
              />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-foreground">
              Analyzing your building photo…
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Google Gemini is reading building type, dimensions and roof
              structure from the photo.
            </p>
            <p
              className="mt-4 text-sm font-medium tabular-nums text-foreground"
              data-testid="analysis-elapsed"
              aria-live="polite"
            >
              {analysisElapsed}s elapsed
            </p>
            <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
              A single read usually takes 5 to 20 seconds. If it passes a
              minute, the vision service is busy and trying again is the fastest
              route.
            </p>
          </div>
        )}
        {/* Phase: Review AI analysis */}
        {phase === "review" && analysis && estimateInput && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card shadow-card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    AI Analysis Complete
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    These are the measurements read from the photo. FRELUX
                    engines do the quantities and the pricing from them, so
                    correct any figure before continuing.
                  </p>
                </div>
                <div
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    analysis.ai_confidence === "high"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : analysis.ai_confidence === "moderate"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-orange-50 text-orange-700 border-orange-200"
                  }`}
                >
                  AI Confidence: {analysis.ai_confidence}
                </div>
              </div>

              {provenance && provenance.needsConfirmation.length > 0 && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                  <p className="font-medium">
                    Not measured, so an engine default is standing in
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {provenance.needsConfirmation.map((key) => (
                      <li key={key}>
                        {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">
                    These change the quantities. Confirm each one against the
                    drawing before ordering.
                  </p>
                </div>
              )}

              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Photo of the building being estimated"
                  decoding="async"
                  className="mb-4 max-h-64 w-full rounded-lg bg-muted/30 object-contain"
                />
              )}

              {/* AI detected parameters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ParamField
                  label="Building type"
                  value={estimateInput.building_type}
                  onChange={(v) =>
                    updateInput(
                      "building_type",
                      v as BuildToRoofInput["building_type"],
                    )
                  }
                  options={[
                    "bungalow",
                    "duplex",
                    "two_storey",
                    "apartment",
                    "office",
                    "shop",
                    "custom",
                  ]}
                />
                <NumberField
                  label="Length (m)"
                  value={estimateInput.building_length}
                  onChange={(v) => updateInput("building_length", v)}
                  step="0.1"
                />
                <NumberField
                  label="Width (m)"
                  value={estimateInput.building_width}
                  onChange={(v) => updateInput("building_width", v)}
                  step="0.1"
                />
                <NumberField
                  label="Floors"
                  value={estimateInput.number_of_floors}
                  onChange={(v) =>
                    updateInput("number_of_floors", Math.floor(v))
                  }
                />
                <NumberField
                  label="Floor height (m)"
                  value={estimateInput.floor_to_floor_height}
                  onChange={(v) => updateInput("floor_to_floor_height", v)}
                  step="0.1"
                />
                <ParamField
                  label="Roof type"
                  value={estimateInput.roof_type}
                  onChange={(v) =>
                    updateInput("roof_type", v as BuildToRoofInput["roof_type"])
                  }
                  options={["gable", "hip", "mono_pitch", "flat", "custom"]}
                />
                <NumberField
                  label="Roof pitch (°)"
                  value={estimateInput.roof_pitch_degrees}
                  onChange={(v) => updateInput("roof_pitch_degrees", v)}
                />
                <ParamField
                  label="Roofing material"
                  value={estimateInput.roofing_material}
                  onChange={(v) =>
                    updateInput(
                      "roofing_material",
                      v as BuildToRoofInput["roofing_material"],
                    )
                  }
                  options={[
                    "long_span_aluminium",
                    "stone_coated",
                    "gi_sheet",
                    "shingle",
                    "custom",
                  ]}
                />
                <NumberField
                  label="Internal walls (m)"
                  value={estimateInput.internal_wall_length}
                  onChange={(v) => updateInput("internal_wall_length", v)}
                  step="0.5"
                />
              </div>

              {/* Analysis notes */}
              {analysis.analysis_notes.length > 0 && (
                <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    AI Observations:
                  </p>
                  <ul className="space-y-1">
                    {analysis.analysis_notes.map((note, i) => (
                      <li
                        key={i}
                        className="text-xs text-blue-600 flex items-start gap-1"
                      >
                        <span className="text-blue-400">•</span> {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {analysis.warnings.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">
                    ⚠️ Important limitations:
                  </p>
                  <ul className="space-y-1">
                    {analysis.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-600 flex items-start gap-1"
                      >
                        <span className="text-amber-400">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Structural observations */}
              {analysis.structural_observations &&
                analysis.structural_observations.length > 0 && (
                  <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                    <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Structural
                      Observations
                    </p>
                    <ul className="space-y-1">
                      {analysis.structural_observations.map((obs, i) => (
                        <li
                          key={i}
                          className="text-xs text-primary flex items-start gap-1"
                        >
                          <span className="text-primary-light">•</span> {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Confidence factors */}
              {analysis.confidence_factors && (
                <div className="mt-3 rounded-lg bg-muted/50 border border-border/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Analysis Confidence Factors:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Image quality
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`w-2 h-2 rounded-full ${n <= Math.round(analysis.confidence_factors.image_quality * 5) ? "bg-green-400" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Angle quality
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`w-2 h-2 rounded-full ${n <= Math.round(analysis.confidence_factors.angle_quality * 5) ? "bg-green-400" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Scale reference
                      </span>
                      <span className="text-muted-foreground">
                        {analysis.confidence_factors.scale_reference_visible
                          ? "✓"
                          : "✗"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Multiple facades
                      </span>
                      <span className="text-muted-foreground">
                        {analysis.confidence_factors.multiple_facades_visible
                          ? "✓"
                          : "✗"}
                      </span>
                    </div>
                  </div>
                  {!analysis.validation_passed && (
                    <p className="mt-2 text-xs text-red-500">
                      ⚠ Some AI parameters failed validation, verify highlighted
                      values before generating estimate.
                    </p>
                  )}
                </div>
              )}

              {/* Verification checklist */}
              {analysis.verification_checklist &&
                analysis.verification_checklist.length > 0 && (
                  <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verification
                      Checklist (before construction)
                    </p>
                    <ul className="space-y-1">
                      {analysis.verification_checklist.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-green-600 flex items-start gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />{" "}
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <Button
                variant="ghost"
                onClick={generateEstimate}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-accent-green/90 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Generate Full Cost Estimate
              </Button>
            </div>
          </div>
        )}
        {/* Phase: Result */}
        {phase === "result" && estimate && (
          <EstimateResultView
            estimate={estimate}
            analysis={analysis}
            buildingPhoto={imageDataUrl}
            photoPreview={analysisPreviewUrl}
            savedId={savedId}
            onEdit={() => setPhase("review")}
            onReset={resetInputs}
            isPaid={isPaid}
            pdfGateOpen={pdfGateOpen}
            pdfUnlocked={pdfUnlocked}
            setPdfGateOpen={setPdfGateOpen}
            setPdfUnlocked={setPdfUnlocked}
          />
        )}
        {/* Phase: Error */}
        {phase === "error" && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle
              aria-hidden="true"
              className="w-16 h-16 text-amber-400 mb-4"
            />
            <h3 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md text-center">
              {error}
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("upload");
                setError("");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try Again
            </Button>
          </div>
        )}
        <RelatedTools
          links={[
            CALC_LINKS.buildToRoof,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.paintCalculator,
            CALC_LINKS.structuralCalc,
            CALC_LINKS.foundationCalc,
          ]}
        />{" "}
        <AdSlot slotKey="ai_feature" className="mt-8" />
        {/* Native banner slot, placement "image_estimator_native" */}
        <AdSlot slotKey="image_estimator_native" className="mt-8" />
      </Container>
    </div>
  );
}

// ── Locked view ──
function LockedView({
  decision,
  config,
  usage,
  onUnlocked,
}: {
  decision: EstimationAccessDecision;
  config: EstimationAccessConfig | null;
  usage: EstimationUsageStatus | null;
  onUnlocked: () => Promise<void>;
}) {
  // Standard rewarded flow (same as the calculators): real Monetag
  // rewarded ad via the bridge, 5-second watch, client attestation,
  // server-side grant through the grant-rewarded-unlock edge function.
  // The old inline flow bypassed the real ad and sent no attestation
  // token, so the server always rejected the unlock.
  const rewarded = useRewardedAccess("image_estimator");
  const adProviderReady =
    !!rewarded.primaryProvider || !!rewarded.fallbackProvider;
  const adFlowReady = adProviderReady && (rewarded.config?.is_enabled ?? false);
  const unlockHandledRef = useRef(false);

  // When the unlock lands, hand control back to the parent so it
  // re-checks access and moves on to the upload phase.
  useEffect(() => {
    if (rewarded.isUnlocked && !unlockHandledRef.current) {
      unlockHandledRef.current = true;
      onUnlocked();
    }
  }, [rewarded.isUnlocked, onUnlocked]);

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card shadow-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Lock className="w-8 h-8 text-brand-purple" />
        </div>
        <div className="mb-4 flex justify-center">
          <PremiumBadge size="lg" glow />
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {decision.reason === "disabled" &&
            "AI Building Photo Estimation is currently disabled."}
          {decision.reason === "limit_reached" &&
            `You've used all ${usage?.limit ?? 0} free estimations for today. Come back tomorrow!`}
          {decision.reason === "not_subscribed" &&
            "This feature requires a premium subscription to access."}
          {decision.reason === "not_configured" &&
            "This feature is not yet configured."}
        </p>

        {config?.paidEnabled && config.paidPrice > 0 && (
          <div className="rounded-xl bg-brand-navy p-6 text-primary-foreground mb-6">
            <div className="flex justify-center mb-2">
              <PremiumBadge size="md" glow />
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(config.paidPrice)}
            </p>
            <p className="text-sm text-primary-foreground/60 mt-1">
              per estimation
            </p>
          </div>
        )}

        {"nextAction" in decision && decision.nextAction === "rewarded" && (
          <>
            {rewarded.isUnlocked ? (
              <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3 text-sm font-medium text-primary-foreground">
                <CheckCircle2 className="w-4 h-4" />
                Unlocked! Loading...
              </div>
            ) : (
              <Button
                variant="default"
                type="button"
                onClick={rewarded.requestUnlock}
                disabled={rewarded.adLoading || !adFlowReady}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rewarded.adLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Watching ad...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    {adFlowReady ? "Watch Ad to Unlock" : "Coming Soon"}
                  </>
                )}
              </Button>
            )}
            {rewarded.error && !rewarded.isUnlocked && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {rewarded.error}
              </div>
            )}
            {rewarded.config && !rewarded.config.is_enabled && (
              <p className="mt-2 text-xs text-muted-foreground">
                This feature is temporarily disabled.
              </p>
            )}
            {!adProviderReady && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ad provider not yet configured. Check back soon!
              </p>
            )}
            {(rewarded.showAdModal || rewarded.adLoading) && (
              <RewardedAdModal
                access={rewarded}
                featureName="AI Building Photo Estimation"
                features={[
                  "One AI estimation from a building photo",
                  "Full material & cost breakdown",
                  "Unlimited re-checks while unlocked",
                ]}
              />
            )}
          </>
        )}
        {"nextAction" in decision && decision.nextAction === "paid" && (
          <Button
            asChild
            variant="default"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90"
          >
            <Link to="/pricing">
              <PremiumBadge size="xs" />
              Upgrade
            </Link>
          </Button>
        )}
        {"nextAction" in decision && decision.nextAction === "login" && (
          <a
            href="/login/"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign In to Continue
          </a>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
          Access controlled by FRELUX administration
        </p>
      </div>
    </div>
  );
}

// ── Estimate result view ──
export function EstimateResultView({
  estimate,
  analysis,
  buildingPhoto,
  photoPreview,
  savedId,
  onEdit,
  onReset,
  isPaid,
  pdfGateOpen,
  pdfUnlocked,
  setPdfGateOpen,
  setPdfUnlocked,
}: {
  estimate: BuildToRoofResult;
  analysis: BuildingAnalysisResult | null;
  buildingPhoto: string | null;
  /**
   * Compressed copy the model read. Only used when the original is no longer in
   * memory, because a downscaled photo is not evidence of the building.
   */
  photoPreview?: string | null;
  savedId: string | null;
  onEdit: () => void;
  onReset: () => void;
  isPaid: boolean;
  pdfGateOpen: boolean;
  pdfUnlocked: boolean;
  setPdfGateOpen: (open: boolean) => void;
  setPdfUnlocked: (unlocked: boolean) => void;
}) {
  const [photoExpanded, setPhotoExpanded] = useState(false);
  // The photo analysis measures in square metres. That is the engine's unit,
  // not necessarily the visitor's: print, share and the screen all read the
  // floor area back in the unit their market works in.
  const { preferredAreaUnit } = useMarket();
  const areaLabel = (sqm: number | null | undefined) =>
    formatArea(Number(sqm ?? 0), { unit: preferredAreaUnit, digits: 0 });

  // One payload feeds the printed sheet and the share sheet, so the figures a
  // customer forwards can never drift from the figures they approved.
  const buildEstimateQuote = () => {
    if (!estimate) return null;
    return {
      title: `FRELUX AI Photo Estimate: ${estimate.project_name || "Building Project"}`,
      subtitle: `Generated ${new Date().toLocaleDateString()} · ${estimate.building_type || "Residential"} · ${areaLabel(estimate.total_floor_area)} · ${estimate.confidence} confidence`,
      metaRows: [
        ["Project Name", estimate.project_name || "N/A"],
        ["Building Type", estimate.building_type || "Residential"],
        ["Total Floor Area", areaLabel(estimate.total_floor_area)],
        [
          "Construction Stage",
          estimate.construction_stage || "Foundation to Roof",
        ],
        ["Confidence Level", estimate.confidence || "Standard"],
      ] as Array<[string, string]>,
      lines: estimate.stages.map((stage) => ({
        label: stage.stage_label,
        quantity: "1",
        unit: "stage",
        unit_price: formatCurrency(stage.stage_total),
        line_total: formatCurrency(stage.stage_total),
        detail: `Materials: ${formatCurrency(stage.materials_total)} · Labour: ${formatCurrency(stage.labour_total)}`,
      })),
      totals: [
        {
          label: "Materials Subtotal",
          value: formatCurrency(estimate.materials_total),
        },
        {
          label: "Labour Subtotal",
          value: formatCurrency(estimate.labour_total),
        },
        { label: "Contingency", value: formatCurrency(estimate.contingency) },
        {
          label: "Estimated Grand Total",
          value: formatCurrency(estimate.grand_total),
          strong: true,
        },
      ],
      warnings: [
        "These are preliminary estimates derived from photo analysis and structural heuristics, not a certified structural design.",
        "Final quantities and safety requirements must be verified on site by a qualified structural engineer.",
      ],
    };
  };

  const handlePrintEstimate = () => {
    const quote = buildEstimateQuote();
    if (!quote) return;
    printQuote(quote, `frelux-ai-estimate-${Date.now()}`);
  };

  return (
    <div className="space-y-6">
      {(buildingPhoto || photoPreview) && (
        <a
          href="#estimate-totals"
          className="sr-only rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip the photo and go to the totals
        </a>
      )}
      {/* The photo comes before the figures, but it must not push them off
          the screen. It is bounded, expandable, and linked full size. */}
      {(buildingPhoto || photoPreview) && (
        <section
          aria-labelledby="estimate-building-photo-title"
          data-testid="estimate-source-photo"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="estimate-building-photo-title"
                className="font-semibold text-foreground"
              >
                Photo this estimate was read from
              </h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Your uploaded photo, uncropped and at full resolution. Gemini
                read a compressed copy of it, so treat every measurement and
                cost as preliminary until they are checked on site.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhotoExpanded((open) => !open)}
                aria-expanded={photoExpanded}
                aria-controls="estimate-photo-frame"
                data-testid="estimate-photo-toggle"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {photoExpanded ? "Fit to card" : "Show full photo"}
              </button>
              <a
                href={buildingPhoto || photoPreview || undefined}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="estimate-photo-open"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open full size
              </a>
            </div>
          </div>
          <div
            id="estimate-photo-frame"
            className={`flex justify-center bg-muted/30 p-3 sm:p-5 ${
              photoExpanded ? "max-h-[85vh] overflow-auto" : "items-center"
            }`}
          >
            <img
              src={buildingPhoto || photoPreview || undefined}
              alt={`Building photo supplied for the estimate of ${estimate.project_name || "this project"}`}
              decoding="async"
              data-testid="estimate-photo-image"
              className={`block h-auto w-auto max-w-full rounded-lg object-contain ${
                photoExpanded ? "max-h-none" : "max-h-[34vh] sm:max-h-[46vh]"
              }`}
            />
          </div>
          <p className="border-t border-border/60 px-5 py-3 text-xs text-muted-foreground sm:px-6">
            The photo is kept for this visit only and is not stored with the
            saved estimate.
          </p>
        </section>
      )}

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-card shadow-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {estimate.project_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {estimate.location} · {areaLabel(estimate.total_floor_area)} ·{" "}
              {estimate.building_type}
            </p>
          </div>
          <div
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              estimate.confidence === "high"
                ? "bg-green-50 text-green-700 border-green-200"
                : estimate.confidence === "moderate"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
            }`}
          >
            {estimate.confidence === "high"
              ? "High Confidence"
              : estimate.confidence === "moderate"
                ? "Moderate Confidence"
                : "Preliminary"}
          </div>
        </div>
        {analysis && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-brand-purple">
            <BadgeCheck className="w-3.5 h-3.5" />
            AI-estimated from photo analysis · confidence:{" "}
            {analysis.ai_confidence}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          These are preliminary estimates derived from photo analysis and your
          adjustments, not a structural or geotechnical design. Final quantities
          and safety requirements must come from a qualified structural engineer
          working from actual drawings and site investigations.
        </p>
      </div>

      {/* Grand total */}
      <div
        id="estimate-totals"
        tabIndex={-1}
        className="grid gap-4 focus-visible:outline-none md:grid-cols-4"
      >
        <div className="rounded-2xl border border-border bg-brand-navy p-6 text-primary-foreground">
          <p
            data-testid="estimate-total"
            className="text-xs text-primary-foreground/60 mb-1"
          >
            Estimated Build-to-Roof Cost
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(estimate.grand_total)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Materials</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(estimate.materials_total)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Labour</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(estimate.labour_total)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Contingency</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(estimate.contingency)}
          </p>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="font-semibold text-foreground">
            Cost Breakdown by Stage
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border/50 bg-muted/50 text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">
                  Stage
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  Materials
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  Labour
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {estimate.stages.map((stage, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-6 py-3 font-medium text-foreground">
                    {stage.stage_label}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(stage.materials_total)}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(stage.labour_total)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(stage.stage_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI warnings */}
      {analysis && analysis.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-3">
            <AlertCircle aria-hidden="true" className="w-5 h-5" />
            Important Limitations
          </h3>
          <ul className="space-y-1.5">
            {analysis.warnings.map((w, i) => (
              <li
                key={i}
                className="text-sm text-amber-700 flex items-start gap-2"
              >
                <span className="text-amber-400">•</span> {w}
              </li>
            ))}
            {estimate.limitations.map((l, i) => (
              <li
                key={`l${i}`}
                className="text-sm text-amber-700 flex items-start gap-2"
              >
                <span className="text-amber-400">•</span> {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground"
        >
          ← Edit AI Parameters
        </Button>
        <div className="flex justify-center pb-3">
          <SaveToProjectButton
            calculatorType="build_to_roof"
            calculatorSlug="ai-photo-estimator"
            calcTitle={`AI Photo: ${estimate.project_name} (${areaLabel(estimate.total_floor_area)})`}
            calcData={estimate as unknown as Record<string, unknown>}
            resultSummary={{
              grand_total: estimate.grand_total,
              materials_total: estimate.materials_total,
              labour_total: estimate.labour_total,
              total_floor_area: estimate.total_floor_area,
              construction_stage: estimate.construction_stage,
              confidence: estimate.confidence,
              building_type: estimate.building_type,
            }}
            compact
            label="Save to Project Workspace"
          />
        </div>
        <div className="flex items-center gap-2">
          {savedId && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved to your projects
            </span>
          )}
          <CalculatorResetButton onReset={onReset} />
          <HowCalculatedSection
            methodologyText={methodologyText("ai-photo-estimate")}
          />
          <QuoteShareButton
            build={buildEstimateQuote}
            kind="AI Photo Estimate"
            link="/image-estimator"
          />
          <Button
            variant="ghost"
            onClick={() => {
              if (isPaid || pdfUnlocked) {
                handlePrintEstimate();
                setPdfUnlocked(false);
              } else {
                setPdfGateOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-muted/50"
          >
            <FileText className="w-4 h-4" /> Print
          </Button>
          <a
            href="/build-to-roof-estimator/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Full Manual Estimator →
          </a>
          {pdfGateOpen && (
            <PremiumFeatureGate
              featureKey="pdf_export"
              featureName="PDF Export"
              description="Print or export your estimate as PDF. One-time use, unlock each export."
              onUnlock={() => {
                setPdfUnlocked(true);
                setPdfGateOpen(false);
                handlePrintEstimate();
                setPdfUnlocked(false);
              }}
              onClose={() => setPdfGateOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Input helpers ──

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  const fieldId = useId();
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground mb-1 block"
      >
        {label}
      </label>
      <NumericInput
        id={fieldId}
        value={value}
        step={step}
        onValueChange={onChange}
        className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground focus:border-brand-purple focus:outline-none"
      />
    </div>
  );
}

function ParamField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const fieldId = useId();
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground mb-1 block"
      >
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground focus:border-brand-purple focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <EstimateDisclaimer />
    </div>
  );
}
