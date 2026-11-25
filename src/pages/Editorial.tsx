import { Link } from "react-router-dom";
import { BadgeCheck, FileSearch, PenLine, RefreshCw, ShieldAlert } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo, SITE_URL } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";
import {
  EDITORIAL_DESK,
  EDITORIAL_LIMITS,
  EDITORIAL_PATH,
  NAMED_REVIEWERS,
  PUBLISHER,
  REVIEW_POLICY,
  authorSchema,
  publisherSchema,
} from "@/lib/editorial";

const STEP_ICONS = [FileSearch, BadgeCheck, PenLine, RefreshCw];

export default function Editorial() {
  const { t } = useLanguage();
  const named = NAMED_REVIEWERS;

  useSeo({
    title: "Editorial standards: who writes and reviews FRELUX",
    description:
      "Who writes FRELUX guides and calculator methodology, what they are qualified to check, how each page is reviewed before publication, and how corrections are handled.",
    canonicalPath: EDITORIAL_PATH,
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "Editorial standards",
      url: `${SITE_URL}${EDITORIAL_PATH}`,
      description:
        "Authorship, review process, corrections policy and company details for FRELUX SMART CALC.",
      publisher: publisherSchema(),
      author: authorSchema(named[0]),
      about: {
        "@type": "Thing",
        name: "Editorial standards and review process",
      },
    },
  });

  return (
    <div className="min-h-screen bg-surface">
      <PageHeader
        eyebrow={t("Trust")}
        title={t("Editorial standards")}
        subtitle={t(
          "Who writes these pages, what they are qualified to check, and how a correction reaches you.",
        )}
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("Editorial standards") },
        ]}
      />
      <Container className="py-10">
        <div className="mx-auto max-w-3xl space-y-10">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {t("Who publishes this site")}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("Publisher")}</dt>
                <dd className="font-medium text-foreground">{PUBLISHER.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Registration")}</dt>
                <dd className="font-medium text-foreground">
                  {PUBLISHER.registrationNumber}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Head office")}</dt>
                <dd className="font-medium text-foreground">
                  {PUBLISHER.addressLocality}, {t("Nigeria")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Contact")}</dt>
                <dd className="font-medium text-foreground">
                  <a className="underline" href={`mailto:${PUBLISHER.email}`}>
                    {PUBLISHER.email}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              {t("Who writes and reviews")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {EDITORIAL_DESK.description}
            </p>
            {named.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {named.map((reviewer) => (
                  <li
                    key={reviewer.name}
                    className="rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {reviewer.name}
                    </p>
                    <p className="text-muted-foreground">
                      {reviewer.role} · {reviewer.credential}
                    </p>
                    <a
                      className="mt-1 inline-block underline"
                      href={reviewer.sameAs}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                    >
                      {t("Verify this credential")}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(
                  "Guides carry the desk byline rather than an individual one. Named, individually verifiable reviewers are added here as they are appointed, and this page is the record of that.",
                )}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              {t("How a page is reviewed")}
            </h2>
            <ol className="mt-4 space-y-4">
              {REVIEW_POLICY.map((entry, index) => {
                const Icon = STEP_ICONS[index] ?? BadgeCheck;
                return (
                  <li key={entry.step} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t(entry.step)}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t(entry.detail)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("The standards each calculator follows are listed in the")}{" "}
              <Link className="underline" to="/engineering-standards">
                {t("engineering standards library")}
              </Link>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              {t("What these pages do not claim")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {EDITORIAL_LIMITS.map((limit) => (
                <li key={limit}>{t(limit)}</li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </div>
  );
}
