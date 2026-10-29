/**
 * OperationsTab — Phase 4 cross-engine operations summary.
 *
 * Presents the project's operational posture across the four
 * engines (tax, credentials, procurement, schedule) with one
 * rule above all: honesty. Every section names its evidence and
 * links to its action surface. Missing data never renders as a
 * green "complete" state — it renders as an explicit gap with
 * the next action.
 *
 * Data rules:
 *  - Tax provenance comes from the stored quotation exactly as
 *    written by generateQuotation (tax_source, rule citation,
 *    validation state). 'not_determined' is displayed as what
 *    it is: tax was not applied.
 *  - Credential labels use credential-status.ts semantics:
 *    document-reviewed is never displayed as registry-verified.
 *  - Procurement status groups mirror the deterministic state
 *    machine; only records linked to this project are counted.
 *  - Calendar availability comes from the calendar engine's own
 *    resolution (fail-closed). No dates are computed on this
 *    tab; the schedule section reports phase progress and
 *    calendar coverage, and never invents a dated schedule.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  Truck,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import {
  supabase as supabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { DbContractorProject, DbProjectQuotation } from "@/types/database";
import type { DbProjectTimeline } from "@/types/database";
import {
  credentialStatusLabel,
  publicCredentialLabel,
} from "@/lib/credential-status";
import type { CredentialVerificationStatus } from "@/types/pro-connect";
import {
  PROCUREMENT_STATUS_LABELS,
  type ProcurementStatus,
} from "@/lib/procurement/state-machine";
import { resolveWorkCalendar } from "@/lib/calendars/work-calendar";
import { useLanguage } from "@/lib/i18n";

type OperationsSection = "tax" | "credentials" | "procurement" | "schedule";

const OPEN_STATUSES: ProcurementStatus[] = [
  "listed",
  "quote_requested",
  "quoted",
  "approved",
  "purchase_ordered",
];
const IN_MOTION_STATUSES: ProcurementStatus[] = ["dispatched", "in_transit"];
const NEEDS_ATTENTION_STATUSES: ProcurementStatus[] = [
  "customs_hold",
  "partial_delivery",
  "exception",
];

interface ProcurementRow {
  id: string;
  title: string;
  supplier: string | null;
  status: ProcurementStatus;
  updated_at: string;
}

interface CredentialRow {
  id: string;
  professional_body: string | null;
  credential_type: string | null;
  verification_status: CredentialVerificationStatus;
  expires_at: string | null;
}

/** A fetch failure, kept distinct from "no records exist". */
interface LoadError {
  source: "credentials" | "procurement";
  /** PostgREST error code when available (42501 = permission denied). */
  code?: string | null;
}

