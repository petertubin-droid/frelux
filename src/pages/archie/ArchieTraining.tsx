// =========================================================
// FRELUX ARCHIE PWA — TRAINING CENTER (mobile)
//
// The owner's mobile front door of ARCHIE training: submit
// text / image / document / drawing / table / voice / video /
// project-outcome / code / web material, see the extraction
// result and knowledge candidates with evidence, confidence
// and provenance BEFORE approval.
//
// Same backend as FRELUX Admin's Training Console (archie-client,
// archie-extract edge function, RLS-gated tables). ARCHIE never
// approves its own learning — Approve is an owner action, and
// high-risk candidates additionally require the engineering-
// review checkbox (spec §8, §10).
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  approveIngestionCandidates,
  createArchieIngestion,
  fetchArchieDomains,
  fetchIngestions,
  fetchMyContributor,
  rejectIngestion,
  uploadTrainingMedia,
} from "@/lib/archie/archie-client";
import type {
  ArchieCandidate,
  ArchieContributor,
  ArchieDomain,
  ArchieIngestion,
  ArchieInputType,
} from "@/lib/archie/types";

const INPUT_TYPES: ArchieInputType[] = [
  "TEXT",
  "IMAGE",
  "DOCUMENT",
  "DRAWING",
  "TABLE",
  "VOICE",
  "VIDEO",
  "PROJECT_OUTCOME",
  "SOURCE_CODE",
  "WEB",
];

const NEEDS_FILE: ArchieInputType[] = [
  "IMAGE",
  "DOCUMENT",
  "DRAWING",
  "TABLE",
  "VOICE",
  "VIDEO",
];

interface Preview {
  ingestionId: string;
  candidates: ArchieCandidate[];
  flags: string[];
}

function confidenceColor(c: number) {
  if (c >= 0.8) return "text-emerald-300";
  if (c >= 0.5) return "text-amber-300";
  return "text-red-300";
}

