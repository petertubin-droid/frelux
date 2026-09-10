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
import {
  ArchieBadge,
  ArchieButton,
  ArchiePage,
  ArchiePanel,
  ArchieSectionTitle,
} from "@/components/archie/premium";
import {
  ARCHIE_SEED_LANGUAGES,
  archieLanguages,
  resolveLanguage,
} from "@/lib/archie/language-intelligence";
import { resolveRegionalProfile } from "@/lib/archie/global-context";

type StatusFilter = "ALL" | "UNVERIFIED" | "VERIFIED" | "REJECTED";

export default function ArchieTerminology() {
  const [rows, setRows] = useState<TerminologyRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [domain, setDomain] = useState<(typeof TERMINOLOGY_DOMAINS)[number]>(
    TERMINOLOGY_DOMAINS[0],
  );
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
      setNotice(
        status === "VERIFIED"
          ? "Verified — now usable in ARCHIE chat"
          : "Rejected",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update verification",
      );
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

  const unverified = rows.filter(
    (r) => r.verification_status === "UNVERIFIED",
  ).length;

  return (
    <ArchiePage
      eyebrow="Terminology Center"
      title="TerminoBook"
      subtitle="Multilingual construction terminology ARCHIE uses in chat. Entries are created UNVERIFIED — verification is your deliberate action, and only VERIFIED entries reach ARCHIE's chat."
    >
      {unverified > 0 && (
        <div className="mb-4">
          <ArchieBadge tone="warning">
            {unverified} entry(ies) awaiting verification
          </ArchieBadge>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}

      {/* ── Filters ── */}
      <div className="mt-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="archie-input flex-1 rounded-lg px-3 py-2.5 text-sm text-slate-100"
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
          className="archie-input flex-1 rounded-lg px-3 py-2.5 text-sm text-slate-100"
        />
      </div>

      {/* ── Add entry ── */}
      <ArchieButton
        onClick={() => setShowForm(!showForm)}
        className="mt-3 w-full py-3"
      >
        {showForm ? "Cancel" : "+ Add terminology"}
      </ArchieButton>

      {showForm && (
        <ArchiePanel className="mt-3 space-y-3 p-4">
          <ArchieSectionTitle>New Terminology Entry</ArchieSectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={domain}
              onChange={(e) =>
                setDomain(
                  e.target.value as (typeof TERMINOLOGY_DOMAINS)[number],
                )
              }
              className="archie-input w-full rounded-lg px-3 py-2.5 text-sm text-slate-100"
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
              className="archie-input w-full rounded-lg px-3 py-2.5 text-sm text-slate-100"
            />
          </div>
          <input
            value={canonicalTerm}
            onChange={(e) => setCanonicalTerm(e.target.value)}
            placeholder="Canonical term (English)"
            className="archie-input w-full rounded-lg px-3 py-2.5 text-sm text-slate-100"
          />
          <input
            value={regionalTerm}
            onChange={(e) => setRegionalTerm(e.target.value)}
            placeholder="Regional term"
            className="archie-input w-full rounded-lg px-3 py-2.5 text-sm text-slate-100"
          />
          <input
            value={meaningNote}
            onChange={(e) => setMeaningNote(e.target.value)}
            placeholder="Meaning note (optional)"
            className="archie-input w-full rounded-lg px-3 py-2.5 text-sm text-slate-100"
          />
          <ArchieButton
            onClick={() => void handleCreate()}
            disabled={busy}
            className="w-full py-2.5"
          >
            {busy ? "Saving…" : "Add as UNVERIFIED"}
          </ArchieButton>
        </ArchiePanel>
      )}

      {/* ── Entries ── */}
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="archie-panel rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">
                  {r.canonical_term}{" "}
                  <span className="text-amber-300/80">→ {r.regional_term}</span>
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
              <ArchieBadge
                tone={
                  r.verification_status === "VERIFIED"
                    ? "positive"
                    : r.verification_status === "REJECTED"
                      ? "critical"
                      : "warning"
                }
              >
                {r.verification_status}
              </ArchieBadge>
            </div>
            <div className="mt-2 flex gap-1.5">
              {r.verification_status !== "VERIFIED" && (
                <button
                  onClick={() => void handleVerify(r.id, "VERIFIED")}
                  disabled={busy}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  Verify
                </button>
              )}
              {r.verification_status !== "REJECTED" && (
                <button
                  onClick={() => void handleVerify(r.id, "REJECTED")}
                  disabled={busy}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                onClick={() => void handleDelete(r.id)}
                disabled={busy}
                className="rounded-md border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!loading && !rows.length && !error && (
          <li className="archie-panel rounded-xl py-6 text-center text-xs text-slate-500">
            No entries match this filter yet.
          </li>
        )}
        {loading && (
          <li className="archie-panel rounded-xl py-4 text-center text-xs text-slate-500">
            Loading…
          </li>
        )}
      </ul>

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        LEARN → VERIFY → VERSION → USE. Verification is enforced server-side in
        archie-core — a VERIFIED entry here is immediately usable in ARCHIE's
        chat on every interface, because both this app and FRELUX Admin share
        the same terminology table.
      </p>

      <LanguageRegistryPanel />
    </ArchiePage>
  );
}

// ---------------------------------------------------------
// Language registry + session language resolution (§4, §18.4)
// — the real seed registry and resolver, not a mock. The
// user's selection is AUTHORITATIVE; the location suggestion
// is used only when the user has not chosen.
// ---------------------------------------------------------
function LanguageRegistryPanel() {
  const [selected, setSelected] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [resolution, setResolution] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  function resolve() {
    setResolveError(null);
    setResolution(null);
    try {
      const profile = resolveRegionalProfile({
        latitude: null,
        longitude: null,
        accuracy_m: null,
        formatted_address: null,
        country: null,
        country_code: countryCode || null,
        region: null,
        city: null,
        postcode: null,
        place_id: null,
        source: "manual",
        captured_at: new Date().toISOString(),
        verification: "user_confirmed",
      });
      const r = resolveLanguage({
        user_selection: selected.trim() ? selected.trim() : null,
        profile,
        registry: archieLanguages,
      });
      setResolution(
        `Language: ${r.language_code} — source: ${r.source}, authoritative: ${r.authoritative}.`,
      );
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Language resolution refused.",
      );
    }
  }

  return (
    <ArchiePanel className="mt-6">
      <ArchieSectionTitle>Language registry</ArchieSectionTitle>
      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ARCHIE_SEED_LANGUAGES.map((lang) => (
          <li key={lang.code} className="archie-panel rounded-lg p-2.5">
            <p className="text-xs font-medium text-slate-200">
              {lang.native_label}
              <span className="ml-1 text-slate-500">({lang.code})</span>
            </p>
            <p className="text-[10px] text-slate-500">
              {lang.common_regions.join(", ") || "—"}
            </p>
            <ArchieBadge tone={lang.active ? "positive" : "neutral"}>
              {lang.active ? "active" : "inactive"}
            </ArchieBadge>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            User selection (authoritative, optional)
          </span>
          <input
            className="w-28 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            placeholder="e.g. yo"
            aria-label="User language selection"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-500">
            Country code
          </span>
          <input
            className="w-20 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            aria-label="Country code"
          />
        </label>
        <ArchieButton onClick={resolve}>Resolve session language</ArchieButton>
      </div>
      {resolution && (
        <p role="status" className="mt-2 text-xs text-emerald-300">
          {resolution}
        </p>
      )}
      {resolveError && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {resolveError}
        </p>
      )}
    </ArchiePanel>
  );
}
