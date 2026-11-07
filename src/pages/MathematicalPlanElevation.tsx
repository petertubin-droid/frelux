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
    title: "Plan Elevation and Material Takeoff Calculator | FRELUX",
    description:
      "Upload a floor plan or type four measurements to get building height, roof area, blockwork, concrete volumes and a phased material schedule. You confirm every extracted value; the engine does the arithmetic and hands the areas to the painting, screeding, tiling, POP and build-to-roof estimators.",
    canonicalPath: "/mathematical-plan-elevation",
    keywords:
      "building plan elevation calculator, floor plan dimension reader, roof pitch geometry, blockwork and concrete takeoff, construction material schedule, plan to quantities, Nigerian building estimator",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX Mathematical Plan Elevation Engine",
      applicationCategory: "CalculatorApplication",
      operatingSystem: "Web",
      description:
        "Reads the dimensions a floor plan states, asks you to confirm them, then calculates elevation height, roof area, blockwork, concrete volumes and a phased material schedule deterministically.",
      featureList: [
        "Plan reading with per-value confidence and confirmation",
        "Dimension-based roof pitch geometry",
        "Animated staged elevation illustration",
        "Blockwork, concrete, reinforcement and roof quantity schedule",
        "One-tap handoff of floor, ceiling, paint and roof areas to other estimators",
        "Metric and imperial display of the same SI calculation",
        "CSV export with stated assumptions",
      ],
    },
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to get a material schedule from a building plan",
        totalTime: "PT2M",
        step: [
          {
            "@type": "HowToStep",
            name: "Upload the plan",
            text: "Add a floor plan, elevation or section as a photo or PDF. The reader lifts only the dimensions the drawing states.",
          },
          {
            "@type": "HowToStep",
            name: "Confirm the values",
            text: "Check each extracted value and its confidence, untick anything you disagree with, and derive a footprint from the room schedule if overall sizes are missing.",
          },
          {
            "@type": "HowToStep",
            name: "Read the quantities",
            text: "The engine recalculates height, roof area, blockwork, concrete and reinforcement from the confirmed numbers, with the arithmetic shown.",
          },
          {
            "@type": "HowToStep",
            name: "Carry the areas across",
            text: "Send floor, ceiling, paintable and roof areas into the painting, screeding, tiling, POP and build-to-roof estimators.",
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "FRELUX",
            item: "https://freluxtools.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: "https://freluxtools.com/calculators",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Mathematical Plan Elevation",
            item: "https://freluxtools.com/mathematical-plan-elevation",
          },
        ],
      },
    ],
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
        subtitle="Upload the plan or type four measurements. You confirm what the drawing states, the engine does the arithmetic, and the height, roof area, blockwork and concrete follow immediately."
        eyebrow="Plan reading with confirmed values · deterministic calculation"
      />

      {/* ── Core Mathematical Engine Component ── */}
      <MathematicalElevationPanel
        onApplyDerivedInput={handleApplyToBuildToRoof}
        onOpenTool={(path, state) => navigate(path, { state })}
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
