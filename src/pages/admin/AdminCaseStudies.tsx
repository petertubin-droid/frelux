import { useState, useEffect, useCallback } from "react";
import { Loader2, Save, Trash2, Globe2, EyeOff } from "lucide-react";
import {
  fetchAdminCaseStudyRows,
  upsertCaseStudy,
  setCaseStudyPublished,
  deleteCaseStudy,
  type CaseStudyAdminRow,
} from "@/lib/case-studies";
import type { DbCaseStudy } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { CATEGORY_LABELS } from "@/lib/case-study-labels";

// Admin: curate before/after case studies from approved gallery
// entries (workspace item 9). One case study per gallery entry;
// the form edits or creates it with an upsert on gallery_entry_id.

export default function AdminCaseStudies() {
  const [rows, setRows] = useState<CaseStudyAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminCaseStudyRows());
    } catch (_e) {
      setError(
        "Failed to load gallery entries. Only approved or featured entries can carry a case study.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(input: Parameters<typeof upsertCaseStudy>[0]) {
    setSavingEntryId(input.gallery_entry_id);
    setError("");
    try {
      await upsertCaseStudy(input);
      await load();
      setSelectedId(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save the case study.",
      );
    } finally {
      setSavingEntryId(null);
    }
  }

  async function handleTogglePublish(cs: DbCaseStudy) {
    setError("");
    try {
      await setCaseStudyPublished(cs.id, !cs.is_published);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to update publish state.",
      );
    }
  }

  async function handleDelete(cs: DbCaseStudy) {
    if (!confirm("Delete this case study? The gallery entry is kept.")) return;
    setError("");
    try {
      await deleteCaseStudy(cs.id);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to delete the case study.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Case Studies</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Build editorial before/after case studies on top of approved gallery
        entries. Publishing requires the entry to stay approved and public.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-6 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No approved or featured gallery entries yet. Approve entries in{" "}
            <a
              href="/admin/gallery-moderation"
              className="font-medium text-brand-purple hover:underline"
            >
              Gallery Moderation
            </a>{" "}
            first, then create case studies here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <CaseStudyRow
              key={row.entry.id}
              row={row}
              expanded={selectedId === row.entry.id}
              saving={savingEntryId === row.entry.id}
              onToggle={() =>
                setSelectedId(selectedId === row.entry.id ? null : row.entry.id)
              }
              onSave={handleSave}
              onTogglePublish={() =>
                row.caseStudy && handleTogglePublish(row.caseStudy)
              }
              onDelete={() => row.caseStudy && handleDelete(row.caseStudy)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseStudyRow({
  row,
  expanded,
  saving,
  onToggle,
  onSave,
  onTogglePublish,
  onDelete,
}: {
  row: CaseStudyAdminRow;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: (input: Parameters<typeof upsertCaseStudy>[0]) => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const { caseStudy, entry, images } = row;
  const before = images.find((i) => i.image_type === "before");
  const after = images.find((i) => i.image_type === "after");

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex gap-2">
          <Thumb
            src={before?.image_url}
            label="B"
            alt={`Before: ${entry.title}`}
          />
          <Thumb
            src={after?.image_url}
            label="A"
            alt={`After: ${entry.title}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[entry.project_category] ?? entry.project_category}
            {entry.location ? ` • ${entry.location}` : ""}
            {caseStudy ? " • case study saved" : " • no case study yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {caseStudy && (
            <>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${caseStudy.is_published ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"}`}
              >
                {caseStudy.is_published ? "Published" : "Draft"}
              </span>
              <Button
                variant="outline"
                onClick={onTogglePublish}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium"
              >
                {caseStudy.is_published ? (
                  <>
                    <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                    Unpublish
                  </>
                ) : (
                  <>
                    <Globe2 aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                    Publish
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onDelete}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
          <Button
            onClick={onToggle}
            className="rounded-lg px-3 py-1 text-xs font-medium"
          >
            {expanded
              ? "Close"
              : caseStudy
                ? "Edit case study"
                : "Write case study"}
          </Button>
        </div>
      </div>

      {expanded && (
        <CaseStudyForm
          row={row}
          saving={saving}
          onCancel={onToggle}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function Thumb({
  src,
  label,
  alt,
}: {
  src?: string;
  label: string;
  alt: string;
}) {
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
          {label}
        </div>
      )}
      <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[9px] font-bold uppercase text-white">
        {label}
      </span>
    </div>
  );
}

function CaseStudyForm({
  row,
  saving,
  onCancel,
  onSave,
}: {
  row: CaseStudyAdminRow;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: Parameters<typeof upsertCaseStudy>[0]) => void;
}) {
  const cs = row.caseStudy;
  const [headline, setHeadline] = useState(
    cs?.headline ?? `${row.entry.title}: Before & After`,
  );
  const [summary, setSummary] = useState(cs?.summary ?? "");
  const [scope, setScope] = useState(cs?.project_scope ?? "");
  const [challenges, setChallenges] = useState(cs?.challenges ?? "");
  const [outcome, setOutcome] = useState(cs?.outcome ?? "");
  const [materials, setMaterials] = useState(
    (cs?.materials_used ?? []).join(", "),
  );
  const [duration, setDuration] = useState(cs?.project_duration ?? "");
  const [budget, setBudget] = useState(
    cs?.budget !== null && cs?.budget !== undefined ? String(cs.budget) : "",
  );
  const [published, setPublished] = useState(cs?.is_published ?? false);

  function submit() {
    onSave({
      gallery_entry_id: row.entry.id,
      headline: headline.trim(),
      summary: summary.trim(),
      project_scope: scope.trim() || null,
      challenges: challenges.trim() || null,
      outcome: outcome.trim() || null,
      materials_used: materials
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      project_duration: duration.trim() || null,
      budget: budget.trim() ? Number(budget) : null,
      is_published: published,
    });
  }

  return (
    <div className="border-t p-4">
      <div className="grid gap-4">
        <Field label="Headline">
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="How a 3-bedroom flat went from cracked walls to a showroom finish"
          />
        </Field>
        <Field label="Summary (shown on cards and search results)">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="One or two sentences on what this project delivered."
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project Scope">
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Rooms, square metres, surfaces, coats..."
            />
          </Field>
          <Field label="Challenges">
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Damp walls, tight timeline, ceiling repairs..."
            />
          </Field>
        </div>
        <Field label="Outcome">
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="The finished result, client reaction, anything measured."
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Materials (comma separated)">
            <input
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Premium emulsion, sealer, POP cement"
            />
          </Field>
          <Field label="Project Duration">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="3 weeks"
            />
          </Field>
          <Field label="Budget (₦)">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="850000"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4"
          />
          Publish immediately (public once the gallery entry stays approved and
          public)
        </label>
        <div className="flex items-center gap-3">
          <Button
            onClick={submit}
            disabled={saving || !headline.trim() || !summary.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Save case study
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
