// =========================================================
// FRELUX PHASE 8, ADMIN ARCHIE TRAINING CONSOLE
//
// The human front door of ARCHIE training: submit text, image,
// document, drawing, table, voice, video, project-outcome, code
// or web material. Every submission shows the EXTRACTION result,
// the detected knowledge candidates with evidence, confidence,
// provenance and approval state BEFORE any promotion.
//
// ARCHIE never approves its own learning: the Approve action is
// a human admin action, and high-risk candidates (structural,
// foundation, safety, deterministic math, code) additionally
// require the engineering-review checkbox.
// =========================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Loader2,
  AlertCircle,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  HardHat,
  Code2,
  Globe,
  Table2,
  DraftingCompass,
  FileScan,
  ShieldAlert,
  ClipboardCheck,
  History,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { classNames } from "@/lib/utils";
import type {
  ArchieCandidate,
  ArchieContributor,
  ArchieDomain,
  ArchieExtraction,
  ArchieIngestion,
  ArchieInputType,
} from "@/lib/archie/types";
import {
  fetchArchieDomains,
  fetchMyContributor,
  uploadTrainingMedia,
  createArchieIngestion,
  fetchIngestions,
  approveIngestionCandidates,
  rejectIngestion,
} from "@/lib/archie/archie-client";
import { requiresReview } from "@/lib/archie/contributors";

const INPUT_TABS: {
  type: ArchieInputType;
  label: string;
  icon: typeof Brain;
}[] = [
  { type: "TEXT", label: "Text", icon: FileText },
  { type: "IMAGE", label: "Image", icon: ImageIcon },
  { type: "PDF_DOCUMENT", label: "PDF / Document", icon: FileScan },
  { type: "ENGINEERING_DRAWING", label: "Drawing", icon: DraftingCompass },
  { type: "TABLE_CALCULATION", label: "Table / Calc", icon: Table2 },
  { type: "AUDIO_VOICE", label: "Voice", icon: Mic },
  { type: "VIDEO_DEMONSTRATION", label: "Video", icon: Video },
  { type: "PROJECT_OUTCOME", label: "Project Outcome", icon: HardHat },
  { type: "SOURCE_CODE", label: "Code", icon: Code2 },
  { type: "WEB_INTELLIGENCE", label: "Web", icon: Globe },
];

