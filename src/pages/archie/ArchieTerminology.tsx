// =========================================================
// FRELUX ARCHIE PWA — TERMINOBOOK (mobile)
//
// The TerminologyBook: multilingual construction terminology
// that ARCHIE uses in chat. Same backend as FRELUX Admin's
// TerminologyBook (stage2-terminology-client, RLS admin-only
// writes).
//
// LEARN → VERIFY → VERSION → USE:
//   - Entries are created UNVERIFIED (never auto-verified)
//   - Verification is a deliberate owner action here
//   - Only VERIFIED entries are injected into ARCHIE chat
//     (enforced server-side in archie-core)
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  TERMINOLOGY_DOMAINS,
  createTerminology,
  deleteTerminology,
  listTerminology,
  setVerification,
  type TerminologyRow,
} from "@/lib/archie/stage2-terminology-client";

type StatusFilter = "ALL" | "UNVERIFIED" | "VERIFIED" | "REJECTED";

function statusColor(s: string) {
  if (s === "VERIFIED") return "text-emerald-300";
  if (s === "REJECTED") return "text-red-300";
  return "text-amber-300";
}

export default function ArchieTerminology() {
  const [rows, setRows] = useState<TerminologyRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [domain, setDomain] = useState(TERMINOLOGY_DOMAINS[0] ?? "architecture");
  const [languageCode, setLanguageCode] = useState("yo");
  const [canonicalTerm, setCanonicalTerm] = useState("");
  const [regionalTerm, setRegionalTerm] = useState("");
  const [meaningNote, setMeaningNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await listTerminology({
          ...(statusFilter !== "ALL"
            ? { verification_status: statusFilter }
            : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load terminology");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await createTerminology({
        domain,
        language_code: languageCode,
        canonical_term: canonicalTerm,
        regional_term: regionalTerm,
        meaning_note: meaningNote || null,
      });
      setNotice(
        `"${row.canonical_term}" added as UNVERIFIED — verify deliberately before ARCHIE uses it in chat.`,
      );
      setCanonicalTerm("");
      setRegionalTerm("");
      setMeaningNote("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create entry");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(id: string, status: "VERIFIED" | "REJECTED") {
    setBusy(true);
    setError("");
    try {
      await setVerification(id, status);
      setNotice(status === "VERIFIED" ? "Verified — now usable in ARCHIE chat" : "Rejected");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update verification");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this terminology entry?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteTerminology(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete entry");
    } finally {
      setBusy(false);
    }
  }

  const unverified = rows.filter((r) => r.verification_status === "UNVERIFIED").length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">TerminoBook</h1>
      <p className="text-xs text-slate-400">
        Multilingual construction terminology ARCHIE uses in chat. Entries are
        created UNVERIFIED — verification is your deliberate action, and only
        VERIFIED entries reach ARCHIE's chat.
      </p>
      {unverified > 0 && (
        <p className="mt-2 text-xs text-amber-200/80">
          {unverified} entry(ies) awaiting verification
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}

      {/* ── Filters ── */}
      <div className="mt-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          aria-label="Filter by status"
        >
          {["ALL", "UNVERIFIED", "VERIFIED", "REJECTED"].map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search term…"
          className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
        />
      </div>

      {/* ── Add entry ── */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mt-3 w-full rounded-lg bg-brand-purple px-4 py-3 text-sm font-semibold text-white"
      >
        {showForm ? "Cancel" : "+ Add terminology"}
      </button>

      {showForm && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
              aria-label="Domain"
            >
              {TERMINOLOGY_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              placeholder="Lang (yo, ig, ha…)"
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>
          <input
            value={canonicalTerm}
            onChange={(e) => setCanonicalTerm(e.target.value)}
            placeholder="Canonical term (English)"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          />
          <input
            value={regionalTerm}
            onChange={(e) => setRegionalTerm(e.target.value)}
            placeholder="Regional term"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          />
          <input
            value={meaningNote}
            onChange={(e) => setMeaningNote(e.target.value)}
            placeholder="Meaning note (optional)"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add as UNVERIFIED"}
          </button>
        </div>
      )}

      {/* ── Entries ── */}
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-100">
                  {r.canonical_term}{" "}
                  <span className="text-slate-300">→ {r.regional_term}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {r.language_code} · {r.domain} · v{r.version}
                </p>
                {r.meaning_note && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {r.meaning_note}
                  </p>
                )}
              </div>
              <span className={`text-[10px] ${statusColor(r.verification_status)}`}>
                {r.verification_status}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {r.verification_status !== "VERIFIED" && (
                <button
                  onClick={() => void handleVerify(r.id, "VERIFIED")}
                  disabled={busy}
                  className="rounded-md bg-emerald-600/80 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                >
                  Verify
                </button>
              )}
              {r.verification_status !== "REJECTED" && (
                <button
                  onClick={() => void handleVerify(r.id, "REJECTED")}
                  disabled={busy}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-200 disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                onClick={() => void handleDelete(r.id)}
                disabled={busy}
                className="rounded-md bg-red-600/60 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!loading && !rows.length && !error && (
          <li className="py-6 text-center text-xs text-slate-500">
            No entries match this filter yet.
          </li>
        )}
        {loading && <li className="py-4 text-center text-xs text-slate-500">Loading…</li>}
      </ul>

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        LEARN → VERIFY → VERSION → USE. Verification is enforced server-side in
        archie-core — a VERIFIED entry here is immediately usable in ARCHIE's
        chat on every interface, because both this app and FRELUX Admin share
        the same terminology table.
      </p>
    </div>
  );
}