interface CalendarAvailability {
  status: "verified" | "missing" | "unavailable" | "no_country";
  note: string;
}

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: { label: string; to?: string; onClick?: () => void };
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden="true" className="text-muted-foreground">
            {icon}
          </span>
          {title}
        </h3>
        {action &&
          (action.to ? (
            <Link
              to={action.to}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {action.label}
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {action.label}
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </button>
          ))}
      </div>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function StatusLine({
  tone,
  children,
}: {
  tone: "neutral" | "attention" | "verified";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "attention"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "verified"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";
  return <p className={`font-medium ${toneClass}`}>{children}</p>;
}

function PermissionDeniedLine({ what }: { what: string }) {
  return (
    <>
      <StatusLine tone="attention">Permission denied for {what}</StatusLine>
      <EvidenceLine>
        Your account is not allowed to read this data. This is usually a sign-in
        or access-level matter, not a problem with the project.
      </EvidenceLine>
    </>
  );
}

function EvidenceLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

export function OperationsTab({
  project,
  quotations,
  timeline,
  onNavigateTab,
}: {
  project: DbContractorProject;
  quotations: DbProjectQuotation[];
  timeline: DbProjectTimeline[];
  onNavigateTab: (tab: "quotation" | "timeline") => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<CredentialRow[] | null>(null);
  const [procurement, setProcurement] = useState<ProcurementRow[] | null>(null);
  const [calendar, setCalendar] = useState<CalendarAvailability | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);

  // Latest quotation by version carries the current tax posture.
  const latestQuotation = useMemo(() => {
    if (quotations.length === 0) return null;
    return [...quotations].sort((a, b) => b.version - a.version)[0];
  }, [quotations]);

  // Derived primitive: the effect must not depend on the
  // location object identity, only on the recorded country.
  const siteCountryCode =
    (project.location as { country_code?: string } | null)?.country_code ??
    null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const client = supabaseClient;
        const tasks: PromiseLike<void>[] = [];

        if (user) {
          tasks.push(
            client
              .from("pro_credentials")
              .select(
                "id, professional_body, credential_type, verification_status, expires_at",
              )
              .eq("profile_id", user.id)
              .then(async ({ data, error }) => {
                if (cancelled) return;
                if (error) {
                  setCredentials(null);
                  setLoadError({
                    source: "credentials",
                    code: (error as { code?: string | null }).code ?? null,
                  });
                  return;
                }
                setCredentials((data as CredentialRow[]) ?? []);
              }),
          );
        } else {
          setCredentials(null);
        }

        tasks.push(
          client
            .from("procurement_records")
            .select("id, title, supplier, status, updated_at")
            .eq("project_ref", project.id)
            .order("updated_at", { ascending: false })
            .then(async ({ data, error }) => {
              if (cancelled) return;
              if (error) {
                setProcurement(null);
                setLoadError({
                  source: "procurement",
                  code: (error as { code?: string | null }).code ?? null,
                });
                return;
              }
              setProcurement((data as ProcurementRow[]) ?? []);
            }),
        );

        const siteCountry = siteCountryCode;
        if (siteCountry) {
          tasks.push(
            resolveWorkCalendar(siteCountry, new Date().getFullYear()).then(
              (resolution) => {
                if (cancelled) return;
                if (resolution.calendar) {
                  setCalendar({
                    status: "verified",
                    note: resolution.note,
                  });
                } else if (resolution.status === "missing") {
                  setCalendar({
                    status: "missing",
                    note: resolution.note,
                  });
                } else {
                  setCalendar({
                    status: "unavailable",
                    note: resolution.note,
                  });
                }
              },
            ),
          );
        } else {
          setCalendar({
            status: "no_country",
            note: "The site country is not recorded on this project, so no work calendar could be checked.",
          });
        }

        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, project.id, siteCountryCode]);

  const procurementGroups = useMemo(() => {
    if (!procurement) return null;
    const group = (statuses: ProcurementStatus[]) =>
      procurement.filter((r) => statuses.includes(r.status)).length;
    return {
      open: group(OPEN_STATUSES),
      inMotion: group(IN_MOTION_STATUSES),
      needsAttention: group(NEEDS_ATTENTION_STATUSES),
      delivered: procurement.filter((r) => r.status === "delivered").length,
      cancelled: procurement.filter((r) => r.status === "cancelled").length,
    };
  }, [procurement]);

  const credentialSummary = useMemo(() => {
    if (!credentials) return null;
    const now = Date.now();
    const expiringSoon = credentials.filter((c) => {
      if (!c.expires_at) return false;
      const expiry = new Date(c.expires_at).getTime();
      return expiry > now && expiry - now < 30 * 24 * 60 * 60 * 1000;
    });
    const registryVerified = credentials.filter(
      (c) =>
        publicCredentialLabel(c.verification_status) === "registry_verified",
    ).length;
    const documentReviewed = credentials.filter(
      (c) =>
        publicCredentialLabel(c.verification_status) === "document_reviewed",
    ).length;
    const pending = credentials.filter(
      (c) =>
        c.verification_status === "submitted" ||
        c.verification_status === "pending_review" ||
        c.verification_status === "pending",
    ).length;
    return {
      total: credentials.length,
      registryVerified,
      documentReviewed,
      pending,
      expiringSoon: expiringSoon.length,
    };
  }, [credentials]);

  const scheduleProgress = useMemo(() => {
    if (timeline.length === 0) return null;
    const completed = timeline.filter((p) => p.is_completed).length;
    const lastEnd = Math.max(...timeline.map((p) => p.end_day));
    return { phases: timeline.length, completed, lastEnd };
  }, [timeline]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label={t("Loading operations summary")}
        className="space-y-4"
      >
        <div className="h-24 animate-pulse rounded-xl border bg-muted" />
        <div className="h-24 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      aria-busy={loading}
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {/* ---------------- Tax status ---------------- */}
      <SectionCard
        icon={<FileText className="h-4 w-4" />}
        title={t("Tax status")}
        action={
          latestQuotation
            ? {
                label: "Open quotation",
                onClick: () => onNavigateTab("quotation"),
              }
            : undefined
        }
      >
        {!latestQuotation ? (
          <>
            <StatusLine tone="neutral">
              {t("No quotation on record")}
            </StatusLine>
            <EvidenceLine>
              Tax is applied when a quotation is generated for a market with a
              validated rule. This project has none yet.
            </EvidenceLine>
            <button
              type="button"
              onClick={() => onNavigateTab("quotation")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("Create a quotation")}
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </button>
          </>
        ) : latestQuotation.tax_source === "not_determined" ||
          !latestQuotation.tax_source ? (
          <>
            <StatusLine tone="attention">
              {t("Tax not determined on the latest quotation")}
            </StatusLine>
            <EvidenceLine>
              No tax was applied: the market has no validated tax rule. The
              quotation total excludes tax.
            </EvidenceLine>
          </>
        ) : latestQuotation.tax_source === "verified_rule" ? (
          <>
            <StatusLine tone="verified">
              Applied verified rule {latestQuotation.tax_rule_code ?? ""}
              {latestQuotation.tax_percentage != null
                ? ` (${latestQuotation.tax_percentage}%)`
                : ""}
            </StatusLine>
            <EvidenceLine>
              {latestQuotation.tax_citation_title
                ? `Source: ${latestQuotation.tax_citation_title}${
                    latestQuotation.tax_citation_publisher
                      ? ` — ${latestQuotation.tax_citation_publisher}`
                      : ""
                  }.`
                : "Rule citation recorded on the quotation."}
              {latestQuotation.tax_validation_state === "validated"
                ? " Rule validated by an accountable reviewer."
                : latestQuotation.tax_validation_state
                  ? ` Validation state: ${latestQuotation.tax_validation_state}.`
                  : ""}
            </EvidenceLine>
          </>
        ) : (
          <>
            <StatusLine tone="attention">
              Applied a manual tax assumption
              {latestQuotation.tax_percentage != null
                ? ` (${latestQuotation.tax_percentage}%)`
                : ""}
            </StatusLine>
            <EvidenceLine>
              {latestQuotation.tax_citation_title
                ? `Assumption: ${latestQuotation.tax_citation_title}.`
                : "No citation recorded for this assumption."}
              {" A manual assumption is not a validated rule."}
            </EvidenceLine>
          </>
        )}
      </SectionCard>

      {/* ---------------- Workforce credentials ---------------- */}
      <SectionCard
        icon={<ShieldCheck className="h-4 w-4" />}
        title={t("Workforce credentials")}
        action={{ label: "Manage", to: "/pro-connect/dashboard" }}
      >
        {loadError?.source === "credentials" && loadError.code === "42501" ? (
          <PermissionDeniedLine what="saved credentials" />
        ) : !credentialSummary ? (
          <>
            <StatusLine tone="neutral">
              {t("Credentials unavailable")}
            </StatusLine>
            <EvidenceLine>
              Your saved credentials could not be loaded. They may require sign
              in, or the service is unavailable right now.
            </EvidenceLine>
          </>
        ) : credentialSummary.total === 0 ? (
          <>
            <StatusLine tone="neutral">
              {t("No credentials on file")}
            </StatusLine>
            <EvidenceLine>
              You have not submitted any professional credentials. Clients see
              credential status on your public profile only after submission.
            </EvidenceLine>
          </>
        ) : (
          <>
            <StatusLine tone="neutral">
              {credentialSummary.registryVerified} registry verified,{" "}
              {credentialSummary.documentReviewed} document reviewed
            </StatusLine>
            {credentialSummary.pending > 0 && (
              <EvidenceLine>
                {credentialSummary.pending}{" "}
                {credentialSummary.pending === 1
                  ? "credential is"
                  : "credentials are"}{" "}
                awaiting review.
              </EvidenceLine>
            )}
            {credentialSummary.expiringSoon > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                {credentialSummary.expiringSoon}{" "}
                {credentialSummary.expiringSoon === 1 ? "expires" : "expire"}{" "}
                within 30 days
              </p>
            )}
            <EvidenceLine>
              Registry verified means checked against the issuing source.
              Document reviewed means a FRELUX reviewer examined your document;
              it is a weaker assurance and is labeled as such.
            </EvidenceLine>
          </>
        )}
      </SectionCard>

      {/* ---------------- Procurement / shipment ---------------- */}
      <SectionCard
        icon={<Truck className="h-4 w-4" />}
        title={t("Procurement and shipments")}
        action={{ label: "Open logistics board", to: "/contractor/logistics" }}
      >
        {loadError?.source === "procurement" && loadError.code === "42501" ? (
          <PermissionDeniedLine what="procurement records" />
        ) : !procurementGroups ? (
          <>
            <StatusLine tone="neutral">
              {t("Procurement data unavailable")}
            </StatusLine>
            <EvidenceLine>
              {t("Linked procurement records could not be loaded right now.")}
            </EvidenceLine>
          </>
        ) : procurement && procurement.length === 0 ? (
          <>
            <StatusLine tone="neutral">
              {t("No procurement records linked to this project")}
            </StatusLine>
            <EvidenceLine>
              Records you link to this project appear here with their auditable
              status. Unlinked records stay on the logistics board.
            </EvidenceLine>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-xs text-muted-foreground">{t("Open")}</p>
                <p className="text-lg font-semibold">
                  {procurementGroups.open}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-xs text-muted-foreground">
                  {t("In motion")}
                </p>
                <p className="text-lg font-semibold">
                  {procurementGroups.inMotion}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-xs text-muted-foreground">
                  {t("Needs attention")}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    procurementGroups.needsAttention > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
                  }`}
                >
                  {procurementGroups.needsAttention}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-xs text-muted-foreground">
                  {t("Delivered")}
                </p>
                <p className="text-lg font-semibold">
                  {procurementGroups.delivered}
                </p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {(procurement ?? []).slice(0, 3).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-foreground">
                    {r.title}
                    {r.supplier ? ` — ${r.supplier}` : ""}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {PROCUREMENT_STATUS_LABELS[r.status]}
                  </span>
                </li>
              ))}
            </ul>
            {procurementGroups.needsAttention > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                {procurementGroups.needsAttention}{" "}
                {procurementGroups.needsAttention === 1
                  ? "record needs"
                  : "records need"}{" "}
                attention
              </p>
            )}
            <EvidenceLine>
              Statuses change only through the auditable trail on the logistics
              board.
            </EvidenceLine>
          </>
        )}
      </SectionCard>

      {/* ---------------- Schedule impact ---------------- */}
      <SectionCard
        icon={<CalendarDays className="h-4 w-4" />}
        title={t("Schedule")}
        action={
          scheduleProgress
            ? {
                label: "Open timeline",
                onClick: () => onNavigateTab("timeline"),
              }
            : undefined
        }
      >
        {!calendar ? (
          <>
            <StatusLine tone="neutral">
              {t("Calendar status unavailable")}
            </StatusLine>
            <EvidenceLine>
              {t("The site calendar could not be checked right now.")}
            </EvidenceLine>
          </>
        ) : calendar.status === "no_country" ? (
          <>
            <StatusLine tone="attention">
              {t("Calendar-verified scheduling unavailable")}
            </StatusLine>
            <EvidenceLine>{calendar.note}</EvidenceLine>
          </>
        ) : calendar.status === "verified" ? (
          <>
            <StatusLine tone="verified">
              {t("Verified work calendar covers the site country")}
            </StatusLine>
            {scheduleProgress ? (
              <EvidenceLine>
                {scheduleProgress.completed} of {scheduleProgress.phases} phases
                complete. The template plan runs to about{" "}
                {scheduleProgress.lastEnd} working day
                {scheduleProgress.lastEnd === 1 ? "" : "s"} from project start.
                It is a planning estimate; phase dates are not
                calendar-scheduled.
              </EvidenceLine>
            ) : (
              <EvidenceLine>
                No timeline phases generated yet. Calendar-verified scheduling
                applies once a timeline exists.
              </EvidenceLine>
            )}
          </>
        ) : (
          <>
            <StatusLine tone="attention">
              {t("No verified work calendar for the site country")}
            </StatusLine>
            <EvidenceLine>
              {calendar.note} Timeline planning continues as a day-offset
              estimate without calendar verification.
            </EvidenceLine>
          </>
        )}
        {calendar?.status === "no_country" && (
          <button
            type="button"
            onClick={() => onNavigateTab("timeline")}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("Review project details")}
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </button>
        )}
      </SectionCard>
    </div>
  );
}
