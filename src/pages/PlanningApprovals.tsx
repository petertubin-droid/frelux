/**
 * Planning approvals and setback guide.
 *
 * Reference page, not a calculator. It answers the two questions a builder
 * asks before drawing: who issues the permit here, and what setbacks does
 * the authority apply. The numbers are only shown as figures where a
 * published source exists; everywhere else the page says plainly that the
 * authority confirms per plot, because an invented setback gets a site
 * sealed.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  FileText,
  ListChecks,
  Search,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import {
  ALL_JURISDICTIONS,
  PLANNING_COUNTRIES,
  SETBACK_STATUS_LABEL,
  getJurisdictionsByCountry,
  type PlanningJurisdiction,
} from "@/lib/codes/planning-approvals";

const statusTone: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  indicative: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  "set-by-scheme": "bg-sky-500/10 text-sky-700 border-sky-500/30",
};

function JurisdictionCard({
  jurisdiction,
}: {
  jurisdiction: PlanningJurisdiction;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {jurisdiction.country}
          {jurisdiction.region ? ` / ${jurisdiction.region}` : ""}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
          {jurisdiction.region ?? jurisdiction.country} building permit
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-foreground/80">
          <Building2
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>
            <span className="font-semibold">Issuing authority:</span>{" "}
            {jurisdiction.authority}
          </span>
        </p>
      </header>

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Governing instruments
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-foreground/80">
          {jurisdiction.instruments.map((instrument) => (
            <li key={instrument} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                -
              </span>
              <span>{instrument}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">
            Setbacks and coverage
          </h3>
          <span
            className={classNames(
              "rounded-full border px-2 py-0.5 text-xs font-semibold",
              statusTone[jurisdiction.setbackStatus],
            )}
          >
            {SETBACK_STATUS_LABEL[jurisdiction.setbackStatus]}
          </span>
        </div>

        {jurisdiction.setbacks.length > 0 ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border py-2 pr-4 font-semibold">
                    Requirement
                  </th>
                  <th className="border-b border-border py-2 pr-4 font-semibold">
                    Value
                  </th>
                  <th className="border-b border-border py-2 font-semibold">
                    Basis
                  </th>
                </tr>
              </thead>
              <tbody>
                {jurisdiction.setbacks.map((rule) => (
                  <tr key={rule.label} className="align-top">
                    <td className="border-b border-border/60 py-2 pr-4 font-medium text-foreground">
                      {rule.label}
                    </td>
                    <td className="border-b border-border/60 py-2 pr-4 tabular-nums text-foreground">
                      {rule.value}
                    </td>
                    <td className="border-b border-border/60 py-2 text-foreground/70">
                      {rule.basis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground/70">
            This jurisdiction sets setbacks in a local scheme rather than a
            table, so no figure is reproduced here.
          </p>
        )}

        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-foreground/80">
          {jurisdiction.setbackNote}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
          Approval route
        </h3>
        <ol className="mt-2 space-y-3">
          {jurisdiction.approvals.map((step, index) => (
            <li key={step.step} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.step}
                </p>
                <p className="text-sm text-foreground/75">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <p className="text-sm text-foreground/85">
          <span className="font-semibold">Watch out for this:</span>{" "}
          {jurisdiction.caution}
        </p>
      </section>

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {jurisdiction.authorityStatus === "verified" &&
        jurisdiction.sourceUrl ? (
          <>
            <span>
              Office confirmed on its own portal, checked{" "}
              {jurisdiction.verifiedOn}
            </span>
            <a
              className="underline"
              href={jurisdiction.sourceUrl}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Open the authority portal
            </a>
          </>
        ) : (
          <span>
            Office described from the national planning framework. Confirm its
            current name at the state secretariat before you submit.
          </span>
        )}
      </footer>
    </article>
  );
}

export default function PlanningApprovals() {
  useSeo({
    title: "Building Permit and Setback Guide by State and Country | FRELUX",
    description:
      "The permitting route for every Nigerian state and the FCT, plus the markets FRELUX serves. Shows the issuing authority, the governing law and the approval stages, and states plainly where set back figures are not published instead of guessing them.",
    canonicalPath: "/planning-approvals",
    ogType: "article",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Building Permit and Setback Guide",
        description:
          "Planning approval routes and set back status for Nigerian states and international markets, with unpublished figures identified rather than estimated.",
        url: "https://freluxtools.com/planning-approvals",
        applicationCategory: "BusinessApplication",
        operatingSystem: "All",
        offers: { "@type": "Offer", price: "0" },
        isPartOf: {
          "@type": "WebSite",
          name: "FRELUX SMART CALC",
          url: "https://freluxtools.com",
        },
      },
    ],
  });

  const [countryCode, setCountryCode] = useState("NG");
  const [selectedId, setSelectedId] = useState("ng-fct");
  const [query, setQuery] = useState("");

  const countryJurisdictions = useMemo(
    () => getJurisdictionsByCountry(countryCode),
    [countryCode],
  );

  const selected =
    countryJurisdictions.find((j) => j.id === selectedId) ??
    countryJurisdictions[0];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? ALL_JURISDICTIONS : countryJurisdictions;
    if (!q) return pool;
    return pool.filter((j) =>
      [j.country, j.region ?? "", j.authority, ...j.instruments]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, countryJurisdictions]);

  return (
    <>
      <PageHeader
        eyebrow="Planning and permits"
        title="Building Permit and Setback Guide"
        subtitle="Who issues the permit, what law they work under, and every stage from plot check to certificate of fitness. Every Nigerian state and the FCT, plus the markets FRELUX serves."
        backTo="/calculators"
        backLabel="All calculators"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Planning approvals" },
        ]}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Country
            <select
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
              onChange={(event) => {
                const next = event.target.value;
                setCountryCode(next);
                const first = getJurisdictionsByCountry(next)[0];
                if (first) setSelectedId(first.id);
              }}
              value={countryCode}
            >
              {PLANNING_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.count})
                </option>
              ))}
            </select>
          </label>

          {countryJurisdictions.length > 1 ? (
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              State or territory
              <select
                className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
                onChange={(event) => setSelectedId(event.target.value)}
                value={selected?.id ?? ""}
              >
                {countryJurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction.id} value={jurisdiction.id}>
                    {jurisdiction.region ?? jurisdiction.country}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Search the guide
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Search
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="State, city, authority or law"
                type="search"
                value={query}
              />
            </span>
          </label>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground/80">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            What this guide verifies, and what it does not
          </h2>
          <ul className="mt-2 space-y-2">
            <li>
              <span className="font-semibold text-foreground">Verified:</span>{" "}
              the approval route and the instruments. The sequence from plot and
              zoning check to certificate of fitness comes from Nigerian
              planning law, and the standards cited are the National Building
              Code (Nigeria) 2006 and each state's planning law. International
              rows name the planning and building law of that country, with no
              individual statute link yet, so treat the instrument as the
              framework to quote rather than a citation.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Verified on the authority portal:
              </span>{" "}
              the office for the jurisdictions whose portal answered on 11
              November 2026, which is Lagos (LASPPPA), Kaduna (KASUPDA) and the
              FCT (FCTA). Every other row names the office the framework
              provides and asks you to confirm its current name before
              submitting.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Not verified, and not invented:
              </span>{" "}
              numerical setback values. No Nigerian state publishes its setback
              schedule online, so no row here carries a published figure. The
              residential norm shown is the planning norm authorities generally
              apply, labelled as such, and it is not this state's instrument.
              Ask for the plot standard in writing.
            </li>
          </ul>
        </section>

        {query.trim() ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {results.length} matching jurisdictions
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {results.map((jurisdiction) => (
                <li key={jurisdiction.id}>
                  <button
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary/50"
                    onClick={() => {
                      setCountryCode(jurisdiction.countryCode);
                      setSelectedId(jurisdiction.id);
                      setQuery("");
                    }}
                    type="button"
                  >
                    <span className="font-semibold text-foreground">
                      {jurisdiction.region ?? jurisdiction.country}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {jurisdiction.country} / {jurisdiction.authority}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selected ? (
          <div className="mt-6">
            <JurisdictionCard jurisdiction={selected} />
          </div>
        ) : null}

        <AdSlot slotKey="calculator_mid" className="mt-8" />

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm text-foreground/80">
          <h2 className="text-base font-bold text-foreground">
            How to read the setback badge
          </h2>
          <ul className="mt-2 space-y-2">
            <li>
              <span className="font-semibold">Published figure:</span> the
              number comes from a published instrument and the citation is on
              the row.
            </li>
            <li>
              <span className="font-semibold">
                National norm, confirm in writing:
              </span>{" "}
              the figure is the planning norm Nigerian states generally apply.
              It is not this state's published standard, and the authority may
              set something different for your plot.
            </li>
            <li>
              <span className="font-semibold">Set by the local scheme:</span>{" "}
              the jurisdiction applies its own scheme or zoning document, which
              is not published as a national table. Ask the authority for the
              standard for your plot number.
            </li>
          </ul>
          <p className="mt-3">
            Nothing on this page is a permit, an approval or legal advice.
            Planning rules change with each administration and each scheme
            amendment, so confirm in writing before you draw or build. If you
            are about to spend money on a plot, ask the authority for the
            standard in writing and keep the reply.
          </p>
          <p className="mt-3">
            Need quantities once the permit question is settled?{" "}
            <Link
              className="font-semibold text-primary underline"
              to="/calculators"
            >
              Run the numbers on the calculators
            </Link>{" "}
            or check the{" "}
            <Link
              className="font-semibold text-primary underline"
              to="/code-reference"
            >
              building code reference
            </Link>{" "}
            for which code edition governs your structure.
          </p>
        </section>

        <AdSlot slotKey="calculator_native" className="mt-8" />
      </main>
    </>
  );
}
