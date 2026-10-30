import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  CircleSlash,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import {
  CODE_FAMILIES,
  DEFAULT_FAMILY_BY_JURISDICTION,
  FAMILY_ORDER,
  REGISTRY_VERSION,
} from "@/lib/codes/library";
import {
  defaultConfiguration,
  resolveReferenceReport,
  type StatusOverlay,
} from "@/lib/codes/resolver";
import { fetchStatusOverlay } from "@/lib/codes/status-store";
import {
  BUILDING_TYPES,
  JURISDICTIONS,
  STRUCTURAL_SYSTEMS,
  type BuildingType,
  type CodeFamilyId,
  type JurisdictionCode,
  type ProjectConfiguration,
  type StructuralSystem,
} from "@/lib/codes/types";

function StatusChip({ status }: { status: "verified" | "verify-locally" }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "verified"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {status === "verified" ? "Referenced" : "Verify locally"}
    </span>
  );
}

export default function CodeReference() {
  useSeo({
    title:
      "International Building Code Reference: Standards by Country | FRELUX",
    description:
      "Select your project country, building type and structural system to see the building code, edition and standards that govern concrete, reinforcement, loads, wind, snow, foundations, durability and materials — with unsupported regulations identified, never filled from another country.",
    canonicalPath: "/code-reference",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX International Building Code Reference",
        description:
          "A regulatory reference engine that maps construction projects to the applicable building code family, edition and technical standards, with explicit unsupported-regulation reporting.",
        url: "https://freluxtools.com/code-reference",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
        isPartOf: {
          "@type": "WebSite",
          name: "FRELUX SMART CALC",
          url: "https://freluxtools.com",
        },
      },
    ],
  });

  const [config, setConfig] = useState<ProjectConfiguration>(() =>
    defaultConfiguration("NG"),
  );
  const [materialsText, setMaterialsText] = useState("");
  const [overlay, setOverlay] = useState<StatusOverlay>({});

  // Administrative statuses are an overlay; the library stays the base.
  useEffect(() => {
    let cancelled = false;
    fetchStatusOverlay().then((result) => {
      if (!cancelled && !result.error) setOverlay(result.overlay);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const family = CODE_FAMILIES[config.familyId];

  const report = useMemo(
    () => resolveReferenceReport(config, { overlay }),
    [config, overlay],
  );

  const setCountry = (country: JurisdictionCode) => {
    const next = defaultConfiguration(country);
    setConfig({ ...next, location: config.location });
  };

  const setFamily = (familyId: CodeFamilyId) => {
    const nextFamily = CODE_FAMILIES[familyId];
    setConfig({
      ...config,
      familyId,
      editionId: nextFamily.defaultEditionId,
    });
  };

  const updateMaterials = (text: string) => {
    setMaterialsText(text);
    setConfig({
      ...config,
      materials: text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Regulatory reference"
          title="International Building Code Reference"
          subtitle="Configure your project and see which building code, edition and technical standards govern it — with every unsupported or locally-verifiable point stated plainly. This engine names documents; it never substitutes one country's design values for another's."
          backTo="/construction-tools"
          backLabel="All tools"
        />

        {/* ── Configuration ───────────────────────────────────── */}
        <section className="mt-6 card-elevated p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Layers aria-hidden="true" className="h-4 w-4 text-primary" />
            1. Project configuration
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="code-country"
                className="text-xs font-medium text-muted-foreground"
              >
                Project country
              </label>
              <select
                id="code-country"
                className="input-field mt-1"
                value={config.country}
                onChange={(event) =>
                  setCountry(event.target.value as JurisdictionCode)
                }
              >
                {JURISDICTIONS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="code-location"
                className="text-xs font-medium text-muted-foreground"
              >
                Project location
              </label>
              <input
                id="code-location"
                className="input-field mt-1"
                placeholder="City / site (e.g. Lekki, Lagos)"
                value={config.location}
                onChange={(event) =>
                  setConfig({ ...config, location: event.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="code-building-type"
                className="text-xs font-medium text-muted-foreground"
              >
                Building type
              </label>
              <select
                id="code-building-type"
                className="input-field mt-1"
                value={config.buildingType}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    buildingType: event.target.value as BuildingType,
                  })
                }
              >
                {BUILDING_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="code-structural"
                className="text-xs font-medium text-muted-foreground"
              >
                Structural system
              </label>
              <select
                id="code-structural"
                className="input-field mt-1"
                value={config.structuralSystem}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    structuralSystem: event.target.value as StructuralSystem,
                  })
                }
              >
                {STRUCTURAL_SYSTEMS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="code-family"
                className="text-xs font-medium text-muted-foreground"
              >
                Applicable code family
              </label>
              <select
                id="code-family"
                className="input-field mt-1"
                value={config.familyId}
                onChange={(event) =>
                  setFamily(event.target.value as CodeFamilyId)
                }
              >
                {FAMILY_ORDER.map((id) => {
                  const item = CODE_FAMILIES[id];
                  const adopted =
                    DEFAULT_FAMILY_BY_JURISDICTION[config.country] === id;
                  return (
                    <option key={id} value={id}>
                      {item.name}
                      {adopted ? " — adopted here" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="code-edition"
                className="text-xs font-medium text-muted-foreground"
              >
                Code edition
              </label>
              <select
                id="code-edition"
                className="input-field mt-1"
                value={config.editionId}
                onChange={(event) =>
                  setConfig({ ...config, editionId: event.target.value })
                }
              >
                {family.editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.label}
                    {edition.state === "superseded" ? " (superseded)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label
                htmlFor="code-materials"
                className="text-xs font-medium text-muted-foreground"
              >
                Material specifications (comma separated, as specified by your
                engineer)
              </label>
              <input
                id="code-materials"
                className="input-field mt-1"
                placeholder="e.g. CEM II/A 42.5N, Grade 500 rebar, S355 steel"
                value={materialsText}
                onChange={(event) => updateMaterials(event.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Edition summary ─────────────────────────────────── */}
        <section className="mt-6 card-elevated p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Applicable code
              </p>
              <h2 className="mt-1 text-lg font-bold text-foreground">
                {report.family.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Edition:{" "}
                <strong className="text-foreground">
                  {report.edition.label}
                </strong>
              </p>
            </div>
            <span
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                report.jurisdictionSupported
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {report.jurisdictionSupported ? (
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {report.jurisdictionSupported
                ? "Adopted family for this country"
                : "Not the adopted code here — comparison only"}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {report.family.adoptingAuthorities}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {report.family.adoptionNote}
          </p>
          {report.edition.note ? (
            <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {report.edition.note}
            </p>
          ) : null}
          {report.family.scopeNotes.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {report.family.scopeNotes.map((note) => (
                <li
                  key={note}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* ── Warnings ────────────────────────────────────────── */}
        {report.warnings.length > 0 && (
          <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <AlertTriangle
                aria-hidden="true"
                className="h-4 w-4 text-amber-600"
              />
              Resolve these before relying on the reference set
            </h2>
            <ul className="mt-2 space-y-1.5">
              {report.warnings.map((warning) => (
                <li key={warning} className="text-xs text-muted-foreground">
                  • {warning}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Domains ─────────────────────────────────────────── */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground">
            2. Engineering requirements
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents only. No load factor, mix ratio, spacing or wind/snow
            value is produced here — those come from the adopted edition and
            your engineer.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {report.domains.map((domain) => (
              <article key={domain.domain} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {domain.label}
                  </h3>
                  {domain.status === "unsupported" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      <CircleSlash aria-hidden="true" className="h-3 w-3" />
                      Not codified
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {domain.references.length} reference
                      {domain.references.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {domain.status === "unsupported" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {domain.reason}
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {domain.references.map((reference) => (
                      <div
                        key={`${reference.document}-${reference.title}`}
                        className="rounded-lg bg-muted/40 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {reference.document}
                          </p>
                          <StatusChip status={reference.status} />
                        </div>
                        <p className="mt-1 text-xs text-foreground">
                          {reference.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reference.governs}
                        </p>
                        {reference.note ? (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            {reference.note}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {domain.note ? (
                      <p className="text-xs text-muted-foreground">
                        {domain.note}
                      </p>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ── Assumptions and non-substitution ────────────────── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card-elevated p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <BookOpenCheck
                aria-hidden="true"
                className="h-4 w-4 text-primary"
              />
              3. Calculation assumptions
            </h2>
            <ul className="mt-2 space-y-1.5">
              {report.assumptions.map((item) => (
                <li key={item} className="text-xs text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-elevated p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldAlert
                aria-hidden="true"
                className="h-4 w-4 text-primary"
              />
              No cross-jurisdiction substitution
            </h2>
            <ul className="mt-2 space-y-1.5">
              {report.nonSubstitution.map((item) => (
                <li key={item} className="text-xs text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Safety ──────────────────────────────────────────── */}
        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            />
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Professional review is required
              </h2>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>
                  • Structural designs must be reviewed and signed off by a
                  qualified, licensed professional in the project country.
                </li>
                <li>
                  • FRELUX does not grant, imply or guarantee municipal
                  approval, code compliance, or acceptance by any authority.
                </li>
                <li>
                  • The authority having jurisdiction may adopt amendments this
                  registry does not track — confirm every reference locally.
                </li>
                <li>
                  • Where a domain is marked “not codified”, no other country's
                  reference has been substituted.
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Registry version {report.registryVersion} · library v
                {REGISTRY_VERSION}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
