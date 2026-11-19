import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { RelatedTools } from "@/components/seo/SeoSections";
import type { RelatedLink } from "@/components/seo/SeoSections";
import { getAboutToolConfig, getAboutToolFaqs } from "@/config/about-this-tool";

export default function AboutThisToolSection({
  route,
  relatedLinks,
  showFaq = true,
}: {
  route: string;
  relatedLinks: RelatedLink[];
  showFaq?: boolean;
}) {
  const content = getAboutToolConfig(route);
  if (!content) return null;
  const faqs = getAboutToolFaqs(route);

  return (
    <section
      aria-labelledby={`${content.slug}-about-tool`}
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="about-this-tool"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id={`${content.slug}-about-tool`}
          className="text-2xl font-bold tracking-tight"
        >
          About This Tool &amp; Methodology
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">What it covers</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {content.scope}
            </p>
          </article>
          <article className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Inputs and results</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <strong>Inputs:</strong> {content.inputs}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <strong>Result:</strong> {content.result}
            </p>
          </article>
        </div>

        {content.methodology && (
          <div className="mt-4 rounded-xl border bg-card p-5">
            <h3 className="font-semibold">How the number is produced</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {content.methodology}
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-muted-foreground/20 bg-muted/30 p-5">
          <h3 className="font-semibold">
            Formulas, assumptions &amp; local standards
          </h3>
          {content.verifiedFormula ||
          content.verifiedAssumptions?.length ||
          content.verifiedStandards?.length ? (
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              {content.verifiedFormula && (
                <p>
                  <strong>Verified formula:</strong> {content.verifiedFormula}
                </p>
              )}
              {content.verifiedAssumptions?.map((item) => (
                <p key={item}>
                  <strong>Assumption:</strong> {item}
                </p>
              ))}
              {content.verifiedStandards?.map((item) => (
                <p key={item.code}>
                  <strong>
                    {item.code} · {item.name} ({item.geography}):
                  </strong>{" "}
                  {item.use}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The calculator uses the inputs and result method described above.
              A universal formula, default coverage or waste rate, package size,
              or building standard is not asserted here because these can vary
              by tool, product, project, and jurisdiction. Check the
              calculator’s result breakdown and selected product documentation;
              where a value is missing, confirm it locally or enter a verified
              value.
            </p>
          )}
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          <strong>Scope:</strong> Preliminary planning and quantity information
          only. This tool is not a certified design, code-compliance
          determination, site inspection, or supplier quotation. Verify
          dimensions, product data, local requirements, and safety-critical
          decisions with the relevant qualified professional.
        </p>
      </div>

      {showFaq && faqs.length > 0 && (
        <div className="mt-2">
          <FaqItemsWithSchema
            faqs={faqs}
            title={`${content.name}: frequently asked questions`}
          />
        </div>
      )}
      {relatedLinks.length > 0 && (
        <RelatedTools
          title="Related calculators & tools"
          links={relatedLinks}
        />
      )}
    </section>
  );
}
