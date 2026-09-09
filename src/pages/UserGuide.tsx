/**
 * Public User Guide page.
 *
 * Renders the structured guide content (src/content/user-guide.ts, which
 * mirrors docs/user-guide.md) as an indexable, navigable page with full
 * SEO metadata and FAQPage structured data.
 */

import { Link } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import {
  guideSections,
  guideFaq,
  GUIDE_LAST_REVIEWED,
  type GuideLink,
} from "@/content/user-guide";

function InlineLink({ text, link }: { text: string; link?: GuideLink }) {
  if (!link) return <>{text}</>;
  return (
    <>
      {text}{" "}
      <Link
        to={link.to}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {link.label}
      </Link>
      .
    </>
  );
}

export default function UserGuide() {
  useSeo({
    title: "FRELUX User Guide: How to Use Every Calculator and Feature",
    description:
      "Step by step guide to FRELUX: paint, screeding, tiling and POP ceiling calculators, AI floor plan estimation, saving estimates, PDF export, projects, pricing and regional settings.",
    canonicalPath: "/user-guide",
    ogType: "article",
    keywords:
      "FRELUX user guide, how to use paint calculator, construction calculator guide, estimate materials Nigeria",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "FRELUX User Guide",
        description:
          "How to use every FRELUX calculator and feature, in plain language.",
        dateModified: GUIDE_LAST_REVIEWED,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: guideFaq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  });

  return (
    <div>
      <PageHeader
        title="FRELUX User Guide"
        subtitle="How to use every calculator and feature, in plain language. Written for homeowners and professionals alike."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Learn", path: "/learn" },
          { label: "User Guide" },
        ]}
      />

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Table of contents */}
          <nav
            aria-label="Guide contents"
            className="lg:sticky lg:top-20 lg:self-start"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contents
            </p>
            <ul className="space-y-1">
              {guideSections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          <div className="min-w-0 space-y-10">
            {guideSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                  {section.title}
                </h2>

                {section.paragraphs?.map((p, i) => (
                  <p
                    key={i}
                    className="mt-3 leading-relaxed text-foreground/90"
                  >
                    {p}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-foreground/90">
                    {section.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}

                {section.linkBullets && (
                  <ul className="mt-3 space-y-1.5 leading-relaxed text-foreground/90">
                    {section.linkBullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          <InlineLink text={b.text} link={b.link} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.table && (
                  <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {section.table.columns.map((c) => (
                            <th
                              key={c}
                              className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {section.table.rows.map((row, i) => (
                          <tr key={i} className="align-top">
                            {row.map((cell, j) =>
                              cell.startsWith("/") && !cell.includes(" ") ? (
                                <td key={j} className="px-3 py-2.5">
                                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                    {cell}
                                  </code>
                                </td>
                              ) : (
                                <td
                                  key={j}
                                  className="px-3 py-2.5 text-foreground/90"
                                >
                                  {cell}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.note && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {section.note}
                    </p>
                  </div>
                )}

                {section.paragraphs2?.map((p, i) => (
                  <p key={i} className="mt-3 font-medium text-foreground">
                    {p}
                  </p>
                ))}

                {section.bullets2 && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-foreground/90">
                    {section.bullets2.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* FAQ */}
            <section id="faq" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Frequently Asked Questions
              </h2>
              <div className="mt-4 divide-y rounded-lg border">
                {guideFaq.map((f) => (
                  <details key={f.question} className="group px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:hidden">
                      {f.question}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <p className="border-t pt-6 text-xs text-muted-foreground">
              Last reviewed {GUIDE_LAST_REVIEWED}. This guide matches the live
              FRELUX system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
