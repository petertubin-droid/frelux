// =========================================================
// FRELUX DIMENSION-BASED ELEVATION ILLUSTRATION
// SVG axonometric projection of entered dimensions
//
// Features:
// - 3D-style axonometric projection with adjustable view angles
// - Step-by-step Level Elevation Animation (L1 Foundation -> L5 Roof)
// - 2D Architectural Blueprint Plan projection with angle & dimension arcs
// - Calculation callouts displaying formula examples
// - Dynamic Wind aerodynamic flow vector & uplift indicator
// - Diagnostic error pinpoint flags anchored to structural members
// - Illustrative quantities, phase durations, and costs from user-entered rates
// =========================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Compass,
  CheckCircle2,
  Play,
  RotateCcw,
  Box,
  Ruler,
  Calculator,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import type { MathematicalElevationResult } from "@/lib/engineering/mathematical-elevation-engine";

interface DiagramProps {
  result: MathematicalElevationResult;
  unitRates?: Record<string, number>;
  currencyCode?: string;
  className?: string;
  onApplyToEstimate?: () => void;
}

type ViewMode =
  "3d_isometric" | "2d_blueprint" | "elevation_cross_section" | "5d_bim";

export function MathematicalElevationDiagram({
  result,
  unitRates = {},
  currencyCode = "",
  className = "",
  onApplyToEstimate,
}: DiagramProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("3d_isometric");
  const [activeLevel, setActiveLevel] = useState<number>(5); // 1 to 5, default full roof
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [yawDeg, setYawDeg] = useState<number>(45); // horizontal rotation
  const [pitchDeg, setPitchDeg] = useState<number>(30); // vertical tilt
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showErrorPins, setShowErrorPins] = useState<boolean>(true);

  const { input, levels, discrepancies } = result;
  const pricedMaterials = result.five_d_bim.materials.filter(
    (material) => Number(unitRates[material.item]) > 0,
  );
  const pricedTotal = pricedMaterials.reduce(
    (sum, material) =>
      sum + material.quantity * Number(unitRates[material.item]),
    0,
  );
  const L = input.building_length;
  const W = input.building_width;
  const H = input.floor_to_floor_height;
  const storeys = input.storeys;
  const overhang = input.roof_overhang;
  const roofPitch = input.roof_pitch_deg;

  // Elevation sequence automation timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isAnimating) {
      timer = setInterval(() => {
        setActiveLevel((prev) => {
          if (prev >= 5) {
            setIsAnimating(false);
            return 5;
          }
          return prev + 1;
        });
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isAnimating]);

  const handleStartAnimation = () => {
    setActiveLevel(1);
    setIsAnimating(true);
  };

  const handleStopAnimation = () => {
    setIsAnimating(false);
  };

  const handleResetView = () => {
    setYawDeg(45);
    setPitchDeg(30);
    setActiveLevel(5);
    setIsAnimating(false);
  };

  // ── 3D Projection Math ──
  // Converts 3D meters (x, y, z) into 2D SVG canvas coordinates
  const canvasWidth = 800;
  const canvasHeight = 560;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.65;

  // Adaptive scale to fit the building in the viewport
  const maxDim = Math.max(
    L,
    W,
    H * storeys + (levels.level_5_roof.ridge_rise_m ?? 0) + 2.0,
  );
  const scale = (canvasWidth * 0.38) / Math.max(12, maxDim);

  const project3D = useMemo(() => {
    const yawRad = (yawDeg * Math.PI) / 180;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    const cosP = Math.cos(pitchRad);
    const sinP = Math.sin(pitchRad);

    return (x: number, y: number, z: number): [number, number] => {
      // Center coordinates around building footprint origin
      const ox = x - L / 2;
      const oy = y - W / 2;

      // Rotate around Z axis (yaw)
      const rx = ox * cosY - oy * sinY;
      const ry = ox * sinY + oy * cosY;

      // Tilt around X axis (pitch)
      const sx = centerX + rx * scale;
      const sy = centerY - (z * cosP - ry * sinP) * scale;
      return [sx, sy];
    };
  }, [yawDeg, pitchDeg, L, W, scale, centerX, centerY]);

  // Geometry Points Definition
  // Z datums (meters)
  const zGround = 0.0;
  const zSlab = levels.level_2_ground_slab.plinth_height_above_ground_m;
  const zWallHead = zSlab + H * storeys;
  const zRingBeam = zWallHead + levels.level_4_ring_beam.ring_beam_depth_m;
  const zRoofApex = zRingBeam + (levels.level_5_roof.ridge_rise_m ?? 0);

  // 3D Corner Coordinates
  // Ground footprint
  const pG0 = project3D(0, 0, zGround);
  const pG1 = project3D(L, 0, zGround);
  const pG2 = project3D(L, W, zGround);
  const _pG3 = project3D(0, W, zGround);

  // Plinth / Slab Top
  const pS0 = project3D(0, 0, zSlab);
  const pS1 = project3D(L, 0, zSlab);
  const pS2 = project3D(L, W, zSlab);
  const pS3 = project3D(0, W, zSlab);

  // Wall Head
  const pW0 = project3D(0, 0, zWallHead);
  const pW1 = project3D(L, 0, zWallHead);
  const pW2 = project3D(L, W, zWallHead);
  const _pW3 = project3D(0, W, zWallHead);

  // Ring Beam Top
  const pB0 = project3D(0, 0, zRingBeam);
  const pB1 = project3D(L, 0, zRingBeam);
  const pB2 = project3D(L, W, zRingBeam);
  const _pB3 = project3D(0, W, zRingBeam);

  // Roof Eaves Points (overhang)
  const pE0 = project3D(-overhang, -overhang, zRingBeam);
  const pE1 = project3D(L + overhang, -overhang, zRingBeam);
  const pE2 = project3D(L + overhang, W + overhang, zRingBeam);
  const pE3 = project3D(-overhang, W + overhang, zRingBeam);

  // Roof Ridge Points (Gable/Hip ridge centerline)
  const ridgeAlongY = L < W;
  const halfSpan = Math.min(L, W) / 2;
  const roofGeometrySupported =
    input.roof_type === "gable" || input.roof_type === "hip";
  const hipIndent = input.roof_type === "hip" ? halfSpan : 0;
  const pR0 = ridgeAlongY
    ? project3D(L / 2, hipIndent, zRoofApex)
    : project3D(hipIndent, W / 2, zRoofApex);
  const pR1 = ridgeAlongY
    ? project3D(L / 2, W - hipIndent, zRoofApex)
    : project3D(L - hipIndent, W / 2, zRoofApex);

  // Active level descriptions & formulas for HUD
  const levelHUDInfo = useMemo(() => {
    switch (activeLevel) {
      case 1:
        return {
          title: "Level 1: Substructure & Foundation Footings",
          formula: "Foundation geometry is not designed by this tool",
          values: "Foundation geometry and excavation are not assessed.",
          description:
            "Foundation dimensions, soil capacity and bearing safety are not assessed. Do not use the schematic footing as a design recommendation.",
        };
      case 2:
        return {
          title: "Level 2: Ground Floor Slab & DPC Damp Proofing",
          formula: "V_slab = (L - 2·tw) · (W - 2·tw) · h_s",
          values: `Slab thickness = ${levels.level_2_ground_slab.slab_thickness_m}m | Plinth datum = +${levels.level_2_ground_slab.plinth_height_above_ground_m}m | Volume = ${levels.level_2_ground_slab.slab_concrete_volume_m3} m³`,
          description:
            "Shows a fixed illustrative plinth datum; this is not a flood or drainage recommendation.",
        };
      case 3:
        return {
          title: "Level 3: Superstructure Walls & Openings",
          formula:
            "Descriptive storey-height / wall-thickness ratio only; no structural check",
          values: `Slenderness λ = ${levels.level_3_superstructure.slenderness_ratio} | Net Wall Area = ${levels.level_3_superstructure.net_masonry_area_m2} m² | Block Count = ${levels.level_3_superstructure.total_blocks_count} units`,
          description:
            "Shows a wall proportion indicator, course count, and opening deductions; not a structural check.",
        };
      case 4:
        return {
          title: "Level 4: Reinforced Concrete Ring Beam & Lintels",
          formula: "Illustrative fixed geometry only; no reinforcement design",
          values: `Illustrative section = ${(levels.level_4_ring_beam.ring_beam_width_m * 1000).toFixed(0)} × ${(levels.level_4_ring_beam.ring_beam_depth_m * 1000).toFixed(0)} mm | Reinforcement not assessed`,
          description:
            "Section dimensions are illustrative assumptions, not a recommendation. Concrete volume is a geometry product only; no capacity, reinforcement, anchorage or code check is performed.",
        };
      case 5:
      default:
        return {
          title: "Level 5: Illustrative roof geometry",
          formula:
            "h_ridge = (clear span / 2) · tan(θ); overhang extends eaves, not ridge",
          values: `Rise = ${levels.level_5_roof.ridge_rise_m ?? "not assessed"} m | Rafter proxy = ${levels.level_5_roof.rafter_slope_length_m ?? "not assessed"} m | Area proxy = ${levels.level_5_roof.approximate_roof_covering_area_m2 ?? "not assessed"} m²`,
          description:
            "Illustrative roof geometry and quantity proxy only. No wind, member, connection or code design is performed.",
        };
    }
  }, [activeLevel, levels]);

  return (
    <div
      className={`rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden flex flex-col ${className}`}
    >
      {/* ── Header Controls Bar ── */}
      <div className="border-b border-border p-4 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Deterministic Mathematical Elevation Diagram
              </h3>
              <Badge
                variant="outline"
                className="text-xs bg-brand-purple/5 text-brand-purple border-brand-purple/20"
              >
                3D-style view • indicative schedule
              </Badge>
              {discrepancies.length > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {discrepancies.length} screening flag
                  {discrepancies.length === 1 ? "" : "s"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  No configured flags
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dimension-based geometry and indicative quantities only. Not a
              structural design or code review.
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-background/80 p-1 rounded-xl border border-border">
          <Button
            size="sm"
            variant={viewMode === "3d_isometric" ? "default" : "ghost"}
            onClick={() => setViewMode("3d_isometric")}
            className="text-xs h-7 gap-1"
          >
            <Box className="h-3.5 w-3.5" />
            3D-style Isometric
          </Button>
          <Button
            size="sm"
            variant={viewMode === "2d_blueprint" ? "default" : "ghost"}
            onClick={() => setViewMode("2d_blueprint")}
            className="text-xs h-7 gap-1"
          >
            <Compass className="h-3.5 w-3.5" />
            2D Blueprint
          </Button>
          <Button
            size="sm"
            variant={
              viewMode === "elevation_cross_section" ? "default" : "ghost"
            }
            onClick={() => setViewMode("elevation_cross_section")}
            className="text-xs h-7 gap-1"
          >
            <Ruler className="h-3.5 w-3.5" />
            Cross Section
          </Button>
          <Button
            size="sm"
            variant={viewMode === "5d_bim" ? "default" : "ghost"}
            onClick={() => setViewMode("5d_bim")}
            className="text-xs h-7 gap-1"
          >
            <Layers className="h-3.5 w-3.5" />
            Quantity & cost schedule
          </Button>
        </div>
      </div>

      {/* ── Main Graphical Display Area ── */}
      <div className="relative w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-b border-border/80 flex items-center justify-center min-h-[440px] select-none overflow-hidden">
        {/* Subtle Engineering Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* ── 3D-STYLE ELEVATION VIEW ── */}
        {viewMode === "3d_isometric" && (
          <svg
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full h-auto max-h-[520px] transition-all duration-300"
          >
            <defs>
              {/* Gradients for structural materials */}
              <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="footingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="slabGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="wallFrontGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="wallSideGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="ringBeamGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="roofSlopeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="windGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* LEVEL 1: Foundation geometry is intentionally not drawn because it is not assessed. */}
            {activeLevel === 1 && (
              <text
                x="320"
                y="330"
                fill="#94a3b8"
                fontSize="12"
                textAnchor="middle"
              >
                Foundation geometry not assessed
              </text>
            )}

            {/* LEVEL 2: Ground Slab & DPC */}
            {activeLevel >= 2 && (
              <g className="transition-opacity duration-500">
                {/* Plinth front face */}
                <polygon
                  points={`${pG0[0]},${pG0[1]} ${pG1[0]},${pG1[1]} ${pS1[0]},${pS1[1]} ${pS0[0]},${pS0[1]}`}
                  fill="#475569"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {/* Plinth side face */}
                <polygon
                  points={`${pG1[0]},${pG1[1]} ${pG2[0]},${pG2[1]} ${pS2[0]},${pS2[1]} ${pS1[0]},${pS1[1]}`}
                  fill="#334155"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {/* Slab top face */}
                <polygon
                  points={`${pS0[0]},${pS0[1]} ${pS1[0]},${pS1[1]} ${pS2[0]},${pS2[1]} ${pS3[0]},${pS3[1]}`}
                  fill="url(#slabGrad)"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <text
                  x={pS0[0] - 14}
                  y={pS0[1] + 4}
                  fill="#a855f7"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Illustrative +0.45m datum / 150mm slab (assumed)
                </text>
              </g>
            )}

            {/* LEVEL 3: Superstructure Walls */}
            {activeLevel >= 3 && (
              <g className="transition-opacity duration-500">
                {/* Front Wall Face */}
                <polygon
                  points={`${pS0[0]},${pS0[1]} ${pS1[0]},${pS1[1]} ${pW1[0]},${pW1[1]} ${pW0[0]},${pW0[1]}`}
                  fill={showWireframe ? "none" : "url(#wallFrontGrad)"}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                {/* Side Wall Face */}
                <polygon
                  points={`${pS1[0]},${pS1[1]} ${pS2[0]},${pS2[1]} ${pW2[0]},${pW2[1]} ${pW1[0]},${pW1[1]}`}
                  fill={showWireframe ? "none" : "url(#wallSideGrad)"}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />

                {/* Openings have no entered positions or storey assignment; do not invent drawing locations. */}
                {input.openings.length > 0 && (
                  <text
                    x={centerX}
                    y={centerY - 8}
                    fill="#fcd34d"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    Opening locations and storeys not modeled
                  </text>
                )}
              </g>
            )}

            {/* LEVEL 4: Ring Beam (Bond Beam) */}
            {activeLevel >= 4 && (
              <g className="transition-opacity duration-500">
                {/* Ring beam front face */}
                <polygon
                  points={`${pW0[0]},${pW0[1]} ${pW1[0]},${pW1[1]} ${pB1[0]},${pB1[1]} ${pB0[0]},${pB0[1]}`}
                  fill="url(#ringBeamGrad)"
                  stroke="#4f46e5"
                  strokeWidth="1.5"
                />
                {/* Ring beam side face */}
                <polygon
                  points={`${pW1[0]},${pW1[1]} ${pW2[0]},${pW2[1]} ${pB2[0]},${pB2[1]} ${pB1[0]},${pB1[1]}`}
                  fill="#4338ca"
                  stroke="#4f46e5"
                  strokeWidth="1.5"
                />
                <text
                  x={pW0[0] - 14}
                  y={pB0[1] + 3}
                  fill="#818cf8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  +{zRingBeam.toFixed(2)}m [illustrative ring-beam geometry]
                </text>
              </g>
            )}

            {/* Roof form is shown only where the calculation model supports it. */}
            {activeLevel >= 5 && !roofGeometrySupported && (
              <text
                x={centerX}
                y={centerY - 24}
                fill="#fcd34d"
                fontSize="12"
                textAnchor="middle"
              >
                {input.roof_type} roof geometry not assessed
              </text>
            )}
            {/* LEVEL 5: illustrative gable/hip roof geometry, not a framing design */}
            {activeLevel >= 5 && roofGeometrySupported && (
              <g className="transition-opacity duration-500">
                {/* Illustrative roof lines only; no member or truss design is represented. */}
                <line
                  x1={pE0[0]}
                  y1={pE0[1]}
                  x2={pR0[0]}
                  y2={pR0[1]}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <line
                  x1={pE1[0]}
                  y1={pE1[1]}
                  x2={pR1[0]}
                  y2={pR1[1]}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <line
                  x1={pE2[0]}
                  y1={pE2[1]}
                  x2={pR1[0]}
                  y2={pR1[1]}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <line
                  x1={pE3[0]}
                  y1={pE3[1]}
                  x2={pR0[0]}
                  y2={pR0[1]}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                {/* Ridge Line */}
                <line
                  x1={pR0[0]}
                  y1={pR0[1]}
                  x2={pR1[0]}
                  y2={pR1[1]}
                  stroke="#fbbf24"
                  strokeWidth="3.5"
                />

                {/* Roof Pitch Slope Polygons */}
                {!showWireframe && (
                  <>
                    {/* Front Slope */}
                    <polygon
                      points={`${pE0[0]},${pE0[1]} ${pE1[0]},${pE1[1]} ${pR1[0]},${pR1[1]} ${pR0[0]},${pR0[1]}`}
                      fill="url(#roofSlopeGrad)"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                    />
                    {/* Hip Left Face (if hip roof) */}
                    {input.roof_type === "hip" && (
                      <polygon
                        points={`${pE0[0]},${pE0[1]} ${pE3[0]},${pE3[1]} ${pR0[0]},${pR0[1]}`}
                        fill="#0284c7"
                        fillOpacity="0.7"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                    )}
                    {/* Hip Right Face (if hip roof) */}
                    {input.roof_type === "hip" && (
                      <polygon
                        points={`${pE1[0]},${pE1[1]} ${pE2[0]},${pE2[1]} ${pR1[0]},${pR1[1]}`}
                        fill="#0369a1"
                        fillOpacity="0.7"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                    )}
                  </>
                )}

                {/* Apex Elevation Tag */}
                <text
                  x={pR1[0] + 16}
                  y={pR1[1] - 4}
                  fill="#38bdf8"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  +{zRoofApex.toFixed(2)}m Apex [θ={roofPitch}° | h=
                  {levels.level_5_roof.ridge_rise_m}m]
                </text>
              </g>
            )}

            {/* ── Dimension Lines & Callouts ── */}
            {showDimensions && (
              <g className="text-muted-foreground text-xs font-mono">
                {/* Building Length Dimension Line */}
                <line
                  x1={pG0[0]}
                  y1={pG0[1] + 25}
                  x2={pG1[0]}
                  y2={pG1[1] + 25}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  markerEnd="url(#arrow)"
                />
                <text
                  x={(pG0[0] + pG1[0]) / 2}
                  y={(pG0[1] + pG1[1]) / 2 + 40}
                  fill="#f1f5f9"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Length = {L.toFixed(2)} m
                </text>

                {/* Building Width Dimension Line */}
                <line
                  x1={pG1[0] + 20}
                  y1={pG1[1] + 10}
                  x2={pG2[0] + 20}
                  y2={pG2[1] + 10}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  x={(pG1[0] + pG2[0]) / 2 + 35}
                  y={(pG1[1] + pG2[1]) / 2}
                  fill="#f1f5f9"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  Width = {W.toFixed(2)} m
                </text>
              </g>
            )}

            {/* Wind design is intentionally not represented: this schematic has no project-specific pressure or connection model. */}
            {/* ── Diagnostic Error Pinpoints ── */}
            {showErrorPins &&
              discrepancies.map((disc, idx) => {
                const pinX =
                  centerX + (idx % 2 === 0 ? 110 + idx * 30 : -140 - idx * 25);
                const pinY = centerY - 140 + idx * 45;

                return (
                  <g key={disc.id} className="cursor-pointer group">
                    <circle
                      cx={pinX}
                      cy={pinY}
                      r="12"
                      fill={
                        disc.severity === "critical" ? "#ef4444" : "#f59e0b"
                      }
                      fillOpacity="0.9"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={pinX}
                      y={pinY + 4}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      !
                    </text>
                    {/* Hover Tooltip Card */}
                    <g className="opacity-90 group-hover:opacity-100 transition-opacity">
                      <rect
                        x={pinX + 16}
                        y={pinY - 18}
                        width="210"
                        height="48"
                        rx="6"
                        fill="#090d16"
                        stroke={
                          disc.severity === "critical" ? "#ef4444" : "#f59e0b"
                        }
                        strokeWidth="1.2"
                      />
                      <text
                        x={pinX + 24}
                        y={pinY - 4}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {disc.title.slice(0, 26)}
                      </text>
                      <text
                        x={pinX + 24}
                        y={pinY + 10}
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        Planning screen
                      </text>
                      <text
                        x={pinX + 24}
                        y={pinY + 22}
                        fill={
                          disc.severity === "critical" ? "#f87171" : "#fcd34d"
                        }
                        fontSize="9"
                      >
                        {disc.detected_value}
                      </text>
                    </g>
                  </g>
                );
              })}
          </svg>
        )}

        {/* ── 2D ARCHITECTURAL BLUEPRINT VIEW ── */}
        {viewMode === "2d_blueprint" && (
          <div className="w-full max-w-2xl p-6 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 600 420"
              className="w-full h-auto bg-slate-950 rounded-xl border border-border"
            >
              {/* Grid */}
              <defs>
                <pattern
                  id="bpGrid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>
              <rect width="600" height="420" fill="url(#bpGrid)" />

              <text
                x="300"
                y="400"
                fill="#fcd34d"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                SCHEMATIC ONLY · partition locations are illustrative, not
                plan-derived
              </text>
              {/* External Footprint Outline */}
              <rect
                x="80"
                y="60"
                width="440"
                height="300"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="4"
              />
              {/* Internal Wall Boundary */}
              <rect
                x="92"
                y="72"
                width="416"
                height="276"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Schematic partition marks are not derived from entered wall locations. */}
              <line
                x1="280"
                y1="72"
                x2="280"
                y2="348"
                stroke="#38bdf8"
                strokeWidth="3"
              />
              <line
                x1="80"
                y1="210"
                x2="280"
                y2="210"
                stroke="#38bdf8"
                strokeWidth="3"
              />

              {/* Dimensions Labels */}
              <text
                x="300"
                y="42"
                fill="#38bdf8"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                EXTERNAL LENGTH: {L.toFixed(2)} m (Clear span:{" "}
                {(L - 2 * input.wall_thickness).toFixed(2)} m)
              </text>
              <text
                x="545"
                y="215"
                fill="#38bdf8"
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                WIDTH: {W.toFixed(2)} m
              </text>
              <text
                x="300"
                y="280"
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Total Internal Partition Run:{" "}
                {input.internal_wall_length.toFixed(1)} m
              </text>
              <text
                x="300"
                y="380"
                fill="#a855f7"
                fontSize="11"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Illustrative wall thickness tw ={" "}
                {(input.wall_thickness * 1000).toFixed(0)} mm (material/design
                not assessed)
              </text>
            </svg>
          </div>
        )}

        {/* ── ELEVATION CROSS SECTION VIEW ── */}
        {viewMode === "elevation_cross_section" && (
          <div className="w-full max-w-2xl p-6 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 640 400"
              className="w-full h-auto bg-slate-950 rounded-xl border border-border"
            >
              {/* Ground line datum */}
              <line
                x1="20"
                y1="280"
                x2="620"
                y2="280"
                stroke="#22c55e"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              <text
                x="30"
                y="274"
                fill="#22c55e"
                fontSize="10"
                fontFamily="monospace"
              >
                ±0.00m NATURAL GROUND LEVEL (NGL)
              </text>

              {/* Foundation dimensions are not modeled and must not be implied by this schematic. */}
              <text
                x="320"
                y="332"
                fill="#fcd34d"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Foundation geometry and bearing are not assessed
              </text>

              {/* Plinth & Slab */}
              <rect
                x="150"
                y="250"
                width="340"
                height="30"
                fill="#64748b"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x="320"
                y="268"
                fill="#ffffff"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Illustrative +0.45m datum / 150mm slab (assumed)
              </text>

              {/* Superstructure Walls */}
              <rect
                x="158"
                y="100"
                width="24"
                height="150"
                fill="#cbd5e1"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <rect
                x="458"
                y="100"
                width="24"
                height="150"
                fill="#cbd5e1"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <text
                x="90"
                y="180"
                fill="#f8fafc"
                fontSize="11"
                fontFamily="monospace"
              >
                H = {H.toFixed(2)}m (Storeys: {storeys})
              </text>

              {/* Illustrative ring-beam geometry only; no reinforcement design. */}
              <rect
                x="156"
                y="85"
                width="28"
                height="15"
                fill="#818cf8"
                stroke="#4f46e5"
                strokeWidth="1.5"
              />
              <rect
                x="456"
                y="85"
                width="28"
                height="15"
                fill="#818cf8"
                stroke="#4f46e5"
                strokeWidth="1.5"
              />

              {roofGeometrySupported ? (
                <>
                  {/* Illustrative pitched roof profile; not a framing design. */}
                  <polygon
                    points={`130,85 510,85 320,${85 - (levels.level_5_roof.ridge_rise_m ?? 0) * 35}`}
                    fill="#0284c7"
                    fillOpacity="0.4"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <text
                    x="320"
                    y={75 - (levels.level_5_roof.ridge_rise_m ?? 0) * 35}
                    fill="#38bdf8"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    Ridge Apex +
                    {levels.level_5_roof.total_building_height_m.toFixed(2)}m
                    (Rise = {(levels.level_5_roof.ridge_rise_m ?? 0).toFixed(2)}
                    m @ {roofPitch}°)
                  </text>
                </>
              ) : (
                <text
                  x="320"
                  y="72"
                  fill="#fcd34d"
                  fontSize="12"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {input.roof_type} roof geometry not assessed
                </text>
              )}
            </svg>
          </div>
        )}

        {/* ── INDICATIVE QUANTITY AND COST SCHEDULE ── */}
        {viewMode === "5d_bim" && (
          <div className="w-full max-w-4xl p-6 space-y-4 max-h-[500px] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-xs text-muted-foreground uppercase font-mono">
                  Indicative concrete quantity
                </span>
                <p className="text-xl font-bold text-foreground mt-1">
                  {result.five_d_bim.total_concrete_volume_m3} m³
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slab + ring beam only; foundation excluded
                </p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-xs text-muted-foreground uppercase font-mono">
                  Indicative phase days
                </span>
                <p className="text-xl font-bold text-foreground mt-1">
                  Not estimated
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set a project-specific programme
                </p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-xs text-muted-foreground uppercase font-mono">
                  Priced items total
                </span>
                <p className="text-xl font-bold text-foreground mt-1">
                  {pricedMaterials.length > 0 && currencyCode
                    ? `${currencyCode} ${pricedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : "Rates not entered"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pricedMaterials.length} of{" "}
                  {result.five_d_bim.materials.length} items priced by you
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Quantities and timeline are simplified planning illustrations, not
              verified takeoffs. Cost totals use only the unit rates you
              entered; missing rates are not estimated.
              {currencyCode
                ? ` Currency: ${currencyCode}.`
                : " Enter a currency code to label totals."}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs font-semibold">
                Indicative quantity and manual-rate cost schedule
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Extended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {result.five_d_bim.materials.map((material) => {
                      const rate = Number(unitRates[material.item]);
                      return (
                        <tr key={material.item}>
                          <td className="p-2">
                            {material.item}{" "}
                            <span className="text-muted-foreground">
                              ({material.unit})
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {material.quantity.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {rate > 0 ? rate.toLocaleString() : "—"}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {rate > 0 && currencyCode
                              ? `${currencyCode} ${(rate * material.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* No assumed schedule: project sequencing and resources are not inputs. */}
            <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
              Programme is not estimated. Provide project sequencing, crew
              sizes, production rates, procurement, access and curing
              requirements to build a defensible schedule.
            </div>
            {result.five_d_bim.timeline_phases.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="p-2.5 text-left font-semibold text-foreground">
                        Phase
                      </th>
                      <th className="p-2.5 text-left font-semibold text-foreground">
                        Level
                      </th>
                      <th className="p-2.5 text-right font-semibold text-foreground">
                        Work Days
                      </th>
                      <th className="p-2.5 text-right font-semibold text-foreground">
                        Curing Hold
                      </th>
                      <th className="p-2.5 text-left font-semibold text-foreground">
                        Milestone Output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {result.five_d_bim.timeline_phases.map((ph) => (
                      <tr key={ph.phase_number} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium text-foreground">
                          {ph.phase_name}
                        </td>
                        <td className="p-2.5 text-muted-foreground font-mono">
                          {ph.level}
                        </td>
                        <td className="p-2.5 text-right font-mono text-foreground">
                          {ph.duration_days} d
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-500 font-semibold">
                          {ph.curing_hold_days} d
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {ph.milestone}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Active Level Mathematical Callout HUD ── */}
      <div className="p-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-purple font-mono">
              {levelHUDInfo.title}
            </span>
            <Badge variant="outline" className="text-[10px] bg-background">
              Step {activeLevel} of 5
            </Badge>
          </div>
          <p className="text-xs font-mono font-semibold text-foreground bg-background/80 px-2.5 py-1 rounded-md border border-border inline-block">
            {levelHUDInfo.formula}
          </p>
          <p className="text-xs text-muted-foreground">{levelHUDInfo.values}</p>
        </div>

        {/* Level Elevation Stepper & Auto-Play */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={isAnimating ? handleStopAnimation : handleStartAnimation}
            className="text-xs h-8 gap-1.5 border-brand-purple/30 text-brand-purple hover:bg-brand-purple/10"
          >
            {isAnimating ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {isAnimating ? "Pause" : "Auto-Elevate (L1→L5)"}
          </Button>

          <div className="flex flex-wrap items-center gap-1 ml-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setActiveLevel(lvl);
                  setIsAnimating(false);
                }}
                className={`h-7 w-7 rounded-lg text-xs font-mono font-bold transition-all ${
                  activeLevel === lvl
                    ? "bg-brand-purple text-white shadow-sm ring-2 ring-brand-purple/30"
                    : "bg-background text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                L{lvl}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetView}
            className="text-xs h-8 px-2 text-muted-foreground"
            title="Reset view angles"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Diagram Controls & Actions Footer ── */}
      <div className="p-3 bg-card flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Toggle options */}
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <label className="flex flex-wrap items-center gap-1.5 cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              className="rounded border-border text-brand-purple focus:ring-brand-purple"
            />
            Dimensions
          </label>
          <label className="flex flex-wrap items-center gap-1.5 cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
              className="rounded border-border text-brand-purple focus:ring-brand-purple"
            />
            Wireframe
          </label>
          <label className="flex flex-wrap items-center gap-1.5 cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={showErrorPins}
              onChange={(e) => setShowErrorPins(e.target.checked)}
              className="rounded border-border text-brand-purple focus:ring-brand-purple"
            />
            Screening flags
          </label>
        </div>

        {/* Illustration view controls */}
        {viewMode === "3d_isometric" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-mono">
                View angle:
              </span>
              <input
                type="range"
                min="0"
                max="360"
                value={yawDeg}
                onChange={(e) => setYawDeg(Number(e.target.value))}
                className="w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono text-[11px] w-7">{yawDeg}°</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-mono">
                View elevation:
              </span>
              <input
                type="range"
                min="10"
                max="65"
                value={pitchDeg}
                onChange={(e) => setPitchDeg(Number(e.target.value))}
                className="w-16 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono text-[11px] w-6">{pitchDeg}°</span>
            </div>
          </div>
        )}

        {/* Apply Button */}
        {onApplyToEstimate && (
          <Button
            size="sm"
            onClick={onApplyToEstimate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Apply Dimensions to Build-to-Roof
          </Button>
        )}
      </div>
    </div>
  );
}