export default function ArchieTraining() {
  const [contributor, setContributor] = useState<ArchieContributor | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [domains, setDomains] = useState<ArchieDomain[]>([]);
  const [ingestions, setIngestions] = useState<ArchieIngestion[]>([]);

  // Submission form
  const [inputType, setInputType] = useState<ArchieInputType>("TEXT");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("architecture");
  const [region, setRegion] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  // Review
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [engineeringReviewed, setEngineeringReviewed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Auth check — identical gating to the Admin console.
  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("frelux_users")
        .select("role")
        .eq("id", user.id)
        .single();
      const admin = profile?.role === "admin";
      setIsAdmin(admin);
      setContributor(
        await fetchMyContributor(admin, user.id, user.email ?? "Owner"),
      );
    })();
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [d, ing] = await Promise.all([
        fetchArchieDomains(),
        fetchIngestions({ limit: 25 }),
      ]);
      setDomains(d);
      setIngestions(ing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load training data");
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function handleSubmit() {
    setError("");
    setNotice("");
    setPreview(null);
    if (!contributor) {
      setError("No contributor profile loaded");
      return;
    }
    if (!title.trim()) {
      setError("A training title is required");
      return;
    }
    const needsMedia = NEEDS_FILE.includes(inputType);
    let mediaUri: string | undefined;
    if (file) {
      const up = await uploadTrainingMedia(contributor.user_id, file);
      if (!up.ok || !up.mediaUri) {
        setError(up.error ?? "Media upload failed");
        return;
      }
      mediaUri = up.mediaUri;
    }
    if (needsMedia && !mediaUri && !text.trim()) {
      setError("Attach a media file or provide text");
      return;
    }
    setBusy(true);
    try {
      const res = await createArchieIngestion({
        input_type: inputType,
        title: title.trim(),
        domain,
        region: region.trim() || undefined,
        text: text.trim() || undefined,
        media_uri: mediaUri,
        source_ref: sourceRef.trim() || undefined,
        contributor,
        user_confirmed: userConfirmed || undefined,
      });
      if (!res.ok || !res.ingestionId) {
        setError(res.error ?? "Training submission failed");
        return;
      }
      setNotice(
        `Extracted ${res.candidates?.length ?? 0} candidate(s). Review before approving — ARCHIE never promotes on its own.`,
      );
      setPreview({
        ingestionId: res.ingestionId,
        candidates: res.candidates ?? [],
        flags: res.flags ?? [],
      });
      setSelected(new Set((res.candidates ?? []).map((_, i) => i)));
      setTitle("");
      setText("");
      setFile(null);
      setSourceRef("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!preview || !contributor) return;
    const chosen = preview.candidates.filter((_, i) => selected.has(i));
    if (!chosen.length) {
      setError("Select at least one candidate to approve");
      return;
    }
    const highRisk = chosen.some((c) => c.requires_engineering_review);
    if (highRisk && !engineeringReviewed) {
      setError("High-risk candidates require the engineering-review confirmation");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await approveIngestionCandidates({
        ingestionId: preview.ingestionId,
        candidates: chosen,
        reviewerRole: contributor.role,
        hasEngineeringReview: engineeringReviewed || !highRisk,
      });
      if (!res.ok) {
        setError(res.error ?? "Approval failed");
        return;
      }
      setNotice(
        `Approved ${res.approved} knowledge item(s), versioned through the learning governance machinery.`,
      );
      setPreview(null);
      setEngineeringReviewed(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await rejectIngestion(preview.ingestionId);
      if (!res.ok) setError(res.error ?? "Rejection failed");
      else {
        setNotice("Ingestion rejected");
        setPreview(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!contributor)
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-400">
        {isAdmin ? "Loading…" : "Sign in required."}
      </div>
    );
  if (!isAdmin)
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-400">
        Owner access only.
      </div>
    );

  const awaiting = ingestions.filter(
    (i) => i.pipeline_state === "AWAITING_APPROVAL",
  ).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Training</h1>
      <p className="text-xs text-slate-400">
        Teach ARCHIE from material you capture on the phone. Everything shows
        up as candidates first — nothing is promoted without your approval.
      </p>
      {awaiting > 0 && (
        <p className="mt-2 text-xs text-amber-200/80">
          {awaiting} ingestion(s) awaiting approval
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

      {/* ── Submission form ── */}
      <div className="mt-4 space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
        <p className="text-xs font-medium text-slate-200">New training material</p>
        <select
          value={inputType}
          onChange={(e) => setInputType(e.target.value as ArchieInputType)}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          aria-label="Input type"
        >
          {INPUT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
            aria-label="Domain"
          >
            {(domains.length ? domains.map((d) => d.key) : [domain]).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region (optional)"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          />
        </div>
        <input
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          placeholder="Source reference (optional)"
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
        />
        {NEEDS_FILE.includes(inputType) && (
          <input
            type="file"
            accept={
              inputType === "VOICE"
                ? "audio/*"
                : inputType === "VIDEO"
                  ? "video/*"
                  : inputType === "IMAGE" || inputType === "DRAWING"
                    ? "image/*"
                    : "*/*"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300"
            aria-label="Media file"
          />
        )}
        {inputType === "TEXT" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type the material…"
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100"
          />
        )}
        <label className="flex items-center gap-2 px-1 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={userConfirmed}
            onChange={(e) => setUserConfirmed(e.target.checked)}
            className="h-5 w-5 accent-emerald-500"
          />
          I confirm every fact in this material
        </label>
        <button
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="w-full rounded-lg bg-brand-purple px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Processing…" : "Submit for extraction"}
        </button>
      </div>

      {/* ── Candidate review ── */}
      {preview && (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="text-xs font-medium text-amber-200">
            Extracted candidates — review before promotion
          </p>
          {preview.flags.length > 0 && (
            <p className="text-[11px] text-amber-200/70">
              Flags: {preview.flags.join(" · ")}
            </p>
          )}
          {preview.candidates.map((c, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={(e) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(i);
                    else next.delete(i);
                    return next;
                  })
                }
                className="mt-0.5 h-5 w-5 accent-emerald-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-100">{c.topic}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {c.knowledge_type} · {c.domain}
                  {c.region ? ` · ${c.region}` : ""}
                </p>
                <p className="mt-1 text-[11px]">
                  <span className={confidenceColor(c.confidence)}>
                    {(c.confidence * 100).toFixed(0)}% confidence
                  </span>{" "}
                  · {c.evidence.length} evidence · {c.evidence_state}
                </p>
                {c.requires_engineering_review && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    High-risk — requires engineering review
                  </p>
                )}
                {c.assumptions.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Assumptions: {c.assumptions.join("; ")}
                  </p>
                )}
              </div>
            </label>
          ))}
          {preview.candidates.some((c) => c.requires_engineering_review) && (
            <label className="flex items-center gap-2 px-1 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={engineeringReviewed}
                onChange={(e) => setEngineeringReviewed(e.target.checked)}
                className="h-5 w-5 accent-amber-500"
              />
              Engineering review completed (required for high-risk candidates)
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void handleApprove()}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve selected
            </button>
            <button
              onClick={() => void handleReject()}
              disabled={busy}
              className="rounded-lg bg-red-600/80 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Reject all
            </button>
          </div>
        </div>
      )}

      {/* ── Recent ingestions ── */}
      <div className="mt-6">
        <p className="text-xs font-medium text-slate-300">Recent ingestions</p>
        <ul className="mt-2 space-y-1.5">
          {ingestions.map((i) => (
            <li
              key={i.id}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {i.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  {i.pipeline_state}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {i.domain} · {i.input_type.replace(/_/g, " ")} ·{" "}
                {i.candidate_count} candidate(s)
              </p>
            </li>
          ))}
          {!ingestions.length && !error && (
            <li className="py-4 text-center text-xs text-slate-500">
              No ingestions yet — submit your first material above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
