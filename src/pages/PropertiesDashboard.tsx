/**
 * FRELUX PROPERTY INTELLIGENCE, DASHBOARD
 *
 * Prompt 4, Phase 14: mobile-first property dashboard.
 * Lists, creates and edits the user's property profiles, surfaces
 * evidence-based risk flags and data-confidence states. No market data
 * is invented: investment panels show explicit insufficient-data
 * states until a provider is connected.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import {
  listProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  type QueryOutcome,
} from "@/lib/property-intelligence/queries";
import LocationCard from "@/components/location/LocationCard";
import {
  locationFromPropertyRow,
  hasValidCoordinates,
  type FreluxLocation,
} from "@/lib/location-intelligence";
import {
  evaluatePropertyRisks,
  PROPERTY_TYPE_LABELS,
  DATA_CLASS_LABELS,
  provenanceClass,
  type PropertyProfile,
  type PropertyType,
  type ConstructionStatus,
} from "@/lib/property-intelligence";
import {
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Info,
  Landmark,
  FileText,
  Layers,
  Globe2,
  Ruler,
  ShieldCheck,
  TrendingUp,
  Home,
  Warehouse,
  Trees,
  Briefcase,
} from "lucide-react";

// =========================================================
// Page state
// =========================================================

type LoadState = "loading" | "ready" | "error";

interface DashboardState {
  authChecked: boolean;
  userId: string | null;
  properties: PropertyProfile[];
  loadState: LoadState;
  loadError: string;
}

function makeProvenance() {
  return {
    source: "User input",
    sourceType: "user" as const,
    verificationStatus: "verified" as const,
    collectedAt: new Date().toISOString(),
  };
}

const CONSTRUCTION_STATUSES: ConstructionStatus[] = [
  "planned",
  "under_construction",
  "completed",
  "renovating",
  "derelict",
  "unknown",
];

const STATUS_STYLES: Record<ConstructionStatus, string> = {
  planned: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  under_construction:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  renovating:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  derelict: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  unknown: "bg-muted text-muted-foreground",
};

const PROPERTY_TYPE_ICONS: Record<PropertyType, typeof Home> = {
  detached: Home,
  semi_detached: Building2,
  terraced: Building2,
  apartment: Layers,
  duplex: Building2,
  bungalow: Home,
  commercial: Briefcase,
  land: Trees,
  other: Warehouse,
};

// =========================================================
// Page
// =========================================================

export default function PropertiesDashboard() {
  useSeo({
    title: "Property Intelligence, FRELUX",
    description:
      "Manage your property profiles: location, building information, documents, risk flags and data confidence.",
    canonicalPath: "/properties",
    noIndex: true, // private user dashboard, not a public marketing page
  });

  const [state, setState] = useState<DashboardState>({
    authChecked: false,
    userId: null,
    properties: [],
    loadState: "loading",
    loadError: "",
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const refresh = useCallback(async (userId: string) => {
    const outcome = await listProperties(userId);
    if (outcome.ok) {
      setState((s) => ({
        ...s,
        properties: outcome.data,
        loadState: "ready",
        loadError: "",
      }));
    } else {
      setState((s) => ({ ...s, loadState: "error", loadError: outcome.error }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (cancelled) return;
        if (!user) {
          setState((s) => ({
            ...s,
            authChecked: true,
            userId: null,
            loadState: "ready",
          }));
          return;
        }
        setState((s) => ({ ...s, authChecked: true, userId: user.id }));
        await refresh(user.id);
      })
      .catch(() => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            authChecked: true,
            loadState: "error",
            loadError: "Could not verify your session. Please refresh the page.",
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleSaved = useCallback(
    async (outcome: QueryOutcome<PropertyProfile>) => {
      if (!outcome.ok) {
        setActionError(outcome.error);
        return false;
      }
      setActionError("");
      setEditorOpen(false);
      setEditing(null);
      if (state.userId) await refresh(state.userId);
      setSelectedId(outcome.data.id);
      return true;
    },
    [refresh, state.userId],
  );

  const handleDelete = useCallback(
    async (propertyId: string) => {
      if (!state.userId) return;
      if (!window.confirm("Delete this property profile? This cannot be undone.")) return;
      const outcome = await deleteProperty(state.userId, propertyId);
      if (!outcome.ok) {
        setActionError(outcome.error);
        return;
      }
      setActionError("");
      if (selectedId === propertyId) setSelectedId(null);
      await refresh(state.userId);
    },
    [refresh, selectedId, state.userId],
  );

  const openCreate = () => {
    setEditing(null);
    setActionError("");
    setEditorOpen(true);
  };

  // =========================================================
  // Gates
  // =========================================================

  if (!state.authChecked || state.loadState === "loading") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border/40 bg-muted/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!state.userId) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center shadow-premium sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <Landmark className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold">
            Property Intelligence
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Sign in to create and manage your property profiles, view risk flags
            and track data confidence.
          </p>
          <Button asChild className="mt-6">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state.loadState === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-premium sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <h1 className="mt-5 font-heading text-xl font-bold">
            Could not load properties
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {state.loadError}
          </p>
          <Button className="mt-6" onClick={() => state.userId && refresh(state.userId)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const selected =
    state.properties.find((p) => p.id === selectedId) ?? state.properties[0] ?? null;

  const totalCritical = state.properties.reduce(
    (n, p) =>
      n +
      evaluatePropertyRisks({ profile: p }).filter((f) => f.severity === "critical")
        .length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* ---------- Header ---------- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            FRELUX Intelligence
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">
            Property Portfolio
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Property profiles, risk flags and data confidence. Facts are never
            mixed with estimates.
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-premium">
          <Plus className="h-4 w-4" aria-hidden />
          Add property
        </Button>
      </header>

      {/* ---------- Stat row ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Properties"
          value={state.properties.length.toLocaleString()}
          hint="Saved profiles"
          icon={Building2}
        />
        <StatTile
          label="Critical flags"
          value={totalCritical.toLocaleString()}
          hint="Need your attention"
          icon={AlertTriangle}
          emphasize={totalCritical > 0}
        />
        <StatTile
          label="Data sources"
          value={new Set(
            state.properties.flatMap((p) => [p.provenance?.source ?? "User input"]),
          ).size.toLocaleString()}
          hint="Distinct provenance"
          icon={ShieldCheck}
        />
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}

      {/* ---------- List / empty ---------- */}
      {state.properties.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-8 text-center shadow-premium sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-lg font-semibold">
            No properties yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Add a property to record its location, building information and
            documents. FRELUX analyses what you provide and clearly marks
            anything missing, nothing is assumed.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add your first property
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.properties.map((p) => (
            <PropertyCard
              key={p.id}
              profile={p}
              active={selected?.id === p.id}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <PropertyDetail
          profile={selected}
          onEdit={() => {
            setEditing(selected);
            setEditorOpen(true);
          }}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {editorOpen && (
        <PropertyEditor
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSave={async (input) => {
            if (editing) {
              return handleSaved(
                await updateProperty(state.userId!, editing.id, input),
              );
            }
            return handleSaved(await createProperty(state.userId!, input));
          }}
        />
      )}
    </div>
  );
}

// =========================================================
// Presentational pieces
// =========================================================

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Building2;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 shadow-premium sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon
          className={`h-4 w-4 ${emphasize ? "text-destructive" : "text-muted-foreground"}`}
          aria-hidden
        />
      </div>
      <p
        className={`mt-2 font-heading text-2xl font-bold tabular-nums ${
          emphasize ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function locationSummary(p: PropertyProfile): string {
  const parts = [p.location.city, p.location.region, p.location.country].filter(
    (x) => Boolean(x) && String(x).length > 0,
  ) as string[];
  return parts.join(", ");
}

function PropertyCard({
  profile,
  active,
  onSelect,
}: {
  profile: PropertyProfile;
  active: boolean;
  onSelect: () => void;
}) {
  const TypeIcon = PROPERTY_TYPE_ICONS[profile.propertyType ?? "other"] ?? Warehouse;
  const critical = evaluatePropertyRisks({ profile }).filter(
    (f) => f.severity === "critical",
  ).length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group rounded-2xl border bg-card p-5 text-left shadow-premium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium-lg ${
        active ? "border-primary/60 ring-1 ring-primary/30" : "border-border/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <TypeIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-heading text-base font-semibold">
              {profile.name ?? "Unnamed property"}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {locationSummary(profile) || "No location recorded"}
              </span>
            </span>
          </div>
        </div>
        {critical > 0 && (
          <span
            title={`${critical} critical flag${critical > 1 ? "s" : ""}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {profile.propertyType && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {PROPERTY_TYPE_LABELS[profile.propertyType] ?? profile.propertyType}
          </span>
        )}
        {profile.constructionStatus && (
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[profile.constructionStatus]}`}
          >
            {profile.constructionStatus.replace(/_/g, " ")}
          </span>
        )}
        {profile.land?.size !== undefined && profile.land?.unit && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {profile.land.size.toLocaleString()} {profile.land.unit}
          </span>
        )}
      </div>
    </button>
  );
}

// =========================================================
// Detail panel
// =========================================================

function PropertyDetail({
  profile,
  onEdit,
  onDelete,
}: {
  profile: PropertyProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const flags = useMemo(() => evaluatePropertyRisks({ profile }), [profile]);
  const criticalCount = flags.filter((f) => f.severity === "critical").length;
  const warningCount = flags.filter((f) => f.severity === "warning").length;

  return (
    <section aria-label="Property details" className="mt-8 space-y-5">
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-premium sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold sm:text-2xl">
              {profile.name ?? "Unnamed property"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {new Date(profile.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow
            icon={MapPin}
            label="Location"
            value={
              profile.location.address
                ? `${profile.location.address}${locationSummary(profile) ? `, ${locationSummary(profile)}` : ""}`
                : locationSummary(profile) || "No location recorded"
            }
          />
          <DetailRow
            icon={Globe2}
            label="Country"
            value={profile.location.country ?? "Requires confirmation"}
          />
          <DetailRow
            icon={Building2}
            label="Property type"
            value={
              profile.propertyType
                ? PROPERTY_TYPE_LABELS[profile.propertyType] ?? profile.propertyType
                : "Not provided"
            }
          />
          <DetailRow
            icon={Layers}
            label="Floors"
            value={
              profile.numberOfFloors !== undefined
                ? String(profile.numberOfFloors)
                : "Not provided"
            }
          />
          <DetailRow
            icon={Ruler}
            label="Land"
            value={
              profile.land?.size !== undefined && profile.land?.unit
                ? `${profile.land.size.toLocaleString()} ${profile.land.unit}`
                : "Not provided"
            }
          />
          <DetailRow
            icon={FileText}
            label="Documents"
            value={
              profile.documents && profile.documents.length > 0
                ? `${profile.documents.length} attached`
                : "None attached"
            }
          />
          <DetailRow
            icon={Building2}
            label="Construction project"
            value={
              profile.constructionProjectId ? (
                <Link
                  to={`/dashboard/projects/${profile.constructionProjectId}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Linked project
                </Link>
              ) : (
                "Not linked"
              )
            }
          />
        </dl>
      </div>

      {/* Data confidence */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-premium sm:p-7">
        <h3 className="font-heading text-base font-semibold">Data confidence</h3>
        {profile.provenance ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
              {DATA_CLASS_LABELS[provenanceClass(profile.provenance)] ??
                profile.provenance.verificationStatus}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Source: {profile.provenance.source}
            </span>
          </div>
        ) : (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Profile information is entered by you and treated as user-provided
            data. AI-extracted or third-party values will carry their own source
            and confidence when they are added.
          </p>
        )}
      </div>

      {/* Review flags */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-premium sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-base font-semibold">Review flags</h3>
          <div className="flex gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {warningCount} warnings
              </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                All clear
              </span>
            )}
          </div>
        </div>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No open flags. Everything recorded for this property has been
            verified.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {flags.map((flag) => {
              const isCritical = flag.severity === "critical";
              const isWarning = flag.severity === "warning";
              return (
                <li
                  key={flag.code}
                  className={`rounded-lg border-l-2 bg-muted/40 px-4 py-3 ${
                    isCritical
                      ? "border-l-destructive"
                      : isWarning
                        ? "border-l-amber-500"
                        : "border-l-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCritical || isWarning ? (
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 ${
                          isCritical ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                        }`}
                        aria-hidden
                      />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <p className="text-sm font-medium">{flag.title}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs leading-relaxed text-muted-foreground">
                    {flag.reason}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Investment analysis */}
      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-5 sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          </span>
          <h3 className="font-heading text-base font-semibold">
            Investment analysis
          </h3>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          No market-data provider is connected yet. FRELUX does not estimate
          rental yields, property values or development margins without real
          regional data, these panels activate automatically once a verified
          source is available.
        </p>
      </div>
    </section>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm">{value}</dd>
      </div>
    </div>
  );
}

// =========================================================
// Editor (create & edit)
// =========================================================

interface EditorInput {
  name?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  propertyType?: PropertyType;
  numberOfFloors?: number;
  land?: { size: number; unit: string };
  constructionStatus?: ConstructionStatus;
}

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
const LAND_UNITS = ["m²", "sq ft", "hectares", "acres", "plots"];

function PropertyEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: PropertyProfile | null;
  onClose: () => void;
  onSave: (input: Partial<PropertyProfile>) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    address: initial?.location.address ?? "",
    country: initial?.location.country ?? "",
    region: initial?.location.region ?? "",
    city: initial?.location.city ?? "",
    propertyType: initial?.propertyType ?? "",
    numberOfFloors:
      initial?.numberOfFloors !== undefined ? String(initial.numberOfFloors) : "",
    landSize: initial?.land?.size !== undefined ? String(initial.land.size) : "",
    landUnit: initial?.land?.unit ?? "m²",
    constructionStatus: initial?.constructionStatus ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Canonical location staged by LocationCard (GPS / search / manual).
  // Persists with the property only on submit, one canonical record,
  // the text fields below are just its editable projection.
  const [capturedLocation, setCapturedLocation] = useState<FreluxLocation | null>(
    // Hydrate from the existing properties row (reload persistence) :
    // only when the row actually carries some location data.
    initial &&
      (initial.location.coordinates ||
        initial.location.country ||
        initial.location.city ||
        initial.location.address ||
        initial.location.region)
      ? locationFromPropertyRow({
          lat: initial.location.coordinates?.lat ?? null,
          lng: initial.location.coordinates?.lng ?? null,
          address: initial.location.address ?? null,
          country: initial.location.country ?? null,
          region: initial.location.region ?? null,
          city: initial.location.city ?? null,
          district: initial.location.district ?? null,
        })
      : null,
  );

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Card -> form: the canonical record fills the editable text fields.
  // The user can still adjust them; coordinates ride along on submit.
  const handleStagedLocation = (loc: FreluxLocation | null) => {
    setCapturedLocation(loc);
    if (loc) {
      setForm((f) => ({
        ...f,
        country: loc.country_code ?? loc.country ?? f.country,
        city: loc.city ?? f.city,
        region: loc.region ?? f.region,
        address: loc.formatted_address ?? f.address,
      }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.country && !/^[A-Za-z]{2}$/.test(form.country.trim()))
      errs.country = "Use the two-letter country code, e.g. NG or GB.";
    const floors = form.numberOfFloors.trim();
    if (floors && (!Number.isInteger(Number(floors)) || Number(floors) <= 0))
      errs.numberOfFloors = "Floors must be a whole number greater than zero.";
    const size = form.landSize.trim();
    if (size && Number(size) <= 0) errs.landSize = "Land size must be greater than zero.";
    if (size && !Number.isFinite(Number(size)))
      errs.landSize = "Enter a valid number.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Cleared fields are sent as explicit empties ("", 0) so the mapper
    // persists them as NULL, otherwise old values would silently survive.
    const input: Partial<PropertyProfile> = {
      name: form.name.trim(),
      location: {
        address: form.address.trim(),
        country: form.country.trim().toUpperCase(),
        region: form.region.trim(),
        city: form.city.trim(),
        // Coordinates flow from the canonical captured record (GPS/search);
        // manual-only entries simply have none. Never guessed.
        coordinates:
          capturedLocation && hasValidCoordinates(capturedLocation)
            ? {
                lat: capturedLocation.latitude!,
                lng: capturedLocation.longitude!,
              }
            : initial?.location.coordinates,
        provenance: makeProvenance(),
      },
      propertyType: form.propertyType as PropertyType, // "" clears in the mapper
      numberOfFloors: floors ? Number(floors) : 0, // 0 clears in the mapper
      land: size ? { size: Number(size), unit: form.landUnit } : { size: 0, unit: "" },
      constructionStatus: form.constructionStatus as ConstructionStatus,
      provenance: {
        source: "User input",
        sourceType: "user",
        verificationStatus: "verified",
        collectedAt: new Date().toISOString(),
      },
    };
    setSaving(true);
    await onSave(input);
    setSaving(false);
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
  const label = "block text-xs font-medium text-muted-foreground";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit property" : "Add property"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border/40 bg-card shadow-premium-lg sm:rounded-2xl sm:p-6"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border/40 bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
          <h2 className="font-heading text-lg font-semibold">
            {initial ? "Edit property" : "Add property"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Identity
          </p>
          <div>
            <label className={label} htmlFor="p-name">
              Property name
            </label>
            <input
              id="p-name"
              className={field}
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Ikeja duplex"
            />
          </div>
          <div>
            <label className={label} htmlFor="p-address">
              Address
            </label>
            <input
              id="p-address"
              className={field}
              value={form.address}
              onChange={set("address")}
              placeholder="Street address"
            />
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Location
          </p>
          <LocationCard
            compact
            initialLocation={capturedLocation}
            onLocationChange={handleStagedLocation}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-country">
                Country code
              </label>
              <input
                id="p-country"
                className={`${field} uppercase`}
                value={form.country}
                onChange={set("country")}
                placeholder="NG"
                maxLength={2}
                aria-invalid={Boolean(errors.country)}
              />
              {errors.country && (
                <p className="mt-1 text-xs text-destructive">{errors.country}</p>
              )}
            </div>
            <div>
              <label className={label} htmlFor="p-city">
                City
              </label>
              <input
                id="p-city"
                className={field}
                value={form.city}
                onChange={set("city")}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="p-region">
              State / region
            </label>
            <input
              id="p-region"
              className={field}
              value={form.region}
              onChange={set("region")}
            />
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Building &amp; land
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-type">
                Property type
              </label>
              <select
                id="p-type"
                className={field}
                value={form.propertyType}
                onChange={set("propertyType")}
              >
                <option value="">Not set</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="p-floors">
                Floors
              </label>
              <input
                id="p-floors"
                inputMode="numeric"
                className={field}
                value={form.numberOfFloors}
                onChange={set("numberOfFloors")}
                aria-invalid={Boolean(errors.numberOfFloors)}
              />
              {errors.numberOfFloors && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.numberOfFloors}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-land">
                Land size
              </label>
              <input
                id="p-land"
                inputMode="decimal"
                className={field}
                value={form.landSize}
                onChange={set("landSize")}
                aria-invalid={Boolean(errors.landSize)}
              />
              {errors.landSize && (
                <p className="mt-1 text-xs text-destructive">{errors.landSize}</p>
              )}
            </div>
            <div>
              <label className={label} htmlFor="p-unit">
                Unit
              </label>
              <select
                id="p-unit"
                className={field}
                value={form.landUnit}
                onChange={set("landUnit")}
              >
                {LAND_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="p-status">
              Construction status
            </label>
            <select
              id="p-status"
              className={field}
              value={form.constructionStatus}
              onChange={set("constructionStatus")}
            >
              <option value="">Not set</option>
              {CONSTRUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/40 p-5 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add property"}
          </Button>
        </div>
      </form>
    </div>
  );
}
