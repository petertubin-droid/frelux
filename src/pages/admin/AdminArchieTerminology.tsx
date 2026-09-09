// =========================================================
// FRELUX ARCHIE STAGE 2 — TERMINOBOOK ADMIN SURFACE (§16)
//
// The TerminologyBook: admin console for the multilingual
// construction terminology that ARCHIE uses in chat.
//
// LEARN → VERIFY → VERSION → USE:
//   - Entries are created UNVERIFIED (never auto-verified)
//   - Verification is a deliberate human action here
//   - Only VERIFIED entries are injected into ARCHIE chat
//     (enforced server-side in archie-core)
//
// RLS enforces admin-only writes; this page is gated by
// RequireAdmin on the /admin/archie-terminology route.
// =========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  Check,
  X,
  Trash2,
  Sparkles,
  Pencil,
} from "lucide-react";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import {
  listTerminology,
  createTerminology,
  updateTerminology,
  setVerification,
  deleteTerminology,
  validateTerminologyDraft,
  seedStarterTerms,
  TERMINOLOGY_DOMAINS,
  type TerminologyRow,
  type TerminologyDraft,
  type VerificationStatus,
} from "@/lib/archie/stage2-terminology-client";
import {
  fetchActiveLanguages,
  type LanguageRegistryRow,
} from "@/lib/archie/stage2-language-client";

const STATUS_STYLES: Record<VerificationStatus, string> = {
  VERIFIED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  UNVERIFIED: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/30",
};

const EMPTY_DRAFT: TerminologyDraft = {
  domain: "materials",
  language_code: "pcm",
  canonical_term: "",
  regional_term: "",
  meaning_note: "",
};

