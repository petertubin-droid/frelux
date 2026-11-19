import React, { useState } from "react";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Layers, ShieldCheck, Thermometer } from "lucide-react";
import type { IcfCoreThicknessMm, IcfFoamType } from "@/lib/estimation/icf-engine";

interface IcfWallSchematicProps {
  coreThicknessMm: IcfCoreThicknessMm;
  foamType: IcfFoamType;
  wallLengthM: number;
  wallHeightM: number;
  hasOpenings: boolean;
  isBasement?: boolean;
}

export const IcfWallSchematic: React.FC<IcfWallSchematicProps> = ({
  coreThicknessMm,
  foamType,
  wallLengthM,
  wallHeightM,
  hasOpenings,
  isBasement,
}) => {
  const [viewMode, setViewMode] = useState<"cross_section" | "elevation">("cross_section");

  const totalWallThicknessMm = 64 + coreThicknessMm + 64; // 2x 64mm EPS + core
  const foamColor = foamType === "graphite_neopor" ? "#475569" : "#e2e8f0";
  const foamLabel = foamType === "graphite_neopor" ? "Neopor Graphite EPS (64mm)" : "Standard EPS Foam (64mm)";

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            ICF Assembly Schematic & Structural Section
          </h3>
          <Badge variant="outline" className="text-xs font-mono font-medium">
            {coreThicknessMm}mm Core ({totalWallThicknessMm}mm Total)
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
            Core Cross-Section
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "elevation" ? "default" : "outline"}
            className="h-7 text-xs px-2.5"
            onClick={() => setViewMode("elevation")}
          >
            Wall & Bracing Elevation
          </Button>
        </div>
      </div>

      <div className="mt-3 flex justify-center overflow-x-auto py-2">
        {viewMode === "cross_section" ? (
          <svg
            viewBox="0 0 740 360"
            className="w-full max-w-2xl h-auto select-none font-sans"
            aria-label="ICF wall cross-section structural diagram"
          >
            <defs>
              {/* Concrete stipple pattern */}
              <pattern id="concretePattern" width="16" height="16" patternUnits="userSpaceOnUse">
                <rect width="16" height="16" fill="#94a3b8" />
                <circle cx="3" cy="4" r="1.2" fill="#475569" />
                <circle cx="11" cy="6" r="1.8" fill="#334155" />
                <circle cx="7" cy="12" r="1.4" fill="#64748b" />
                <circle cx="14" cy="14" r="1" fill="#475569" />
              </pattern>
              {/* Waterproofing membrane hatched pattern */}
              <pattern id="membranePattern" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#1e293b" />
                <path d="M0 8 L8 0" stroke="#0ea5e9" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background container */}
            <rect x="20" y="15" width="700" height="330" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />

            {/* Footing / Slab foundation at bottom */}
            <rect x="120" y="270" width="500" height="60" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
            <text x="370" y="305" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
              Reinforced Concrete Strip Footing / Monolithic Slab
            </text>

            {/* Starter Dowel Rebar anchored into footing */}
            <path
              d="M370 295 L370 170"
              stroke="#ea580c"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="none"
            />
            {/* L-Hook in footing */}
            <path d="M370 295 L405 295" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" />

            {/* Below Grade Waterproofing Membrane (if basement) */}
            {isBasement && (
              <g>
                <rect x="188" y="45" width="12" height="225" fill="url(#membranePattern)" rx="2" />
                <text x="140" y="140" fill="#0284c7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Peel & Stick +
                </text>
                <text x="140" y="154" fill="#0284c7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Dimple Board
                </text>
                <line x1="188" y1="145" x2="175" y2="145" stroke="#0284c7" strokeWidth="1" />
              </g>
            )}

            {/* Outer EPS Foam Face (64mm) */}
            <rect
              x="200"
              y="45"
              width="55"
              height="225"
              fill={foamColor}
              stroke="#64748b"
              strokeWidth="1.5"
              rx="2"
            />
            <text
              x="227"
              y="160"
              transform="rotate(-90 227 160)"
              textAnchor="middle"
              fill="#1e293b"
              fontSize="11"
              fontWeight="600"
            >
              Exterior EPS Foam (64mm)
            </text>

            {/* Polypropylene Internal Web Ties (spacers connecting foam panels) */}
            {[75, 125, 175, 225].map((y) => (
              <g key={y}>
                <line x1="250" y1={y} x2="490" y2={y} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
                {/* Rebar saddle clips on the web */}
                <circle cx="340" cy={y} r="5" fill="#f97316" stroke="#9a3412" strokeWidth="1.5" />
                <circle cx="400" cy={y} r="5" fill="#f97316" stroke="#9a3412" strokeWidth="1.5" />
              </g>
            ))}

            {/* Concrete Core Cavity */}
            <rect
              x="255"
              y="45"
              width="230"
              height="225"
              fill="url(#concretePattern)"
              stroke="#334155"
              strokeWidth="2"
            />
            <text x="370" y="80" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="bold">
              {coreThicknessMm}mm Solid Poured Concrete Core
            </text>
            <text x="370" y="98" textAnchor="middle" fill="#334155" fontSize="10">
              High-Flow Pea Gravel Mix (25–30 MPa)
            </text>

            {/* Vertical Rebar Bars in core */}
            <line x1="340" y1="50" x2="340" y2="265" stroke="#ea580c" strokeWidth="3" />
            <line x1="400" y1="50" x2="400" y2="265" stroke="#ea580c" strokeWidth="3" />

            {/* Inner EPS Foam Face (64mm) */}
            <rect
              x="485"
              y="45"
              width="55"
              height="225"
              fill={foamColor}
              stroke="#64748b"
              strokeWidth="1.5"
              rx="2"
            />
            <text
              x="512"
              y="160"
              transform="rotate(90 512 160)"
              textAnchor="middle"
              fill="#1e293b"
              fontSize="11"
              fontWeight="600"
            >
              Interior EPS Foam (64mm)
            </text>

            {/* Interior 12.5mm Gypsum Drywall Thermal Barrier */}
            <rect
              x="543"
              y="45"
              width="14"
              height="225"
              fill="#fed7aa"
              stroke="#ea580c"
              strokeWidth="1.5"
              rx="1"
            />
            {/* Drywall fastening screws */}
            {[75, 125, 175, 225].map((y) => (
              <circle key={y} cx="550" cy={y} r="2.5" fill="#1e293b" />
            ))}
            <text
              x="590"
              y="150"
              fill="#9a3412"
              fontSize="10"
              fontWeight="bold"
            >
              12.5mm Type X Drywall
            </text>
            <text
              x="590"
              y="164"
              fill="#64748b"
              fontSize="9"
            >
              15-Min Thermal Barrier (IRC R316)
            </text>

            {/* Dimension Callouts */}
            <line x1="200" y1="28" x2="540" y2="28" stroke="#0f172a" strokeWidth="1.2" markerEnd="url(#arrow)" />
            <text x="370" y="24" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
              Total Thickness: {totalWallThicknessMm} mm ({(totalWallThicknessMm / 25.4).toFixed(1)}&quot;)
            </text>

            {/* Annotations */}
            <text x="35" y="45" fill="#334155" fontSize="10" fontWeight="bold">
              Exterior Zone
            </text>
            <text x="650" y="45" fill="#334155" fontSize="10" fontWeight="bold">
              Conditioned Interior
            </text>
          </svg>
        ) : (
          <svg
            viewBox="0 0 740 360"
            className="w-full max-w-2xl h-auto select-none font-sans"
            aria-label="ICF wall elevation and turnbuckle bracing diagram"
          >
            {/* Background container */}
            <rect x="20" y="15" width="700" height="330" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />

            {/* Ground / Footing level */}
            <line x1="40" y1="290" x2="700" y2="290" stroke="#334155" strokeWidth="2.5" />
            <text x="50" y="315" fill="#64748b" fontSize="10" fontWeight="bold">
              Finished Slab / Footing Grade
            </text>

            {/* Stacked ICF Blocks Grid (8 courses high) */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
              const y = 290 - (c + 1) * 28;
              const isEven = c % 2 === 0;
              const offset = isEven ? 0 : 35;
              return (
                <g key={c}>
                  {/* Horizontal course line */}
                  <line x1="80" y1={y} x2="660" y2={y} stroke="#64748b" strokeWidth="1" />
                  {/* Vertical interlocking joints (staggered running bond) */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
                    <line
                      key={b}
                      x1={80 + offset + b * 70}
                      y1={y}
                      x2={80 + offset + b * 70}
                      y2={y + 28}
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                  ))}
                </g>
              );
            })}
            {/* Wall Top Plate Line */}
            <line x1="80" y1="66" x2="660" y2="66" stroke="#0f172a" strokeWidth="2" />
            <rect x="80" y="66" width="580" height="224" fill={foamColor} opacity="0.35" />

            {/* Window Rough Opening with Buck & Reinforced Lintel */}
            {hasOpenings && (
              <g>
                <rect x="250" y="115" width="120" height="85" fill="#ffffff" stroke="#ea580c" strokeWidth="2" rx="2" />
                {/* Window buck outline */}
                <rect x="246" y="111" width="128" height="93" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="4 2" />
                <text x="310" y="160" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">
                  Rough Opening Buck
                </text>
                {/* Lintel header reinforcement band */}
                <rect x="235" y="85" width="150" height="24" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.5" rx="2" />
                <text x="310" y="101" textAnchor="middle" fill="#9a3412" fontSize="9" fontWeight="bold">
                  Reinforced Lintel Header Cage
                </text>
              </g>
            )}

            {/* Turnbuckle Alignment Bracing Jacks */}
            {[140, 420, 600].map((x) => (
              <g key={x}>
                {/* Vertical Strongback Channel */}
                <line x1={x} y1="75" x2={x} y2="290" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
                {/* Catwalk Scaffold Bracket */}
                <rect x={x - 25} y="170" width="50" height="8" fill="#0369a1" rx="1" />
                <line x1={x} y1="178" x2={x - 20} y2="210" stroke="#0369a1" strokeWidth="2" />
                {/* Diagonal Turnbuckle Leg */}
                <line x1={x} y1="170" x2={x + 70} y2="290" stroke="#0284c7" strokeWidth="3" />
                {/* Turnbuckle adjustment screw center */}
                <circle cx={x + 35} cy="230" r="4.5" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                {/* Slab Anchor Foot */}
                <rect x={x + 65} y="287" width="15" height="5" fill="#0f172a" rx="1" />
              </g>
            ))}

            <text x="420" y="45" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">
              Adjustable Turnbuckle Bracing Strongbacks (Every 2.0m Centers)
            </text>
            <text x="420" y="58" textAnchor="middle" fill="#64748b" fontSize="9">
              Integrated with scaffold walkboard brackets for pour safety
            </text>

            <text x="640" y="325" textAnchor="end" fill="#64748b" fontSize="10">
              Perimeter: {wallLengthM}m &middot; Height: {wallHeightM}m
            </text>
          </svg>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-amber-500" />
          <span>{foamLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Monolithic Concrete Core with Polypropylene Thermal Break</span>
        </div>
      </div>
    </div>
  );
};

export default IcfWallSchematic;
