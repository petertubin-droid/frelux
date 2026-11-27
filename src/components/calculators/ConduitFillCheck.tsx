import { useMemo, useState } from "react";
import { Gauge, ShieldCheck, AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  verifyConduitFill,
  type CableSpec,
  type ConduitFillStandard,
} from "@/lib/estimation/conduit-wiring-engine";
import { Badge } from "@/components/ui/shadcn/badge";

interface ConduitPreset {
  id: string;
  label: string;
  innerDiameterMm: number;
}

const CONDUIT_PRESETS: ConduitPreset[] = [
  { id: "emt_0.5", label: '1/2" EMT (15.8 mm ID)', innerDiameterMm: 15.8 },
  { id: "emt_0.75", label: '3/4" EMT (20.9 mm ID)', innerDiameterMm: 20.9 },
  { id: "emt_1.0", label: '1" EMT (26.6 mm ID)', innerDiameterMm: 26.6 },
  { id: "emt_1.25", label: '1-1/4" EMT (35.1 mm ID)', innerDiameterMm: 35.1 },
  { id: "emt_1.5", label: '1-1/2" EMT (40.9 mm ID)', innerDiameterMm: 40.9 },
  { id: "emt_2.0", label: '2" EMT (52.5 mm ID)', innerDiameterMm: 52.5 },
  {
    id: "pvc_16mm",
    label: "16 mm Metric PVC (13.0 mm ID)",
    innerDiameterMm: 13.0,
  },
  {
    id: "pvc_20mm",
    label: "20 mm Metric PVC (16.5 mm ID)",
    innerDiameterMm: 16.5,
  },
  {
    id: "pvc_25mm",
    label: "25 mm Metric PVC (21.0 mm ID)",
    innerDiameterMm: 21.0,
  },
  {
    id: "pvc_32mm",
    label: "32 mm Metric PVC (27.5 mm ID)",
    innerDiameterMm: 27.5,
  },
  {
    id: "pvc_40mm",
    label: "40 mm Metric PVC (35.0 mm ID)",
    innerDiameterMm: 35.0,
  },
  {
    id: "pvc_50mm",
    label: "50 mm Metric PVC (44.5 mm ID)",
    innerDiameterMm: 44.5,
  },
  { id: "custom", label: "Custom inner diameter", innerDiameterMm: 20.0 },
];

const CABLE_PRESETS: Array<{ label: string; outerDiameterMm: number }> = [
  { label: "14 AWG THHN (2.82 mm OD)", outerDiameterMm: 2.82 },
  { label: "12 AWG THHN (3.30 mm OD)", outerDiameterMm: 3.3 },
  { label: "10 AWG THHN (4.17 mm OD)", outerDiameterMm: 4.17 },
  { label: "8 AWG THHN (5.49 mm OD)", outerDiameterMm: 5.49 },
  { label: "6 AWG THHN (6.45 mm OD)", outerDiameterMm: 6.45 },
  { label: "4 AWG THHN (8.23 mm OD)", outerDiameterMm: 8.23 },
  { label: "2 AWG THHN (9.75 mm OD)", outerDiameterMm: 9.75 },
  { label: "1/0 AWG THHN (12.50 mm OD)", outerDiameterMm: 12.5 },
  { label: "1.5 mm² Single (2.80 mm OD)", outerDiameterMm: 2.8 },
  { label: "2.5 mm² Single (3.40 mm OD)", outerDiameterMm: 3.4 },
  { label: "4.0 mm² Single (4.00 mm OD)", outerDiameterMm: 4.0 },
  { label: "6.0 mm² Single (4.70 mm OD)", outerDiameterMm: 4.7 },
  { label: "10.0 mm² Single (6.00 mm OD)", outerDiameterMm: 6.0 },
  { label: "16.0 mm² Single (7.20 mm OD)", outerDiameterMm: 7.2 },
];

interface WireRow {
  id: string;
  presetIdx: number;
  count: number;
}

