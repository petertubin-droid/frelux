/**
 * Admin pane: Conversational Language Packs (Engine 3)
 *
 * Full CRUD over conversational_language_packs - the keyword
 * packs powering language detection and parameter extraction for
 * the WhatsApp-native estimator. Every pack needs a source
 * reference (phrase book / verified chat sample); nothing is
 * guessed. Also shows the recent parse log so admins can see
 * what customers actually ask and which packs need coverage.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchConversationalPacks,
  createConversationalPack,
  updateConversationalPack,
  deleteConversationalPack,
  fetchConversationalParseLog,
  type ConversationalLanguagePackRow,
  type ConversationalParseLogRow,
} from "@/lib/estimation/queries";
import { getSafeError } from "@/lib/safeError";
import {
  AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  AdminIconButton,
  AdminInput,
} from "@/components/admin/AdminUi";

interface PackForm {
  language_code: string;
  category: string;
  keywords: string; // comma-separated in the form, array in the DB
  weight: string;
  description: string;
  source_reference: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: PackForm = {
  language_code: "en",
  category: "greeting",
  keywords: "",
  weight: "1",
  description: "",
  source_reference: "",
  is_active: true,
  sort_order: "0",
};

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
];

const CATEGORIES = [
  "greeting",
  "surface_paint",
  "surface_screed",
  "surface_pop",
  "surface_tile",
  "dimension_word",
  "unit_meter",
  "unit_feet",
  "region_hint",
  "coats_word",
];

function formFromPack(p: ConversationalLanguagePackRow): PackForm {
  return {
    language_code: p.language_code,
    category: p.category,
    keywords: p.keywords.join(", "),
    weight: String(p.weight),
    description: p.description ?? "",
    source_reference: p.source_reference,
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  };
}

function validate(f: PackForm): string | null {
  if (!f.keywords.trim()) return "Keywords are required (comma-separated).";
  const kws = f.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (kws.length === 0) return "At least one keyword is required.";
  const w = Number(f.weight);
  if (!Number.isFinite(w) || w <= 0)
    return "Weight must be a positive number: 1 for common words, higher for unambiguous markers.";
  if (!f.source_reference.trim())
    return "Source reference is required (phrase book or verified chat sample).";
  return null;
}

export default function AdminConversationalPacks() {
  const [packs, setPacks] = useState<ConversationalLanguagePackRow[]>([]);
  const [logs, setLogs] = useState<ConversationalParseLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConversationalLanguagePackRow | null>(
    null,
  );
  const [form, setForm] = useState<PackForm>(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await fetchConversationalPacks();
    if (error) setError(getSafeError(error, "Failed to load language packs."));
    else setPacks(data);
    const logResult = await fetchConversationalParseLog(50);
    if (!logResult.error) setLogs(logResult.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof PackForm>(key: K, value: PackForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: ConversationalLanguagePackRow) => {
    setEditing(p);
    setForm(formFromPack(p));
    setModalOpen(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const payload = {
      language_code: form.language_code,
      category: form.category,
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      weight: Number(form.weight),
      description: form.description.trim() || undefined,
      source_reference: form.source_reference.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateConversationalPack(editing.id, payload)
      : await createConversationalPack(payload);
    if (error)
      setError(getSafeError(error, "Failed to save the language pack."));
    else {
      setModalOpen(false);
      setMessage(editing ? "Language pack updated." : "Language pack created.");
      load();
    }
  };

  const remove = async (p: ConversationalLanguagePackRow) => {
    if (
      !window.confirm(
        `Delete the ${p.language_code}/${p.category} pack (${p.keywords.slice(0, 3).join(", ")}…)? The engine falls back to its built-in defaults for that category.`,
      )
    )
      return;
    const { error } = await deleteConversationalPack(p.id);
    if (error)
      setError(getSafeError(error, "Failed to delete the language pack."));
    else {
      setMessage("Language pack deleted.");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <AdminHeader
        title="Conversational Estimator: Language Packs"
        subtitle="Keyword packs the WhatsApp estimator uses to detect English chat and to extract sizes, coats and regions. Every pack needs a source reference; the engine falls back to its built-in defaults only where a category is unconfigured."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-1 inline h-4 w-4" /> Add pack
          </AdminButton>
        }
      />

      {error && <StateMessage type="error" title="Error" message={error} />}
      {message && !error && (
        <StateMessage type="empty" title="Saved" message={message} />
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Language</th>
              <th className="p-3">Category</th>
              <th className="p-3">Keywords</th>
              <th className="p-3 text-right">Weight</th>
              <th className="p-3">Source reference</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  No packs configured. The estimator runs on its built-in
                  defaults until you add packs.
                </td>
              </tr>
            ) : (
              packs.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3 font-medium">{p.language_code}</td>
                  <td className="p-3 text-xs">{p.category}</td>
                  <td
                    className="max-w-[260px] truncate p-3 text-xs"
                    title={p.keywords.join(", ")}
                  >
                    {p.keywords.join(", ")}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {p.weight}
                  </td>
                  <td
                    className="max-w-[200px] truncate p-3 text-xs text-muted-foreground"
                    title={p.source_reference}
                  >
                    {p.source_reference}
                  </td>
                  <td className="p-3 text-xs">{p.is_active ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <AdminIconButton onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton
                        onClick={() => remove(p)}
                        title="Delete"
                        variant="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="pt-4 text-lg font-semibold">Recent parses (last 50)</h2>
      <p className="text-sm text-muted-foreground">
        What customers ask and what the engine found. Missing dimensions show up
        as intent + no estimate: that is the engine asking rather than guessing.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Language</th>
              <th className="p-3">Intent</th>
              <th className="p-3">Estimate?</th>
              <th className="p-3">Thread</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground"
                >
                  No parses logged yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3 text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-xs font-medium">
                    {l.detected_language}
                  </td>
                  <td className="p-3 text-xs">{l.intent}</td>
                  <td className="p-3 text-xs">
                    {l.had_estimate ? "Yes" : "Asked back"}
                  </td>
                  <td
                    className="max-w-[280px] truncate p-3 text-xs text-muted-foreground"
                    title={l.raw_thread}
                  >
                    {l.raw_thread.slice(0, 120)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-4 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">
              {editing ? "Edit language pack" : "Add language pack"}
            </h2>
            <div className="grid gap-3">
              <AdminField label="Language">
                <select
                  value={form.language_code}
                  onChange={(e) => set("language_code", e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Category">
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Keywords (comma-separated)">
                <AdminInput
                  value={form.keywords}
                  onChange={(e) => set("keywords", e.target.value)}
                  placeholder="abeg, oga, how far"
                />
              </AdminField>
              <AdminField label="Weight (positive number)">
                <AdminInput
                  type="number"
                  step="1"
                  min="1"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </AdminField>
              <AdminField label="Source reference (required)">
                <AdminInput
                  value={form.source_reference}
                  onChange={(e) => set("source_reference", e.target.value)}
                />
              </AdminField>
              <AdminField label="Description (optional)">
                <AdminInput
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </AdminField>
              <AdminField label="Sort order">
                <AdminInput
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                />
              </AdminField>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                Active
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </AdminButton>
              <AdminButton onClick={save}>
                {editing ? "Save changes" : "Create pack"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
