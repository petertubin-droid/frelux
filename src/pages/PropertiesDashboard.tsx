/**
 * FRELUX PROPERTY INTELLIGENCE — DASHBOARD
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
import {
  evaluatePropertyRisks,
  PROPERTY_RISK_LABELS,
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

// =========================================================
// Page
// =========================================================

export default function PropertiesDashboard() {
  useSeo({
    title: "Property Intelligence — FRELUX",
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

  // =========================================================
  // Gates
  // =========================================================

  if (!state.authChecked || state.loadState === "loading") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!state.userId) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border bg-card p-8 text-center">
          <Landmark className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h1 className="mt-4 font-heading text-2xl font-bold">Property Intelligence</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to create and manage your property profiles, view risk flags and
            track data confidence.
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
          <h1 className="mt-4 font-heading text-xl font-bold">Could not load properties</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.loadError}</p>
          <Button className="mt-6" onClick={() => state.userId && refresh(state.userId)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const selected =
    state.properties.find((p) => p.id === selectedId) ?? state.properties[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            Property Intelligence
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Property profiles, risk flags and data confidence. Facts are never
            mixed with estimates.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setActionError("");
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add property
        </Button>
      </header>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}

      {state.properties.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-card p-8 text-center sm:p-12">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-heading text-lg font-semibold">No properties yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add a property to record its location, building information and documents.
            FRELUX analyses what you provide and clearly marks anything missing —
            nothing is assumed.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add your first property
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.properties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              aria-pressed={selected?.id === p.id}
              className={`rounded-lg border bg-card p-5 text-left transition-colors ${
                selected?.id === p.id
                  ? "border-primary ring-1 ring-ring"
                  : "hover:border-foreground/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-heading text-base font-semibold">
                  {p.name ?? "Unnamed property"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {locationSummary(p) || "No location recorded"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.propertyType && (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}
                  </span>
                )}
                {p.constructionStatus && (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {p.constructionStatus.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </button>
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
// Helpers
// =========================================================

function locationSummary(p: PropertyProfile): string {
  const parts = [p.location.city, p.location.region, p.location.country].filter(
    (x) => Boolean(x) && String(x).length > 0,
  ) as string[];
  return parts.join(", ");
}

function riskIcon(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return AlertTriangle;
  if (severity === "warning") return AlertTriangle;
  return Info;
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
  const flags = useMemo(
    () =>
      evaluatePropertyRisks({
        profile,
      }),
    [profile],
  );
  const criticalCount = flags.filter((f) => f.severity === "critical").length;
  const warningCount = flags.filter((f) => f.severity === "warning").length;

  return (
    <section
      aria-label="Property details"
      className="mt-8 space-y-6"
    >
      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">
            {profile.name ?? "Unnamed property"}
          </h2>
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
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {new Date(profile.updatedAt).toLocaleDateString()}
        </p>

        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <DetailRow
            icon={MapPin}
            label="Location"
            value={
              profile.location.address
                ? `${profile.location.address}${locationSummary(profile) ? ` — ${locationSummary(profile)}` : ""}`
                : locationSummary(profile) || "No location recorded"
            }
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
            icon={Landmark}
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

      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <h3 className="font-heading text-base font-semibold">Data confidence</h3>
        {profile.provenance ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
              {DATA_CLASS_LABELS[provenanceClass(profile.provenance)] ??
                profile.provenance.verificationStatus}
            </span>
            <span className="text-muted-foreground">
              Source: {profile.provenance.source}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Profile information is entered by you and treated as user-provided data.
            AI-extracted or third-party values will carry their own source and
            confidence when they are added.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <h3 className="font-heading text-base font-semibold">
          Review flags
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {criticalCount} critical · {warningCount} warnings
          </span>
        </h3>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No open flags. Everything recorded for this property has been verified.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {flags.map((flag) => {
              const Icon = riskIcon(flag.severity);
              return (
                <li key={flag.code} className="flex gap-3">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      flag.severity === "critical"
                        ? "text-destructive"
                        : flag.severity === "warning"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">{flag.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {flag.reason}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <h3 className="font-heading text-base font-semibold">Investment analysis</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No market-data provider is connected yet. FRELUX does not estimate rental
          yields, property values or development margins without real regional data —
          these panels activate automatically once a verified source is available.
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
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
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

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
    // persists them as NULL — otherwise old values would silently survive.
    const input: Partial<PropertyProfile> = {
      name: form.name.trim(),
      location: {
        address: form.address.trim(),
        country: form.country.trim().toUpperCase(),
        region: form.region.trim(),
        city: form.city.trim(),
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
    const ok = await onSave(input);
    setSaving(false);
  };

  const field = "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const label = "block text-xs font-medium text-muted-foreground";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit property" : "Add property"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg border bg-card p-5 sm:rounded-lg sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">
            {initial ? "Edit property" : "Add property"}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={label} htmlFor="p-name">Property name</label>
            <input id="p-name" className={field} value={form.name} onChange={set("name")} placeholder="e.g. Ikeja duplex" />
          </div>
          <div>
            <label className={label} htmlFor="p-address">Address</label>
            <input id="p-address" className={field} value={form.address} onChange={set("address")} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-country">Country code</label>
              <input id="p-country" className={field} value={form.country} onChange={set("country")} placeholder="NG" maxLength={2} aria-invalid={Boolean(errors.country)} />
              {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country}</p>}
            </div>
            <div>
              <label className={label} htmlFor="p-city">City</label>
              <input id="p-city" className={field} value={form.city} onChange={set("city")} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="p-region">State / region</label>
            <input id="p-region" className={field} value={form.region} onChange={set("region")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-type">Property type</label>
              <select id="p-type" className={field} value={form.propertyType} onChange={set("propertyType")}>
                <option value="">Not set</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="p-floors">Floors</label>
              <input id="p-floors" inputMode="numeric" className={field} value={form.numberOfFloors} onChange={set("numberOfFloors")} aria-invalid={Boolean(errors.numberOfFloors)} />
              {errors.numberOfFloors && <p className="mt-1 text-xs text-destructive">{errors.numberOfFloors}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="p-land">Land size</label>
              <input id="p-land" inputMode="decimal" className={field} value={form.landSize} onChange={set("landSize")} aria-invalid={Boolean(errors.landSize)} />
              {errors.landSize && <p className="mt-1 text-xs text-destructive">{errors.landSize}</p>}
            </div>
            <div>
              <label className={label} htmlFor="p-unit">Unit</label>
              <select id="p-unit" className={field} value={form.landUnit} onChange={set("landUnit")}>
                {LAND_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="p-status">Construction status</label>
            <select id="p-status" className={field} value={form.constructionStatus} onChange={set("constructionStatus")}>
              <option value="">Not set</option>
              {CONSTRUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