export default function AdminArchieTerminology() {
  const [rows, setRows] = useState<TerminologyRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // filters
  const [filterLang, setFilterLang] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TerminologyDraft>(EMPTY_DRAFT);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTerminology({
        language_code: filterLang || undefined,
        verification_status: (filterStatus || undefined) as
          | VerificationStatus
          | undefined,
      });
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load terminology");
    } finally {
      setLoading(false);
    }
  }, [filterLang, filterStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    fetchActiveLanguages()
      .then(setLanguages)
      .catch(() => setLanguages([]));
  }, []);

  const stats = useMemo(() => {
    const verified = rows.filter((r) => r.verification_status === "VERIFIED").length;
    const unverified = rows.filter(
      (r) => r.verification_status === "UNVERIFIED",
    ).length;
    const langs = new Set(rows.map((r) => r.language_code)).size;
    return { total: rows.length, verified, unverified, langs };
  }, [rows]);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  }

  function openEdit(row: TerminologyRow) {
    setEditingId(row.id);
    setDraft({
      domain: row.domain,
      language_code: row.language_code,
      canonical_term: row.canonical_term,
      regional_term: row.regional_term,
      meaning_note: row.meaning_note ?? "",
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    const check = validateTerminologyDraft(draft);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateTerminology(editingId, {
          domain: draft.domain,
          language_code: draft.language_code,
          canonical_term: draft.canonical_term,
          regional_term: draft.regional_term,
          meaning_note: draft.meaning_note || null,
        });
        setNotice("Entry updated. Edits reset nothing — verification is unchanged.");
      } else {
        await createTerminology(draft);
        setNotice("Entry created as UNVERIFIED — verify it to make it usable in ARCHIE chat.");
      }
      setFormOpen(false);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(row: TerminologyRow, status: VerificationStatus) {
    setBusy(true);
    setError(null);
    try {
      await setVerification(row.id, status);
      setNotice(
        status === "VERIFIED"
          ? `"${row.regional_term}" is now verified and usable in ARCHIE chat.`
          : `"${row.canonical_term}" rejected — it will not be used in chat.`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: TerminologyRow) {
    if (
      !window.confirm(
        `Delete "${row.canonical_term}" → "${row.regional_term}" (${row.language_code})? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteTerminology(row.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSeed() {
    setBusy(true);
    setError(null);
    try {
      const { added, skipped } = await seedStarterTerms();
      setNotice(
        `Starter set: ${added} added, ${skipped} skipped (duplicates). All UNVERIFIED — review each before verifying.`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHeader
        title="ARCHIE TerminologyBook"
        subtitle="Verified multilingual construction terminology — the terms ARCHIE uses in chat. Only VERIFIED entries reach the chat core (LEARN → VERIFY → VERSION → USE)."
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminCard>
          <div className="text-xs text-slate-500">Total entries</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-xs text-slate-500">Verified (in chat)</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {stats.verified}
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-xs text-slate-500">Awaiting verification</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">
            {stats.unverified}
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-xs text-slate-500">Languages covered</div>
          <div className="mt-1 text-2xl font-semibold">{stats.langs}</div>
        </AdminCard>
      </div>

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <AdminButton onClick={openCreate} disabled={busy}>
          <Plus className="mr-1 h-4 w-4" /> Add entry
        </AdminButton>
        <AdminButton variant="secondary" onClick={handleSeed} disabled={busy}>
          <Sparkles className="mr-1 h-4 w-4" /> Seed starter terms
        </AdminButton>
        <AdminButton variant="secondary" onClick={refresh} disabled={busy}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </AdminButton>
        <div className="ml-auto flex items-center gap-2">
          <AdminSelect
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            aria-label="Filter by language"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native_label} ({l.code})
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="REJECTED">Rejected</option>
          </AdminSelect>
        </div>
      </div>

      {/* add / edit form */}
      {formOpen && (
        <AdminCard className="mb-6">
          <div className="mb-4 flex items-center gap-2 font-medium">
            <BookOpen className="h-4 w-4" />
            {editingId ? "Edit entry" : "New terminology entry"}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Domain">
              <AdminSelect
                value={draft.domain}
                onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
              >
                {TERMINOLOGY_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Language">
              <AdminSelect
                value={draft.language_code}
                onChange={(e) =>
                  setDraft({ ...draft, language_code: e.target.value })
                }
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native_label} ({l.code})
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Canonical term (English/FRELUX canonical)">
              <AdminInput
                value={draft.canonical_term}
                onChange={(e) =>
                  setDraft({ ...draft, canonical_term: e.target.value })
                }
                placeholder="e.g. reinforcement bar"
              />
            </AdminField>
            <AdminField label="Regional term (what ARCHIE should say)">
              <AdminInput
                value={draft.regional_term}
                onChange={(e) =>
                  setDraft({ ...draft, regional_term: e.target.value })
                }
                placeholder="e.g. iron rod"
              />
            </AdminField>
            <AdminField label="Meaning note (optional)">
              <AdminTextarea
                value={draft.meaning_note ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, meaning_note: e.target.value })
                }
                placeholder="Short context for review and usage"
                rows={2}
              />
            </AdminField>
          </div>
          <div className="mt-4 flex gap-2">
            <AdminButton onClick={handleSubmit} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create (UNVERIFIED)"}
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
                setDraft(EMPTY_DRAFT);
              }}
              disabled={busy}
            >
              Cancel
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {/* list */}
      <AdminCard>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading terminology…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No terminology entries yet. Use "Seed starter terms" to load a
            reviewable starter set, or add entries manually.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Canonical</th>
                  <th className="px-2 py-2">Regional</th>
                  <th className="px-2 py-2">Language</th>
                  <th className="px-2 py-2">Domain</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="font-medium">{row.canonical_term}</div>
                      {row.meaning_note && (
                        <div className="text-xs text-slate-500">
                          {row.meaning_note}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 font-medium">
                      {row.regional_term}
                    </td>
                    <td className="px-2 py-2.5">{row.language_code}</td>
                    <td className="px-2 py-2.5 text-slate-500">{row.domain}</td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.verification_status]}`}
                      >
                        {row.verification_status}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit ${row.canonical_term}`}
                          onClick={() => openEdit(row)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {row.verification_status !== "VERIFIED" && (
                          <button
                            type="button"
                            title="Verify (usable in chat)"
                            aria-label={`Verify ${row.canonical_term}`}
                            onClick={() => handleVerify(row, "VERIFIED")}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {row.verification_status !== "REJECTED" && (
                          <button
                            type="button"
                            title="Reject"
                            aria-label={`Reject ${row.canonical_term}`}
                            onClick={() => handleVerify(row, "REJECTED")}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete ${row.canonical_term}`}
                          onClick={() => handleDelete(row)}
                          disabled={busy}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <p className="mt-4 text-xs text-slate-500">
        Terminology is per-language ground truth: once verified, archie-core
        injects these terms into every chat turn in that language. Entries are
        never auto-verified — verification is a deliberate action here.
      </p>
    </div>
  );
}
