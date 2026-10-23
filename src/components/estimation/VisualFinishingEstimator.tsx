import React, { useState, useRef, useId } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Ruler,
  Paintbrush,
  Sparkles,
  Info,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  Maximize2,
  HelpCircle,
  Video,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  COUNTRY_OPTIONS,
  getCountryCurrency,
} from "@/lib/international/countries";
import {
  VISUAL_FINISHING_ACTIVITIES,
  KNOWN_REFERENCE_TARGETS,
  type VisualFinishingActivity,
  type VisualSurface,
  type VisualMediaInput,
  type FinishingOptions,
  type VisualFinishingEstimateResult,
  type VideoExtractionProgress,
  type MarketFinishingRates,
  type KnownReferenceTarget,
} from "@/lib/plan-vision/visual-finishing-types";
import {
  validateVisualMedia,
  calculateVisualFinishingEstimate,
  resolveMarketFinishingRates,
  scaleSurfacesByReferenceObject,
} from "@/lib/plan-vision/visual-finishing-engine";
import {
  extractKeyframesFromVideo,
  isVideoMedia,
} from "@/lib/plan-vision/video-walkthrough";
import { requestAiVisualFinishing } from "@/lib/plan-vision/ai-visual-finishing";
import { supabase } from "@/lib/supabase";

export interface VisualFinishingEstimatorProps {
  initialActivity?: VisualFinishingActivity;
  initialMarket?: string;
}

