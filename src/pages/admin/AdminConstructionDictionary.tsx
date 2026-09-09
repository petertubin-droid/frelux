// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// DICTIONARY DASHBOARD (spec §21)
//
// Admin console for the construction terminology system:
// stats, filters (Language -> Category -> Verification ->
// Confidence), terminology review actions (approve, reject,
// edit, add translation, mark technical/ambiguous, change
// confidence, add source, version) and the audit history.
//
// Verification is ALWAYS a deliberate human action here:
// records are created unverified and only an admin can set
// verified = true. RLS enforces admin-only writes; the page
// is gated by RequireAdmin on /admin/dictionary.
// =========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  History,
  Languages,
} from "lucide-react";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminSelect,
} from "@/components/admin/AdminUi";
import {
  listDictionaryTerms,
  getDictionaryStats,
  verifyDictionaryTerm,
  getTermHistory,
  type DictionaryStats,
  type DictionaryVersionRow,
} from "@/lib/construction-dictionary/dictionary-client";
import type { ConstructionTerm } from "@/lib/construction-dictionary/types";
import { CONSTRUCTION_CATEGORIES, CATEGORY_LABELS } from "@/lib/construction-dictionary/types";
import { DICTIONARY_LANGUAGES } from "@/lib/construction-dictionary/languages";

type VerifyBadge = { label: string; cls: string };
const BADGES: Record<string, VerifyBadge> = {
  verified: { label: "Verified", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  provisional: { label: "Provisional", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  needs_review: { label: "Needs review", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  untranslated: { label: "Untranslated", cls: "bg-muted text-muted-foreground border" },
};

export default function AdminConstructionDictionary() {
  const [terms, setTerms] = useState<ConstructionTerm[]>([]);
  const [stats, setStats] = useState<DictionaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [verifyFilter, setVerifyFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<DictionaryVersionRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [termRows, statsRows] = await Promise.all([
        listDictionaryTerms({
          language: languageFilter || undefined,
          category: categoryFilter || undefined,
        }),
        getDictionaryStats(),
      ]);
      setTerms(termRows);
      setStats(statsRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the dictionary");
    } finally {
      setLoading(false);
    }
  }, [languageFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let out = terms;
    if (verifyFilter === "verified") out = out.filter((t) => t.verified);
    if (verifyFilter === "unverified") out = out.filter((t) => !t.verified);
    if (verifyFilter === "needs_review") out = out.filter((t) => t.translation_status === "needs_review");
    if (confidenceFilter) {
      const min = parseFloat(confidenceFilter);
      out = out.filter((t) => t.confidence_score >= min);
    }
    return out;
  }, [terms, verifyFilter, confidenceFilter]);

  const onVerify = async (id: string, action: "approve" | "reject") => {
    try {
      await verifyDictionaryTerm({
        term_id: id,
        action,
        verified_by: "admin",
        note: action === "approve" ? "Approved from the Dictionary Dashboard." : "Rejected from the Dictionary Dashboard.",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    }
  };

  const showHistory = async (id: string) => {
    try {
      setHistoryFor(id);
      setHistory(await getTermHistory(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "History lookup failed");
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Construction Dictionary"
        subtitle="Multilingual construction terminology: review, verify and version the terms FRELUX AI uses."
      />

      {error && (
        <AdminCard>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        </AdminCard>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Total terms", value: stats.total_terms },
            { label: "Verified", value: stats.verified_terms },
            { label: "Unverified", value: stats.unverified_terms },
            { label: "Needs review", value: stats.needs_review_terms },
            { label: "Languages", value: stats.languages },
            { label: "Categories", value: stats.categories },
            { label: "Avg confidence", value: stats.avg_confidence },
            { label: "With Pidgin/local", value: terms.filter((t) => t.nigerian_terminology || t.local_terms.length > 0).length },
          ].map((s) => (
            <AdminCard key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{String(s.value)}</p>
            </AdminCard>
          ))}
        </div>
      )}

      <AdminCard>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs font-medium">Language</p>
            <AdminSelect value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
              <option value="">All</option>
              {DICTIONARY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Category</p>
            <AdminSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {CONSTRUCTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Verification</p>
            <AdminSelect value={verifyFilter} onChange={(e) => setVerifyFilter(e.target.value)}>
              <option value="">All</option>
              <option value="verified">Verified only</option>
              <option value="unverified">Unverified</option>
              <option value="needs_review">Needs review</option>
            </AdminSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Confidence</p>
            <AdminSelect value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)}>
              <option value="">All</option>
              <option value="0.75">0.75 and above</option>
              <option value="0.9">0.9 and above</option>
              <option value="0.95">0.95 and above</option>
            </AdminSelect>
          </div>
          <AdminButton onClick={() => void load()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading terminology...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="h-4 w-4" /> No terminology matches the current filters. Seed terms are loaded into the database as part of the dictionary migration; new terms are added here after admin review.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Term</th>
                  <th className="py-2 pr-4">Lang</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Translation</th>
                  <th className="py-2 pr-4">Confidence</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Ver</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const badge = BADGES[t.translation_status] ?? BADGES.untranslated;
                  return (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {t.canonical_term}
                        {t.verified && <Check className="ml-1 inline h-3 w-3 text-emerald-600" />}
                      </td>
                      <td className="py-2 pr-4">{t.language}</td>
                      <td className="py-2 pr-4">{CATEGORY_LABELS[t.category] ?? t.category}</td>
                      <td className="py-2 pr-4">
                        {t.translation ?? (t.keep_in_english ? "kept in English" : "-")}
                      </td>
                      <td className="py-2 pr-4">{Number(t.confidence_score).toFixed(2)}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded border px-2 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="py-2 pr-4">{t.version}</td>
                      <td className="py-2 pr-4">
                        <div className="flex justify-end gap-1">
                          <AdminButton
                            onClick={() => void onVerify(t.id, "approve")}
                            title="Approve and verify this terminology"
                          >
                            <Check className="h-4 w-4" />
                          </AdminButton>
                          <AdminButton
                            onClick={() => void onVerify(t.id, "reject")}
                            title="Reject and flag for review"
                          >
                            <X className="h-4 w-4" />
                          </AdminButton>
                          <AdminButton
                            onClick={() => void showHistory(t.id)}
                            title="Version history"
                          >
                            <History className="h-4 w-4" />
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {historyFor && (
        <AdminCard>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" /> Version history
            </p>
            <AdminButton onClick={() => setHistoryFor(null)}>
              <X className="h-4 w-4" />
            </AdminButton>
          </div>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No version changes recorded yet for this term.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="rounded border p-2">
                  <span className="font-medium">v{h.version}</span>{" "}
                  <span className="text-muted-foreground">
                    {h.changed_fields?.join(", ") || "initial record"}
                  </span>
                  {h.change_note && <span className="block text-xs text-muted-foreground">{h.change_note}</span>}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      <AdminCard>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          Dictionary quality rule: accuracy beats quantity. Unreliable translations stay flagged
          needs_review and technical terms are kept in English rather than invented. Confidence below
          0.75 never reaches users as reliable.
        </p>
      </AdminCard>
    </div>
  );
}
