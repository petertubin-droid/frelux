// =========================================================
// FRELUX ARCHIE — EVOLUTION CONTROL CENTER (§4, §17, §20)
//
// The owner's control surface for ARCHIE self-evolution, inside
// the protected admin environment (RLS + RequireAdmin route):
//   * Language Learning settings
//   * Self-Modification settings
//   * Change Request approval / rejection / rollback, with
//     EVERYTHING shown: what, why, files, diff, risk, tests,
//     security & data impact, rollback plan (§4)
//   * Language Registry (registered / learned / learning /
//     discovered)
//   * Evolution Memory (lessons learned)
//
// Approvals here go through the server-side archie-owner-auth
// flow (PBKDF2-verified) — this page never treats a typed
// command or a recommendation as authorization.
// =========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dna,
  GitBranch,
  Languages,
  Loader2,
  ScrollText,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminCard,
  AdminField,
  AdminTabButton,
  StateMessage,
} from "@/components/admin/AdminUi";
import { Switch } from "@/components/ui/shadcn/switch";
// The evolution barrel (@/lib/archie/evolution) is the
// canonical entry point for the self-evolution layer.
import {
  buildApprovalView,
  parseOwnerCommand,
  DEFAULT_EVOLUTION_SETTINGS,
  fetchChangeRequests,
  fetchEvolutionMemory,
  fetchEvolutionSettings,
  fetchLanguageProfiles,
  saveEvolutionSettings,
  transitionChangeRequestServer,
} from "@/lib/archie/evolution";
import type {
  EvolutionChangeRequest,
  EvolutionMemoryEntry,
  EvolutionSettings,
  LanguageProfile,
} from "@/lib/archie/evolution";
import { authorizeOwnerChange } from "@/lib/archie/mobile/owner-authorization";

type Tab = "settings" | "changes" | "languages" | "memory";

const STATE_LABELS: Record<string, string> = {
  PROPOSED: "Proposed",
  AWAITING_OWNER: "Awaiting owner",
  AUTHORIZED: "Staging authorized",
  STAGING: "Staging",
  TESTING: "Testing",
  PASSED: "Tests passed",
  FAILED: "Tests failed",
  EXECUTED: "Executed",
  REJECTED: "Rejected",
  ROLLED_BACK: "Rolled back",
};

const REGISTRY_LABELS: Record<string, string> = {
  frelux_registered: "FRELUX REGISTERED",
  archie_learned: "ARCHIE LEARNED",
  currently_learning: "CURRENTLY LEARNING",
  discovered: "DISCOVERED",
};

function confidencePct(c: number | null): string {
  return c === null ? "unknown" : `${Math.round(c * 100)}%`;
}

/** A settings row with label + description (AdminUi's Toggle is
 *  bare; the descriptive row lives here). */
function SettingRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export default function AdminArchieEvolution() {
  const [tab, setTab] = useState<Tab>("settings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [settings, setSettings] = useState<EvolutionSettings>(
    DEFAULT_EVOLUTION_SETTINGS,
  );
  const [changeRequests, setChangeRequests] = useState<
    EvolutionChangeRequest[]
  >([]);
  const [languageProfiles, setLanguageProfiles] = useState<LanguageProfile[]>(
    [],
  );
  const [memory, setMemory] = useState<EvolutionMemoryEntry[]>([]);
  const [openCr, setOpenCr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [s, cr, langs, mem] = await Promise.all([
      fetchEvolutionSettings(),
      fetchChangeRequests(),
      fetchLanguageProfiles(),
      fetchEvolutionMemory(),
    ]);
    if (!s.ok) setError(s.error);
    else setSettings(s.data);
    if (cr.ok) setChangeRequests(cr.data);
    else if (!cr.ok) setError(cr.error);
    if (langs.ok) setLanguageProfiles(langs.data);
    else setError(langs.error);
    if (mem.ok) setMemory(mem.data);
    else setError(mem.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const saveSettings = useCallback(async () => {
    setSavingSettings(true);
    setError(null);
    setNotice(null);
    const next: EvolutionSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    const result = await saveEvolutionSettings(next);
    if (result.ok) {
      setSettings(result.data);
      setNotice("Evolution settings saved.");
    } else {
      setError(result.error);
    }
    setSavingSettings(false);
  }, [settings]);

  // ---------------------------------------------------------
  // Owner-gated decisions — every one requires the owner secret
  // and produces a server-verified authorization record.
  // ---------------------------------------------------------
  const decide = useCallback(
    async (
      cr: EvolutionChangeRequest,
      decision: "authorize" | "reject" | "execute" | "rollback",
    ) => {
      setError(null);
      setNotice(null);
      const actionLabel = {
        authorize: `authorize staging of ${cr.crNumber}`,
        reject: `reject ${cr.crNumber}`,
        execute: `authorize PRODUCTION execution of ${cr.crNumber}`,
        rollback: `roll back ${cr.crNumber}`,
      }[decision];

      let resultingCommit: string | undefined;
      if (decision === "execute") {
        // Production application happens through the owner's Git
        // workflow; the resulting commit must be recorded — no
        // fake deploy success (§22).
        const sha = window.prompt(
          `Production execution of ${cr.crNumber}: enter the resulting Git commit SHA (the merged/approved commit).`,
        );
        if (!sha || !sha.trim()) return;
        resultingCommit = sha.trim();
      }

      const secret = window.prompt(
        `ARCHIE Evolution — ${actionLabel}\n\nEnter the owner authorization secret. It is verified server-side (archie-owner-auth, PBKDF2) and never stored in the browser.`,
      );
      if (!secret || !secret.trim()) return;

      // The server verifies the owner secret and returns the
      // authorization record — nothing here fabricates approval.
      const auth = await authorizeOwnerChange({
        secret,
        changeKind: "CODE_CHANGE",
        target: cr.crNumber,
        currentVersion: cr.archieVersion,
        proposedVersion: resultingCommit ?? cr.crNumber,
        beforeState: { cr: cr.crNumber, state: cr.state },
        afterState: { cr: cr.crNumber, decision },
        testsPassed:
          cr.testResults?.summary === "all_passed" ||
          decision === "reject" ||
          decision === "rollback",
        rollbackRef: cr.rollbackPlan,
        reason: `Evolution decision (${decision}) on ${cr.crNumber}: ${cr.title}`,
      });
      if (!auth.ok || !auth.authorization) {
        setError(
          auth.error ??
            "Server-side owner verification failed — no approval recorded.",
        );
        return;
      }
      const recordId = auth.authorization.id;
      const result = await transitionChangeRequestServer(
        cr,
        decision,
        recordId,
        resultingCommit,
      );
      if (result.ok) {
        setNotice(
          `${cr.crNumber}: ${decision} recorded (server-verified authorization ${recordId}).`,
        );
        await loadAll();
      } else {
        setError(result.error);
      }
    },
    [loadAll],
  );

  // ---------------------------------------------------------
  // Owner command console — parsed with the same deterministic
  // parser; shows what each command ACTUALLY does (§18).
  // ---------------------------------------------------------
  const [commandText, setCommandText] = useState("");
  const parsedCommand = useMemo(
    () => (commandText.trim() ? parseOwnerCommand(commandText) : null),
    [commandText],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the Evolution
        Control Center…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="ARCHIE Evolution Control Center"
        subtitle="Owner authority over ARCHIE's learning, proposals and modifications. Learning never equals authority: ARCHIE observes, learns and proposes — only you authorize."
      />

      {error && <StateMessage type="error" title="Error" message={error} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <AdminTabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          Owner Settings
        </AdminTabButton>
        <AdminTabButton
          active={tab === "changes"}
          onClick={() => setTab("changes")}
        >
          Change Requests ({changeRequests.length})
        </AdminTabButton>
        <AdminTabButton
          active={tab === "languages"}
          onClick={() => setTab("languages")}
        >
          Language Registry ({languageProfiles.length})
        </AdminTabButton>
        <AdminTabButton
          active={tab === "memory"}
          onClick={() => setTab("memory")}
        >
          Evolution Memory ({memory.length})
        </AdminTabButton>
      </div>

      {tab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Language Learning</h2>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">
              Universal language learning with persistent, evidence-based
              memory. The FRELUX Language Dictionary stays intact as the
              registered set.
            </p>
            <div className="divide-y divide-border">
              <SettingRow
                label="Universal Language Learning"
                description="Master switch for the entire language layer."
                checked={settings.language.enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, enabled: v },
                  }))
                }
              />
              <SettingRow
                label="Automatic Language Learning"
                description="ARCHIE may begin learning without a per-language owner command."
                checked={settings.language.autoLearning}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, autoLearning: v },
                  }))
                }
              />
              <SettingRow
                label="Automatic Language Memory"
                description="Learned information may become permanent memory automatically once confidence is sufficient."
                checked={settings.language.autoMemory}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, autoMemory: v },
                  }))
                }
              />
              <SettingRow
                label="External Language Research"
                description="ARCHIE may research languages through permitted external sources."
                checked={settings.language.externalResearch}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, externalResearch: v },
                  }))
                }
              />
              <SettingRow
                label="Dialect Learning"
                description="Regional/dialect variants are learned as coexisting variants."
                checked={settings.language.dialectLearning}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, dialectLearning: v },
                  }))
                }
              />
              <SettingRow
                label="Require approval before permanent memory"
                description="SAFEST: you confirm what ARCHIE may permanently remember."
                checked={settings.language.requireApprovalBeforePermanentMemory}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    language: {
                      ...s.language,
                      requireApprovalBeforePermanentMemory: v,
                    },
                  }))
                }
              />
            </div>
            <div className="pt-4">
              <AdminField
                label={`Minimum confidence threshold — ${confidencePct(settings.language.minConfidenceThreshold)}`}
                hint="Permanent language memory requires at least this confidence."
              >
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(
                    settings.language.minConfidenceThreshold * 100,
                  )}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      language: {
                        ...s.language,
                        minConfidenceThreshold: Number(e.target.value) / 100,
                      },
                    }))
                  }
                  className="w-full"
                />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Self-Modification</h2>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">
              OBSERVE and PROPOSE are always available; STAGE and EXECUTE stay
              off until you enable them. Production changes additionally require
              a separate, explicit, server-verified authorization every time.
            </p>
            <div className="divide-y divide-border">
              <SettingRow
                label="Self-Code Analysis"
                description="ARCHIE may inspect code, identify bugs, debt and improvements. (OBSERVE)"
                checked={settings.selfModification.selfCodeAnalysis}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      selfCodeAnalysis: v,
                    },
                  }))
                }
              />
              <SettingRow
                label="Automatic Change Proposals"
                description="ARCHIE may create change proposals automatically from what it identifies."
                checked={settings.selfModification.automaticChangeProposals}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      automaticChangeProposals: v,
                    },
                  }))
                }
              />
              <SettingRow
                label="Staging Permission"
                description="Authorized changes may be applied to the staging environment."
                checked={settings.selfModification.stagingPermission}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      stagingPermission: v,
                    },
                  }))
                }
              />
              <SettingRow
                label="Production Modification"
                description="ULTIMATE GATE: even when on, every production change needs your explicit approval of that specific change."
                checked={settings.selfModification.productionModification}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      productionModification: v,
                    },
                  }))
                }
              />
              <SettingRow
                label="Require Explicit Approval"
                description="Cannot be turned off — approval is the floor, not the ceiling."
                checked={settings.selfModification.requireExplicitApproval}
                onChange={() => undefined}
                disabled
              />
              <SettingRow
                label="Automatic Rollback"
                description="Recommend rollback automatically when post-deployment validation fails. Executing the rollback remains owner-gated."
                checked={settings.selfModification.automaticRollback}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      automaticRollback: v,
                    },
                  }))
                }
              />
            </div>
            <div className="pt-4">
              <AdminField
                label="Maximum change risk allowed"
                hint="Changes above this risk are refused outright."
              >
                <select
                  value={settings.selfModification.maxChangeRiskAllowed}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      selfModification: {
                        ...s.selfModification,
                        maxChangeRiskAllowed: e.target.value as
                          "low" | "medium" | "high",
                      },
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </AdminField>
            </div>
          </AdminCard>

          <div className="lg:col-span-2">
            <AdminButton
              onClick={() => void saveSettings()}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}{" "}
              Save Owner Settings
            </AdminButton>
            <p className="mt-2 text-xs text-muted-foreground">
              Protected surfaces (authority, auth, secrets, audit, approval) can
              never be de-protected through settings — the validation refuses
              it.
            </p>
          </div>
        </div>
      )}

      {tab === "changes" && (
        <div className="space-y-4">
          {changeRequests.length === 0 && (
            <AdminCard>
              <h2 className="font-semibold">No change requests yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When ARCHIE identifies an improvement (OBSERVE) or proposes a
                change (PROPOSE), it appears here with the full approval view.
                Nothing is ever hidden from you: what will change, why, files,
                diff, risk, tests, security & data impact, and the rollback
                plan.
              </p>
            </AdminCard>
          )}
          {changeRequests.map((cr) => {
            const view = buildApprovalView(cr);
            const isOpen = openCr === cr.id;
            return (
              <AdminCard key={cr.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold">
                      {cr.crNumber} — {cr.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-1 font-medium">
                      {STATE_LABELS[cr.state] ?? cr.state}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      risk: {view.risk}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      level: {view.requestedLevel}
                    </span>
                    {cr.requiresOwnerIntervention && (
                      <span className="rounded-full bg-destructive/15 px-2 py-1 font-medium text-destructive">
                        protected surface — owner intervention required
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setOpenCr(isOpen ? null : cr.id)}
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isOpen
                    ? "Hide the full change"
                    : "Show me exactly what will change"}
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <h3 className="font-medium">WHAT WILL CHANGE</h3>
                      <p className="text-muted-foreground">
                        {view.whatWillChange}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">WHY</h3>
                      <p className="text-muted-foreground">{view.why}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">FILES AFFECTED</h3>
                      <ul className="text-muted-foreground">
                        {view.filesAffected.map((f) => (
                          <li key={f} className="font-mono text-xs">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium">PROPOSED DIFF</h3>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                        {view.diff}
                      </pre>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <h3 className="font-medium">SECURITY IMPACT</h3>
                        <p className="text-muted-foreground">
                          {view.securityImpact}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium">DATA IMPACT</h3>
                        <p className="text-muted-foreground">
                          {view.dataImpact}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">TEST RESULTS</h3>
                      {view.testResults ? (
                        <ul className="text-muted-foreground">
                          {view.testResults.checks.map((c) => (
                            <li key={c.name} className="font-mono text-xs">
                              {c.status === "passed"
                                ? "✓"
                                : c.status === "failed"
                                  ? "✗"
                                  : "–"}{" "}
                              {c.name}: {c.detail}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">Not run yet.</p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">ROLLBACK PLAN</h3>
                      <p className="text-muted-foreground">
                        {view.rollbackPlan}
                      </p>
                    </div>
                    {cr.resultingCommit && (
                      <div>
                        <h3 className="font-medium">RESULTING COMMIT</h3>
                        <p className="font-mono text-xs text-muted-foreground">
                          {cr.resultingCommit}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {cr.state === "AWAITING_OWNER" && (
                    <>
                      <AdminButton onClick={() => void decide(cr, "authorize")}>
                        Authorize staging
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => void decide(cr, "reject")}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </AdminButton>
                    </>
                  )}
                  {cr.state === "PASSED" && (
                    <>
                      <AdminButton onClick={() => void decide(cr, "execute")}>
                        <CheckCircle2 className="h-4 w-4" /> Approve for
                        production
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => void decide(cr, "reject")}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </AdminButton>
                    </>
                  )}
                  {cr.state === "EXECUTED" && (
                    <AdminButton
                      variant="secondary"
                      onClick={() => void decide(cr, "rollback")}
                    >
                      <Undo2 className="h-4 w-4" /> Roll back
                    </AdminButton>
                  )}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {tab === "languages" && (
        <div className="space-y-4">
          <AdminCard>
            <div className="mb-2 flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">ARCHIE Language Registry</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              FRELUX REGISTERED (the owner's dictionary) · ARCHIE LEARNED
              (validated by evidence) · CURRENTLY LEARNING · DISCOVERED
              (identified, not yet validated). No maximum language count;
              Unicode and multiple writing systems supported.
            </p>
          </AdminCard>
          {languageProfiles.length === 0 && (
            <AdminCard>
              <h2 className="font-semibold">No learned languages yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When language learning is enabled and ARCHIE encounters a
                language, its profile appears here with confidence, verification
                status and validation states.
              </p>
            </AdminCard>
          )}
          {languageProfiles.map((p) => (
            <AdminCard key={p.id}>
              <h2 className="font-semibold">
                {p.name} — {p.nativeName}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-1 font-medium">
                  {REGISTRY_LABELS[p.registryStatus] ?? p.registryStatus}
                </span>
                <span className="rounded-full bg-muted px-2 py-1">
                  confidence: {confidencePct(p.confidence)}
                </span>
                <span className="rounded-full bg-muted px-2 py-1">
                  {p.verificationStatus}
                </span>
                {p.isoCode && (
                  <span className="rounded-full bg-muted px-2 py-1">
                    ISO {p.isoCode}
                  </span>
                )}
                {p.dialects.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-1">
                    dialects: {p.dialects.join(", ")}
                  </span>
                )}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {tab === "memory" && (
        <div className="space-y-4">
          <AdminCard>
            <div className="mb-2 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">
                Evolution Memory — lessons learned
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              What was discovered, proposed, decided, what happened and what was
              learned — so future proposals draw on past successes AND failures.
              This memory can never override system instructions or owner
              authority.
            </p>
          </AdminCard>
          {memory.length === 0 && (
            <AdminCard>
              <h2 className="font-semibold">No evolution memories yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Records appear here as change requests complete, fail or roll
                back.
              </p>
            </AdminCard>
          )}
          {memory.map((m) => (
            <AdminCard key={m.id}>
              <h2 className="font-semibold">{m.problem}</h2>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Proposed:</span>{" "}
                  {m.proposedSolution}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Owner decision:
                  </span>{" "}
                  {m.ownerDecision}
                </p>
                {m.implementationResult && (
                  <p>
                    <span className="font-medium text-foreground">Result:</span>{" "}
                    {m.implementationResult}
                  </p>
                )}
                {m.lessonsLearned && (
                  <p>
                    <span className="font-medium text-foreground">Lesson:</span>{" "}
                    {m.lessonsLearned}
                  </p>
                )}
                {m.relatedCrNumber && (
                  <p className="font-mono text-xs">CR: {m.relatedCrNumber}</p>
                )}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <AdminCard>
        <div className="mb-2 flex items-center gap-2">
          <Dna className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Owner Command Console</h2>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">
          Commands are parsed deterministically and shown for what they ACTUALLY
          do. <span className="italic">"Improve yourself"</span> starts analysis
          and proposals — it grants nothing.
        </p>
        <input
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          placeholder="ARCHIE, improve yourself."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
        />
        {parsedCommand && (
          <div className="mt-3 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">{parsedCommand.action}</p>
            {parsedCommand.target && (
              <p className="font-mono text-xs">
                target: {parsedCommand.target}
              </p>
            )}
            <p className="text-muted-foreground">{parsedCommand.explanation}</p>
            {parsedCommand.requiresOwnerAuth && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> This command requires the
                server-verified owner authorization flow (archie-owner-auth).
              </p>
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
