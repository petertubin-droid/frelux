import type { ReactNode } from "react";

/**
 * Crawlable guide text that sits below a calculator.
 *
 * Why this exists: a calculator page is an input, a button and two sentences of
 * instructions. The maths runs in JavaScript, so a crawler (and a first-time
 * reader) sees almost nothing. Google treats that as thin content, and so does
 * a person deciding whether to trust the number.
 *
 * The rules this component keeps:
 *  - every word is in the HTML, not behind a toggle or an accordion that needs
 *    JavaScript to open, so it is indexable as served;
 *  - headings are real h2/h3, the ratio figures are a real <table> with a
 *    caption and scoped headers, and the questions are <details>/<summary>,
 *    which opens without script;
 *  - the content is data (see src/content/calculator-guides), so the words are
 *    reviewed once and every calculator that uses the block gets the same
 *    structure.
 *
 * It deliberately renders no prices. Coverage rates are ranges, because they
 * belong to the tin in the reader's hand, not to this page.
 */

export interface GuideStep {
  label: string;
  value: string;
}

export interface WorkedExample {
  intro: string;
  steps: GuideStep[];
  result: string;
  note?: string;
}

export interface RatioTable {
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface CalculatorGuide {
  /** Used for the section heading and the anchor id. */
  slug: string;
  heading: string;
  howItWorks: string[];
  workedExample: WorkedExample;
  ratioTable: RatioTable;
  faqs: GuideFaq[];
  /** Plain-language statement of what the tool does not do. */
  limits?: string;
}

export default function CalculatorGuideBlock({
  guide,
  footer,
}: {
  guide: CalculatorGuide;
  footer?: ReactNode;
}) {
  const headingId = `guide-${guide.slug}`;

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto mt-12 max-w-3xl space-y-10 border-t border-border pt-10 text-left"
    >
      <div className="space-y-3">
        <h2 id={headingId} className="text-xl font-semibold tracking-tight">
          {guide.heading}
        </h2>
        <p className="text-sm text-muted-foreground">
          How this calculator works, a worked example with real numbers, the
          coverage figures it uses, and the questions people ask before trusting
          the result.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">How it works</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {guide.howItWorks.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Worked example</h3>
        <p className="text-sm leading-relaxed">{guide.workedExample.intro}</p>
        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-xs text-muted-foreground">
            Each line of the example, so you can check the arithmetic yourself
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Step
              </th>
              <th scope="col" className="py-1.5 font-medium">
                Figure
              </th>
            </tr>
          </thead>
          <tbody>
            {guide.workedExample.steps.map((step, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="py-1.5 pr-3">{step.label}</td>
                <td className="py-1.5 tabular-nums">{step.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm font-medium">{guide.workedExample.result}</p>
        {guide.workedExample.note && (
          <p className="text-sm text-muted-foreground">
            {guide.workedExample.note}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Coverage figures</h3>
        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-xs text-muted-foreground">
            {guide.ratioTable.caption}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              {guide.ratioTable.columns.map((c) => (
                <th key={c} scope="col" className="py-1.5 pr-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.ratioTable.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/60">
                {row.map((cell, j) => (
                  <td key={j} className="py-1.5 pr-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Questions people ask</h3>
        <div className="space-y-2">
          {guide.faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-lg border border-border p-3"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>

      {guide.limits && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {guide.limits}
        </p>
      )}

      {footer}
    </section>
  );
}
