import React from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { VisualFinishingEstimator } from "@/components/estimation/VisualFinishingEstimator";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import AdSlot from "@/components/ui/AdSlot";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";

export default function VisualFinishingEstimatorPage() {
  useSeo({
    title:
      "Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence",
    description:
      "Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration and deterministic calculation engines.",
    canonicalPath: "/tools/visual-finishing-estimator",
  });

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Visual takeoff"
        title="Visual Finishing Estimator"
        subtitle="Surface candidates are proposed from a photograph, then measured by you. Only the deterministic engine turns those dimensions into quantities, and every price is shown with its verification state."
      />

      <Container className="max-w-6xl space-y-8 pb-12 pt-8">
        <VisualFinishingEstimator />

        {/* Ad slot, placement "calculator_mid" */}
        <RecommendedProducts category="paint" />

        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />

        <div className="pt-8 border-t border-border">
          <RelatedTools links={Object.values(CALC_LINKS)} />
        </div>
      </Container>
    </>
  );
}
