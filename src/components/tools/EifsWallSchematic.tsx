import React, { useState } from "react";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Layers, ShieldCheck, Thermometer, Wind } from "lucide-react";
import type {
  EifsSubstrateType,
  EifsInsulationType,
  EifsThicknessMm,
  EifsSystemType,
  EifsFinishTexture,
} from "@/lib/estimation/eifs-engine";

interface EifsWallSchematicProps {
  substrateType: EifsSubstrateType;
  insulationType: EifsInsulationType;
  insulationThicknessMm: EifsThicknessMm;
  systemType: EifsSystemType;
  finishTexture: EifsFinishTexture;
  wallLengthM: number;
  wallHeightM: number;
  hasOpenings: boolean;
  hasImpactMesh: boolean;
}

export const EifsWallSchematic: React.FC<EifsWallSchematicProps> = ({
  substrateType,
  insulationType,
  insulationThicknessMm,
  systemType,
  finishTexture,
  wallLengthM,
  wallHeightM,
  hasOpenings,
  hasImpactMesh,
}) => {
  const [viewMode, setViewMode] = useState<"cross_section" | "elevation">(
    "cross_section",
  );

  const insulationColor =
    insulationType === "graphite_neopor"
      ? "#64748b" // Dark graphite grey
      : insulationType === "mineral_wool"
        ? "#a16207" // Ochre/amber stone wool
        : insulationType === "xps"
          ? "#38bdf8" // Light blue/pink XPS
          : "#e2e8f0"; // White EPS

  const insulationName =
    insulationType === "graphite_neopor"
      ? "Neopor GPS Foam"
      : insulationType === "mineral_wool"
        ? "Mineral Stone Wool (A1)"
        : insulationType === "xps"
          ? "Extruded Polystyrene (XPS)"
          : "Expanded Polystyrene (EPS)";

  const substrateName =
    substrateType === "cmu_masonry"
      ? "CMU Concrete Block"
      : substrateType === "poured_concrete"
        ? "Cast Concrete Wall"
        : substrateType === "existing_brick_stucco"
          ? "Masonry / Brick Substrate"
          : "Gypsum / OSB Sheathing on Studs";

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            EIFS / ETICS Multi-Layer Assembly Schematic
          </h3>
          <Badge variant="outline" className="text-xs font-mono font-medium">
            {insulationThicknessMm}mm Continuous Insulation (
            {systemType === "drainable_eifs" ? "Drainable" : "Barrier"})
          </Badge>
          <Badge variant="secondary" className="text-xs font-medium">
            Substrate: {substrateName}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-mono text-muted-foreground"
          >
            {wallLengthM}m × {wallHeightM}m{" "}
            {hasOpenings ? "(openings deducted)" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "cross_section" ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => setViewMode("cross_section")}
          >
            System Cutaway Section
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "elevation" ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => setViewMode("elevation")}
          >
            Board Layout & Mesh Elevation
          </Button>
        </div>
      </div>

      <div className="mt-3 flex justify-center overflow-x-auto py-2">
        {viewMode === "cross_section" ? (
          <svg
            viewBox="0 0 740 360"
            className="w-full max-w-2xl h-auto select-none font-sans"
            aria-label="EIFS wall assembly cross section schematic"
          >
            <defs>
              {/* Concrete/block hatching */}
              <pattern
                id="eifsSubstratePattern"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill="#cbd5e1" />
                <path
                  d="M0 16 L16 0 M8 16 L16 8 M0 8 L8 0"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
              </pattern>

              {/* Fiberglass mesh grid pattern */}
              <pattern
                id="meshGridPattern"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="#475569" />
                <path
                  d="M 0 4 L 8 4 M 4 0 L 4 8"
                  stroke="#f8fafc"
                  strokeWidth="1.2"
                />
              </pattern>

              {/* Textured finish pattern */}
              <pattern
                id="stuccoTexturePattern"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <rect width="12" height="12" fill="#d97706" />
                <circle cx="3" cy="3" r="1.2" fill="#b45309" />
                <circle cx="9" cy="8" r="1.5" fill="#fef3c7" />
                <circle cx="6" cy="11" r="1" fill="#78350f" />
              </pattern>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width="740" height="360" fill="#f8fafc" rx="8" />

            {/* 1. Structural Substrate Layer (X: 40 to 160) */}
            <g>
              <rect
                x="40"
                y="40"
                width="120"
                height="260"
                fill="url(#eifsSubstratePattern)"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <text
                x="100"
                y="170"
                fill="#1e293b"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                Substrate
              </text>
              <text
                x="100"
                y="190"
                fill="#475569"
                fontSize="10"
                textAnchor="middle"
              >
                {substrateType === "exterior_sheathing"
                  ? "Framed Sheathing"
                  : "Masonry/Concrete"}
              </text>
            </g>

            {/* 2. Fluid-Applied WRB / Air Barrier (X: 160 to 175) */}
            <g>
              <rect
                x="160"
                y="40"
                width="15"
                height="260"
                fill="#dc2626"
                stroke="#b91c1c"
                strokeWidth="1"
              />
              <line
                x1="167"
                y1="40"
                x2="167"
                y2="300"
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </g>

            {/* 3. Drainage Cavity / Mat (X: 175 to 195) if drainable */}
            {systemType === "drainable_eifs" ? (
              <g>
                <rect
                  x="175"
                  y="40"
                  width="20"
                  height="260"
                  fill="#0284c7"
                  fillOpacity="0.25"
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Drainage arrows */}
                <path
                  d="M 185 80 L 185 110 M 182 104 L 185 110 L 188 104"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M 185 170 L 185 200 M 182 194 L 185 200 L 188 194"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M 185 240 L 185 270 M 182 264 L 185 270 L 188 264"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  fill="none"
                />
              </g>
            ) : null}

            {/* 4. Adhesive Ribbon & Dabs (X: 195 to 215) */}
            <g>
              <path
                d="M 198 60 Q 208 80 198 100 Q 208 120 198 140 Q 208 160 198 180 Q 208 200 198 220 Q 208 240 198 260"
                stroke="#475569"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* 5. Continuous Insulation Board (X: 215 to 355) */}
            <g>
              <rect
                x="215"
                y="40"
                width="140"
                height="260"
                fill={insulationColor}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <text
                x="285"
                y="165"
                fill="#0f172a"
                fontSize="13"
                fontWeight="bold"
                textAnchor="middle"
              >
                {insulationName}
              </text>
              <text
                x="285"
                y="185"
                fill="#334155"
                fontSize="11"
                textAnchor="middle"
              >
                {insulationThicknessMm} mm Thickness
              </text>
              <text
                x="285"
                y="202"
                fill="#0369a1"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                Continuous ci
              </text>

              {/* Mechanical washer fastener illustration */}
              <circle
                cx="285"
                cy="90"
                r="14"
                fill="#64748b"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <circle cx="285" cy="90" r="4" fill="#0f172a" />
              <line
                x1="285"
                y1="90"
                x2="100"
                y2="90"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
              <text
                x="310"
                y="94"
                fill="#334155"
                fontSize="9"
                fontWeight="bold"
              >
                Washer Fixing
              </text>
            </g>

            {/* 6. Base Coat with AR Fiberglass Mesh Embedment (X: 355 to 375) */}
            <g>
              <rect
                x="355"
                y="40"
                width="20"
                height="260"
                fill="#64748b"
                stroke="#475569"
                strokeWidth="1"
              />
              <rect
                x="362"
                y="40"
                width="6"
                height="260"
                fill="url(#meshGridPattern)"
              />
            </g>

            {/* 7. Acrylic Primer + Textured Finish Coat (X: 375 to 400) */}
            <g>
              {/* Primer line */}
              <rect x="375" y="40" width="5" height="260" fill="#f59e0b" />
              {/* Textured finish */}
              <rect
                x="380"
                y="40"
                width="20"
                height="260"
                fill="url(#stuccoTexturePattern)"
                stroke="#b45309"
                strokeWidth="1.5"
              />
            </g>

            {/* Starter Weep Track at Base */}
            <g>
              <path
                d="M 160 300 L 405 300 L 405 315 L 390 315 L 390 305 L 160 305 Z"
                fill="#475569"
                stroke="#1e293b"
                strokeWidth="1"
              />
              <circle cx="395" cy="308" r="2" fill="#0284c7" />
              <line
                x1="395"
                y1="315"
                x2="395"
                y2="330"
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <text
                x="405"
                y="335"
                fill="#0369a1"
                fontSize="9"
                fontWeight="bold"
              >
                Weep Drainage
              </text>
            </g>

            {/* Right Side Layer Labels Callouts */}
            <g transform="translate(425, 55)">
              <line
                x1="0"
                y1="10"
                x2="-25"
                y2="10"
                stroke="#b45309"
                strokeWidth="1"
              />
              <text x="5" y="14" fill="#9a3412" fontSize="11" fontWeight="bold">
                1. Synthetic Acrylic Finish ({finishTexture.replace(/_/g, " ")})
              </text>

              <line
                x1="0"
                y1="40"
                x2="-50"
                y2="40"
                stroke="#d97706"
                strokeWidth="1"
              />
              <text x="5" y="44" fill="#b45309" fontSize="11">
                2. Tinted Acrylic Primer Coat
              </text>

              <line
                x1="0"
                y1="75"
                x2="-60"
                y2="75"
                stroke="#475569"
                strokeWidth="1"
              />
              <text x="5" y="79" fill="#1e293b" fontSize="11" fontWeight="bold">
                3. Base Coat + Embedded AR Mesh (160 g/m²)
              </text>
              {hasImpactMesh ? (
                <text x="18" y="94" fill="#047857" fontSize="10">
                  + High-Impact Armor Mesh at ground zone (2.0m)
                </text>
              ) : null}

              <line
                x1="0"
                y1="130"
                x2="-140"
                y2="130"
                stroke="#0f172a"
                strokeWidth="1"
              />
              <text
                x="5"
                y="134"
                fill="#0f172a"
                fontSize="11"
                fontWeight="bold"
              >
                4. Continuous Insulation ({insulationThicknessMm}mm{" "}
                {insulationName})
              </text>

              <line
                x1="0"
                y1="170"
                x2="-220"
                y2="170"
                stroke="#475569"
                strokeWidth="1"
              />
              <text x="5" y="174" fill="#475569" fontSize="11">
                5. Polymer-Modified Adhesive + Mechanical Anchors
              </text>

              {systemType === "drainable_eifs" ? (
                <>
                  <line
                    x1="0"
                    y1="205"
                    x2="-240"
                    y2="205"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <text
                    x="5"
                    y="209"
                    fill="#0284c7"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    6. Engineered Drainage Cavity (ASTM E2273)
                  </text>
                </>
              ) : null}

              <line
                x1="0"
                y1="240"
                x2="-260"
                y2="240"
                stroke="#b91c1c"
                strokeWidth="1"
              />
              <text
                x="5"
                y="244"
                fill="#b91c1c"
                fontSize="11"
                fontWeight="bold"
              >
                {systemType === "drainable_eifs" ? "7." : "6."} Fluid-Applied
                Air/Water Barrier (WRB)
              </text>
            </g>
          </svg>
        ) : (
          <svg
            viewBox="0 0 740 360"
            className="w-full max-w-2xl h-auto select-none font-sans"
            aria-label="EIFS wall elevation board pattern and opening detailing"
          >
            {/* Background */}
            <rect x="0" y="0" width="740" height="360" fill="#f8fafc" rx="8" />

            {/* Wall Outline */}
            <rect
              x="40"
              y="40"
              width="660"
              height="260"
              fill="#e2e8f0"
              stroke="#475569"
              strokeWidth="2"
            />

            {/* Staggered Insulation Board Joints (Running Bond Grid) */}
            <g stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 1">
              {/* Horizontal board courses */}
              <line x1="40" y1="105" x2="700" y2="105" />
              <line x1="40" y1="170" x2="700" y2="170" />
              <line x1="40" y1="235" x2="700" y2="235" />

              {/* Course 1 Vertical Stagger */}
              <line x1="160" y1="40" x2="160" y2="105" />
              <line x1="300" y1="40" x2="300" y2="105" />
              <line x1="440" y1="40" x2="440" y2="105" />
              <line x1="580" y1="40" x2="580" y2="105" />

              {/* Course 2 Vertical Stagger (shifted) */}
              <line x1="90" y1="105" x2="90" y2="170" />
              <line x1="230" y1="105" x2="230" y2="170" />
              <line x1="370" y1="105" x2="370" y2="170" />
              <line x1="510" y1="105" x2="510" y2="170" />
              <line x1="650" y1="105" x2="650" y2="170" />

              {/* Course 3 Vertical Stagger */}
              <line x1="160" y1="170" x2="160" y2="235" />
              <line x1="300" y1="170" x2="300" y2="235" />
              <line x1="440" y1="170" x2="440" y2="235" />
              <line x1="580" y1="170" x2="580" y2="235" />

              {/* Course 4 Vertical Stagger */}
              <line x1="90" y1="235" x2="90" y2="300" />
              <line x1="230" y1="235" x2="230" y2="300" />
              <line x1="370" y1="235" x2="370" y2="300" />
              <line x1="510" y1="235" x2="510" y2="300" />
              <line x1="650" y1="235" x2="650" y2="300" />
            </g>

            {/* High-Impact Ground Zone Shading (bottom 65px representing 2.0m) */}
            {hasImpactMesh ? (
              <g>
                <rect
                  x="40"
                  y="235"
                  width="660"
                  height="65"
                  fill="#059669"
                  fillOpacity="0.18"
                  stroke="#059669"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x="50"
                  y="255"
                  fill="#065f46"
                  fontSize="10"
                  fontWeight="bold"
                >
                  HIGH-IMPACT ARMOR MESH ZONE (Ground to 2.0m height)
                </text>
              </g>
            ) : null}

            {/* Window Opening Illustration (X: 180, Y: 90, W: 110, H: 90) */}
            <g>
              {/* L-shaped corner cutouts (highlighted) */}
              <rect
                x="180"
                y="90"
                width="110"
                height="90"
                fill="#38bdf8"
                fillOpacity="0.4"
                stroke="#0284c7"
                strokeWidth="2"
              />
              <text
                x="235"
                y="140"
                fill="#0369a1"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                WINDOW
              </text>

              {/* 45° Butterfly Mesh Patches at all 4 corners */}
              {/* Top-Left Corner */}
              <path
                d="M 170 80 L 190 70 L 175 100 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />
              {/* Top-Right Corner */}
              <path
                d="M 300 80 L 280 70 L 295 100 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />
              {/* Bottom-Left Corner */}
              <path
                d="M 170 190 L 190 200 L 175 170 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />
              {/* Bottom-Right Corner */}
              <path
                d="M 300 190 L 280 200 L 295 170 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />

              <text
                x="235"
                y="70"
                fill="#9a3412"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
              >
                45° Butterfly Stress Patches
              </text>
            </g>

            {/* Door Opening Illustration (X: 430, Y: 120, W: 80, H: 180) */}
            <g>
              <rect
                x="430"
                y="120"
                width="80"
                height="180"
                fill="#cbd5e1"
                stroke="#334155"
                strokeWidth="2"
              />
              <text
                x="470"
                y="210"
                fill="#1e293b"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                DOOR
              </text>
              {/* Butterfly Patches at Door Top Corners */}
              <path
                d="M 420 110 L 440 100 L 425 130 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />
              <path
                d="M 520 110 L 500 100 L 515 130 Z"
                fill="#d97706"
                stroke="#b45309"
                strokeWidth="1.5"
              />
            </g>

            {/* Starter Weep Screed Line at Base */}
            <line
              x1="40"
              y1="300"
              x2="700"
              y2="300"
              stroke="#0f172a"
              strokeWidth="4"
            />
            <text
              x="370"
              y="320"
              fill="#334155"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
            >
              Perforated PVC Starter Weep Screed (Min. 50mm above finished
              grade)
            </text>

            {/* Legend badges */}
            <g transform="translate(50, 15)">
              <rect x="0" y="0" width="12" height="12" fill="#d97706" />
              <text x="18" y="10" fill="#475569" fontSize="10">
                Butterfly Anti-Crack Patches (200x300mm at 45°)
              </text>

              <rect
                x="310"
                y="0"
                width="12"
                height="12"
                fill="#059669"
                fillOpacity="0.4"
              />
              <text x="328" y="10" fill="#475569" fontSize="10">
                High-Impact Ground Mesh
              </text>

              <rect
                x="520"
                y="0"
                width="12"
                height="12"
                fill="#e2e8f0"
                stroke="#94a3b8"
              />
              <text x="538" y="10" fill="#475569" fontSize="10">
                Staggered Running Bond (1200x600mm)
              </text>
            </g>
          </svg>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4 border-t border-border/50 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Continuous ci R-value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>ASTM E2568 / NFPA 285</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>Wind-Suction Anchors</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>Dual Drainage & Flashing</span>
        </div>
      </div>
    </div>
  );
};

export default EifsWallSchematic;
