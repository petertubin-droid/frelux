import Container from "@/components/ui/Container";
import ToolShell from "@/components/tools/ToolShell";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import {
  SLAB_HOW_TO_STEPS,
  buildSequenceHowTo,
} from "@/lib/build-sequence-seo";
import { ConcreteTakeoffCalculator } from "@/pages/StructuralCalculator";
import AdSlot from "@/components/ui/AdSlot";

/**
 * The page supplies the calculator and the HowTo markup the catalogue cannot
 * know about. Its title, description, question set and neighbouring tools come
 * from the catalogue through the shell.
 *
 * This page used to render the window blind questions above its own, so a slab
 * takeoff emitted two FAQPage blocks and one of them belonged to a different
 * tool.
 */
export default function ConcreteTakeoffPage() {
  return (
    <ToolShell
      route="/concrete-takeoff-calculator"
      structuredData={buildSequenceHowTo({
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
        tool: ["Tape and string line", "Plate compactor", "Concrete mixer", "Screed board"],
      })}
    >
      <Container className="py-8 sm:py-10">
        <ConcreteTakeoffCalculator />
        <RecommendedProducts category="cement" />

        <AdSlot slotKey="calculator_mid" className="mt-8" />
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
    </ToolShell>
  );
}
