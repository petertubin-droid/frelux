import {
  Camera,
  MessageSquareText,
  FileText,
  Palette,
  ArrowRight,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * AI tools showcase on the homepage.
 *
 * The hero copy is CMS-managed and client-approved, so this section sits
 * below the calculators band instead. It surfaces the AI-assisted tools
 * (photo counting, natural-language estimating, BOQ generation, color
 * advice) that are otherwise buried in the Construction Tools directory,
 * each linking straight to the tool with trailing-slash hrefs.
 */
const aiTools = [
  {
    icon: Camera,
    title: "Photo Counter",
    description:
      "Photograph a stack of cement bags, blocks, or tiles and Counter-Vision counts what is visible. It says so honestly when a photo cannot be counted.",
    to: "/count-vision/",
    accent: "text-brand-purple bg-primary/8",
  },
  {
    icon: MessageSquareText,
    title: "Smart Calculator",
    description:
      "Describe your room or project in plain words and get quantities, materials, and costs without a single form.",
    to: "/smart-calculator/",
    accent: "text-accent-cyan bg-accent-cyan/10",
  },
  {
    icon: FileText,
    title: "BOQ Generator",
    description:
      "Turn estimates into a clean bill of quantities or quotation you can hand to a client or contractor.",
    to: "/boq-generator/",
    accent: "text-accent-green bg-accent-green/10",
  },
  {
    icon: Palette,
    title: "AI Color Assistant",
    description:
      "Get personalized paint color ideas for your space, then price the paint with the calculators.",
    to: "/ai-color-assistant/",
    accent: "text-amber-600 bg-amber-100 dark:bg-amber-500/10",
  },
];

export default function AiToolsSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      aria-label="AI powered tools"
      className="relative overflow-hidden bg-background py-20 sm:py-24 dark:bg-card bg-noise"
    >
      <Container className="relative">
        <div
          ref={ref}
          className={`transition-all duration-700 ease-out ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {/* Section heading */}
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple dark:text-brand-purple-lighter">
              AI powered tools
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground dark:text-primary-foreground sm:text-4xl">
              Snap it. Describe it. Get numbers.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground dark:text-muted-foreground">
              The calculators do the arithmetic. These tools remove the typing:
              count from a photo, estimate from a sentence, quote from an
              estimate.
            </p>
          </div>

          {/* Tool cards */}
          <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {aiTools.map((tool) => (
              <li key={tool.to}>
                <Link
                  to={tool.to}
                  className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-all hover:-translate-y-1 hover:border-brand-purple/50 hover:shadow-lg dark:border-white/10 dark:bg-background dark:text-primary-foreground dark:hover:border-brand-purple-lighter/50"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${tool.accent}`}
                  >
                    <tool.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground dark:text-primary-foreground">
                    {tool.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                    {tool.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-purple transition-colors group-hover:text-brand-purple dark:text-brand-purple-lighter">
                    Try it
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
