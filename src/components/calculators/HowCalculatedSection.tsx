import { useState } from "react";
import {
  ChevronDown,
  Info,
  Ruler,
  Layers,
  Sliders,
  Package,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import type { CalculationBreakdownProps } from "./CalculationBreakdownDrawer";

export interface EngineeringConstant {
  label: string;
  value: string;
  standard?: string;
  notes?: string;
}

export interface HowCalculatedSectionProps {
  methodologyText: string;
  /**
   * Either a label/value pair (a value the engine chose, shown beside its
   * name) or a plain sentence (a method statement a reader must accept). Both
   * are real assumptions; the shape differs because the source does.
   */
  assumptions?: (string | { label: string; value: string })[];
  priceSourceDate?: string;
  priceSource?: string;
  breakdown?: CalculationBreakdownProps;
  geometryBreakdown?: CalculationBreakdownProps["geometryBreakdown"];
  physicalFactors?: CalculationBreakdownProps["physicalFactors"];
  siteModifiers?: CalculationBreakdownProps["siteModifiers"];
  packagingDetails?: CalculationBreakdownProps["packagingDetails"];
  calibrationEvidence?: CalculationBreakdownProps["calibrationEvidence"];
  civilEngineeringConstants?: EngineeringConstant[];
  governingStandards?: string[];
}

export default function HowCalculatedSection({
  methodologyText,
  assumptions = [],
  priceSourceDate,
  priceSource,
  breakdown,
  geometryBreakdown: propGeometry,
  physicalFactors: propPhysical,
  siteModifiers: propModifiers,
  packagingDetails: propPackaging,
  calibrationEvidence: propCalibration,
  civilEngineeringConstants = [],
  governingStandards = [],
}: HowCalculatedSectionProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const geometry = propGeometry ?? breakdown?.geometryBreakdown;
  const physical = propPhysical ?? breakdown?.physicalFactors;
  const modifiers = propModifiers ?? breakdown?.siteModifiers;
  const packaging = propPackaging ?? breakdown?.packagingDetails;
  const calibration = propCalibration ?? breakdown?.calibrationEvidence;

  const hasBreakdown = Boolean(
    geometry ||
    physical ||
    modifiers ||
    packaging ||
    calibration ||
    civilEngineeringConstants.length > 0 ||
    governingStandards.length > 0,
  );

  if (!methodologyText && assumptions.length === 0 && !hasBreakdown)
    return null;

  return (
    <div
      id="calculation-methodology"
      className="calc-card mt-4 scroll-mt-24 overflow-hidden rounded-xl border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5"
    >
      <Button
        variant="ghost"
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 whitespace-normal px-4 py-3 text-left transition-colors hover:bg-muted dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
          <Info className="h-4 w-4 shrink-0 text-brand-purple" />
          {t("How this estimate is calculated")}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </Button>

      {expanded && (
        <div className="animate-content-reveal space-y-3.5 border-t border-border px-4 py-3 dark:border-white/5">
          {methodologyText && (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
              {methodologyText}
            </pre>
          )}

          {/* Section: Civil Engineering Constants & Design Standards */}
          {(governingStandards.length > 0 ||
            civilEngineeringConstants.length > 0) && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Scale className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {t("Civil Engineering Constants & Building Standards")}
                </span>
              </div>
              {governingStandards.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {governingStandards.map((std) => (
                    <span
                      key={std}
                      className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              )}
              {civilEngineeringConstants.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {civilEngineeringConstants.map((c) => (
                    <div
                      key={c.label}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-1 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{c.label}</span>
                        {c.standard && (
                          <span className="text-[10px] text-muted-foreground/75 font-mono">
                            [{c.standard}]
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-medium text-foreground">
                          {c.value}
                        </span>
                        {c.notes && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">
                            ({c.notes})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Geometric Takeoff */}
          {geometry && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Ruler className="h-3.5 w-3.5 text-brand-purple" />
                <span>{t("Geometric Takeoff")}</span>
              </div>
              {geometry.dimensionsSummary && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Input Dimensions")}</span>
                  <span className="font-mono text-foreground">
                    {geometry.dimensionsSummary}
                  </span>
                </div>
              )}
              {geometry.grossAreaM2 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Gross Face Area")}</span>
                  <span className="font-mono text-foreground">
                    {geometry.grossAreaM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometry.deductionsM2 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Openings Deducted")}</span>
                  <span className="font-mono text-foreground">
                    -{geometry.deductionsM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometry.netAreaM2 !== undefined && (
                <div className="flex justify-between border-t border-border/40 pt-1 font-medium text-foreground">
                  <span>{t("Net Work Area")}</span>
                  <span className="font-mono">
                    {geometry.netAreaM2.toFixed(2)} m²
                  </span>
                </div>
              )}
              {geometry.volumeM3 !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Finished Wet Volume")}</span>
                  <span className="font-mono text-foreground">
                    {geometry.volumeM3.toFixed(3)} m³
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Physical Bulking & Shrinkage Factors */}
          {physical && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("Physical Bulking & Shrinkage Factors")}</span>
              </div>
              {physical.mixRatio && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Design Mix Ratio")}</span>
                  <span className="font-mono text-foreground">
                    {physical.mixRatio}
                  </span>
                </div>
              )}
              {physical.dryVolumeBulkingFactor && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Concrete Dry Volume Factor")}</span>
                  <span className="font-mono text-foreground">
                    {physical.dryVolumeBulkingFactor}× (dry batch allowance)
                  </span>
                </div>
              )}
              {physical.mortarDryFactor && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Mortar Shrinkage Factor")}</span>
                  <span className="font-mono text-foreground">
                    {physical.mortarDryFactor}× (wet-to-dry conversion)
                  </span>
                </div>
              )}
              {physical.looseHardcoreBulking && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Hardcore Loose Bulking")}</span>
                  <span className="font-mono text-foreground">
                    {physical.looseHardcoreBulking}× (loose fill to compacted)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Site Variables & Substrate Conditions */}
          {modifiers && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sliders className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("Site Variables & Substrate Conditions")}</span>
              </div>
              {modifiers.surfacePorosity && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Substrate Condition")}</span>
                  <span className="font-medium text-foreground">
                    {modifiers.surfacePorosity}
                    {modifiers.porosityMultiplier &&
                      ` (${modifiers.porosityMultiplier}× spread rate)`}
                  </span>
                </div>
              )}
              {modifiers.layoutComplexity && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Pattern & Layout Waste")}</span>
                  <span className="font-medium text-foreground">
                    {modifiers.layoutComplexity}
                    {modifiers.cuttingWastePercent !== undefined &&
                      ` (+${modifiers.cuttingWastePercent}% waste)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Packaging & Purchase Rounding */}
          {packaging && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Package className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("Packaging & Purchase Rounding")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Theoretical Quantity")}</span>
                <span className="font-mono text-foreground">
                  {packaging.theoreticalAmount.toFixed(2)} {packaging.unitLabel}
                </span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span>{t("Practical Purchase")}</span>
                <span className="font-mono">
                  {packaging.practicalPurchaseAmount}{" "}
                  {packaging.packSizeLabel || packaging.unitLabel}
                </span>
              </div>
              {packaging.surplusQuantity !== undefined &&
                packaging.surplusQuantity > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("Estimated Leftover / Surplus")}</span>
                    <span className="font-mono text-foreground">
                      {packaging.surplusQuantity.toFixed(2)}{" "}
                      {packaging.unitLabel}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Section: Calibration Engine Guardrails */}
          {calibration && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs dark:border-white/5 dark:bg-black/20">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-purple" />
                <span>{t("Adaptive Calibration & Guardrails")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Status")}</span>
                <span className="font-medium text-foreground">
                  {calibration.approvedDecision === "approved"
                    ? t("Admin Approved Multiplier Active")
                    : t("Deterministic Baseline Active (Shadow Review)")}
                </span>
              </div>
              {calibration.shadowMultiplier && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Shadow Calibrated Multiplier")}</span>
                  <span className="font-mono text-foreground">
                    {calibration.shadowMultiplier.toFixed(3)}×
                  </span>
                </div>
              )}
              {calibration.confidenceInterval && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Empirical Quantile Range (P10 - P90)")}</span>
                  <span className="font-mono text-foreground">
                    {calibration.confidenceInterval.low.toFixed(1)} –{" "}
                    {calibration.confidenceInterval.high.toFixed(1)}
                  </span>
                </div>
              )}
              {calibration.outliersFilteredCount !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("IQR Outliers Discarded")}</span>
                  <span className="font-mono text-foreground">
                    {calibration.outliersFilteredCount} {t("records")}
                  </span>
                </div>
              )}
            </div>
          )}

          {assumptions.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border/40 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("Active assumptions")}
              </p>
              {assumptions.map((a, index) => {
                if (typeof a === "string") {
                  return (
                    <p
                      key={`${index}-${a.slice(0, 24)}`}
                      className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed"
                    >
                      {a}
                    </p>
                  );
                }
                return (
                  <div key={a.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-muted-foreground">
                      {a.label}
                    </span>
                    <span className="font-medium text-card-foreground dark:text-muted-foreground/80">
                      {a.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {(priceSourceDate || priceSource) && (
            <div className="mt-3 space-y-1 border-t border-border pt-2 dark:border-white/5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("Price information")}
              </p>
              {priceSource && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    {t("Source")}
                  </span>
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">
                    {priceSource}
                  </span>
                </div>
              )}
              {priceSourceDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    {t("Effective date")}
                  </span>
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">
                    {priceSourceDate}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