export function VisualFinishingEstimator({
  initialActivity = "painting",
  initialMarket = "NG",
}: VisualFinishingEstimatorProps) {
  // Step State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Settings
  const [activity, setActivity] =
    useState<VisualFinishingActivity>(initialActivity);
  const [marketCode, setMarketCode] = useState<string>(initialMarket);

  // Load market finishing rates when marketCode changes
  React.useEffect(() => {
    let active = true;
    setIsLoadingMarketRates(true);
    resolveMarketFinishingRates(marketCode)
      .then((rates) => {
        if (active) {
          setMarketRates(rates);
          setIsLoadingMarketRates(false);
        }
      })
      .catch(() => {
        if (active) setIsLoadingMarketRates(false);
      });
    return () => {
      active = false;
    };
  }, [marketCode]);

  // Media
  const [media, setMedia] = useState<VisualMediaInput | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [videoProgress, setVideoProgress] =
    useState<VideoExtractionProgress | null>(null);
  const [visionWarnings, setVisionWarnings] = useState<string[]>([]);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<string | null>(null);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  // Surfaces & Calibration
  const [surfaces, setSurfaces] = useState<VisualSurface[]>([]);
  const [surfaceDimensionDrafts, setSurfaceDimensionDrafts] = useState<
    Record<string, { width: string; height: string; name: string }>
  >({});
  const [calibrationWarnings, setCalibrationWarnings] = useState<string[]>([]);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);

  // Activity Specific Inputs
  const [coats, setCoats] = useState<number>(2);
  const [includeCeiling, setIncludeCeiling] = useState<boolean>(true);
  const [includePrimer, setIncludePrimer] = useState<boolean>(true);
  const [screedSystem, setScreedSystem] = useState<
    "putty" | "white_cement_paint"
  >("putty");
  const [tileWidthMm, setTileWidthMm] = useState<number>(600);
  const [tileHeightMm, setTileHeightMm] = useState<number>(600);
  const [tileMethod, setTileMethod] = useState<"adhesive" | "traditional">(
    "adhesive",
  );
  const [flooringType, setFlooringType] = useState<
    "laminate" | "vinyl" | "parquet"
  >("laminate");
  const [customUnitPrice, setCustomUnitPrice] = useState<string>("");
  const [marketRates, setMarketRates] = useState<MarketFinishingRates | null>(
    null,
  );
  const [isLoadingMarketRates, setIsLoadingMarketRates] =
    useState<boolean>(false);
  const [calibrationMode, setCalibrationMode] = useState<
    "dimensions" | "reference_target"
  >("dimensions");
  const [selectedReferenceTarget, setSelectedReferenceTarget] =
    useState<KnownReferenceTarget>("a4_sheet");
  const [customRefDimensionM, setCustomRefDimensionM] =
    useState<string>("0.297");
  const [referenceBBoxLengthPct, setReferenceBBoxLengthPct] =
    useState<string>("5");

  // Calculation Result
  const [result, setResult] = useState<VisualFinishingEstimateResult | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coatsInputId = useId();
  const customPriceInputId = useId();
  const tileWidthInputId = useId();
  const tileHeightInputId = useId();

  const applyDetectedSurfaces = (detected: VisualSurface[]) => {
    setSurfaces(detected);
    setSurfaceDimensionDrafts(
      Object.fromEntries(
        detected.map((surface) => [
          surface.id,
          {
            width: "",
            height: "",
            name: surface.name,
          },
        ]),
      ),
    );
  };

  // Handle Image or Video Walkthrough Upload
  const handleFileSelect = async (
    file: File,
    sourceType: "upload" | "camera" | "video_walkthrough",
  ) => {
    setUploadError(null);
    setVisionWarnings([]);

    if (sourceType === "video_walkthrough" || isVideoMedia(file)) {
      if (file.size <= 0) {
        setUploadError("The selected video is empty.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setUploadError("Video exceeds the 100MB limit.");
        return;
      }

      setIsProcessingMedia(true);
      setVideoProgress(null);
      try {
        const walkthrough = await extractKeyframesFromVideo(
          file,
          { intervalSec: 1.5, maxFrames: 10 },
          setVideoProgress,
        );
        if (walkthrough.keyframes.length === 0) {
          throw new Error(
            "No sharp keyframes could be extracted from the walkthrough.",
          );
        }

        const primaryFrame = walkthrough.keyframes[0];
        const mediaInput: VisualMediaInput = {
          id: `media-${Date.now()}`,
          fileName: file.name,
          mimeType: file.type || "video/mp4",
          sizeBytes: file.size,
          dataUrl: primaryFrame.dataUrl,
          widthPx: primaryFrame.width,
          heightPx: primaryFrame.height,
          capturedAt: new Date().toISOString(),
          sourceType: "video_walkthrough",
          durationSec: walkthrough.durationSec,
          keyframes: walkthrough.keyframes,
        };
        setMedia(mediaInput);
        setSelectedKeyframeIndex(0);
        setImagePreview(primaryFrame.dataUrl);

        const ai = await requestAiVisualFinishing({
          media: mediaInput,
          preferredActivity: activity,
          frameDataUrls: [primaryFrame.dataUrl],
        });
        applyDetectedSurfaces(ai.detected_surfaces);
        setVisionWarnings([
          ...walkthrough.warnings,
          ...ai.warnings,
          ...ai.scene_notes,
          "Video frames are not spatially reconstructed. Choose one view at a time; no combined multi-view quantities are produced.",
        ]);
        setIsCalibrated(false);
        setStep(2);
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Unable to process video walkthrough.",
        );
      } finally {
        setIsProcessingMedia(false);
      }
      return;
    }

    const validation = validateVisualMedia({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.ok) {
      setUploadError(validation.message ?? "Invalid media file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setSelectedKeyframeIndex(0);

      const mediaInput: VisualMediaInput = {
        id: `media-${Date.now()}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataUrl,
        capturedAt: new Date().toISOString(),
        sourceType,
      };

      setMedia(mediaInput);
      setIsProcessingMedia(true);
      try {
        const ai = await requestAiVisualFinishing({
          media: mediaInput,
          preferredActivity: activity,
        });
        applyDetectedSurfaces(ai.detected_surfaces);
        setVisionWarnings([...ai.warnings, ...ai.scene_notes]);
        setIsCalibrated(false);
        setStep(2);
      } catch {
        // Never infer surfaces when the model is unavailable.
        applyDetectedSurfaces([]);
        setVisionWarnings([
          "Gemini analysis failed. No surfaces were inferred; retry with a supported image and available AI service.",
        ]);
        setIsCalibrated(false);
        setStep(2);
      } finally {
        setIsProcessingMedia(false);
      }
    };
    reader.onerror = () => setUploadError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };

  const handleSelectKeyframe = async (index: number) => {
    const frame = media?.keyframes?.[index];
    if (!frame || !media) return;
    setSelectedKeyframeIndex(index);
    setImagePreview(frame.dataUrl);
    setIsProcessingMedia(true);
    try {
      const ai = await requestAiVisualFinishing({
        media,
        preferredActivity: activity,
        frameDataUrls: [frame.dataUrl],
      });
      applyDetectedSurfaces(ai.detected_surfaces);
      setVisionWarnings([
        ...ai.warnings,
        ...ai.scene_notes,
        "Only this selected frame is used for the current 2D estimate.",
      ]);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Each surface requires its own user-entered dimensions. No scale or dimensions
  // are inferred from the image, and opening deductions remain zero until measured.
  const handleApplyDimensions = () => {
    if (surfaces.length === 0) return;
    const missing = surfaces.filter((surface) => {
      const draft = surfaceDimensionDrafts[surface.id];
      return (
        !draft ||
        !Number.isFinite(Number(draft.width)) ||
        !Number.isFinite(Number(draft.height)) ||
        Number(draft.width) <= 0 ||
        Number(draft.height) <= 0
      );
    });
    if (missing.length > 0) {
      setCalibrationWarnings([
        `Enter positive width and height for every candidate surface (${missing.length} missing).`,
      ]);
      return;
    }
    const calibrated = surfaces.map((surface) => {
      const draft = surfaceDimensionDrafts[surface.id];
      const widthM = Number(draft.width);
      const heightM = Number(draft.height);
      const grossAreaM2 = Math.round(widthM * heightM * 100) / 100;
      return {
        ...surface,
        name: draft.name.trim() || surface.name,
        widthM,
        heightM,
        grossAreaM2,
        // Model-detected openings have no verified real-world size, so no deduction is applied.
        deductedOpeningAreaM2: 0,
        netAreaM2: grossAreaM2,
        measurementStatus: "user_confirmed" as const,
        calibrationMethod: "user_supplied" as const,
        openings: surface.openings.map((opening) => ({
          ...opening,
          widthM: null,
          heightM: null,
          areaM2: null,
          deduct: false,
        })),
        notes: [
          ...surface.notes,
          `User-entered dimensions: ${widthM}m × ${heightM}m; opening sizes remain unmeasured.`,
        ],
      };
    });
    setSurfaces(calibrated);
    setCalibrationWarnings([
      "Opening deductions are excluded because their real dimensions have not been entered.",
    ]);
    setIsCalibrated(true);
    setStep(3);
  };

  const handleApplyReferenceTarget = () => {
    if (surfaces.length === 0) return;
    const targetSpec = KNOWN_REFERENCE_TARGETS.find(
      (t) => t.id === selectedReferenceTarget,
    );
    const realM =
      selectedReferenceTarget === "custom"
        ? Number(customRefDimensionM)
        : (targetSpec?.metricDimensionM ?? 0.297);
    const bboxLengthNorm = Number(referenceBBoxLengthPct) / 100;

    if (!Number.isFinite(realM) || realM <= 0) {
      setCalibrationWarnings([
        "Enter a positive real dimension for the reference target.",
      ]);
      return;
    }
    if (
      !Number.isFinite(bboxLengthNorm) ||
      bboxLengthNorm <= 0 ||
      bboxLengthNorm > 1
    ) {
      setCalibrationWarnings([
        "Reference object image proportion must be between 1% and 100%.",
      ]);
      return;
    }

    const {
      surfaces: calibrated,
      scaleFactorMPerBBox,
      warnings,
    } = scaleSurfacesByReferenceObject(surfaces, {
      realDimensionM: realM,
      bboxNormalizedLength: bboxLengthNorm,
      targetName: targetSpec?.label ?? "Custom reference target",
    });

    setSurfaces(calibrated);
    setCalibrationWarnings([
      ...warnings,
      `Reference scale calibrated: 1.0 image coordinate = ${scaleFactorMPerBBox}m in physical space. Review or adjust individual candidate dimensions as needed.`,
    ]);
    setIsCalibrated(true);
    setStep(3);
  };

  // Save reviewed output only; raw photos and videos are not uploaded.
  const handleSaveToCloud = async () => {
    if (!result || isSavingToCloud) return;
    setIsSavingToCloud(true);
    setCloudSaveStatus(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setCloudSaveStatus("Sign in to save this estimate to your account.");
        return;
      }
      const { error } = await supabase.from("construction_extractions").insert({
        created_by: auth.user.id,
        document_kind: "visual_finishing_estimate",
        file_name: media?.fileName ?? "Visual finishing estimate",
        extraction: {
          activity: result.activity,
          marketCode: result.marketCode,
          currency: result.currency,
          surfaces: result.surfaces,
          materials: result.materials,
          provenance: result.provenance,
          missingInformation: result.missingInformation,
          warnings: result.warnings,
          createdAt: result.createdAt,
        },
        applied_fields: [],
      });
      if (error) throw error;
      setCloudSaveStatus(
        "Estimate saved privately to your account. Source media was not uploaded.",
      );
    } catch {
      setCloudSaveStatus(
        "Unable to save the estimate. Please try again later.",
      );
    } finally {
      setIsSavingToCloud(false);
    }
  };

  // Run Deterministic Calculation
  const handleCalculateEstimate = () => {
    const userPrice = customUnitPrice ? Number(customUnitPrice) : null;
    const currency = getCountryCurrency(marketCode);

    const options: FinishingOptions = {
      activity,
      marketCode,
      currency,
      currencySymbol:
        currency === "NGN"
          ? "₦"
          : currency === "USD"
            ? "$"
            : currency === "EUR"
              ? "€"
              : currency === "GBP"
                ? "£"
                : currency,
      unitSystem: "metric",
      painting: {
        qualityName: "Premium Emulsion",
        coats,
        includeCeiling,
        includePrimer,
        userPricePerBucket: userPrice,
      },
      screeding: {
        systemType: screedSystem,
        coats,
        userPricePerUnit: userPrice,
      },
      tiling: {
        surfaceType: "floor",
        method: tileMethod,
        tileWidthMm,
        tileHeightMm,
        tilesPerBox: 4,
        wastePct: 10,
        userPricePerBox: userPrice,
      },
      popCeiling: {
        workflow: marketCode === "NG" ? "nigeria" : "international",
        includeDecorative: true,
        wastePct: 10,
        userPricePerUnit: userPrice,
      },
      flooring: {
        flooringType,
        includeUnderlay: true,
        includeAdhesive: false,
        wastePct: 10,
        userPricePerPack: userPrice,
      },
    };

    const est = calculateVisualFinishingEstimate(
      surfaces,
      options,
      media?.fileName ?? "Captured Photograph",
      marketRates ?? undefined,
    );
    setResult(est);
    setStep(4);
  };

  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" /> FRELUX Visual Engine
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Phase 1 Finishing Takeoff
            </Badge>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Visual Surface Estimation
          </h2>
          <p className="text-sm text-muted-foreground">
            Photograph surfaces, confirm verified dimensions, and generate
            transparent material takeoffs.
          </p>
        </div>

        {/* Market & Country Selector */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="market-select"
            className="text-xs font-medium text-muted-foreground"
          >
            Market:
          </Label>
          <select
            id="market-select"
            value={marketCode}
            onChange={(e) => setMarketCode(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {COUNTRY_OPTIONS.map((grp) => (
              <optgroup key={grp.group} label={grp.group}>
                {grp.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* ── Workflow Stepper ── */}
      <div className="mb-6 grid grid-cols-4 gap-2 text-center text-xs font-medium">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 1
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">
            1
          </span>
          Media Input
        </button>
        <button
          disabled={!media}
          onClick={() => setStep(2)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 2
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">
            2
          </span>
          Surfaces & Dimensions
        </button>
        <button
          disabled={!isCalibrated}
          onClick={() => setStep(3)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 3
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">
            3
          </span>
          Specification
        </button>
        <button
          disabled={!result}
          onClick={() => setStep(4)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 4
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">
            4
          </span>
          Takeoff & Provenance
        </button>
      </div>

      {/* ── STEP 1: Media Input ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-semibold text-foreground">
              Select Construction Activity
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {VISUAL_FINISHING_ACTIVITIES.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivity(act.id)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                    activity === act.id
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Paintbrush className="mb-1 h-5 w-5" />
                  <span className="text-xs font-semibold">{act.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Upload or Capture Project Photo
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Photograph the room, wall or ceiling. Supported formats: JPEG,
                PNG, WebP (max 25MB).
              </p>

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="default"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Choose Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Capture with Camera
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => videoInputRef.current?.click()}
                disabled={isProcessingMedia}
              >
                <Video className="h-4 w-4" /> Upload Walkthrough Video
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f, "video_walkthrough");
                  e.currentTarget.value = "";
                }}
              />
              {isProcessingMedia && (
                <div className="mt-4 w-full max-w-sm rounded-lg bg-muted/50 p-3 text-left">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {videoProgress?.message ?? "Analysing image with Gemini..."}
                  </div>
                  {videoProgress && (
                    <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${videoProgress.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f, "upload");
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f, "camera");
                }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Measurement Honesty:</strong> A single 2D photograph
                does not carry absolute real-world dimensions. Gemini proposes
                editable 2D surface and opening candidates. Enter your own width
                and height for each candidate; the app does not infer dimensions
                or opening deductions from perspective.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Surface Detection & Dimensional Calibration ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Visual Photo with Overlays */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Visual Inspection & Overlays
              </Label>
              {visionWarnings.length > 0 && (
                <div className="space-y-1">
                  {visionWarnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300"
                    >
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
              {media?.keyframes && media.keyframes.length > 1 && (
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Review extracted video keyframes"
                >
                  {media.keyframes.map((frame, index) => (
                    <Button
                      key={`${frame.index}-${frame.timestampSec}`}
                      type="button"
                      size="sm"
                      variant={
                        selectedKeyframeIndex === index ? "default" : "outline"
                      }
                      onClick={() => void handleSelectKeyframe(index)}
                      aria-pressed={selectedKeyframeIndex === index}
                    >
                      View {index + 1} · {frame.timestampSec.toFixed(1)}s
                    </Button>
                  ))}
                </div>
              )}
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black/90">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Uploaded project"
                    className="h-full w-full object-contain opacity-80"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No image available
                  </div>
                )}
                {/* Visual landmark indicators */}
                <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between">
                  <div className="rounded bg-black/60 px-2 py-1 text-[11px] text-white w-fit backdrop-blur-sm">
                    {surfaces.length} candidate surfaces detected
                  </div>
                  <div className="rounded bg-black/60 px-2 py-1 text-[11px] text-amber-300 w-fit backdrop-blur-sm">
                    Status: Uncalibrated observations
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Review and edit 2D candidates
                </span>
                {surfaces.map((surface) => {
                  const draft = surfaceDimensionDrafts[surface.id] ?? {
                    width: "",
                    height: "",
                    name: surface.name,
                  };
                  return (
                    <div
                      key={surface.id}
                      className="space-y-2 rounded-md border border-border bg-background p-3"
                    >
                      <Label
                        htmlFor={`surface-name-${surface.id}`}
                        className="text-xs"
                      >
                        Candidate label ({surface.category})
                      </Label>
                      <Input
                        id={`surface-name-${surface.id}`}
                        value={draft.name}
                        onChange={(event) =>
                          setSurfaceDimensionDrafts((current) => ({
                            ...current,
                            [surface.id]: {
                              ...draft,
                              name: event.target.value,
                            },
                          }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor={`surface-width-${surface.id}`}
                            className="text-xs"
                          >
                            Your measured width (m)
                          </Label>
                          <Input
                            id={`surface-width-${surface.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.width}
                            onChange={(event) =>
                              setSurfaceDimensionDrafts((current) => ({
                                ...current,
                                [surface.id]: {
                                  ...draft,
                                  width: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`surface-height-${surface.id}`}
                            className="text-xs"
                          >
                            Your measured height / depth (m)
                          </Label>
                          <Input
                            id={`surface-height-${surface.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.height}
                            onChange={(event) =>
                              setSurfaceDimensionDrafts((current) => ({
                                ...current,
                                [surface.id]: {
                                  ...draft,
                                  height: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {surface.openings.length} unmeasured opening
                        candidate(s); no opening deduction will be made.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimensional Calibration & Spatial Reference */}
            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Calibration Method
                </h4>
                <p className="text-xs text-muted-foreground">
                  Choose between direct physical measurement per candidate, or
                  calibrate scale using a known reference target in the
                  photograph.
                </p>
              </div>

              {/* Mode switch */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    calibrationMode === "dimensions" ? "default" : "outline"
                  }
                  onClick={() => setCalibrationMode("dimensions")}
                  className="text-xs"
                >
                  <Ruler className="mr-1.5 h-3.5 w-3.5" /> Direct Measurements
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    calibrationMode === "reference_target"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setCalibrationMode("reference_target")}
                  className="text-xs"
                >
                  <Maximize2 className="mr-1.5 h-3.5 w-3.5" /> Reference Target
                  Scale
                </Button>
              </div>

              {calibrationMode === "dimensions" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Explicitly enter measured width and height for each detected
                    candidate in the left panel. No unverified geometry is
                    assumed.
                  </p>
                  <Button
                    onClick={handleApplyDimensions}
                    className="w-full gap-2"
                    disabled={surfaces.length === 0 || isProcessingMedia}
                  >
                    <Ruler className="h-4 w-4" /> Confirm entered dimensions
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="ref-target-select"
                      className="text-xs font-semibold"
                    >
                      Known Reference Target in Scene
                    </Label>
                    <select
                      id="ref-target-select"
                      value={selectedReferenceTarget}
                      onChange={(e) =>
                        setSelectedReferenceTarget(
                          e.target.value as KnownReferenceTarget,
                        )
                      }
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {KNOWN_REFERENCE_TARGETS.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.label} ({target.metricDimensionM}m)
                        </option>
                      ))}
                      <option value="custom">Custom Dimension Target</option>
                    </select>
                  </div>

                  {selectedReferenceTarget === "custom" && (
                    <div>
                      <Label htmlFor="custom-ref-dim" className="text-xs">
                        Custom Real Dimension (m)
                      </Label>
                      <Input
                        id="custom-ref-dim"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customRefDimensionM}
                        onChange={(e) => setCustomRefDimensionM(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="ref-target-bbox-pct" className="text-xs">
                      Reference Object Image Proportion (% of frame dimension)
                    </Label>
                    <Input
                      id="ref-target-bbox-pct"
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={referenceBBoxLengthPct}
                      onChange={(e) =>
                        setReferenceBBoxLengthPct(e.target.value)
                      }
                      className="text-xs"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Percentage of the image axis occupied by the reference
                      object (e.g. 5% = 0.05 normalized).
                    </p>
                  </div>

                  <Button
                    onClick={handleApplyReferenceTarget}
                    className="w-full gap-2"
                    disabled={surfaces.length === 0 || isProcessingMedia}
                  >
                    <Maximize2 className="h-4 w-4" /> Calibrate via Reference
                    Target
                  </Button>
                </div>
              )}

              {calibrationWarnings.length > 0 && (
                <div
                  className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
                  role="status"
                >
                  {calibrationWarnings.map((warning, index) => (
                    <div key={index}>{warning}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Specification & Parameters ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="text-sm font-bold text-foreground">
              Activity Specification: {activity.toUpperCase()}
            </h4>
            <p className="text-xs text-muted-foreground">
              Configure product coverage options, coats, and optional user
              prices for market {marketCode}.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activity === "painting" && (
                <>
                  <div>
                    <Label htmlFor={coatsInputId} className="text-xs">
                      Coats of Paint
                    </Label>
                    <Input
                      id={coatsInputId}
                      type="number"
                      min="1"
                      max="4"
                      value={coats}
                      onChange={(e) =>
                        setCoats(parseInt(e.target.value, 10) || 2)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={includeCeiling}
                        onChange={(e) => setIncludeCeiling(e.target.checked)}
                        className="rounded border-input"
                      />
                      Include Ceiling Painting
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={includePrimer}
                        onChange={(e) => setIncludePrimer(e.target.checked)}
                        className="rounded border-input"
                      />
                      Include Undercoat / Primer
                    </label>
                  </div>
                </>
              )}

              {activity === "screeding" && (
                <div>
                  <Label htmlFor="screed-system" className="text-xs">
                    Screeding System
                  </Label>
                  <select
                    id="screed-system"
                    value={screedSystem}
                    onChange={(e) =>
                      setScreedSystem(
                        e.target.value as "putty" | "white_cement_paint",
                      )
                    }
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="putty">Acrylic Wall Putty System</option>
                    <option value="white_cement_paint">
                      White Cement + Screeding Paint Mix
                    </option>
                  </select>
                </div>
              )}

              {activity === "tiling" && (
                <>
                  <div>
                    <Label htmlFor={tileWidthInputId} className="text-xs">
                      Tile Width (mm)
                    </Label>
                    <Input
                      id={tileWidthInputId}
                      type="number"
                      step="50"
                      value={tileWidthMm}
                      onChange={(e) =>
                        setTileWidthMm(parseInt(e.target.value, 10) || 600)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={tileHeightInputId} className="text-xs">
                      Tile Height (mm)
                    </Label>
                    <Input
                      id={tileHeightInputId}
                      type="number"
                      step="50"
                      value={tileHeightMm}
                      onChange={(e) =>
                        setTileHeightMm(parseInt(e.target.value, 10) || 600)
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {activity === "flooring" && (
                <div>
                  <Label htmlFor="flooring-type" className="text-xs">
                    Flooring Product
                  </Label>
                  <select
                    id="flooring-type"
                    value={flooringType}
                    onChange={(e) =>
                      setFlooringType(
                        e.target.value as "laminate" | "vinyl" | "parquet",
                      )
                    }
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="laminate">Laminate Planks (Packs)</option>
                    <option value="vinyl">Luxury Vinyl Tile (LVT)</option>
                    <option value="parquet">Engineered Hardwood Parquet</option>
                  </select>
                </div>
              )}

              {/* Market Intelligence & Live Pricebook status */}
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Market Pricebook Status ({marketCode} ·{" "}
                    {getCountryCurrency(marketCode)})
                  </span>
                  {isLoadingMarketRates ? (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Querying DB
                    </span>
                  ) : marketRates?.source === "verified_db" ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500 text-emerald-600 bg-emerald-500/10 text-[10px]"
                    >
                      Verified DB Rates
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-600 bg-amber-500/10 text-[10px]"
                    >
                      Price Unavailable
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {marketRates?.provenanceNote ??
                    "No verified database prices for this market. Enter your supplier rate below."}
                </p>
                {marketRates?.paintBucketPrice && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified Paint: {marketRates.currencySymbol}
                    {marketRates.paintBucketPrice.toLocaleString()} / bucket
                  </p>
                )}
                {marketRates?.tileBoxPrice && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified Tile: {marketRates.currencySymbol}
                    {marketRates.tileBoxPrice.toLocaleString()} / box
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor={customPriceInputId}
                  className="text-xs font-semibold"
                >
                  Manual Unit Price Override ({getCountryCurrency(marketCode)})
                </Label>
                <Input
                  id={customPriceInputId}
                  type="number"
                  placeholder={
                    marketRates?.paintBucketPrice
                      ? `Default: ${marketRates.paintBucketPrice}`
                      : "e.g. 35000"
                  }
                  value={customUnitPrice}
                  onChange={(e) => setCustomUnitPrice(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Overrides database rates. If no database or manual rate is
                  provided, cost displays honestly as price unavailable.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleCalculateEstimate} className="gap-2">
                <Sparkles className="h-4 w-4" /> Calculate Material Takeoff
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Quantified Estimate & Provenance ── */}
      {step === 4 && result && (
        <div className="space-y-6">
          {/* Surface Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-xs text-muted-foreground">
                Gross Surface Area
              </span>
              <div className="text-xl font-bold text-foreground">
                {result.totalGrossAreaM2} m²
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-xs text-muted-foreground">
                Openings Deducted
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                -{result.totalOpeningDeductionM2} m²
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-xs text-muted-foreground">
                Net Quantified Area
              </span>
              <div className="text-xl font-bold text-primary">
                {result.totalNetAreaM2} m²
              </div>
            </div>
          </div>

          {/* Materials Table */}
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">
                Material Quantities & Breakdown
              </h4>
              <Badge variant={result.isFullyPriced ? "default" : "secondary"}>
                {result.isFullyPriced
                  ? "Fully Priced"
                  : "Quantities Verified / Prices Unconfigured"}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Material</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Package Sizing</th>
                    <th className="px-4 py-2">Unit Price</th>
                    <th className="px-4 py-2">Total Cost</th>
                    <th className="px-4 py-2">Price Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.materials.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {m.name}
                      </td>
                      <td className="px-4 py-3">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="px-4 py-3">
                        {m.packageCount
                          ? `${m.packageCount} × ${m.packageUnit}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {m.unitPrice != null
                          ? `${result.currencySymbol}${m.unitPrice.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {m.totalCost != null
                          ? `${result.currencySymbol}${m.totalCost.toLocaleString()}`
                          : "Price not configured"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            m.priceStatus === "verified"
                              ? "default"
                              : m.priceStatus === "user_provided"
                                ? "outline"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {m.priceStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Subtotal Material Cost
              </span>
              <span className="text-base font-bold text-primary">
                {result.subtotalMaterialCost != null
                  ? `${result.currencySymbol}${result.subtotalMaterialCost.toLocaleString()}`
                  : "Requires local unit prices"}
              </span>
            </div>
          </div>

          {/* Provenance and Audit Trail */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Provenance & Engineering Audit Trail
              </h5>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Source Media:</span>
                <div className="font-medium text-foreground">
                  {result.provenance.mediaSource}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Calibration Method:
                </span>
                <div className="font-medium text-foreground">
                  {result.provenance.calibrationMethod}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Surface Detection Confidence:
                </span>
                <div className="font-medium text-foreground">
                  Model candidate scores shown per surface; not a validated
                  accuracy percentage
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Quantity Engine Confidence:
                </span>
                <div className="font-medium text-foreground">
                  Deterministic formulas used; inputs still require review
                </div>
              </div>
            </div>

            {result.auditSteps.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Calculation Steps:
                </span>
                {result.auditSteps.map((st, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">{st.label}:</strong>{" "}
                    {st.detail}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Adjust Dimensions
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToCloud}
                disabled={isSavingToCloud}
                className="gap-1"
              >
                {isSavingToCloud ? "Saving…" : "Save to Cloud"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1"
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF Export
              </Button>
              <Button size="sm" onClick={() => setStep(1)} className="gap-1">
                Start New Estimate
              </Button>
            </div>
            {cloudSaveStatus && (
              <p role="status" className="text-xs text-muted-foreground">
                {cloudSaveStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualFinishingEstimator;