export default function ConduitFillCheck() {
  const [standard, setStandard] = useState<ConduitFillStandard>("NEC");
  const [isTrunking, setIsTrunking] = useState(false);
  const [conduitPreset, setConduitPreset] = useState("emt_0.75");
  const [customDiameter, setCustomDiameter] = useState("20.9");
  const [wires, setWires] = useState<WireRow[]>([
    { id: "w-1", presetIdx: 1, count: 3 }, // 3 x 12 AWG
  ]);

  const activeDiameter = useMemo(() => {
    if (conduitPreset === "custom") {
      const parsed = parseFloat(customDiameter);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 20.0;
    }
    const found = CONDUIT_PRESETS.find((p) => p.id === conduitPreset);
    return found ? found.innerDiameterMm : 20.0;
  }, [conduitPreset, customDiameter]);

  const cables: CableSpec[] = useMemo(() => {
    return wires.map((w) => {
      const spec = CABLE_PRESETS[w.presetIdx] ?? CABLE_PRESETS[0];
      return {
        count: w.count,
        outerDiameterMm: spec.outerDiameterMm,
        label: spec.label,
      };
    });
  }, [wires]);

  const fillResult = useMemo(() => {
    return verifyConduitFill(activeDiameter, cables, {
      standard,
      isTrunking: standard === "BS_7671" ? isTrunking : false,
    });
  }, [activeDiameter, cables, standard, isTrunking]);

  const addWire = () => {
    setWires((prev) => [
      ...prev,
      { id: `w-${Date.now()}`, presetIdx: 0, count: 1 },
    ]);
  };

  const removeWire = (id: string) => {
    if (wires.length <= 1) return;
    setWires((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWire = (id: string, updates: Partial<WireRow>) => {
    setWires((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    );
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Conduit Wire Fill Capacity Check
            </h3>
            <p className="text-xs text-muted-foreground">
              Evaluates raceway fill capacity against NEC Chapter 9 Table 1 or
              BS 7671 On-Site Guide.
            </p>
          </div>
        </div>
        {fillResult && (
          <Badge
            variant="outline"
            className={`text-xs font-medium px-2.5 py-0.5 ${
              fillResult.passesCode
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400"
            }`}
          >
            {fillResult.passesCode
              ? "✓ Within Fill Limit"
              : "✗ Overfilled Raceway"}
          </Badge>
        )}
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Code Standard Basis */}
        <div>
          <label
            htmlFor="conduit-standard-select"
            className="text-xs font-medium text-foreground block mb-1"
          >
            Governing Standard
          </label>
          <select
            id="conduit-standard-select"
            value={standard}
            onChange={(e) => setStandard(e.target.value as ConduitFillStandard)}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
          >
            <option value="NEC">NEC 2023 / NFPA 70 (Ch 9 Table 1)</option>
            <option value="BS_7671">BS 7671 / IET Wiring Regs (UK/Euro)</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {standard === "NEC"
              ? "1 wire: 53% · 2 wires: 31% · 3+ wires: 40% cap"
              : "Standard 40% space factor (conduit) or 45% (trunking)"}
          </p>
        </div>

        {/* Raceway Type if BS 7671 */}
        {standard === "BS_7671" ? (
          <div>
            <label
              htmlFor="conduit-raceway-select"
              className="text-xs font-medium text-foreground block mb-1"
            >
              Raceway Enclosure
            </label>
            <select
              id="conduit-raceway-select"
              value={isTrunking ? "trunking" : "conduit"}
              onChange={(e) => setIsTrunking(e.target.value === "trunking")}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
            >
              <option value="conduit">Circular Conduit (40% max fill)</option>
              <option value="trunking">
                Rectangular Trunking (45% max fill)
              </option>
            </select>
          </div>
        ) : (
          <div>
            <label
              htmlFor="conduit-size-select"
              className="text-xs font-medium text-foreground block mb-1"
            >
              Conduit Trade Size
            </label>
            <select
              id="conduit-size-select"
              value={conduitPreset}
              onChange={(e) => setConduitPreset(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
            >
              {CONDUIT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {standard === "BS_7671" && (
          <div>
            <label
              htmlFor="conduit-bs-size-select"
              className="text-xs font-medium text-foreground block mb-1"
            >
              Raceway Size
            </label>
            <select
              id="conduit-bs-size-select"
              value={conduitPreset}
              onChange={(e) => setConduitPreset(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
            >
              {CONDUIT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Inner Diameter input */}
        {conduitPreset === "custom" && (
          <div>
            <label
              htmlFor="conduit-custom-id"
              className="text-xs font-medium text-foreground block mb-1"
            >
              Custom Inner Diameter (mm)
            </label>
            <input
              id="conduit-custom-id"
              type="number"
              step={0.5}
              min={5}
              max={200}
              value={customDiameter}
              onChange={(e) => setCustomDiameter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      {/* Conductors Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Conductors in Raceway ({wires.reduce((acc, w) => acc + w.count, 0)}{" "}
            Total)
          </span>
          <button
            type="button"
            onClick={addWire}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Conductor Group
          </button>
        </div>

        <div className="space-y-2">
          {wires.map((wire, idx) => (
            <div
              key={wire.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
            >
              <div className="flex-1">
                <label htmlFor={`wire-type-${wire.id}`} className="sr-only">
                  Conductor Type
                </label>
                <select
                  id={`wire-type-${wire.id}`}
                  value={wire.presetIdx}
                  onChange={(e) =>
                    updateWire(wire.id, { presetIdx: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  {CABLE_PRESETS.map((p, pIdx) => (
                    <option key={p.label} value={pIdx}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <label htmlFor={`wire-count-${wire.id}`} className="sr-only">
                  Count
                </label>
                <input
                  id={`wire-count-${wire.id}`}
                  type="number"
                  min={1}
                  max={50}
                  value={wire.count}
                  onChange={(e) =>
                    updateWire(wire.id, {
                      count: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-center font-mono"
                  placeholder="Qty"
                />
              </div>

              <button
                type="button"
                onClick={() => removeWire(wire.id)}
                disabled={wires.length <= 1}
                className="p-1 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                aria-label={`Remove conductor row ${idx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fill Analysis Output */}
      {fillResult && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3.5 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span className="text-foreground">
              Fill Ratio: {fillResult.fillPercentage.toFixed(1)}% of{" "}
              {fillResult.maxAllowedFillPercentage}% Limit
            </span>
            <span className="text-muted-foreground font-mono">
              {fillResult.totalCableAreaMm2.toFixed(1)} mm² /{" "}
              {fillResult.totalConduitAreaMm2.toFixed(1)} mm²
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                fillResult.passesCode ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(100, (fillResult.fillPercentage / fillResult.maxAllowedFillPercentage) * 100)}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-1">
            <div>
              <span className="block text-foreground font-medium">
                Standard
              </span>
              <span>{fillResult.codeStandard}</span>
            </div>
            <div>
              <span className="block text-foreground font-medium">
                Conduit ID
              </span>
              <span>{fillResult.conduitInnerDiameterMm} mm</span>
            </div>
            <div>
              <span className="block text-foreground font-medium">
                Wire Count
              </span>
              <span>{fillResult.cableCount} conductors</span>
            </div>
            <div>
              <span className="block text-foreground font-medium">
                Allowed Cap
              </span>
              <span>{fillResult.maxAllowedFillPercentage}%</span>
            </div>
          </div>

          {!fillResult.passesCode && fillResult.warning && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-tight font-medium">
                {fillResult.warning}
              </p>
            </div>
          )}

          {fillResult.passesCode && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-tight">
                Raceway has sufficient cross-sectional area for heat dissipation
                and mechanical pulling tension per {fillResult.codeStandard}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