export default function AdminArchieTraining() {
  const [domains, setDomains] = useState<ArchieDomain[]>([]);
  const [contributor, setContributor] = useState<ArchieContributor | null>(
    null,
  );
  const [ingestions, setIngestions] = useState<ArchieIngestion[]>([]);
  const [inputType, setInputType] = useState<ArchieInputType>("TEXT");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("architecture");
  const [region, setRegion] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [engineeringReviewed, setEngineeringReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Extraction preview BEFORE approval
  const [preview, setPreview] = useState<{
    ingestionId: string;
    extraction: ArchieExtraction;
    candidates: ArchieCandidate[];
    flags: string[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadIngestions = useCallback(async () => {
    try {
      const rows = await fetchIngestions({ limit: 25 });
      setIngestions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ingestions");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", auth.user.id)
          .maybeSingle();
        const me = await fetchMyContributor(
          profile?.role === "admin",
          auth.user.id,
          profile?.full_name ?? auth.user.email ?? "Admin",
        );
        setContributor(me);
        const doms = await fetchArchieDomains();
        setDomains(doms);
        await loadIngestions();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to initialize ARCHIE console",
        );
      }
    })();
  }, [loadIngestions]);

  const needsMedia = useMemo(
    () =>
      inputType !== "TEXT" &&
      inputType !== "WEB_INTELLIGENCE" &&
      inputType !== "SOURCE_CODE",
    [inputType],
  );

  async function handleSubmit() {
    setError("");
    setNotice("");
    setPreview(null);
    setSelected(new Set());
    if (!contributor) {
      setError("No contributor profile loaded.");
      return;
    }
    if (!title.trim()) {
      setError("A training title is required.");
      return;
    }

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
      setError("Attach a media file or provide text.");
      return;
    }

    setLoading(true);
    try {
      const res = await createArchieIngestion({
        input_type: inputType,
        title,
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
        `Extracted ${res.candidates?.length ?? 0} candidate(s). Review before approving, ARCHIE never promotes on its own.`,
      );
      setPreview({
        ingestionId: res.ingestionId,
        extraction: {
          summary: "",
          detected_domain: domain,
          detected_region: region || undefined,
          facts: [],
          warnings: (res.flags ?? []).slice(0, 10),
        },
        candidates: res.candidates ?? [],
        flags: res.flags ?? [],
      });
      setSelected(new Set((res.candidates ?? []).map((_, i) => i)));
      await loadIngestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training submission failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!preview || !contributor) return;
    const chosen = preview.candidates.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      setError("Select at least one candidate to approve.");
      return;
    }
    const highRisk = chosen.some((c) => c.requires_engineering_review);
    if (highRisk && !engineeringReviewed) {
      setError(
        "High-risk candidates require the engineering-review confirmation.",
      );
      return;
    }
    setLoading(true);
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
      await loadIngestions();
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!preview) return;
    setLoading(true);
    const res = await rejectIngestion(preview.ingestionId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Reject failed");
      return;
    }
    setNotice("Ingestion rejected, no knowledge was created.");
    setPreview(null);
    await loadIngestions();
  }

  const reviewRequired = contributor ? requiresReview(contributor) : true;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="ARCHIE Training"
        subtitle="Teach FRELUX's built-in AI, every submission is reviewed before it becomes knowledge"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <Check className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      <AdminCard className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {INPUT_TABS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setInputType(type);
                setFile(null);
              }}
              data-testid={`archie-tab-${type}`}
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                inputType === type
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-input hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Title">
            <AdminInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this training material?"
              data-testid="archie-title"
            />
          </AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Domain">
              <AdminSelect
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                data-testid="archie-domain"
              >
                {domains.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                    {d.is_core ? " (core)" : ""}
                    {d.risk_class !== "STANDARD" ? " ⚠" : ""}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Region (optional)">
              <AdminInput
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. NG-Lagos"
              />
            </AdminField>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Source reference (optional)">
            <AdminInput
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="URL, book, drawing number…"
            />
          </AdminField>
          {(needsMedia ||
            inputType === "IMAGE" ||
            inputType === "PDF_DOCUMENT") && (
            <AdminField label="Media file">
              <input
                type="file"
                accept="image/*,application/pdf,audio/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
                data-testid="archie-file"
              />
            </AdminField>
          )}
        </div>

        <AdminField label="Text / transcription / instructions">
          <AdminTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste the training material, or type instructions for text training…"
            data-testid="archie-text"
          />
        </AdminField>

        <div className="flex flex-wrap items-center gap-4">
          <label
            className="inline-flex items-center gap-2 text-sm"
            data-testid="archie-confirmed"
          >
            <input
              type="checkbox"
              checked={userConfirmed}
              onChange={(e) => setUserConfirmed(e.target.checked)}
              className="h-4 w-4"
            />
            I confirm these facts are accurate (USER_CONFIRMED)
          </label>
          <label
            className="inline-flex items-center gap-2 text-sm"
            data-testid="archie-eng-reviewed"
          >
            <input
              type="checkbox"
              checked={engineeringReviewed}
              onChange={(e) => setEngineeringReviewed(e.target.checked)}
              className="h-4 w-4"
            />
            Engineering review completed (high-risk domains)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <AdminButton
            onClick={handleSubmit}
            disabled={loading}
            data-testid="archie-submit"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Extract knowledge"
            )}
          </AdminButton>
          {reviewRequired && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Human review required
              before promotion
            </span>
          )}
        </div>
      </AdminCard>

      {preview && (
        <AdminCard className="space-y-4" data-testid="archie-preview">
          <div>
            <h3 className="flex items-center gap-2 font-medium">
              <ClipboardCheck className="h-4 w-4" /> Extraction preview :{" "}
              {preview.candidates.length} candidate(s)
            </h3>
            {preview.flags.length > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Flags: {preview.flags.join(", ")}
              </p>
            )}
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {preview.candidates.map((c, i) => (
              <div key={i} className="rounded-md border p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      setSelected(next);
                    }}
                    className="mt-1 h-4 w-4"
                    data-testid={`archie-candidate-${i}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.topic}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {c.evidence_state}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {c.knowledge_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        confidence {(c.confidence * 100).toFixed(0)}%
                      </span>
                      {c.requires_engineering_review && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <ShieldAlert className="h-3 w-3" /> engineering review
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {JSON.stringify(c.content).slice(0, 400)}
                    </p>
                    {c.evidence.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Evidence: “{c.evidence[0].slice(0, 160)}”
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Provenance: {c.provenance.contributor_name} ·{" "}
                      {c.provenance.input_type} ·{" "}
                      {c.provenance.ingested_at.slice(0, 10)}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <AdminButton
              onClick={handleApprove}
              disabled={loading}
              data-testid="archie-approve"
            >
              <Check className="h-4 w-4" /> Approve selected
            </AdminButton>
            <AdminButton
              onClick={handleReject}
              disabled={loading}
              variant="secondary"
              data-testid="archie-reject"
            >
              <X className="h-4 w-4" /> Reject
            </AdminButton>
          </div>
        </AdminCard>
      )}

      <AdminCard className="space-y-3">
        <h3 className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4" /> Recent ingestions
        </h3>
        <div className="space-y-2">
          {ingestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No training material yet.
            </p>
          )}
          {ingestions.map((ing) => (
            <div
              key={ing.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <span className="min-w-0 truncate font-medium">{ing.title}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {ing.input_type}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {ing.domain}
                </span>
                <span
                  className={classNames(
                    "rounded px-1.5 py-0.5",
                    ing.pipeline_state === "APPROVED" &&
                      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
                    ing.pipeline_state === "REJECTED" &&
                      "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                    ing.pipeline_state === "AWAITING_APPROVAL" &&
                      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                  )}
                >
                  {ing.pipeline_state}
                </span>
                <span>{ing.candidate_count} candidate(s)</span>
                <span>{new Date(ing.created_date).toLocaleDateString()}</span>
              </span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
