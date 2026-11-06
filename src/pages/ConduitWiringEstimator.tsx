/**
 * Electrical Conduit & Wiring Loop Estimator page.
 *
 * Supports two complementary workflows:
 * 1. Empirical Area & Point Takeoff (planning allowances per m² and point count).
 * 2. Interactive Manhattan Wall & Drop Router (taxicab perimeter/wall geometry,
 *    vertical drop/rise multipliers, and 10% physical wastage constant).
 */

import { useMemo, useState } from "react";
import {
  calculateConduitWiring,
  parseConduitWiringRules,
  type ConduitWiringInput,
} from "@/lib/estimation/conduit-wiring-engine";
import {
  calculateMEPRouting,
  type MEPPoint,
} from "@/lib/estimation/mep-conduit-router-engine";
import type { SpecialtyResult } from "@/lib/estimation/specialty";
import {
  mergePriceOverrides,
  useSpecialtyPrices,
} from "@/components/calculators/useSpecialtyPrices";
import SpecialtyCalculatorShell from "@/components/calculators/SpecialtyCalculatorShell";
import { CalculatorSchematic } from "@/components/engineering/CalculatorSchematic";
import {
  SliderField,
  FieldGroup,
} from "@/components/calculators/SpecialtyFields";
import { track } from "@/lib/analytics";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import {
  Plus,
  Trash2,
  Download,
  Route,
  Layers,
} from "lucide-react";

type DeviceType = MEPPoint["type"];

const DEVICE_LABELS: Record<DeviceType, { label: string; color: string }> = {
  distribution_board: { label: "Distribution Board", color: "#ef4444" },
  switch: { label: "Light Switch", color: "#f59e0b" },
  light: { label: "Ceiling Light", color: "#eab308" },
  socket: { label: "Wall Socket", color: "#3b82f6" },
  water_inlet: { label: "Water Inlet", color: "#06b6d4" },
  tap: { label: "Tap / Fixture", color: "#14b8a6" },
};

