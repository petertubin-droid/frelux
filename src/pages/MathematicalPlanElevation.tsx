// =========================================================
// FRELUX MATHEMATICAL PLAN ELEVATION ENGINE PAGE
// Dimension-based elevation illustration and preliminary quantities
// Preliminary geometry and assumptions, for professional review
// =========================================================

import { useNavigate } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import ToolFaqs from "@/components/seo/ToolFaqs";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { MathematicalElevationPanel } from "@/components/engineering/MathematicalElevationPanel";
import { BookOpen, ArrowRight, Landmark } from "lucide-react";
import type { BuildToRoofInput } from "@/types/build-to-roof";

export default function MathematicalPlanElevation() {
  const navigate = useNavigate();

  useSeo({
    title: "Parametric Building Elevation Calculator | FRELUX",
    description:
      "Explore a dimension-based building elevation with trigonometric roof geometry, an illustrative quantity schedule and CSV export. Metric or imperial display; manual inputs only, no AI drawing interpretation or code-compliance determination.",
    canonicalPath: "/mathematical-plan-elevation",
    keywords:
      "manual building elevation calculator, imperial and metric building dimensions, roof pitch geometry, elevation takeoff CSV, construction planning tool",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX Mathematical Plan Elevation",
      applicationCategory: "CalculatorApplication",
      operatingSystem: "Web",
      description:
        "Create an indicative elevation and quantity schedule from manually entered dimensions. It does not interpret uploaded plans or verify structural design or code compliance.",
      featureList: [
        "Dimension-based roof pitch geometry",
        "Animated staged elevation illustration",
        "Preliminary quantity schedule with CSV export",
        "Metric and imperial display of the same SI calculation",
        "Optional cost calculations from user-entered supplier rates",
      ],
    },
  });

  const handleApplyToBuildToRoof = (patch: Partial<BuildToRoofInput>) => {
    // Navigate to Build to Roof Estimator with state or query params
    navigate("/build-to-roof-estimator", {
      state: { mathematicalElevationPatch: patch },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* ── Page Header ── */}
      <PageHeader
        title="Mathematical Plan Elevation Engine"
        subtitle="Pick the closest building type, adjust four measurements, and read the height, roof area and wall area straight away. Preliminary figures for planning, not a code-compliance check."
        eyebrow="Deterministic calculation · no AI image interpretation"
      />

      {/* ── Core Mathematical Engine Component ── */}
      <MathematicalElevationPanel
        onApplyDerivedInput={handleApplyToBuildToRoof}
      />

      {/* ── Mid Content Ad Banner ── */}
      <AdSlot slotKey="calculator_mid" className="my-6" />

      {/* ── Engineering Mathematics & Regulatory Explainer Cards ── */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <BookOpen className="h-6 w-6 text-brand-purple" />
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Formula examples and limitations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simplified examples only; this page does not implement code review
              or structural design.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-muted-foreground leading-relaxed">
          {/* L1 Foundation */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Badge
                variant="outline"
                className="text-xs bg-brand-purple/10 text-brand-purple border-brand-purple/20"
              >
                Level 1
              </Badge>
              <span>Substructure & Soil Bearing Mechanics</span>
            </div>
            <p>
              An illustrative footing-width estimate uses assumed line load and
              an entered bearing value:
            </p>
            <div className="p-2 rounded bg-background border border-border font-mono text-foreground text-[11px]">
              B_illustration = (assumed line load / entered bearing value) ·
              1.15
            </div>
            <p>
              This simplified relationship omits geotechnical investigation,
              settlement, eccentricity, reinforcement, and local design rules;
              it is not a foundation design.
            </p>
          </div>

          {/* L2 Plinth */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Badge
                variant="outline"
                className="text-xs bg-brand-purple/10 text-brand-purple border-brand-purple/20"
              >
                Level 2
              </Badge>
              <span>Plinth datum and slab quantities</span>
            </div>
            <p>
              A fixed illustrative plinth datum is used in the display; it is
              not a flood or drainage recommendation:
            </p>
            <div className="p-2 rounded bg-background border border-border font-mono text-foreground text-[11px]">
              V_concrete = (L_internal · W_internal · 0.150m) + (Perimeter ·
              0.45m · t_w)
            </div>
            <p>
              DPM and DPC quantities are not modeled or verified by this
              illustration.
            </p>
          </div>

          {/* L3 Slenderness */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Badge
                variant="outline"
                className="text-xs bg-brand-purple/10 text-brand-purple border-brand-purple/20"
              >
                Level 3
              </Badge>
              <span>Wall proportion and opening-width indicators</span>
            </div>
            <p>
              A wall height-to-thickness proportion is shown as a geometry
              indicator:
            </p>
            <div className="p-2 rounded bg-background border border-border font-mono text-foreground text-[11px]">
              λ_screen = (0.75 · entered wall height) / entered thickness
            </div>
            <p>
              The ratio and opening-width flags are not code checks and do not
              establish masonry capacity or stability.
            </p>
          </div>

          {/* L4 & L5 Ring Beam and Wind */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Badge
                variant="outline"
                className="text-xs bg-brand-purple/10 text-brand-purple border-brand-purple/20"
              >
                Levels 4 & 5
              </Badge>
              <span>Roof geometry and simplified wind illustration</span>
            </div>
            <p>
              Parametric rafter slope and illustrative wind velocity pressure:
            </p>
            <div className="p-2 rounded bg-background border border-border font-mono text-foreground text-[11px]">
              q = 0.613 · K_z · K_d · V² | h_ridge = (Span/2) · tan(θ)
            </div>
            <p>
              A simplified velocity-pressure illustration uses assumed wind
              inputs. Roof pressure coefficients, terrain, topography, internal
              pressure, load combinations and tie design are not fully modeled.
            </p>
          </div>
        </div>

        {/* Transition CTA */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Ready to continue with the existing estimator?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use the calculator’s apply button to carry entered dimensions into
              the existing estimator. You can also open it separately; the
              existing AI drawing workflow remains available there.
            </p>
          </div>
          <Button
            onClick={() => navigate("/build-to-roof-estimator")}
            className="bg-brand-purple hover:bg-brand-purple-dark text-white text-xs h-9 gap-2 shrink-0 shadow-sm"
          >
            <Landmark className="h-4 w-4" />
            Open estimator
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Native Ad Slot ── */}
      <AdSlot slotKey="calculator_native" className="my-6" />

      {/* ── Questions from the registry, rendered with matching FAQ markup ── */}
      <ToolFaqs
        slug="mathematical-plan-elevation"
        title="Elevation questions"
      />

      {/* ── Related Tools Links ── */}
      <RelatedToolsLinks />
    </div>
  );
}
