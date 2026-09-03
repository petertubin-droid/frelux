import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  Bug,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileCode,
  Zap,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  analyzeErrorWithAI,
  generateErrorFix,
  approveFix,
  fetchRecentErrorsForStudio,
  fetchFixHistory,
  type ErrorDiagnosis,
  type ErrorFix,
  type ErrorFixHistoryRecord,
} from "@/lib/error-analysis";
import { ToolHeader } from "@/components/studio/StudioShared";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

// ── Types ──

interface AppError {
  id: string;
  created_at: string;
  severity: "low" | "medium" | "high" | "critical";
  error_type: string;
  message: string;
  stack_trace: string | null;
  route: string | null;
  feature: string | null;
  calculator: string | null;
  http_status: number | null;
  service: string | null;
  browser: string | null;
  operating_system: string | null;
  device_type: string | null;
  app_version: string | null;
  session_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  fingerprint: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  medium:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  analyzing:
    "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
  fix_proposed:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  awaiting_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  validation_failed:
    "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  approved:
    "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary-light",
  deployed:
    "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary-light",
  verified:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  rolled_back:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ErrorAnalysis() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialErrorId =
    (location.state as { errorId?: string })?.errorId ||
    queryParams.get("errorId");

  const [recentErrors, setRecentErrors] = useState<AppError[]>([]);
  const [selectedError, setSelectedError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingFix, setGeneratingFix] = useState(false);
  const [diagnosis, setDiagnosis] = useState<ErrorDiagnosis | null>(null);
  const [fix, setFix] = useState<ErrorFix | null>(null);
  const [_aiResponse, setAiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixHistory, setFixHistory] = useState<ErrorFixHistoryRecord[]>([]);
  const [allFixHistory, setAllFixHistory] = useState<ErrorFixHistoryRecord[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<"errors" | "history">(
    initialErrorId ? "errors" : "errors",
  );
  const [approving, setApproving] = useState(false);

  // ── Load recent errors ──
  const loadRecentErrors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecentErrorsForStudio(30);
      setRecentErrors(data as AppError[]);
      // If an error ID was passed, select it
      if (initialErrorId) {
        const { data: errorData } = await supabase
          .from("application_errors")
          .select("*")
          .eq("id", initialErrorId)
          .single();
        if (errorData) {
          setSelectedError(errorData as AppError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load errors");
    } finally {
      setLoading(false);
    }
  }, [initialErrorId]);

  // ── Load fix history ──
  const loadFixHistory = useCallback(async () => {
    try {
      const history = await fetchFixHistory(50);
      setAllFixHistory(history);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    loadRecentErrors();
    loadFixHistory();
  }, [loadRecentErrors, loadFixHistory]);

  // ── Analyze error ──
  const handleAnalyze = async (err: AppError) => {
    setSelectedError(err);
    setAnalyzing(true);
    setError(null);
    setDiagnosis(null);
    setFix(null);
    setAiResponse(null);
    try {
      const { diagnosis: diag, rawResponse } = await analyzeErrorWithAI(err);
      setDiagnosis(diag);
      setAiResponse(rawResponse);
      // Load fix history for this error
      const { data: history } = await supabase
        .from("error_fix_history")
        .select("*")
        .eq("error_id", err.id)
        .order("created_at", { ascending: false });
      setFixHistory((history ?? []) as ErrorFixHistoryRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Generate fix ──
  const handleGenerateFix = async () => {
    if (!selectedError) return;
    setGeneratingFix(true);
    setError(null);
    try {
      const { fix: fixResult, rawResponse } = await generateErrorFix(
        selectedError,
        diagnosis ?? undefined,
      );
      setFix(fixResult);
      setAiResponse(rawResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix generation failed");
    } finally {
      setGeneratingFix(false);
    }
  };

  // ── Approve fix ──
  const handleApprove = async () => {
    if (!selectedError || !fixHistory[0]) return;
    setApproving(true);
    try {
      await approveFix(fixHistory[0].id);
      // Refresh history
      const { data: history } = await supabase
        .from("error_fix_history")
        .select("*")
        .eq("error_id", selectedError.id)
        .order("created_at", { ascending: false });
      setFixHistory((history ?? []) as ErrorFixHistoryRecord[]);
      loadFixHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <ToolHeader
        icon={Bug}
        title="Error Analysis"
        description="Diagnose application errors with AI and generate safe fixes"
      />

      {/* ── Navigation ── */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/admin/studio"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-purple"
        >
          <ArrowLeft aria-hidden="true" className="h-3 w-3" /> Back to Studio
        </Link>
        <Link
          to="/admin/system-health"
          className="text-xs text-brand-purple hover:underline"
        >
          System Health →
        </Link>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 border-b border-border dark:border-white/10">
        {(["errors", "history"] as const).map((tab) => (
          <Button variant="ghost"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={classNames(
              "px-4 py-2 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-brand-purple text-brand-purple"
                : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60",
            )}
          >
            {tab === "errors" ? "Recent Errors" : "Fix History"}
          </Button>
        ))}
      </div>

      {/* ── Errors Tab ── */}
      {activeTab === "errors" && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Error list */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unresolved Errors
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unresolved errors.</p>
            ) : (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {recentErrors.map((e) => (
                  <Button variant="ghost"
                    key={e.id}
                    onClick={() => handleAnalyze(e)}
                    className={classNames(
                      "w-full rounded-lg border p-3 text-left transition-all",
                      selectedError?.id === e.id
                        ? "border-brand-purple bg-primary/5"
                        : "border-border hover:border-border dark:border-white/5 dark:hover:border-white/10",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={classNames(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                          SEVERITY_STYLES[e.severity],
                        )}
                      >
                        {e.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.occurrence_count > 1
                          ? `${e.occurrence_count}×`
                          : formatDate(e.last_seen)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-card-foreground dark:text-muted-foreground/80">
                      {e.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.feature ?? "—"}
                    </p>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Analysis panel */}
          <div className="space-y-4">
            {!selectedError ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border p-12 dark:border-white/5">
                <Bug className="h-8 w-8 text-muted-foreground/80" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select an error to analyze with AI
                </p>
              </div>
            ) : (
              <>
                {/* Error summary */}
                <div className="rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
                  <div className="flex items-start gap-3">
                    <span
                      className={classNames(
                        "rounded px-2 py-0.5 text-[10px] font-medium border",
                        SEVERITY_STYLES[selectedError.severity],
                      )}
                    >
                      {selectedError.severity.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                        {selectedError.message}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{selectedError.error_type}</span>
                        {selectedError.feature && (
                          <span>· {selectedError.feature}</span>
                        )}
                        {selectedError.route && (
                          <span>· {selectedError.route}</span>
                        )}
                        {selectedError.calculator && (
                          <span>· {selectedError.calculator}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analyze button (initial) */}
                {!diagnosis && !analyzing && !error && (
                  <Button variant="ghost"
                    onClick={() => handleAnalyze(selectedError)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Zap aria-hidden="true" className="h-4 w-4" /> Analyze with
                    AI
                  </Button>
                )}

                {analyzing && (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-border p-6 dark:border-white/5">
                    <svg
                      className="h-5 w-5 animate-spin text-brand-purple"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-sm text-muted-foreground">
                      AI is analyzing the error...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                    <Button variant="ghost"
                      onClick={() => setError(null)}
                      className="ml-2 text-xs underline"
                    >
                      dismiss
                    </Button>
                  </div>
                )}

                {/* Diagnosis result */}
                {diagnosis && !analyzing && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
                      <div className="mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-brand-purple" />
                        <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                          AI Diagnosis
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <DiagnosisField
                          label="What failed"
                          value={diagnosis.what_failed}
                        />
                        <DiagnosisField
                          label="Where failed"
                          value={diagnosis.where_failed}
                        />
                        <DiagnosisField
                          label="Root cause"
                          value={diagnosis.root_cause}
                        />
                        <DiagnosisField
                          label="Affected file/component"
                          value={diagnosis.affected_file}
                          icon={<FileCode className="h-3.5 w-3.5" />}
                        />
                        <DiagnosisField
                          label="Category"
                          value={diagnosis.category}
                        />
                        <DiagnosisField
                          label="Proposed solution"
                          value={diagnosis.proposed_solution}
                        />
                        <DiagnosisField
                          label="Recommended action"
                          value={diagnosis.recommended_action}
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                            Risk level:
                          </span>
                          <span
                            className={classNames(
                              "rounded px-2 py-0.5 text-[10px] font-medium",
                              diagnosis.risk_level === "critical"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                : diagnosis.risk_level === "high"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                                  : diagnosis.risk_level === "medium"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
                            )}
                          >
                            {diagnosis.risk_level.toUpperCase()}
                          </span>
                        </div>

                        {diagnosis.protected_functionality_affected && (
                          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            <ShieldAlert className="h-4 w-4" />
                            <span className="font-medium">
                              ⚠️ Protected FRELUX Logic Detected — explicit
                              admin approval required
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Generate Fix */}
                    {!fix && !generatingFix && (
                      <Button variant="default"
                        onClick={handleGenerateFix}
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold hover:/90"
                      >
                        <FileCode className="h-4 w-4" /> Generate Fix
                      </Button>
                    )}

                    {generatingFix && (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-border p-4 dark:border-white/5">
                        <svg
                          className="h-4 w-4 animate-spin text-brand-purple"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span className="text-sm text-muted-foreground">
                          Generating fix...
                        </span>
                      </div>
                    )}

                    {/* Proposed fix */}
                    {fix && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
                          <div className="mb-3 flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-brand-purple" />
                            <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                              Proposed Fix
                            </h3>
                          </div>
                          <div className="space-y-3">
                            <DiagnosisField
                              label="File"
                              value={fix.file}
                              icon={<FileCode className="h-3.5 w-3.5" />}
                            />
                            <DiagnosisField
                              label="Explanation"
                              value={fix.explanation}
                            />
                            <DiagnosisField
                              label="Expected effect"
                              value={fix.expected_effect}
                            />

                            {/* Code diff */}
                            {fix.existing_code &&
                              fix.existing_code !== "see source" && (
                                <div>
                                  <span className="text-xs font-medium text-red-500">
                                    Existing code:
                                  </span>
                                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-red-950 p-3 text-xs text-red-200">
                                    {fix.existing_code}
                                  </pre>
                                </div>
                              )}
                            {fix.proposed_code && (
                              <div>
                                <span className="text-xs font-medium text-emerald-500">
                                  Proposed code:
                                </span>
                                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-200">
                                  {fix.proposed_code}
                                </pre>
                              </div>
                            )}

                            {fix.protected_functionality_affected && (
                              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="font-medium">
                                  ⚠️ Protected FRELUX Logic Detected — requires
                                  explicit admin approval
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                Risk level:
                              </span>
                              <span
                                className={classNames(
                                  "rounded px-2 py-0.5 text-[10px] font-medium",
                                  fix.risk_level === "high"
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                                    : fix.risk_level === "medium"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
                                )}
                              >
                                {fix.risk_level.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Approve & Apply */}
                          <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4 dark:border-white/5">
                            <Button variant="ghost"
                              onClick={handleApprove}
                              disabled={approving}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {approving
                                ? "Approving..."
                                : "Approve & Apply Fix"}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Fix will be applied via Git commit and deployed
                              through the existing CI/CD pipeline
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fix history for this error */}
                {fixHistory.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
                    <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-primary-foreground">
                      Fix History for This Error
                    </h3>
                    <div className="space-y-2">
                      {fixHistory.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 p-2 dark:border-white/5"
                        >
                          <span
                            className={classNames(
                              "rounded px-2 py-0.5 text-[10px] font-medium",
                              STATUS_STYLES[h.status] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {h.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {formatDate(h.created_at)}
                          </span>
                          {h.approved_by && (
                            <span className="text-xs text-muted-foreground">
                              · Approved
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fix History Tab ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {allFixHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border p-12 dark:border-white/5">
              <Clock className="h-8 w-8 text-muted-foreground/80" />
              <p className="mt-2 text-sm text-muted-foreground">
                No fix history yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground dark:border-white/10 dark:text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Error</th>
                    <th className="pb-2 pr-3 font-medium">Severity</th>
                    <th className="pb-2 pr-3 font-medium">Approved</th>
                    <th className="pb-2 pr-3 font-medium">Created</th>
                    <th className="pb-2 font-medium">Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {allFixHistory.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-border/50 hover:bg-muted/50 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="py-2 pr-3">
                        <span
                          className={classNames(
                            "rounded px-2 py-0.5 text-[10px] font-medium",
                            STATUS_STYLES[h.status] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {h.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-[300px] truncate text-card-foreground dark:text-muted-foreground/80">
                        {h.error_message}
                      </td>
                      <td className="py-2 pr-3">
                        {h.error_severity && (
                          <span
                            className={classNames(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                              SEVERITY_STYLES[h.error_severity] ?? "",
                            )}
                          >
                            {h.error_severity.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {h.approved_at ? formatDate(h.approved_at) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {formatDate(h.created_at)}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {h.deployed_at ? formatDate(h.deployed_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function DiagnosisField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  if (!value || value === "unknown" || value === "none") return null;
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
        {label}:{" "}
      </span>
      <span className="text-sm text-foreground dark:text-muted-foreground/60">
        {icon}
        {value}
      </span>
    </div>
  );
}
