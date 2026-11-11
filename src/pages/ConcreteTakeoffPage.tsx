import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import { useSeo } from "@/lib/seo";
import {
  SLAB_HOW_TO_STEPS,
  buildSequenceHowTo,
} from "@/lib/build-sequence-seo";
import { ConcreteTakeoffCalculator } from "@/pages/StructuralCalculator";
import AdSlot from "@/components/ui/AdSlot";

export default function ConcreteTakeoffPage() {
  useSeo({
    title: "Concrete Slab Quantity Calculator | FRELUX",
    description:
      "Estimate measured slab concrete volume, cement bags, sand, coarse aggregate and scheduled rebar weight from your own dimensions and mix, with a step by step animated build sequence for slabs, beams, columns and footings.",
    structuredData: buildSequenceHowTo({
      name: "Build a reinforced concrete slab",
      description:
        "Set out, excavate and compact, blind, place the reinforcement, pour and finish, then cure before loading.",
      steps: SLAB_HOW_TO_STEPS,
      path: "/concrete-takeoff-calculator",
      totalTime: "P7D",
      supply: [
        "Cement, sharp sand and coarse aggregate",
        "Reinforcement mesh or bars, tie wire and chairs",
        "Blinding material",
      ],
      tool: [
        "Tape and string line",
        "Plate compactor",
        "Concrete mixer",
        "Screed board",
      ],
    }),
  });

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Measured quantity takeoff"
        title="Concrete Slab Takeoff"
        subtitle="Estimate materials from your measured slab dimensions, specified mix ratio, and an optional engineer-provided reinforcement schedule. This free quantity tool does not perform structural design."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Concrete Slab Takeoff" },
        ]}
      />
      <Container className="py-8 sm:py-10">
        <ConcreteTakeoffCalculator />
        {/* Ad slot, placement "calculator_mid" */}
        <RecommendedProducts category="cement" />

        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
      <div className="mt-10">
        <RelatedTools
          links={[
            CALC_LINKS.structuralCalc,
            CALC_LINKS.foundationCalc,
            CALC_LINKS.buildToRoof,
          ]}
        />
      </div>

      <EstimateDisclaimer />
    </>
  );
}
