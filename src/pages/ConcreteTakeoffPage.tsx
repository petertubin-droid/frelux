import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { ConcreteTakeoffCalculator } from "@/pages/StructuralCalculator";

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
      </Container>
    </>
  );
}
