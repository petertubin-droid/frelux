import { useMemo } from "react";
import { SlidersHorizontal, Package, Info } from "lucide-react";
import { classNames } from "@/lib/utils";
import { useWasteSettings } from "@/lib/waste/use-waste-settings";
import { applyWaste } from "@/lib/waste/waste-factor";
import {
  WASTE_MATERIALS,
  WASTE_MAX_PERCENT,
  WASTE_MIN_PERCENT,
  WASTE_PRESETS,
  presetLabel,
  wasteMaterial,
  wasteRows,
  type WasteMaterialKey,
} from "@/lib/waste/waste-factor";

/**
 * Waste allowance control.
 *
 * One slider, a row of presets, and, when a base quantity is supplied, the four
 * rows that show what the allowance actually buys. Turning it off is a real
 * switch: the base quantity is used untouched, so a takeoff can never quietly
 * carry an allowance nobody chose.
 */
export function WasteFactorControl({
  material,
  baseQuantity,
  unit = "",
  packageSize = null,
  compact = false,
  className,
}: {
  /** Fix the control to one material, or let the user pick when omitted. */
  material?: WasteMaterialKey;
  /** Base quantity to preview. Omit for settings-only use. */
  baseQuantity?: number;
  unit?: string;
  packageSize?: number | null;
  compact?: boolean;
  className?: string;
}) {
  const { settings, setEnabled, setMaterialPercent, reset } =
    useWasteSettings();
  const active = material ?? "tiles";
  const percent = material
    ? (settings.perMaterial[material] ?? wasteMaterial(material).defaultPercent)
    : 0;
  const effectiveMaterial = material ? material : active;
  const effectivePercent = material
    ? percent
    : (settings.perMaterial[effectiveMaterial] ??
      wasteMaterial(effectiveMaterial).defaultPercent);

  // The preview runs the same function the calculators run, so what is shown
  // here cannot drift from what is ordered.
  const preview = useMemo(() => {
    if (
      typeof baseQuantity !== "number" ||
      !Number.isFinite(baseQuantity) ||
      baseQuantity <= 0
    ) {
      return null;
    }
    const percentNow = settings.enabled ? effectivePercent : 0;
    const breakdown = applyWaste(baseQuantity, percentNow, { packageSize });
    return { breakdown, rows: wasteRows(breakdown, unit) };
  }, [baseQuantity, effectivePercent, packageSize, unit, settings.enabled]);

  return (
    <div
      className={classNames(
        "rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]",
        className,
      )}
      data-testid="waste-factor-control"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-purple" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Waste allowance
            </p>
            <p className="text-[11px] text-muted-foreground">
              {settings.enabled
                ? `${presetLabel(effectivePercent)} · ${effectivePercent}% added to base quantities`
                : "Off. Base quantities are used exactly as calculated."}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Apply waste allowance"
          onClick={() => setEnabled(!settings.enabled)}
          className={classNames(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            settings.enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={classNames(
              "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform",
              settings.enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <div
        className={classNames(
          "mt-4 space-y-3",
          !settings.enabled && "opacity-50",
        )}
      >
        {!material && (
          <label className="block">
            <span className="sr-only">Material</span>
            <select
              value={effectiveMaterial}
              onChange={(e) =>
                setMaterialPercent(
                  e.target.value as WasteMaterialKey,
                  effectivePercent,
                )
              }
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            >
              {WASTE_MATERIALS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{WASTE_MIN_PERCENT}%</span>
            <span
              className="font-semibold text-foreground"
              data-testid="waste-percent"
            >
              {settings.enabled ? `${effectivePercent}%` : "off"}
            </span>
            <span>{WASTE_MAX_PERCENT}%</span>
          </div>
          <input
            type="range"
            min={WASTE_MIN_PERCENT}
            max={WASTE_MAX_PERCENT}
            step={1}
            value={effectivePercent}
            disabled={!settings.enabled}
            aria-label="Waste percentage"
            onChange={(e) =>
              setMaterialPercent(effectiveMaterial, Number(e.target.value))
            }
            className="mt-1 w-full accent-[hsl(var(--primary))]"
          />
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            {WASTE_PRESETS.map((preset) => (
              <button
                key={preset.percent}
                type="button"
                disabled={!settings.enabled}
                aria-pressed={effectivePercent === preset.percent}
                title={preset.description}
                onClick={() =>
                  setMaterialPercent(effectiveMaterial, preset.percent)
                }
                className={classNames(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  effectivePercent === preset.percent
                    ? "border-primary/40 bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                    : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {preset.percent}% {preset.label}
              </button>
            ))}
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {wasteMaterial(effectiveMaterial).reason}.
        </p>

        {preview && (
          <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs dark:bg-white/[0.04]">
            {preview.rows.map((row) => (
              <div key={row.label}>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {preview?.breakdown.packages ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Package className="h-3 w-3" />
            Rounded up to whole packages of {packageSize} {unit}.
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Reset to material defaults
        </button>
      </div>
    </div>
  );
}

export default WasteFactorControl;
