import { useState } from "react";
import {
  ChevronDown,
  Info,
  Ruler,
  Sliders,
  ShieldCheck,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

export interface CalculationBreakdownProps {
  title?: string;
  methodologyText?: string;
  geometryBreakdown?: {
    grossAreaM2?: number;
    deductionsM2?: number;
    netAreaM2?: number;
    volumeM3?: number;
    dimensionsSummary?: string;
  };
  physicalFactors?: {
    dryVolumeBulkingFactor?: number;
    mortarDryFactor?: number;
    looseHardcoreBulking?: number;
    mixRatio?: string;
  };
  siteModifiers?: {
    surfacePorosity?: string;
    porosityMultiplier?: number;
    layoutComplexity?: string;
    cuttingWastePercent?: number;
  };
  packagingDetails?: {
    theoreticalAmount: number;
    practicalPurchaseAmount: number;
    unitLabel: string;
    packSizeLabel?: string;
    surplusQuantity?: number;
  };
  calibrationEvidence?: {
    baselineQuantity: number;
    shadowMultiplier?: number | null;
    approvedDecision?: "approved" | "shadow_candidate" | "baseline_active";
    confidenceInterval?: { low: number; likely: number; high: number } | null;
    outliersFilteredCount?: number;
  };
  assumptions?: Array<{ label: string; value: string }>;
  defaultOpen?: boolean;
}

export default function CalculationBreakdownDrawer({
  title,
  methodologyText,
  geometryBreakdown,
  physicalFactors,
  siteModifiers,
  packagingDetails,
  calibrationEvidence,
  assumptions = [],
  defaultOpen = false,
}: CalculationBreakdownProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="calc-card mt-4 overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm dark:border-white/10 dark:bg-white/5"
      data-testid="calculation-breakdown-drawer"
    >
      <Button
        variant="ghost"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/70 dark:hover:bg-white/10"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-card-foreground dark:text-foreground">
          <Info className="h-4 w-4 shrink-0 text-brand-purple" />
          {title || t("Calculation Breakdown & Engineering Assumptions")}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 py-3 text-xs dark:border-white/10">
          {/* Methodology summary */}
          {methodologyText && (
            <p className="leading-relaxed text-muted-foreground">
              {methodologyText}
            </p>
          )}

          {/* Section 1: Geometric Takeoff */}
          {geometryBreakdown && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Ruler className="h-3.5 w-3.5 text-brand-purple" />
                <span>{t("Geometric Takeoff")}</span>
              </div>
              {geometryBreakdown.dimensionsSummary && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Input Dimensions")}</span>
                  <span className="font-mono text-foreground">
                    {geometryBreakdown.dimensionsSummary}
                  </span>
                </div>
              )}
              {geometryBreakdown.grossAreaM2 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Gross Face Area")}</span>
                  <span className="font-mono text-foreground">
                    {geometryBreakdown.grossAreaM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometryBreakdown.deductionsM2 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Openings Deducted")}</span>
                  <span className="font-mono text-foreground">
                    -{geometryBreakdown.deductionsM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometryBreakdown.netAreaM2 !== undefined && (
                <div className="flex justify-between border-t border-border/40 pt-1 font-medium text-foreground">
                  <span>{t("Net Work Area")}</span>
                  <span className="font-mono">
                    {geometryBreakdown.netAreaM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometryBreakdown.volumeM3 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Finished Wet Volume")}</span>
                  <span className="font-mono text-foreground">
                    {geometryBreakdown.volumeM3.toFixed(3)} m³
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Physical Bulking & Shrinkage Factors */}
          {physicalFactors && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("Physical Bulking & Shrinkage Factors")}</span>
              </div>
              {physicalFactors.mixRatio && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Design Mix Ratio")}</span>
                  <span className="font-mono text-foreground">
                    {physicalFactors.mixRatio}
                  </span>
                </div>
              )}
              {physicalFactors.dryVolumeBulkingFactor && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Concrete Dry Volume Factor")}</span>
                  <span className="font-mono text-foreground">
                    {physicalFactors.dryVolumeBulkingFactor}× (dry batch allowance)
                  </span>
                </div>
              )}
              {physicalFactors.mortarDryFactor && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Mortar Shrinkage Factor")}</span>
                  <span className="font-mono text-foreground">
                    {physicalFactors.mortarDryFactor}× (wet-to-dry conversion)
                  </span>
                </div>
              )}
              {physicalFactors.looseHardcoreBulking && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Hardcore Loose Bulking")}</span>
                  <span className="font-mono text-foreground">
                    {physicalFactors.looseHardcoreBulking}× (loose fill to compacted)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Substrate & Layout Complexity Modifiers */}
          {siteModifiers && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sliders className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("Site Variables & Substrate Conditions")}</span>
              </div>
              {siteModifiers.surfacePorosity && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Substrate Condition")}</span>
                  <span className="font-medium text-foreground">
                    {siteModifiers.surfacePorosity}
                    {siteModifiers.porosityMultiplier &&
                      ` (${siteModifiers.porosityMultiplier}× spread rate)`}
                  </span>
                </div>
              )}
              {siteModifiers.layoutComplexity && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Pattern & Layout Waste")}</span>
                  <span className="font-medium text-foreground">
                    {siteModifiers.layoutComplexity}
                    {siteModifiers.cuttingWastePercent !== undefined &&
                      ` (+${siteModifiers.cuttingWastePercent}% waste)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Packaging & Purchase Rounding */}
          {packagingDetails && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Package className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("Packaging & Purchase Rounding")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Theoretical Quantity")}</span>
                <span className="font-mono text-foreground">
                  {packagingDetails.theoreticalAmount.toFixed(2)}{" "}
                  {packagingDetails.unitLabel}
                </span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span>{t("Practical Purchase")}</span>
                <span className="font-mono">
                  {packagingDetails.practicalPurchaseAmount}{" "}
                  {packagingDetails.packSizeLabel || packagingDetails.unitLabel}
                </span>
              </div>
              {packagingDetails.surplusQuantity !== undefined &&
                packagingDetails.surplusQuantity > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("Estimated Leftover / Surplus")}</span>
                    <span className="font-mono text-foreground">
                      {packagingDetails.surplusQuantity.toFixed(2)}{" "}
                      {packagingDetails.unitLabel}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Section 5: Calibration Engine Guardrails */}
          {calibrationEvidence && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-purple" />
                <span>{t("Adaptive Calibration & Guardrails")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Status")}</span>
                <span className="font-medium text-foreground">
                  {calibrationEvidence.approvedDecision === "approved"
                    ? t("Admin Approved Multiplier Active")
                    : t("Deterministic Baseline Active (Shadow Review)")}
                </span>
              </div>
              {calibrationEvidence.shadowMultiplier && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Shadow Calibrated Multiplier")}</span>
                  <span className="font-mono text-foreground">
                    {calibrationEvidence.shadowMultiplier.toFixed(3)}×
                  </span>
                </div>
              )}
              {calibrationEvidence.confidenceInterval && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Empirical Quantile Range (P10 - P90)")}</span>
                  <span className="font-mono text-foreground">
                    {calibrationEvidence.confidenceInterval.low.toFixed(1)} –{" "}
                    {calibrationEvidence.confidenceInterval.high.toFixed(1)}
                  </span>
                </div>
              )}
              {calibrationEvidence.outliersFilteredCount !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("IQR Outliers Discarded")}</span>
                  <span className="font-mono text-foreground">
                    {calibrationEvidence.outliersFilteredCount} {t("records")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Additional assumptions list */}
          {assumptions.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
              <p className="font-medium uppercase tracking-wide text-muted-foreground">
                {t("Additional Calculation Rules")}
              </p>
              {assumptions.map((a) => (
                <div key={a.label} className="flex justify-between">
                  <span className="text-muted-foreground">{a.label}</span>
                  <span className="font-medium text-foreground">{a.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
