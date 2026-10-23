import React from "react";
import HeroTitle from "@/components/ui/HeroTitle";
import { useSeo } from "@/lib/seo";
import { VisualFinishingEstimator } from "@/components/estimation/VisualFinishingEstimator";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";

export default function VisualFinishingEstimatorPage() {
  useSeo({
    title:
      "Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence",
    description:
      "Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration and deterministic calculation engines.",
    canonicalPath: "/tools/visual-finishing-estimator",
  });

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        <div className="text-center space-y-2">
          <HeroTitle
            title="Global Visual Finishing Estimator"
            className="text-3xl font-extrabold sm:text-4xl text-foreground"
          />
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground">
            Gemini proposes editable 2D finishing-surface candidates. Enter
            measured dimensions for each surface, then calculate deterministic
            quantities with price availability shown explicitly.
          </p>
        </div>

        <VisualFinishingEstimator />

        <div className="pt-8 border-t border-border">
          <RelatedTools links={Object.values(CALC_LINKS)} />
        </div>
      </div>
    </div>
  );
}
