import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { ConcreteTakeoffCalculator } from "@/pages/StructuralCalculator";
import AdSlot from "@/components/ui/AdSlot";

export default function ConcreteTakeoffPage() {
  useSeo({
    title: "Concrete Slab Quantity Calculator | FRELUX",
    description:
      "Estimate measured slab concrete volume, cement bags, sand, coarse aggregate, and scheduled rebar weight from project-specified dimensions and mix inputs.",
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
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
    </>
  );
}
