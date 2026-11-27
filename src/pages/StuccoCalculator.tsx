/**
 * FRELUX Stucco Calculator (Phase 4)
 *
 * Thin wrapper over the shared ConfigurableFinishCalculator - the same
 * deterministic engine and database configuration model as Mineral
 * Stone (coverage-based, kg/m² and L/m² consumption), pointed at the
 * 'stucco' product category. No duplicated logic.
 */

import ConfigurableFinishCalculator from "./ConfigurableFinishCalculator";
import { useBreadcrumbJsonLd } from "@/lib/seo";
import { stuccoCalculatorGuide } from "@/content/calculator-guides/stucco-calculator";

export default function StuccoCalculator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/construction-tools" },
    { name: "Stucco Calculator", path: "/stucco-calculator" },
  ]);
  return (
    <ConfigurableFinishCalculator
      category="stucco"
      refPrefix="STC"
      title="Stucco Calculator"
      subtitle="Deterministic Stucco estimation from database-verified product data."
      calcEvent="stucco_calculated"
      calculatorType="stucco"
      embedded={embedded}
      guide={stuccoCalculatorGuide}
    />
  );
}
