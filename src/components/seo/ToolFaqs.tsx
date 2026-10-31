/**
 * Renders a tool's questions through the shared FaqSection accordion and emits
 * matching FAQPage structured data from the same strings.
 *
 * Using one component for both halves is deliberate: the usual failure mode for
 * FAQ markup is a page whose JSON-LD drifts from what is on screen, which
 * Search Console reports as a mismatch and Google ignores.
 */

import { FaqSection } from "@/components/seo/SeoSections";
import { getToolFaqGroup } from "@/config/tool-faqs";
import { useFaqJsonLd } from "@/lib/seo";
import { Link } from "react-router-dom";

export default function ToolFaqs({
  slug,
  title,
}: {
  /** Registry slug from src/config/tool-faqs.ts */
  slug: string;
  title?: string;
}) {
  const group = getToolFaqGroup(slug);
  const items = (group?.questions ?? []).map((q) => ({
    question: q.q,
    answer: q.a,
  }));

  useFaqJsonLd(items);

  if (!group) return null;

  return (
    <section aria-labelledby={`${group.slug}-faq`}>
      <div id={`${group.slug}-faq`}>
        <FaqSection
          title={title ?? `${group.name}: frequently asked questions`}
          faqs={group.questions.map((q) => ({ question: q.q, answer: q.a }))}
        />
      </div>
      <p className="mx-auto -mt-6 max-w-3xl px-4 pb-4 text-sm text-muted-foreground sm:px-6">
        More questions?{" "}
        <Link
          to="/faq"
          className="text-primary underline-offset-4 hover:underline"
        >
          Browse every tool question
        </Link>
        , or read the{" "}
        <Link
          to="/learn"
          className="text-primary underline-offset-4 hover:underline"
        >
          construction guides
        </Link>{" "}
        behind the numbers.
      </p>
    </section>
  );
}
