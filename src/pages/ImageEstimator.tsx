import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { trackAiPhotoEstimatorRewards } from "@/lib/rewards-integration";
import { supabase } from "@/lib/supabase";
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
import { unlockFeatureViaAd } from "@/lib/credits";
import { hasRewardedAdProvider } from "@/lib/ad-config";
import { logAdEvent } from "@/lib/ad-config";
import type {
  EstimationAccessConfig,
  EstimationUsageStatus,
  EstimationAccessDecision,
  BuildingAnalysisResult,
} from "@/types/premium-estimation";
import { calculateBuildToRoof } from "@/lib/estimation/build-to-roof-engine";
import type {
  BuildToRoofInput,
  BuildToRoofResult,
} from "@/types/build-to-roof";
import { formatCurrency } from "@/lib/utils";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Button } from "@/components/ui/shadcn/button";

type Phase = "upload" | "analyzing" | "review" | "result" | "locked" | "error";

// ── Rotating text slide for AI features ──
function AiFeatureSlide() {
  const messages = [
    "Detects building type, roof structure, and materials from photos",
    "Estimates dimensions, floor count, and room layout automatically",
    "Generates material quantities with Nigerian-market pricing",
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

export default function ImageEstimator() {
  useSeo({
    title: "AI Photo Estimator — AI-Assisted Preliminary Estimation | FRELUX",
    description:
      "Upload a photo of any building for AI-assisted preliminary construction estimation. AI analyzes visible features to suggest dimensions and materials. Results are preliminary — verify with actual drawings and a qualified professional.",
    keywords:
      "AI building estimator, photo to construction cost, building image analysis, Nigerian construction AI",
  });

  const { user, isAdmin, isPaid } = useAuth();
  const [phase, setPhase] = useState<Phase>("upload");
  const [config, setConfig] = useState<EstimationAccessConfig | null>(null);
  const [usage, setUsage] = useState<EstimationUsageStatus | null>(null);
  const [accessDecision, setAccessDecision] =
    useState<EstimationAccessDecision | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
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
  const [pdfGateOpen, setPdfGateOpen] = useState(false);
  const [pdfUnlocked, setPdfUnlocked] = useState(false);
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
      const clientId =
        localStorage.getItem("frelux_estimation_client_id") || "unknown";

      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-building-estimation",
        {
          body: {
            imageDataUrl: resizedImage,
            clientId,
            projectName: projectName || "AI-Estimated Building",
            location: location || "Nigeria",
          },
        },
      );

      if (fnError || !data) {
        // Edge function not deployed — fallback to manual mode
        setError(
          "The AI vision service is not yet deployed. You can still use the manual Build-to-Roof Estimator.",
        );
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
          setError(
            "Image estimation is currently disabled by the administrator.",
          );
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
      setSavedId(data.savedId ?? null);
      setPhase("review");
    } catch (err) {
      if (import.meta.env.DEV) console.error("[ImageEstimator] Error:", err);
      setError("Failed to analyze image. Please try again.");
      setPhase("error");
    }
  }, [imageDataUrl, projectName, location, resizeImage]);

  // ── Generate estimate from review ──
  const generateEstimate = useCallback(() => {
    if (!estimateInput) return;
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
    <div className="min-h-screen bg-muted/50">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-background text-primary-foreground">
        <div
          className="absolute inset-0 animate-mesh-float"
          style={{
            background: `radial-gradient(at 15% 20%, rgba(109, 40, 217, 0.25) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(34, 197, 94, 0.12) 0px, transparent 50%)`,
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-brand-purple/30 backdrop-blur-sm">
              <Camera
                aria-hidden="true"
                className="w-7 h-7 text-accent-green"
              />
              <Zap className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                AI Building Photo Estimator
              </h1>
              <AiFeatureSlide />
            </div>
          </div>
          {config && config.enabled && accessDecision?.allowed && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent-green/20 px-3 py-1 text-xs text-accent-green">
              <PremiumBadge size="xs" />
              {accessDecision.reason === "admin_override"
                ? "Admin Access"
                : accessDecision.reason === "free"
                  ? `${usage?.remaining ?? 0} free uses remaining today`
                  : "Active"}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
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
                    alt="Building"
                    className="max-h-80 mx-auto rounded-lg shadow-md"
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
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Project name (optional)
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. House on Allen Avenue"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Location
                    </label>
                    <input
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
                    <strong>AI-assisted preliminary estimate</strong> — a
                    photograph cannot determine hidden construction conditions,
                    exact dimensions, or structural integrity. Always verify
                    with actual drawings, site measurements, and a qualified
                    structural engineer.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={runEstimation}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3.5 text-sm font-bold text-primary-foreground -green/90 transition-colors"
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
              AI is detecting building type, dimensions, roof structure, and
              more.
            </p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p>✓ Uploading image</p>
              <p>✓ AI vision analysis</p>
              <p>→ Generating estimate parameters</p>
            </div>
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
                    Review the AI's estimates below and adjust if needed.
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

              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Building"
                  className="w-full max-h-64 object-cover rounded-lg mb-4"
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
                  <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 p-3">
                    <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Structural
                      Observations
                    </p>
                    <ul className="space-y-1">
                      {analysis.structural_observations.map((obs, i) => (
                        <li
                          key={i}
                          className="text-xs text-purple-600 flex items-start gap-1"
                        >
                          <span className="text-purple-400">•</span> {obs}
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
                      ⚠ Some AI parameters failed validation — verify
                      highlighted values before generating estimate.
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
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3.5 text-sm font-bold text-primary-foreground -green/90 transition-colors"
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
            savedId={savedId}
            onEdit={() => setPhase("review")}
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
      </div>
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
  const [adState, setAdState] = useState<
    "idle" | "checking" | "watching" | "verifying" | "success" | "error"
  >("idle");
  const [adError, setAdError] = useState("");
  const [adProviderReady, setAdProviderReady] = useState(false);

  useEffect(() => {
    hasRewardedAdProvider().then(setAdProviderReady);
  }, []);

  async function handleWatchAd() {
    if (adState === "watching" || adState === "verifying") return;

    setAdState("checking");
    setAdError("");

    const providerReady = await hasRewardedAdProvider();
    if (!providerReady) {
      setAdError("No ad provider is configured yet. Please check back later!");
      setAdState("error");
      return;
    }

    setAdState("watching");

    // Log impression
    const adEventId = `est_ad_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await logAdEvent({
      event_type: "impression",
      tool_key: "image_estimator",
      metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
    });

    // In production, this is where the ad SDK renders and plays the ad.
    // The SDK fires a completion callback with a verification token.
    // For now, we show a brief watching state then verify server-side.
    setAdState("verifying");

    const result = await unlockFeatureViaAd(
      "image_estimator",
      "adsense",
      adEventId,
      { source: "locked_view" },
    );

    if (result.success) {
      setAdState("success");
      await logAdEvent({
        event_type: "reward",
        tool_key: "image_estimator",
        metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
      });
      // Give user feedback before re-checking access
      setTimeout(() => {
        onUnlocked();
      }, 1000);
    } else {
      setAdError(
        result.error ??
          "Ad verification failed. No reward was granted. Please try again.",
      );
      setAdState("error");
    }
  }

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
          <div className="rounded-xl bg-background p-6 text-primary-foreground mb-6">
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
            {adState === "success" ? (
              <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-6 py-3 text-sm font-medium text-primary-foreground">
                <CheckCircle2 className="w-4 h-4" />
                Unlocked! Loading...
              </div>
            ) : adState === "error" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {adError}
                </div>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setAdState("idle");
                    setAdError("");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Zap className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                type="button"
                onClick={handleWatchAd}
                disabled={
                  adState === "watching" ||
                  adState === "verifying" ||
                  adState === "checking" ||
                  !adProviderReady
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium hover:/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adState === "watching" ||
                adState === "verifying" ||
                adState === "checking" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {adState === "watching"
                      ? "Watching ad..."
                      : adState === "checking"
                        ? "Checking..."
                        : "Verifying..."}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    {adProviderReady ? "Watch Ad to Unlock" : "Coming Soon"}
                  </>
                )}
              </Button>
            )}
            {adState === "idle" && !adProviderReady && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ad provider not yet configured. Check back soon!
              </p>
            )}
          </>
        )}
        {"nextAction" in decision && decision.nextAction === "paid" && (
          <Button
            variant="default"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium hover:/90"
          >
            <PremiumBadge size="xs" />
            Upgrade
          </Button>
        )}
        {"nextAction" in decision && decision.nextAction === "login" && (
          <a
            href="/login"
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
function EstimateResultView({
  estimate,
  analysis,
  savedId,
  onEdit,
  isPaid,
  pdfGateOpen,
  pdfUnlocked,
  setPdfGateOpen,
  setPdfUnlocked,
}: {
  estimate: BuildToRoofResult;
  analysis: BuildingAnalysisResult | null;
  savedId: string | null;
  onEdit: () => void;
  isPaid: boolean;
  pdfGateOpen: boolean;
  pdfUnlocked: boolean;
  setPdfGateOpen: (open: boolean) => void;
  setPdfUnlocked: (unlocked: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl border border-border bg-card shadow-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {estimate.project_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {estimate.location} · {estimate.total_floor_area} m² ·{" "}
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
      </div>

      {/* Grand total */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-background p-6 text-primary-foreground">
          <p className="text-xs text-primary-foreground/60 mb-1">
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
            calcTitle={`AI Photo: ${estimate.project_name} (${estimate.total_floor_area} m²)`}
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
          <Button
            variant="ghost"
            onClick={() => {
              if (isPaid || pdfUnlocked) {
                window.print();
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
            href="/build-to-roof-estimator"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Full Manual Estimator →
          </a>
          {pdfGateOpen && (
            <PremiumFeatureGate
              featureKey="pdf_export"
              featureName="PDF Export"
              description="Print or export your estimate as PDF. One-time use — unlock each export."
              onUnlock={() => {
                setPdfUnlocked(true);
                setPdfGateOpen(false);
                window.print();
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
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <select
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
    </div>
  );
}
