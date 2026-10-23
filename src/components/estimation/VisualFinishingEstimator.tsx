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
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Badge } from "@/components/ui/shadcn/badge";
import { COUNTRY_OPTIONS, getCountryCurrency } from "@/lib/international/countries";
import {
  VISUAL_FINISHING_ACTIVITIES,
  type VisualFinishingActivity,
  type VisualSurface,
  type VisualMediaInput,
  type CalibrationData,
  type FinishingOptions,
  type VisualFinishingEstimateResult,
} from "@/lib/plan-vision/visual-finishing-types";
import {
  validateVisualMedia,
  detectVisualSurfaces,
  applyCalibrationToSurfaces,
  calculateVisualFinishingEstimate,
} from "@/lib/plan-vision/visual-finishing-engine";

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
  const [activity, setActivity] = useState<VisualFinishingActivity>(initialActivity);
  const [marketCode, setMarketCode] = useState<string>(initialMarket);

  // Media
  const [media, setMedia] = useState<VisualMediaInput | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Surfaces & Calibration
  const [surfaces, setSurfaces] = useState<VisualSurface[]>([]);
  const [roomLengthM, setRoomLengthM] = useState<number>(5.0);
  const [roomWidthM, setRoomWidthM] = useState<number>(4.0);
  const [wallHeightM, setWallHeightM] = useState<number>(2.8);
  const [calibrationWarnings, setCalibrationWarnings] = useState<string[]>([]);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);

  // Activity Specific Inputs
  const [coats, setCoats] = useState<number>(2);
  const [includeCeiling, setIncludeCeiling] = useState<boolean>(true);
  const [includePrimer, setIncludePrimer] = useState<boolean>(true);
  const [screedSystem, setScreedSystem] = useState<"putty" | "white_cement_paint">("putty");
  const [tileWidthMm, setTileWidthMm] = useState<number>(600);
  const [tileHeightMm, setTileHeightMm] = useState<number>(600);
  const [tileMethod, setTileMethod] = useState<"adhesive" | "traditional">("adhesive");
  const [flooringType, setFlooringType] = useState<"laminate" | "vinyl" | "parquet">("laminate");
  const [customUnitPrice, setCustomUnitPrice] = useState<string>("");

  // Calculation Result
  const [result, setResult] = useState<VisualFinishingEstimateResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const lengthInputId = useId();
  const widthInputId = useId();
  const heightInputId = useId();
  const coatsInputId = useId();
  const customPriceInputId = useId();
  const tileWidthInputId = useId();
  const tileHeightInputId = useId();

  // Handle File Change
  const handleFileSelect = (file: File, sourceType: "upload" | "camera") => {
    setUploadError(null);
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
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);

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

      // Trigger Visual Intelligence: surface extraction
      const detected = detectVisualSurfaces(mediaInput, activity);
      setSurfaces(detected);
      setIsCalibrated(false);
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  // Run Calibration
  const handleApplyDimensions = () => {
    if (!roomLengthM || !roomWidthM || !wallHeightM) return;

    const calib: CalibrationData = {
      method: "user_supplied",
      roomLengthM: Number(roomLengthM),
      roomWidthM: Number(roomWidthM),
      wallHeightM: Number(wallHeightM),
      ceilingHeightM: Number(wallHeightM),
      isCalibrated: true,
    };

    const calibrated = applyCalibrationToSurfaces(surfaces, calib);
    setSurfaces(calibrated.surfaces);
    setCalibrationWarnings(calibrated.warnings);
    setIsCalibrated(true);
    setStep(3);
  };

  // Run Deterministic Calculation
  const handleCalculateEstimate = () => {
    const userPrice = customUnitPrice ? Number(customUnitPrice) : null;
    const currency = getCountryCurrency(marketCode);

    const options: FinishingOptions = {
      activity,
      marketCode,
      currency,
      currencySymbol: currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency,
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

    const est = calculateVisualFinishingEstimate(surfaces, options, media?.fileName ?? "Captured Photograph");
    setResult(est);
    setStep(4);
  };

  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
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
            Photograph surfaces, confirm verified dimensions, and generate transparent material takeoffs.
          </p>
        </div>

        {/* Market & Country Selector */}
        <div className="flex items-center gap-2">
          <Label htmlFor="market-select" className="text-xs font-medium text-muted-foreground">
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
            step === 1 ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">1</span>
          Media Input
        </button>
        <button
          disabled={!media}
          onClick={() => setStep(2)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 2 ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">2</span>
          Surfaces & Dimensions
        </button>
        <button
          disabled={!isCalibrated}
          onClick={() => setStep(3)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 3 ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">3</span>
          Specification
        </button>
        <button
          disabled={!result}
          onClick={() => setStep(4)}
          className={`flex items-center justify-center gap-1 rounded-md py-2 border transition-colors ${
            step === 4 ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px]">4</span>
          Takeoff & Provenance
        </button>
      </div>

      {/* ── STEP 1: Media Input ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-semibold text-foreground">Select Construction Activity</Label>
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
              <h3 className="text-base font-semibold text-foreground">Upload or Capture Project Photo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Photograph the room, wall or ceiling. Supported formats: JPEG, PNG, WebP (max 25MB).
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
                <strong>Measurement Honesty:</strong> A single 2D photograph does not carry absolute real-world dimensions.
                The engine detects visual surface boundaries and candidate door/window openings, then asks you to confirm room dimensions or provide a known reference scale.
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
              <Label className="text-sm font-semibold">Visual Inspection & Overlays</Label>
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

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detected Planes
                </span>
                {surfaces.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-border bg-background p-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="ml-2 text-muted-foreground">({s.category})</span>
                    </div>
                    <Badge variant={s.measurementStatus === "user_confirmed" ? "default" : "outline"}>
                      {s.measurementStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Calibration & Dimension Input */}
            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Real-World Room Dimensions</h4>
                <p className="text-xs text-muted-foreground">
                  Enter real measurements to ground the detected surfaces into metric meters and square meters.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={lengthInputId} className="text-xs">Length (m)</Label>
                  <Input
                    id={lengthInputId}
                    type="number"
                    step="0.1"
                    min="1"
                    value={roomLengthM}
                    onChange={(e) => setRoomLengthM(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={widthInputId} className="text-xs">Width (m)</Label>
                  <Input
                    id={widthInputId}
                    type="number"
                    step="0.1"
                    min="1"
                    value={roomWidthM}
                    onChange={(e) => setRoomWidthM(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={heightInputId} className="text-xs">Wall Height (m)</Label>
                  <Input
                    id={heightInputId}
                    type="number"
                    step="0.1"
                    min="1"
                    value={wallHeightM}
                    onChange={(e) => setWallHeightM(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {calibrationWarnings.length > 0 && (
                <div className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                  {calibrationWarnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Button onClick={handleApplyDimensions} className="w-full gap-2">
                  <Ruler className="h-4 w-4" /> Confirm & Calibrate Surfaces
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Specification & Parameters ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="text-sm font-bold text-foreground">Activity Specification: {activity.toUpperCase()}</h4>
            <p className="text-xs text-muted-foreground">
              Configure product coverage options, coats, and optional user prices for market {marketCode}.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activity === "painting" && (
                <>
                  <div>
                    <Label htmlFor={coatsInputId} className="text-xs">Coats of Paint</Label>
                    <Input
                      id={coatsInputId}
                      type="number"
                      min="1"
                      max="4"
                      value={coats}
                      onChange={(e) => setCoats(parseInt(e.target.value, 10) || 2)}
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
                  <Label htmlFor="screed-system" className="text-xs">Screeding System</Label>
                  <select
                    id="screed-system"
                    value={screedSystem}
                    onChange={(e) => setScreedSystem(e.target.value as "putty" | "white_cement_paint")}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="putty">Acrylic Wall Putty System</option>
                    <option value="white_cement_paint">White Cement + Screeding Paint Mix</option>
                  </select>
                </div>
              )}

              {activity === "tiling" && (
                <>
                  <div>
                    <Label htmlFor={tileWidthInputId} className="text-xs">Tile Width (mm)</Label>
                    <Input
                      id={tileWidthInputId}
                      type="number"
                      step="50"
                      value={tileWidthMm}
                      onChange={(e) => setTileWidthMm(parseInt(e.target.value, 10) || 600)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={tileHeightInputId} className="text-xs">Tile Height (mm)</Label>
                    <Input
                      id={tileHeightInputId}
                      type="number"
                      step="50"
                      value={tileHeightMm}
                      onChange={(e) => setTileHeightMm(parseInt(e.target.value, 10) || 600)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {activity === "flooring" && (
                <div>
                  <Label htmlFor="flooring-type" className="text-xs">Flooring Product</Label>
                  <select
                    id="flooring-type"
                    value={flooringType}
                    onChange={(e) => setFlooringType(e.target.value as "laminate" | "vinyl" | "parquet")}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="laminate">Laminate Planks (Packs)</option>
                    <option value="vinyl">Luxury Vinyl Tile (LVT)</option>
                    <option value="parquet">Engineered Hardwood Parquet</option>
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor={customPriceInputId} className="text-xs">
                  User Unit Price (Optional - overrides or fills missing market price)
                </Label>
                <Input
                  id={customPriceInputId}
                  type="number"
                  placeholder="e.g. 35000"
                  value={customUnitPrice}
                  onChange={(e) => setCustomUnitPrice(e.target.value)}
                  className="mt-1"
                />
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
              <span className="text-xs text-muted-foreground">Gross Surface Area</span>
              <div className="text-xl font-bold text-foreground">{result.totalGrossAreaM2} m²</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-xs text-muted-foreground">Openings Deducted</span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                -{result.totalOpeningDeductionM2} m²
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-center">
              <span className="text-xs text-muted-foreground">Net Quantified Area</span>
              <div className="text-xl font-bold text-primary">{result.totalNetAreaM2} m²</div>
            </div>
          </div>

          {/* Materials Table */}
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Material Quantities & Breakdown</h4>
              <Badge variant={result.isFullyPriced ? "default" : "secondary"}>
                {result.isFullyPriced ? "Fully Priced" : "Quantities Verified / Prices Unconfigured"}
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
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="px-4 py-3">
                        {m.packageCount ? `${m.packageCount} × ${m.packageUnit}` : "—"}
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
              <span className="text-xs font-semibold text-foreground">Subtotal Material Cost</span>
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
                <div className="font-medium text-foreground">{result.provenance.mediaSource}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Calibration Method:</span>
                <div className="font-medium text-foreground">{result.provenance.calibrationMethod}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Surface Detection Confidence:</span>
                <div className="font-medium text-foreground">
                  {(result.confidenceBreakdown.surfaceDetection * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Quantity Engine Confidence:</span>
                <div className="font-medium text-foreground">
                  {(result.confidenceBreakdown.quantityEngine * 100).toFixed(0)}% (Deterministic)
                </div>
              </div>
            </div>

            {result.auditSteps.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Calculation Steps:</span>
                {result.auditSteps.map((st, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">{st.label}:</strong> {st.detail}
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
                <Printer className="h-3.5 w-3.5" /> Print / PDF Export
              </Button>
              <Button size="sm" onClick={() => setStep(1)} className="gap-1">
                Start New Estimate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualFinishingEstimator;
