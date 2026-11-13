import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import type { BoreholeSystemResult } from "@/lib/estimation/borehole-water-system-engine";

interface Props {
  result: BoreholeSystemResult;
  className?: string;
}

export default function BoreholeWaterSystemAnimation({
  result,
  className = "",
}: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<number | null>(null);

  const steps = result.installationSteps;
  const currentStep = steps[activeStep] ?? steps[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    timerRef.current = window.setTimeout(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeStep, steps.length, reducedMotion]);

  const handlePlayToggle = () => {
    if (activeStep >= steps.length - 1 && !isPlaying) {
      setActiveStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setActiveStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  // Visual state flags based on activeStep
  const showDrilling = activeStep >= 0;
  const showCasingAndGrout = activeStep >= 1;
  const showPumpAndCheckValves = activeStep >= 2;
  const showTreatmentTrain = activeStep >= 3;
  const showTowerAndTank = activeStep >= 4;
  const showAutomationSensors = activeStep >= 5;
  const showBuriedPipeAndTap = activeStep >= 6;

  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-sky-500 animate-pulse" />
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              Autonomous Borehole Water Supply System Cutaway
            </h3>
            <p className="text-xs text-muted-foreground">
              Groundwater abstraction • Hydraulic lift • Multi-barrier treatment
              • Tower rush buffer • Gravity reticulation
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={activeStep === 0}
            className="h-8 w-8 p-0"
            aria-label="Previous engineering step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
            onClick={handlePlayToggle}
            className="h-8 px-3 gap-1.5 text-xs font-medium"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Play Sequence
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={activeStep === steps.length - 1}
            className="h-8 w-8 p-0"
            aria-label="Next engineering step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Reset sequence to start"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Step Indicators / Tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-border bg-muted/20 p-1 text-center text-xs sm:grid-cols-7">
        {steps.map((st, idx) => (
          <button
            key={st.id}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStep(idx);
            }}
            className={`rounded px-1.5 py-1.5 text-[11px] font-medium transition-all ${
              activeStep === idx
                ? "bg-primary text-primary-foreground shadow-sm"
                : activeStep > idx
                  ? "bg-primary/15 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="hidden sm:inline">Step </span>
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Stage notes on phones: in the flow above the drawing, never on top of it */}
      <div
        data-testid="cutaway-notes-mobile"
        className="md:hidden border-b border-border bg-muted/20 p-3"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              Stage {activeStep + 1} of {steps.length}: {currentStep.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {currentStep.detail}
            </p>
            {currentStep.check && (
              <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>QA Gate: {currentStep.check}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Visual SVG Cutaway Diagram */}
      <div className="relative aspect-[5/3] w-full max-h-[520px] md:aspect-[16/9] bg-gradient-to-b from-sky-50/50 via-background to-amber-950/20 dark:from-slate-950 dark:via-background dark:to-stone-950 border-b border-border p-2">
        <svg
          viewBox="0 0 1000 580"
          className="w-full h-full select-none"
          role="img"
          aria-label={`Interactive engineering cutaway illustrating step ${activeStep + 1}: ${currentStep.title}`}
        >
          <defs>
            {/* Ground Gradients */}
            <linearGradient id="topsoilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8d6e63" />
              <stop offset="100%" stopColor="#6d4c41" />
            </linearGradient>
            <linearGradient id="clayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bcaaa4" />
              <stop offset="100%" stopColor="#8d6e63" />
            </linearGradient>
            <linearGradient id="transitionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78909c" />
              <stop offset="100%" stopColor="#546e7a" />
            </linearGradient>
            <linearGradient id="aquiferGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#37474f" />
              <stop offset="100%" stopColor="#263238" />
            </linearGradient>

            {/* Water Gradient */}
            <linearGradient id="waterFlowGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Tank Water Level */}
            <linearGradient id="tankWaterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>

            {/* Grout Texture */}
            <pattern
              id="groutPattern"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <rect width="10" height="10" fill="#9e9e9e" />
              <circle cx="2" cy="2" r="1.5" fill="#616161" />
              <circle cx="7" cy="7" r="1.5" fill="#757575" />
            </pattern>

            {/* Gravel Pack Pattern */}
            <pattern
              id="gravelPattern"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="3" cy="3" r="2.5" fill="#ffb74d" />
              <circle cx="9" cy="9" r="2" fill="#ffa726" />
              <circle cx="9" cy="3" r="1.5" fill="#ffe082" />
            </pattern>
          </defs>

          {/* ──────────────── SURFACE WORLD (Top 220px) ──────────────── */}
          {/* Sky / Air Background */}
          <rect x="0" y="0" width="1000" height="220" fill="transparent" />

          {/* Ground Line */}
          <line
            x1="0"
            y1="220"
            x2="1000"
            y2="220"
            stroke="#4e342e"
            strokeWidth="4"
          />
          <text x="15" y="212" fill="#8d6e63" fontSize="11" fontWeight="bold">
            GROUND SURFACE EL. ±0.00 m
          </text>

          {/* ──────────────── SUB-SURFACE GEOLOGICAL STRATA (y: 220 to 580) ──────────────── */}
          {/* Stratum 1: Topsoil (220 to 260) */}
          <rect
            x="0"
            y="220"
            width="1000"
            height="40"
            fill="url(#topsoilGrad)"
            opacity="0.9"
          />
          <text x="15" y="245" fill="#efebe9" fontSize="10" fontWeight="bold">
            0 - 3m: Topsoil & Loose Overburden
          </text>

          {/* Stratum 2: Impermeable Clay / Silt Aquitard (260 to 350) */}
          <rect
            x="0"
            y="260"
            width="1000"
            height="90"
            fill="url(#clayGrad)"
            opacity="0.85"
          />
          <text x="15" y="305" fill="#efebe9" fontSize="10" fontWeight="bold">
            3 - 18m: Impermeable Clay Silt Aquitard (Surface Runoff Barrier)
          </text>

          {/* Stratum 3: Transition Weathered Zone (350 to 450) */}
          <rect
            x="0"
            y="350"
            width="1000"
            height="100"
            fill="url(#transitionGrad)"
            opacity="0.9"
          />
          <text x="15" y="400" fill="#eceff1" fontSize="10" fontWeight="bold">
            18 - 45m: Weathered Sandstone / Saprolite
          </text>

          {/* Stratum 4: Target Groundwater Aquifer (450 to 580) */}
          <rect
            x="0"
            y="450"
            width="1000"
            height="130"
            fill="url(#aquiferGrad)"
          />
          {/* Aquifer Water Table Shimmer */}
          <rect
            x="0"
            y="450"
            width="1000"
            height="130"
            fill="#0284c7"
            opacity="0.15"
          />
          <text x="15" y="480" fill="#38bdf8" fontSize="11" fontWeight="bold">
            45 - {result.well.totalDepthMeters}m: TARGET GROUNDWATER AQUIFER
            (Recharge Zone)
          </text>
          <text x="15" y="496" fill="#bae6fd" fontSize="9">
            Static Water Level: {result.pumping.staticWaterLevelMeters}m |
            Yield: {result.pumping.designFlowRateM3PerHour} m³/h (
            {result.pumping.designFlowRateGpm} GPM)
          </text>

          {/* ──────────────── STEP 1: BOREHOLE WELLBORE (Center at x=140) ──────────────── */}
          {/* Drilled Hole */}
          {showDrilling && (
            <g id="borehole-drilled-shaft">
              {/* Drilled Borehole Cavity (width 40px) */}
              <rect
                x="120"
                y="220"
                width="40"
                height="340"
                fill="#1e293b"
                opacity="0.75"
              />
              <line
                x1="120"
                y1="220"
                x2="120"
                y2="560"
                stroke="#0f172a"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <line
                x1="160"
                y1="220"
                x2="160"
                y2="560"
                stroke="#0f172a"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* ──────────────── STEP 2: CASING, SCREEN, GRAVEL PACK & SANITARY GROUT ──────────────── */}
          {showCasingAndGrout && (
            <g id="casing-and-grouting">
              {/* Sanitary Grout Annular Seal (y: 220 to 300, outer annular space) */}
              <rect
                x="120"
                y="220"
                width="8"
                height="85"
                fill="url(#groutPattern)"
                stroke="#757575"
                strokeWidth="1"
              />
              <rect
                x="152"
                y="220"
                width="8"
                height="85"
                fill="url(#groutPattern)"
                stroke="#757575"
                strokeWidth="1"
              />
              <text
                x="170"
                y="255"
                fill="#fbbf24"
                fontSize="9"
                fontWeight="bold"
              >
                ▲ Sanitary Annular Grout Seal (
                {result.well.sanitaryGroutDepthMeters}m depth)
              </text>
              <text x="170" y="268" fill="#d4d4d8" fontSize="8">
                {result.well.sanitaryGroutCementBags50kg} bags cement +
                bentonite (Blocks surface runoff)
              </text>

              {/* Gravel Pack Envelope around Screen (y: 440 to 560, outer annular space) */}
              <rect
                x="120"
                y="440"
                width="8"
                height="120"
                fill="url(#gravelPattern)"
              />
              <rect
                x="152"
                y="440"
                width="8"
                height="120"
                fill="url(#gravelPattern)"
              />
              <text
                x="170"
                y="455"
                fill="#f59e0b"
                fontSize="9"
                fontWeight="bold"
              >
                ▲ Graded Silica Gravel Pack
              </text>
              <text x="170" y="467" fill="#d4d4d8" fontSize="8">
                {result.well.gravelPackBags25kg} bags (Filters sand, maximizes
                inflow)
              </text>

              {/* Casing Pipe Walls (width 24px: x: 128 to 152) */}
              {/* Upper Plain Casing */}
              <rect
                x="128"
                y="200"
                width="24"
                height="260"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1.5"
              />
              {/* Slotted Well Screen (Perforated slots) */}
              <rect
                x="128"
                y="460"
                width="24"
                height="100"
                fill="#94a3b8"
                stroke="#334155"
                strokeWidth="1.5"
              />
              {/* Screen Slot Horizontal Marks */}
              {[465, 475, 485, 495, 505, 515, 525, 535, 545, 555].map(
                (ySlot) => (
                  <line
                    key={ySlot}
                    x1="128"
                    y1={ySlot}
                    x2="152"
                    y2={ySlot}
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                ),
              )}

              {/* Sanitary Wellhead Cap */}
              <rect
                x="122"
                y="195"
                width="36"
                height="10"
                rx="2"
                fill="#475569"
                stroke="#1e293b"
                strokeWidth="2"
              />
              <circle cx="140" cy="200" r="2" fill="#38bdf8" />
            </g>
          )}

          {/* ──────────────── STEP 3: SUBMERSIBLE PUMP, RISER & CHECK VALVES ──────────────── */}
          {showPumpAndCheckValves && (
            <g id="pump-and-riser-hydraulics">
              {/* Drop Column Riser Pipe (x=138, width=5) */}
              <rect
                x="138"
                y="195"
                width="4"
                height="260"
                fill="#0284c7"
                stroke="#0369a1"
                strokeWidth="1"
              />

              {/* Submersible Pump Body (suspended at y: 440 to 470) */}
              <rect
                x="133"
                y="430"
                width="14"
                height="35"
                rx="3"
                fill="#059669"
                stroke="#047857"
                strokeWidth="1.5"
              />
              {/* Pump Intake Screen */}
              <line
                x1="134"
                y1="452"
                x2="146"
                y2="452"
                stroke="#f1f5f9"
                strokeWidth="2"
                strokeDasharray="1 1"
              />
              {/* Motor Section below pump */}
              <rect
                x="133"
                y="467"
                width="14"
                height="28"
                rx="2"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="1"
              />
              <text
                x="155"
                y="438"
                fill="#10b981"
                fontSize="9"
                fontWeight="bold"
              >
                ◄ {result.pumping.recommendedMotorHp} HP Submersible Pump
              </text>
              <text x="155" y="449" fill="#d1fae5" fontSize="8">
                Setting: {result.pumping.pumpSettingDepthMeters}m | TDH:{" "}
                {result.pumping.totalDynamicHeadMeters}m (
                {result.pumping.totalDynamicHeadFeet} ft)
              </text>

              {/* Non-Return Spring-Loaded Check Valve (Directly on pump collar) */}
              <rect
                x="135"
                y="420"
                width="10"
                height="10"
                fill="#f59e0b"
                stroke="#b45309"
                strokeWidth="1"
              />
              <polygon points="137,428 143,428 140,422" fill="#ffffff" />
              <text
                x="155"
                y="425"
                fill="#f59e0b"
                fontSize="8"
                fontWeight="bold"
              >
                ◄ Spring Check Valve #1 (Eliminates Backdrain & Water Hammer)
              </text>

              {/* Intermediate Check Valve if deep */}
              {result.pumping.checkValves.length > 1 && (
                <>
                  <rect
                    x="135"
                    y="320"
                    width="10"
                    height="10"
                    fill="#f59e0b"
                    stroke="#b45309"
                    strokeWidth="1"
                  />
                  <polygon points="137,328 143,328 140,322" fill="#ffffff" />
                  <text x="155" y="325" fill="#f59e0b" fontSize="8">
                    ◄ Intermediate Check Valve #2 (Shock Dissipation)
                  </text>
                </>
              )}

              {/* Safety Stainless Wire Rope & Electrical Drop Cable */}
              <line
                x1="135"
                y1="195"
                x2="135"
                y2="430"
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="145"
                y1="195"
                x2="145"
                y2="430"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* ──────────────── STEP 4: WATER QUALITY & MULTI-BARRIER TREATMENT TRAIN (x: 230 to 450, y: 140 to 220) ──────────────── */}
          {showTreatmentTrain && (
            <g id="water-treatment-train">
              {/* Concrete Equipment Plinth on Ground */}
              <rect
                x="220"
                y="208"
                width="220"
                height="12"
                fill="#64748b"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Transmission pipe from wellhead to WTP */}
              <path
                d="M 140 195 L 140 185 L 235 185"
                fill="none"
                stroke="#0284c7"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Stage 1: Coarse Spin-Down Sediment Filter (x=240, y=165) */}
              <rect
                x="235"
                y="165"
                width="18"
                height="40"
                rx="3"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="1.5"
              />
              <line
                x1="244"
                y1="165"
                x2="244"
                y2="205"
                stroke="#bae6fd"
                strokeWidth="1"
                strokeDasharray="2 1"
              />
              <text
                x="232"
                y="158"
                fill="#0284c7"
                fontSize="8"
                fontWeight="bold"
              >
                1. Spin-Down
              </text>

              {/* Pipe 1 -> 2 */}
              <line
                x1="253"
                y1="185"
                x2="275"
                y2="185"
                stroke="#0284c7"
                strokeWidth="2.5"
              />

              {/* Stage 2: Media FRP Vessel with Multiport Valve (x=275, y=140) */}
              {/* Multiport Valve on top */}
              <rect
                x="283"
                y="132"
                width="16"
                height="10"
                rx="2"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="1"
              />
              {/* FRP Vessel Cylinder */}
              <rect
                x="278"
                y="142"
                width="26"
                height="65"
                rx="6"
                fill="#0284c7"
                stroke="#0369a1"
                strokeWidth="2"
              />
              <text
                x="268"
                y="125"
                fill="#0369a1"
                fontSize="8"
                fontWeight="bold"
              >
                2. Media Tank
              </text>
              <text x="268" y="218" fill="#64748b" fontSize="7">
                {result.treatment.stages
                  .find((s) => s.stageNumber === 2)
                  ?.name.includes("Iron")
                  ? "Birm/Greensand"
                  : result.treatment.stages
                        .find((s) => s.stageNumber === 2)
                        ?.name.includes("Softener")
                    ? "Cation Softener"
                    : "Carbon/Sand"}
              </text>

              {/* Pipe 2 -> 3 */}
              <line
                x1="304"
                y1="185"
                x2="330"
                y2="185"
                stroke="#0284c7"
                strokeWidth="2.5"
              />

              {/* Stage 3: Fine Big Blue 5μm Polishing Filter (x=330, y=155) */}
              <rect
                x="330"
                y="155"
                width="20"
                height="52"
                rx="3"
                fill="#1d4ed8"
                stroke="#1e40af"
                strokeWidth="1.5"
              />
              <text
                x="323"
                y="147"
                fill="#1d4ed8"
                fontSize="8"
                fontWeight="bold"
              >
                3. 5μm Cartridge
              </text>

              {/* Pipe 3 -> 4 */}
              <line
                x1="350"
                y1="185"
                x2="375"
                y2="185"
                stroke="#0284c7"
                strokeWidth="2.5"
              />

              {/* Stage 4: Stainless Steel UV-C Disinfection Sterilizer Chamber (x=375, y=170) */}
              <rect
                x="375"
                y="178"
                width="55"
                height="14"
                rx="4"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              {/* UV Glow Effect */}
              <rect
                x="382"
                y="181"
                width="40"
                height="8"
                rx="2"
                fill="#818cf8"
                opacity="0.85"
                className="animate-pulse"
              />
              {/* Indicator LED */}
              <circle cx="435" cy="185" r="3" fill="#22c55e" />
              <text
                x="375"
                y="170"
                fill="#6366f1"
                fontSize="8"
                fontWeight="bold"
              >
                4. UV-C Disinfection (254nm)
              </text>

              {/* Multi-barrier Badge */}
              <g transform="translate(230, 230)">
                <rect
                  x="0"
                  y="0"
                  width="200"
                  height="16"
                  rx="3"
                  fill="#0f172a"
                  opacity="0.8"
                />
                <text
                  x="8"
                  y="11"
                  fill="#38bdf8"
                  fontSize="8"
                  fontWeight="bold"
                >
                  ✓ Certified 4-Stage Multi-Barrier Water Treatment Train
                </text>
              </g>
            </g>
          )}

          {/* ──────────────── STEP 5: OVERHEAD WATER TOWER & PEAK RUSH BUFFERING (x: 480 to 600) ──────────────── */}
          {showTowerAndTank && (
            <g id="water-tower-and-tank">
              {/* Structural Steel Tower Staging (Height ~140px, representing 6m) */}
              {/* Tower Legs */}
              <line
                x1="500"
                y1="220"
                x2="515"
                y2="80"
                stroke="#475569"
                strokeWidth="3"
              />
              <line
                x1="580"
                y1="220"
                x2="565"
                y2="80"
                stroke="#475569"
                strokeWidth="3"
              />
              {/* Cross Bracing X */}
              <line
                x1="506"
                y1="180"
                x2="574"
                y2="120"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <line
                x1="574"
                y1="180"
                x2="506"
                y2="120"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <line
                x1="510"
                y1="140"
                x2="570"
                y2="140"
                stroke="#475569"
                strokeWidth="2"
              />
              {/* Top Support Platform */}
              <rect
                x="495"
                y="75"
                width="90"
                height="8"
                rx="2"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Riser delivery pipe up to tank inlet */}
              <path
                d="M 430 185 L 470 185 L 470 20 L 525 20 L 525 32"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Overhead Storage Tank (x=505, y=25, w=70, h=50) */}
              <rect
                x="505"
                y="25"
                width="70"
                height="50"
                rx="6"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Water Inside Tank */}
              <rect
                x="507"
                y="35"
                width="66"
                height="38"
                rx="4"
                fill="url(#tankWaterGrad)"
                opacity="0.9"
              />
              {/* Tank Lid / Inspection Hatch */}
              <rect
                x="528"
                y="22"
                width="24"
                height="4"
                rx="1"
                fill="#475569"
              />

              {/* Overflow Pipe */}
              <path
                d="M 575 35 L 585 35 L 585 180"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text x="590" y="80" fill="#94a3b8" fontSize="7">
                Overflow ({result.storage.overflowPipeDiameterMm}mm)
              </text>

              {/* Morning Rush Buffer Label */}
              <text
                x="540"
                y="14"
                textAnchor="middle"
                fill="#0284c7"
                fontSize="9"
                fontWeight="bold"
              >
                ▲ {result.storage.commercialTankSizeLiters}L Overhead Storage
                Tank
              </text>
              <text
                x="540"
                y="58"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
              >
                Buffers Morning Rush
              </text>
              <text
                x="540"
                y="67"
                textAnchor="middle"
                fill="#bae6fd"
                fontSize="7"
              >
                ({result.storage.peakRushDemandLitersPerHour} L/h peak vs{" "}
                {result.storage.pumpHourlyOutputLiters} L/h well)
              </text>

              {/* Washout Drain Valve at base of tank */}
              <circle cx="560" cy="77" r="3" fill="#f59e0b" />
            </g>
          )}

          {/* ──────────────── STEP 6: AUTOMATION, DUAL FLOAT SWITCH & DRY-RUN SENSORS ──────────────── */}
          {showAutomationSensors && (
            <g id="automation-and-controls">
              {/* Overhead Tank High Level Float Switch */}
              <circle
                cx="560"
                cy="38"
                r="4"
                fill="#22c55e"
                stroke="#15803d"
                strokeWidth="1.5"
              />
              <line
                x1="560"
                y1="28"
                x2="560"
                y2="38"
                stroke="#0f172a"
                strokeWidth="1"
              />
              <text
                x="568"
                y="38"
                fill="#15803d"
                fontSize="7"
                fontWeight="bold"
              >
                ◄ High Float (Stops Pump)
              </text>

              {/* Overhead Tank Low Level Float Switch */}
              <circle
                cx="560"
                cy="62"
                r="4"
                fill="#eab308"
                stroke="#a16207"
                strokeWidth="1.5"
              />
              <line
                x1="560"
                y1="28"
                x2="560"
                y2="62"
                stroke="#0f172a"
                strokeWidth="1"
              />
              <text
                x="568"
                y="64"
                fill="#a16207"
                fontSize="7"
                fontWeight="bold"
              >
                ◄ Low Float (Starts Pump)
              </text>

              {/* Downhole Borehole Dry-Run Electrodes */}
              <circle
                cx="140"
                cy="415"
                r="3"
                fill="#ef4444"
                stroke="#991b1b"
                strokeWidth="1"
              />
              <text
                x="155"
                y="415"
                fill="#ef4444"
                fontSize="8"
                fontWeight="bold"
              >
                ◄ Dry-Run Sensor (Prevents Motor Burnout)
              </text>

              {/* Automated Control Panel Box mounted on Tower Leg */}
              <rect
                x="480"
                y="150"
                width="16"
                height="24"
                rx="2"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <circle cx="488" cy="158" r="2" fill="#22c55e" />
              <circle cx="488" cy="164" r="2" fill="#38bdf8" />
              <text
                x="440"
                y="162"
                fill="#38bdf8"
                fontSize="8"
                fontWeight="bold"
              >
                Auto Control Panel ►
              </text>
            </g>
          )}

          {/* ──────────────── STEP 7: BURIED TRENCH & HOUSE GRAVITY RETICULATION (x: 600 to 980) ──────────────── */}
          {showBuriedPipeAndTap && (
            <g id="buried-pipe-and-house">
              {/* Buried Pipe Trench in ground (y: 220 to 260) */}
              <rect
                x="550"
                y="222"
                width="280"
                height="30"
                fill="#5d4037"
                opacity="0.6"
              />
              <text x="610" y="248" fill="#d7ccc8" fontSize="8">
                Buried Supply Trench (
                {result.distribution.buriedTrenchDepthMeters}m depth in bedding
                sand)
              </text>

              {/* Gravity Drop Pipe from Tower Platform down to underground */}
              <path
                d="M 540 75 L 540 236 L 820 236 L 820 155"
                fill="none"
                stroke="#0284c7"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Main Isolation Gate Valve before house */}
              <polygon points="760,233 768,239 760,245" fill="#f59e0b" />
              <polygon points="768,233 760,239 768,245" fill="#f59e0b" />
              <circle cx="764" cy="230" r="3" fill="#b45309" />

              {/* House Structure Cutaway (x: 800 to 970, y: 70 to 220) */}
              {/* House Foundation Slab */}
              <rect
                x="800"
                y="210"
                width="180"
                height="15"
                fill="#94a3b8"
                stroke="#475569"
                strokeWidth="1"
              />
              {/* House Walls & Roof */}
              <polygon
                points="810,120 890,70 970,120"
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="2"
              />
              <rect
                x="815"
                y="120"
                width="150"
                height="90"
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              <rect
                x="815"
                y="120"
                width="150"
                height="90"
                fill="#38bdf8"
                opacity="0.05"
              />

              {/* Kitchen Counter & Sink */}
              <rect
                x="830"
                y="165"
                width="60"
                height="45"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1"
              />
              <rect
                x="840"
                y="165"
                width="25"
                height="12"
                rx="2"
                fill="#94a3b8"
              />

              {/* Gooseneck Kitchen Tap */}
              <path
                d="M 820 155 L 848 155 L 848 145 A 6 6 0 0 1 860 145 L 860 152"
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Flowing Clean Water Stream from Tap */}
              <line
                x1="860"
                y1="152"
                x2="860"
                y2="167"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="2 2"
                className="animate-pulse"
              />

              {/* Water Splash in Sink */}
              <circle cx="860" cy="168" r="3" fill="#0284c7" opacity="0.7" />

              {/* Pressure & Water Callout */}
              <g transform="translate(820, 95)">
                <rect
                  x="0"
                  y="0"
                  width="145"
                  height="26"
                  rx="4"
                  fill="#0284c7"
                  opacity="0.95"
                />
                <text
                  x="8"
                  y="11"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  Hydrostatic Gravity Pressure:
                </text>
                <text
                  x="8"
                  y="21"
                  fill="#f0f9ff"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {result.distribution.groundHydrostaticPressureBar} bar (
                  {result.distribution.groundHydrostaticPressurePsi} psi) —
                  Ready at Tap!
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Step Title Badge */}
        <div
          data-testid="cutaway-notes-desktop"
          className="absolute left-4 top-4 hidden max-h-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-lg border border-border bg-background/90 p-2.5 shadow-md backdrop-blur-sm md:block"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Stage {activeStep + 1} of 7: {currentStep.title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {currentStep.detail}
          </p>
          {currentStep.check && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>QA Gate: {currentStep.check}</span>
            </div>
          )}
        </div>

        {/* Live Engineering Metrics HUD in Bottom Right */}
        <div className="absolute bottom-4 right-4 hidden md:flex flex-col gap-1 rounded-lg bg-background/90 p-2.5 shadow-md border border-border text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> Well Depth:
            </span>
            <span className="font-semibold text-foreground">
              {result.well.totalDepthMeters}m (
              {Math.round(result.well.totalDepthMeters * 3.28084)} ft)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" /> Submersible Motor:
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {result.pumping.recommendedMotorHp} HP (
              {result.pumping.motorElectricalPowerKw} kW)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3" /> Tank Capacity:
            </span>
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              {result.storage.commercialTankSizeLiters.toLocaleString()} L (
              {result.storage.commercialTankSizeUsGal.toLocaleString()} gal)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Tap Pressure:
            </span>
            <span className="font-semibold text-foreground">
              {result.distribution.groundHydrostaticPressureBar} bar (
              {result.distribution.groundHydrostaticPressurePsi} psi)
            </span>
          </div>
        </div>
      </div>

      {/* Footer Step Explainer */}
      <div className="p-4 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          <strong className="text-foreground">Process Flow:</strong> Well
          supplies water → Multi-barrier filtration purifies → Overhead tower
          buffers rush → Gravity delivers to taps.
        </div>
        <div className="text-primary font-medium">
          Step {activeStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
