import React from "react";
import HeroTitle from "@/components/ui/HeroTitle";
import { useSeo } from "@/lib/seo";
import { VisualFinishingEstimator } from "@/components/estimation/VisualFinishingEstimator";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";

export default function VisualFinishingEstimatorPage() {
  useSeo({
    title: "Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence",
    description:
      "Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration and deterministic calculation engines.",
    canonical: "/tools/visual-finishing-estimator",
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
            Image intelligence meets deterministic quantity surveying. Photograph rooms and architectural surfaces,
            confirm verified dimensions, and calculate exact material takeoffs across all 32 supported markets.
          </p>
        </div>

        <VisualFinishingEstimator />

        <div className="pt-8 border-t border-border">
          <RelatedTools currentSlug="visual-finishing-estimator" tools={CALC_LINKS} />
        </div>
      </div>
    </div>
  );
}
