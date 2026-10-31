import { Link } from "react-router-dom";
import {
  ArrowRight,
  Globe2,
  Ruler,
  Wallet,
  Calculator,
  FileText,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DisplayPreferencesBar from "@/components/measurement/DisplayPreferencesBar";
import { useSeo } from "@/lib/seo";

/**
 * The page a diaspora builder lands on after searching how to budget a
 * Nigerian project from abroad.
 *
 * It exists to prevent one expensive mistake: treating a converted dollar
 * figure as a price. Everything here points at the calculators, measures in
 * the units the visitor thinks in, and repeats that naira pricing comes from
 * Nigerian suppliers, not from an exchange rate.
 */

const STEPS = [
  {
    icon: Ruler,
    title: "Measure the building, not the drawing",
    body: "Convert every dimension to one system before you start. A plan in feet and a supplier selling in metres is how quantities double. The Unit Converter handles feet, inches, metres, plots and bags in one place.",
    link: { label: "Open the Unit Converter", to: "/unit-converter" },
  },
  {
    icon: Calculator,
    title: "Price the quantities in naira first",
    body: "Run each trade through its calculator with the currency left on naira. Blockwork, concrete, roof sheets, screeding, POP, tiles and paint each have their own calculator, and each one shows the formula it used.",
    link: { label: "See all construction tools", to: "/construction-tools" },
  },
  {
    icon: Wallet,
    title: "Switch the display, not the estimate",
    body: "Choose USD or GBP above and a converted figure appears beside the naira total, with the rate and its timestamp. The estimate itself never changes currency. This is the honest way to read a Nigerian project from abroad.",
    link: { label: "Try a cost estimate", to: "/cost-estimator" },
  },
  {
    icon: ShieldCheck,
    title: "Allow for the material you will lose",
    body: "Cutting, breakage and spillage are real on every site. Set an allowance per material, from low waste on paint to high waste on a complex tiled floor, and the purchase quantity reflects it.",
    link: { label: "Estimate tiles with waste", to: "/tile-calculator" },
  },
  {
    icon: FileText,
    title: "Send a document, not a screenshot",
    body: "Export the quantity and cost breakdown to a PDF you can send to the builder, the quantity surveyor or the family member buying materials. The document keeps the currency it was priced in.",
    link: {
      label: "Build a full budget report",
      to: "/build-to-roof-estimator",
    },
  },
  {
    icon: Globe2,
    title: "Compare with a local quote",
    body: "The calculator tells you how much material the work needs. Only a local supplier tells you what it costs this week. Ask for a written quote and compare it against your estimate line by line.",
    link: { label: "Check local material prices", to: "/material-prices" },
  },
];

const MISTAKES = [
  "Converting a US retail price into naira and calling it a Nigerian price. Store shelves in Houston and Lagos are not the same market.",
  "Budgeting from a single exchange rate. Materials are priced in naira by suppliers, and the naira figure moves for its own reasons.",
  "Skipping the waste allowance, then discovering the purchased quantity was short by a room.",
  "Mixing feet and metres inside one calculation. Convert everything once, at the start.",
  "Paying for materials before the quantity is confirmed by someone on site.",
];

const FAQS = [
  {
    q: "Can I estimate Nigerian construction costs from the US or UK?",
    a: "Yes for quantities, and carefully for money. FRELUX calculates how much material the work needs from your dimensions, using Nigerian pricing rules. The cost figure is only as current as the last local price update, so treat it as a planning number and confirm it with a supplier quote.",
  },
  {
    q: "Why does the converted dollar figure differ from what my builder quotes?",
    a: "A converted figure is the naira estimate translated at a dated exchange rate. Your builder quotes naira prices set by local suppliers, which include their own transport, margins and stock positions. The conversion is for reading comfort, not a prediction of the invoice.",
  },
  {
    q: "Which units should I use if my plan is in feet?",
    a: "Enter the plan in feet and switch the display to imperial, or convert to metres first with the Unit Converter. Either way, keep one system through a single calculation and convert at the boundaries.",
  },
  {
    q: "How do I send the result to someone in Nigeria?",
    a: "Export the quotation or budget report as a PDF. It carries the quantities, the rates used and the currency the estimate was priced in, so the person buying materials is not guessing from a chat screenshot.",
  },
];

export default function BuildInNigeriaFromAbroad() {
  useSeo({
    title:
      "How to Estimate and Budget Construction Costs in Nigeria from the US or UK | FRELUX",
    description:
      "A practical process for diaspora builders: measure in feet or metres, price quantities in naira, read costs in USD or GBP without mistaking a conversion for a local price, and send a document your builder can cost.",
    canonicalPath: "/learn/build-in-nigeria-from-abroad",
    ogType: "article",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline:
          "How to Estimate and Budget Construction Costs in Nigeria from the US or UK",
        description:
          "Measure the building, price the quantities in naira, read a converted figure honestly, and send your builder a document instead of a screenshot.",
        about: [
          "construction cost estimation",
          "building in Nigeria from abroad",
          "diaspora construction budgeting",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Building in Nigeria from abroad"
        subtitle="How to estimate and budget construction costs from the US, UK or anywhere else"
      />

      <article className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-lg leading-relaxed text-muted-foreground">
          You are in Houston or Manchester. The building is in Lagos or Enugu.
          The quotes arrive in naira, you think in dollars or pounds, and every
          number you send back home will be spent by someone else. This page is
          the process we would follow ourselves.
        </p>

        <div className="mt-8">
          <DisplayPreferencesBar />
        </div>

        <section className="mt-10 rounded-xl border border-border/60 bg-muted/40 p-5">
          <h2 className="text-xl font-semibold text-foreground">
            The one rule that saves the most money
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            A converted figure is not a price. Exchange rates translate a naira
            amount into dollars for your comfort. They say nothing about what
            cement, tiles or roofing sheets cost where the building stands.
            Price the work in naira, then read it in dollars.
          </p>
        </section>

        <h2 className="mt-12 text-2xl font-semibold text-foreground">
          The process, in six steps
        </h2>
        <div className="mt-6 space-y-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                    <Link
                      to={step.link.to}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {step.link.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mt-12 text-2xl font-semibold text-foreground">
          Five mistakes that cost diaspora builders money
        </h2>
        <ul className="mt-4 space-y-3">
          {MISTAKES.map((mistake) => (
            <li
              key={mistake}
              className="flex gap-3 leading-relaxed text-muted-foreground"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                aria-hidden="true"
              />
              <span>{mistake}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-2xl font-semibold text-foreground">
          Questions this page gets asked
        </h2>
        <div className="mt-4 space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="rounded-xl border border-border/60 bg-card p-4"
            >
              <summary className="cursor-pointer font-medium text-foreground">
                {faq.q}
              </summary>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Start with the building you actually have
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Enter your dimensions and let the calculators size the materials.
            You will get quantities you can defend to a builder and a cost
            figure you can read in the currency you spend.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/build-to-roof-estimator"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Build to roof estimate
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/finish-estimator"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Finishing estimate
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              See it on the map
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