export default function ConduitWiringEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("conduit_wiring");

  // Mode: "quick" (empirical area/points) vs "router" (interactive 2D Manhattan layout)
  const [activeMode, setActiveMode] = useState<"quick" | "router">("quick");

  // Quick mode inputs
  const [area, setArea] = useState(120);
  const [lights, setLights] = useState(12);
  const [sockets, setSockets] = useState(10);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  // Router mode inputs
  const [roomWidth, setRoomWidth] = useState(6); // meters
  const [roomLength, setRoomLength] = useState(8); // meters
  const [ceilingHeight, setCeilingHeight] = useState(3.0); // meters
  const [deviceTypeToAdd, setDeviceTypeToAdd] = useState<DeviceType>("socket");

  const [routerPoints, setRouterPoints] = useState<MEPPoint[]>([
    { id: "p-db", type: "distribution_board", x: 0.5, y: 0.5, label: "Main DB" },
    { id: "p-sw1", type: "switch", x: 0.5, y: 3.5, label: "Door Switch" },
    { id: "p-l1", type: "light", x: 3.0, y: 4.0, label: "Center Light" },
    { id: "p-sk1", type: "socket", x: 5.5, y: 2.0, label: "Ring Socket 1" },
    { id: "p-sk2", type: "socket", x: 5.5, y: 6.5, label: "Ring Socket 2" },
  ]);

  const rules = useMemo(() => parseConduitWiringRules(ruleRows), [ruleRows]);
  const prices = useMemo(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const routingResult = useMemo(() => {
    return calculateMEPRouting(routerPoints, {
      ceilingHeightMeters: ceilingHeight,
      conduitStandardLengthMeters: rules.conduit_length_m,
    });
  }, [routerPoints, ceilingHeight, rules.conduit_length_m]);

  const input: ConduitWiringInput = {
    floor_area_m2: area,
    lighting_points: lights,
    socket_points: sockets,
  };

  const run = () => {
    const res = calculateConduitWiring(input, rules, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "conduit_wiring",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  const addPointAtCenter = () => {
    const newId = `p-${Date.now()}`;
    const nextOffset = (routerPoints.length % 5) * 0.8;
    setRouterPoints((prev) => [
      ...prev,
      {
        id: newId,
        type: deviceTypeToAdd,
        x: Math.min(roomWidth - 0.5, 1.0 + nextOffset),
        y: Math.min(roomLength - 0.5, 1.5 + nextOffset),
        label: `${DEVICE_LABELS[deviceTypeToAdd].label} #${prev.length + 1}`,
      },
    ]);
  };

  const removePoint = (id: string) => {
    setRouterPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const syncPointsToTakeoff = () => {
    const lightCount = routerPoints.filter(
      (p) => p.type === "light" || p.type === "switch",
    ).length;
    const socketCount = routerPoints.filter((p) => p.type === "socket").length;
    const calcArea = Math.round(roomWidth * roomLength);

    setArea(calcArea);
    setLights(lightCount);
    setSockets(socketCount);
    setActiveMode("quick");
  };

  const exportRouterCsv = () => {
    const rows: string[][] = [
      ["FRELUX Manhattan Conduit & Wiring Route Schedule", ""],
      ["Room Dimensions", `${roomWidth}m × ${roomLength}m (${roomWidth * roomLength} m²)`],
      ["Ceiling Height", `${ceilingHeight}m`],
      ["Total Horizontal Manhattan Run", `${routingResult.totalHorizontalLengthM} m`],
      ["Total Vertical Wall Drops", `${routingResult.totalVerticalLengthM} m`],
      ["Total Conduit Route (incl. 10% Waste)", `${routingResult.totalConduitLengthM} m`],
      ["20mm PVC Conduit Pipes (2.9m lengths)", String(routingResult.conduitPvcPipes20mmPieces)],
      ["1.5mm Lighting Wire Coils (100m)", String(routingResult.lightingWireCoils1_5mm)],
      ["2.5mm Socket Wire Coils (100m)", String(routingResult.socketWireCoils2_5mm)],
      ["--- ROUTED SEGMENTS ---", ""],
      ["From", "To", "Horizontal (m)", "Vertical Drops (m)", "Segment Total (m)"],
      ...routingResult.segments.map((s) => [
        s.fromId,
        s.toId,
        String(s.manhattanHorizontalM),
        String(s.verticalDropsM),
        String(s.totalLengthM),
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mep-conduit-route-${roomWidth}x${roomLength}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SpecialtyCalculatorShell
      calculatorType="conduit_wiring"
      title="Electrical Conduit & Wiring Estimator"
      subtitle="Convert floor area or Manhattan wall-routed device layouts into conduit lengths, cable coils, boxes, switches and sockets."
      seoTitle="Electrical Conduit and Wiring Material Estimator | FRELUX"
      seoDescription="Estimate PVC conduit, 1.5 mm and 2.5 mm cable coils, junction boxes, switch plates and sockets from floor area and your lighting and socket point counts."
      breadcrumbName="Conduit and Wiring Estimator"
      faqSlug="conduit-wiring-estimator"
      routePath="/electrical-conduit-wiring-estimator"
      limitations={[
        "This is a material takeoff, not a circuit design. Circuit sizing, breaker ratings, earthing and volt drop remain the electrician's responsibility.",
        "Cable lengths are planning allowances per point, not measured routes: ceiling height, wall thickness and switch drops change them.",
        "Conduit is sized from floor area or Manhattan taxicab pathing with a 10% physical installation wastage allowance.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Electrical Material Estimate"
      quoteFooter="Material takeoff only, not a circuit design. Circuit sizing, earthing and breaker ratings are the electrician's design."
      proCallout={{
        title: "Ready to install wiring conduits?",
        body: "Find verified local electricians near you on Pro Connect, then hand them this shopping list.",
        cta: "Find an electrician",
        to: "/pro-connect",
      }}
      crossLinks={[
        {
          label: "Electrical estimator",
          to: "/electrical",
          description:
            "Full electrical estimate with cable, breakers, switches and sockets by circuit.",
        },
        {
          label: "Water Tank Staging Estimator",
          to: "/water-tower-staging-estimator",
          description:
            "Structural dead load, wind safety factor, and steel/concrete BOM for overhead water tank towers.",
        },
        {
          label: "Solar PV estimator",
          to: "/solar-pv-estimator",
          description:
            "Inverter and panel sizing for the same building once the wiring is in.",
        },
      ]}
      notes={
        <p>
          Rules in use: {rules.conduit_per_m2} m of conduit per m² of floor,{" "}
          {rules.conduit_length_m} m per conduit length,{" "}
          {rules.lighting_cable_per_point_m} m of 1.5 mm cable per lighting
          point, {rules.socket_cable_per_point_m} m of 2.5 mm cable per socket
          point, {rules.junction_per_point} boxes per point.
        </p>
      }
      inputs={
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="rounded-xl border border-border bg-muted/40 p-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode("quick")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeMode === "quick"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-primary" /> Quick Takeoff (Area & Points)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("router")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeMode === "router"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Route className="h-3.5 w-3.5 text-primary" /> Interactive Manhattan Router
            </button>
          </div>

          {activeMode === "quick" ? (
            <>
              <FieldGroup title="Building">
                <SliderField
                  label="Total floor area"
                  unit="m²"
                  value={area}
                  onChange={setArea}
                  min={10}
                  max={1000}
                  step={5}
                  hint="Floor area of the spaces being wired."
                />
              </FieldGroup>

              <FieldGroup title="Points">
                <SliderField
                  label="Lighting points"
                  unit="points"
                  value={lights}
                  onChange={setLights}
                  min={0}
                  max={200}
                  hint="Ceiling lights, including outside lights on the same wiring."
                />
                <SliderField
                  label="Socket and outlet points"
                  unit="points"
                  value={sockets}
                  onChange={setSockets}
                  min={0}
                  max={200}
                  hint="Wall sockets, including air conditioner and dedicated outlets."
                />
              </FieldGroup>
              <CalculatorSchematic
                kind="electrical"
                area={area.toLocaleString()}
                lights={lights.toLocaleString()}
                sockets={sockets.toLocaleString()}
              />
            </>
          ) : (
            <div className="space-y-6">
              {/* Room Geometry Parameters */}
              <FieldGroup title="Room Dimensions & Ceiling">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      step={0.5}
                      value={roomWidth}
                      onChange={(e) => setRoomWidth(Math.max(2, Number(e.target.value)))}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Length (m)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      step={0.5}
                      value={roomLength}
                      onChange={(e) => setRoomLength(Math.max(2, Number(e.target.value)))}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Ceiling (m)
                    </label>
                    <input
                      type="number"
                      min={2.4}
                      max={6.0}
                      step={0.1}
                      value={ceilingHeight}
                      onChange={(e) => setCeilingHeight(Math.max(2.4, Number(e.target.value)))}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </FieldGroup>

              {/* 2D Manhattan Floorplan Visual Canvas */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Route className="h-4 w-4 text-primary" /> Visual Floorplan & Glowing Wall Runs
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {routerPoints.length} Points · {roomWidth}m × {roomLength}m
                  </Badge>
                </div>

                {/* SVG Visual Canvas */}
                <div className="relative border border-border/80 rounded-lg bg-slate-950 p-2 overflow-hidden aspect-[4/3] flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${roomWidth * 50 + 40} ${roomLength * 50 + 40}`}
                    className="w-full h-full select-none"
                  >
                    <defs>
                      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Room perimeter walls */}
                    <rect
                      x="20"
                      y="20"
                      width={roomWidth * 50}
                      height={roomLength * 50}
                      fill="#020617"
                      stroke="#334155"
                      strokeWidth="3"
                      rx="4"
                    />

                    {/* Glowing Manhattan Path Lines connecting adjacent points */}
                    {routerPoints.map((pt, idx) => {
                      if (idx === routerPoints.length - 1) return null;
                      const next = routerPoints[idx + 1];
                      const x1 = 20 + pt.x * 50;
                      const y1 = 20 + pt.y * 50;
                      const x2 = 20 + next.x * 50;
                      const y2 = 20 + next.y * 50;

                      // Manhattan taxicab path: travel horizontally then vertically
                      return (
                        <g key={`path-${pt.id}-${next.id}`}>
                          <path
                            d={`M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            filter="url(#neonGlow)"
                            strokeDasharray="4 2"
                            opacity="0.9"
                          />
                        </g>
                      );
                    })}

                    {/* Device Points */}
                    {routerPoints.map((pt) => {
                      const cx = 20 + pt.x * 50;
                      const cy = 20 + pt.y * 50;
                      const meta = DEVICE_LABELS[pt.type] || { color: "#38bdf8", label: pt.type };

                      return (
                        <g key={pt.id}>
                          <circle cx={cx} cy={cy} r="8" fill={meta.color} stroke="#ffffff" strokeWidth="1.5" />
                          <text
                            x={cx}
                            y={cy - 12}
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="9"
                            fontWeight="bold"
                            className="drop-shadow-md"
                          >
                            {pt.label || meta.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Main DB
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Switch
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" /> Light
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Socket
                  </span>
                </div>
              </div>

              {/* Add Device Controls */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-3">
                <span className="text-xs font-semibold text-foreground block">
                  Add Device to Route
                </span>
                <div className="flex gap-2">
                  <select
                    value={deviceTypeToAdd}
                    onChange={(e) => setDeviceTypeToAdd(e.target.value as DeviceType)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="socket">🔌 Wall Socket (0.3m)</option>
                    <option value="switch">🎛️ Light Switch (1.2m)</option>
                    <option value="light">💡 Ceiling Light (Ceiling)</option>
                    <option value="distribution_board">⚡ Distribution Board (1.5m)</option>
                  </select>
                  <Button size="sm" onClick={addPointAtCenter} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>

                {/* Point List */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {routerPoints.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium text-foreground">{p.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({p.x}m, {p.y}m)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePoint(p.id)}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manhattan Route BOM Metrics */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Manhattan Route Output
                  </span>
                  <Badge variant="outline" className="text-xs font-mono border-primary/30">
                    +10% Wastage Added
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[11px] text-muted-foreground block">Conduit PVC Pipes</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {routingResult.conduitPvcPipes20mmPieces} Lengths
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {routingResult.totalConduitLengthM}m total @ 2.9m/pipe
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[11px] text-muted-foreground block">Horizontal + Vertical</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {routingResult.totalHorizontalLengthM}m + {routingResult.totalVerticalLengthM}m
                    </span>
                    <span className="text-[10px] text-muted-foreground">Wall perimeter & drops</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[11px] text-muted-foreground block">1.5mm Lighting Wire</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {routingResult.lightingWireCoils1_5mm} Coil(s)
                    </span>
                    <span className="text-[10px] text-muted-foreground">100m bundles</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[11px] text-muted-foreground block">2.5mm Socket Wire</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {routingResult.socketWireCoils2_5mm} Coil(s)
                    </span>
                    <span className="text-[10px] text-muted-foreground">100m ring/radial</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={syncPointsToTakeoff}
                    className="flex-1 text-xs"
                  >
                    Sync to Quick Takeoff
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportRouterCsv}
                    className="gap-1 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Route CSV
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
