import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronDown,
  Search,
  ShieldCheck,
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import {
  ENGINEERING_DOMAINS,
  ENGINEERING_TRUST_NOTICE,
  PUBLIC_ENGINE_METADATA,
} from "@/config/engineering-standards";

const filters = ["All", ...ENGINEERING_DOMAINS.map((domain) => domain.title)];

export default function EngineeringStandards() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("All standards");
  const [expanded, setExpanded] = useState<string | null>(null);
  const standards = [
    "All standards",
    ...Array.from(
      new Set(PUBLIC_ENGINE_METADATA.flatMap((engine) => engine.standards)),
    ).sort(),
  ];

  const engines = useMemo(
    () =>
      PUBLIC_ENGINE_METADATA.filter((engine) => {
        const matchesDomain =
          filter === "All" ||
          ENGINEERING_DOMAINS.find((d) => d.key === engine.domain)?.title ===
            filter;
        const matchesStandard =
          selectedStandard === "All standards" ||
          engine.standards.includes(selectedStandard);
        const text =
          `${engine.name} ${engine.category} ${engine.standards.join(" ")}`.toLowerCase();
        return (
          matchesDomain &&
          matchesStandard &&
          text.includes(query.trim().toLowerCase())
        );
      }),
    [filter, query, selectedStandard],
  );

  return (
    <>
      <PageHeader
        title="Engineering & Accuracy"
        subtitle="See how FRELUX quantity tools work, which engineering references they cite, and what assumptions to verify before using an estimate."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Engineering & Accuracy" },
        ]}
      />

      <AdSlot
        slotKey="content_native"
        className="mx-auto mt-8 max-w-5xl px-4 sm:px-6"
      />
      <Container className="py-8 md:py-12">
        <section
          className="mb-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-7"
          aria-labelledby="trust-summary"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="trust-summary" className="text-xl font-semibold">
                Transparent quantity tools, not a substitute for professional
                judgment
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                FRELUX is built around deterministic calculations, explicit
                inputs, and visible assumptions. Standards references identify
                context; they do not certify compliance or replace current
                project specifications and professional review.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Construction engines in the codebase"
              value="55+"
              detail="Inventory count, not a claim that every engine is verified."
            />
            <Metric
              label="Methodology disclosures"
              value={`${PUBLIC_ENGINE_METADATA.length}`}
              detail="Selected tools have public summaries; this is not a completeness score."
            />
            <Metric
              label="Standards references"
              value="Tool-specific"
              detail="Only references evidenced in the relevant implementation are listed."
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {ENGINEERING_TRUST_NOTICE}
          </p>
        </section>

        <section className="mb-10" aria-labelledby="domains-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id="domains-title" className="text-2xl font-semibold">
                Six construction domains
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse public-facing scope and tool-specific references where
                the implementation documents them.
              </p>
            </div>
            <BookOpenCheck
              className="hidden h-7 w-7 text-primary sm:block"
              aria-hidden="true"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ENGINEERING_DOMAINS.map((domain) => (
              <article
                key={domain.key}
                className="rounded-xl border bg-card p-5"
              >
                <h3 className="font-semibold">{domain.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {domain.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {domain.standards.length ? (
                    domain.standards.map((standard) => (
                      <Badge key={standard} variant="secondary">
                        {standard}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No tool-specific standard reference published here.
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="engines-title">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="engines-title" className="text-2xl font-semibold">
                Tool methodology
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Public summaries of selected calculators and their assumptions.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tool or standard"
                  aria-label="Search tool or standard"
                  className="pl-9"
                />
              </div>
              <label className="sr-only" htmlFor="standard-filter">
                Filter by referenced standard
              </label>
              <select
                id="standard-filter"
                value={selectedStandard}
                onChange={(event) => setSelectedStandard(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-56"
              >
                {standards.map((standard) => (
                  <option key={standard} value={standard}>
                    {standard}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            className="mb-5 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filter by construction domain"
          >
            {filters.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "default" : "outline"}
                onClick={() => setFilter(item)}
                className="shrink-0"
              >
                {item}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {engines.map((engine) => {
              const isOpen = expanded === engine.id;
              return (
                <article
                  key={engine.id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{engine.name}</h3>
                        <Badge variant="outline">{engine.category}</Badge>
                      </div>
                      {engine.standards.length > 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Implementation references:{" "}
                          {engine.standards.join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          No tool-specific standards reference published.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(isOpen ? null : engine.id)}
                        aria-expanded={isOpen}
                        aria-controls={`method-${engine.id}`}
                      >
                        Methodology{" "}
                        <ChevronDown
                          className={`ml-1 h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to={engine.route}>
                          Open tool{" "}
                          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      id={`method-${engine.id}`}
                      className="border-t bg-muted/30 px-4 py-4 sm:px-5"
                    >
                      <h4 className="text-sm font-semibold">
                        How quantities are derived
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {engine.method}
                      </p>
                      <h4 className="mt-4 text-sm font-semibold">
                        Assumptions to check
                      </h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {engine.assumptions.map((assumption) => (
                          <li key={assumption}>{assumption}</li>
                        ))}
                      </ul>
                      {engine.standards.length > 0 && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          These are implementation references, not a compliance
                          claim. Check the current edition and local amendments
                          for your project.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {engines.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No tools match those filters.
              </div>
            )}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="engineering-faq-title">
          <h2 id="engineering-faq-title" className="text-2xl font-semibold">
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-3">
            <details className="rounded-xl border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                Do FRELUX standards references certify that an estimate complies
                with building codes?
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No. References describe context documented in selected tool
                implementations. They are not a compliance certificate, and
                current standards, local amendments, project specifications and
                professional review still apply.
              </p>
            </details>
            <details className="rounded-xl border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                Are all FRELUX calculators verified for every market?
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No. Market availability, product data and documented calculation
                scope vary by tool. A configured market does not by itself prove
                that every input, material or local requirement has been
                independently validated.
              </p>
            </details>
            <details className="rounded-xl border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                How does FRELUX calculate material quantities?
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Each selected tool uses its documented inputs and calculation
                method. Where a tool exposes a methodology breakdown, review the
                measurements, product coverage, allowances and package rounding
                shown there; confirm product-specific values with current
                manufacturer data.
              </p>
            </details>
            <details className="rounded-xl border bg-card p-4">
              <summary className="cursor-pointer font-medium">
                Does FRELUX provide structural or professional design approval?
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No. Quantity estimates and preliminary calculations do not
                replace structural design, code-compliance checks, site
                investigation or review by a qualified professional.
              </p>
            </details>
          </div>
        </section>
      </Container>
    </>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
