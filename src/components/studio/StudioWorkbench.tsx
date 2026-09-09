// =========================================================
// ARCHIE CODING STUDIO — SHARED OWNER WORKBENCH
//
// ONE implementation, TWO surfaces:
//   * /admin/archie-studio  (Admin console)
//   * /archie/coding        (ARCHIE Owner PWA)
//
// Same ARCHIE identity, same backend, same studio tables,
// same versions and permissions — no PWA-only duplicate.
//
// The full loop: BRIEF → ARCHIE BUILDS → LIVE PREVIEW (real
// code) → INSPECT FILES → FEEDBACK → NEW VERSION → ROLLBACK
// → ARCHIVE → APPROVE → VERIFIED PRODUCTION PACKAGE (no
// deploy).
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Code2,
  Eye,
  History,
  CheckCircle2,
  Undo2,
  AlertTriangle,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import {
  getStudioFiles,
  getStudioVersions,
  listStudioProjects,
  studioAction,
  type StudioFile,
  type StudioProject,
  type StudioVersion,
} from "@/lib/archie/studio-client";
import { composePreview } from "@/lib/studio/preview";

type Panel = "preview" | "code" | "history";

export default function StudioWorkbench() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(
    null,
  );
  const [files, setFiles] = useState<StudioFile[]>([]);
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState("index.html");
  const [panel, setPanel] = useState<Panel>("preview");
  const [brief, setBrief] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const previewKey = useRef(0);

  // ---- load project list ----
  useEffect(() => {
    let alive = true;
    listStudioProjects()
      .then((ps) => alive && setProjects(ps))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [refreshTick]);

  const openProject = useCallback(async (p: StudioProject) => {
    setActiveProject(p);
    setError(null);
    setStatus(null);
    try {
      const [fs, vs] = await Promise.all([
        getStudioFiles(p.id),
        getStudioVersions(p.id),
      ]);
      setFiles(fs);
      setVersions(vs);
      setSelectedFile(
        fs.find((f) => f.path === "index.html")?.path ?? fs[0]?.path ?? null,
      );
      setCurrentPage("index.html");
      setPanel("preview");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const previewDoc = activeProject ? composePreview(files, currentPage) : null;

  // ---- actions ----
  const runAction = useCallback(
    async (fn: () => ReturnType<typeof studioAction>, successNote: string) => {
      setBusy(true);
      setError(null);
      setStatus(null);
      try {
        const res = await fn();
        setStatus(res.message ?? successNote);
        setRefreshTick((t) => t + 1);
        if (res.projectId) {
          const { listStudioProjects } =
            await import("@/lib/archie/studio-client");
          const projects = await listStudioProjects();
          const fresh = projects.find((x) => x.id === res.projectId);
          if (fresh) await openProject(fresh);
        }
        if (res.files) {
          setFiles(res.files);
          const idx = res.files.find((f) => f.path === "index.html");
          if (idx) setCurrentPage("index.html");
        }
        previewKey.current += 1;
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [openProject],
  );

  // ---- preview harness: listen for internal navigation ----
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; page?: string };
      if (d?.type === "archie-studio-nav" && d.page) {
        setCurrentPage(d.page);
        previewKey.current += 1;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ARCHIE Coding Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            An isolated workspace where ARCHIE plans, writes real code,
            validates it, and runs it live for your review. Iterations are
            versioned, nothing touches production, and deployment stays under
            your explicit authority.
          </p>
        </div>
      </div>

      {/* NEW PROJECT BRIEF */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="studio-brief"
        >
          New project brief
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            id="studio-brief"
            className="min-h-[64px] flex-1 rounded-md border border-input bg-background p-3 text-sm"
            placeholder='e.g. "Create a professional interior business website with 2 pages"'
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={busy}
          />
          <Button
            className="sm:w-44"
            disabled={busy || brief.trim().length < 8}
            onClick={() =>
              runAction(
                () => studioAction("create", { brief: brief.trim() }),
                "Project created.",
              )
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Code2 className="h-4 w-4" aria-hidden />
            )}
            Build project
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>{error}</div>
        </div>
      )}
      {status && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>{status}</div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* PROJECT LIST */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Projects
          </p>
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No studio projects yet. Write a brief above.
            </p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => openProject(p)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                activeProject?.id === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="font-medium">{p.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {p.status === "READY_FOR_DEPLOYMENT" ? "✓ Approved" : "Draft"} ·{" "}
                {new Date(p.updated_date).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>

        {/* WORKBENCH */}
        {activeProject ? (
          <div className="rounded-xl border border-border bg-card">
            {/* header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{activeProject.name}</p>
                {activeProject.summary && (
                  <p className="max-w-xl text-xs text-muted-foreground">
                    {activeProject.summary}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={
                  busy || activeProject.status === "READY_FOR_DEPLOYMENT"
                }
                title="Archive this project (removes it from the active list; versions are preserved)"
                onClick={() =>
                  runAction(
                    () =>
                      studioAction("archive", { projectId: activeProject.id }),
                    "Project archived.",
                  )
                }
              >
                <Archive className="mr-1 h-4 w-4" aria-hidden /> Archive
              </Button>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={panel === "preview" ? "default" : "ghost"}
                  onClick={() => setPanel("preview")}
                >
                  <Eye className="mr-1 h-4 w-4" aria-hidden /> Preview
                </Button>
                <Button
                  size="sm"
                  variant={panel === "code" ? "default" : "ghost"}
                  onClick={() => setPanel("code")}
                >
                  <Code2 className="mr-1 h-4 w-4" aria-hidden /> Code
                </Button>
                <Button
                  size="sm"
                  variant={panel === "history" ? "default" : "ghost"}
                  onClick={() => setPanel("history")}
                >
                  <History className="mr-1 h-4 w-4" aria-hidden /> History
                </Button>
              </div>
            </div>

            {/* PREVIEW — the actual running code, sandboxed */}
            {panel === "preview" && (
              <div className="p-3">
                {files.filter((f) => f.path.endsWith(".html")).length > 1 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {files
                      .filter((f) => f.path.endsWith(".html"))
                      .map((f) => (
                        <Button
                          key={f.path}
                          size="sm"
                          variant={
                            currentPage === f.path ? "secondary" : "ghost"
                          }
                          onClick={() => {
                            setCurrentPage(f.path);
                            previewKey.current += 1;
                          }}
                        >
                          {f.path}
                        </Button>
                      ))}
                  </div>
                )}
                <iframe
                  key={`${activeProject.id}-${currentPage}-${previewKey.current}`}
                  title={`Live preview of ${currentPage}`}
                  sandbox="allow-scripts allow-forms"
                  className="h-[560px] w-full rounded-lg border border-border bg-background"
                  srcDoc={previewDoc?.html ?? ""}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Live preview of the actual executable code, sandboxed and
                  isolated from FRELUX. Internal links navigate within the
                  preview.
                </p>
              </div>
            )}

            {/* CODE — inspect the real files */}
            {panel === "code" && (
              <div className="grid gap-3 p-3 md:grid-cols-[180px_1fr]">
                <div className="space-y-1">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => setSelectedFile(f.path)}
                      className={`w-full rounded px-2 py-1.5 text-left text-xs font-mono ${
                        selectedFile === f.path
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f.path}
                    </button>
                  ))}
                </div>
                <pre className="max-h-[560px] overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                  <code>
                    {files.find((f) => f.path === selectedFile)?.content ?? ""}
                  </code>
                </pre>
              </div>
            )}

            {/* HISTORY — immutable versions + rollback */}
            {panel === "history" && (
              <div className="max-h-[600px] space-y-2 overflow-auto p-3">
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No versions yet.
                  </p>
                )}
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {v.label}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({v.kind})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_date).toLocaleString()} · {v.reason}
                      </p>
                      {v.engine_note && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          {v.engine_note}
                        </p>
                      )}
                    </div>
                    {v.kind !== "PRODUCTION_BUILD" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            () =>
                              studioAction("rollback", {
                                projectId: activeProject.id,
                                versionId: v.id,
                              }),
                            "Rolled back.",
                          )
                        }
                      >
                        <Undo2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Roll
                        back here
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FEEDBACK + APPROVE */}
            <div className="space-y-3 border-t border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder='Feedback: "move the hero text up", "add a pricing section", "fix the button color"'
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={busy}
                />
                <Button
                  size="sm"
                  disabled={busy || feedback.trim().length < 3}
                  onClick={() =>
                    runAction(
                      () =>
                        studioAction("feedback", {
                          projectId: activeProject.id,
                          comment: feedback.trim(),
                        }),
                      "Feedback applied.",
                    )
                  }
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Apply feedback
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                disabled={
                  busy || activeProject.status === "READY_FOR_DEPLOYMENT"
                }
                onClick={() =>
                  runAction(
                    () =>
                      studioAction("approve", { projectId: activeProject.id }),
                    "Approved.",
                  )
                }
              >
                <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                {activeProject.status === "READY_FOR_DEPLOYMENT"
                  ? "Approved — production package ready (deployment is owner-authorized)"
                  : "Approve as production-ready"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Select a project, or create one from a brief above.
          </div>
        )}
      </div>
    </div>
  );
}
