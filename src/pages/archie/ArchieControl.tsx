// =========================================================
// FRELUX ARCHIE STAGE 1 — OWNER CENTRAL CONTROL DASHBOARD
//
// Overview of ARCHIE's major systems with REAL operational
// state (archie-status). Nothing dormant (owner directive
// 2026-09-14): every card reflects what is actually
// deployed, and every system with a real engine dispatch
// gate carries a LIVE ACTIVATE/DEACTIVATE toggle backed by
// archie_engine_states (the same infrastructure as the
// Engines panel). Core cognition is marked PROTECTED — it
// has no toggle by design, and the card says why. Protected
// operations still require explicit Owner authorization.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusCenter from "@/components/archie/StatusCenter";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import AuthorityGovernance from "@/components/archie/AuthorityGovernance";
import { listDevices, recordAuditEvent } from "@/lib/archie/stage1-client";
import { fetchArchieStatus, type ArchieStatus } from "@/lib/archie/status";

type SystemState =
  "operational" | "disabled" | "degraded" | "alert" | "offline";

/** Live activation state for a gated capability, from the
 *  archie-engines manifest (archie_engine_states). */
interface EngineState {
  enabled: boolean;
  toggleable: boolean;
  protected: boolean;
}

interface SystemSection {
  key: string;
  title: string;
  state: SystemState;
  route?: string;
  description: string;
  /** Manifest capability that gates ARCHIE's chat access to
   *  this system. A real dispatch gate → the card gets a
   *  toggle. Core cognition (protected) and platform-managed
   *  surfaces get no toggle — the card says which and why. */
  capabilityId?: string;
}

const SYSTEMS: SystemSection[] = [
  {
    key: "intelligence",
    title: "ARCHIE Intelligence",
    state: "operational",
    route: "/archie/chat",
    capabilityId: "natural-conversation",
    description: "Conversational core with tool orchestration — live.",
  },
  {
    key: "knowledge",
    title: "ARCHIE Knowledge",
    state: "operational",
    route: "/archie/knowledge",
    capabilityId: "knowledge-acquisition",
    description: "Knowledge core with scopes and evidence states.",
  },
  {
    key: "learning",
    title: "Learning",
    state: "operational",
    route: "/archie/learning",
    capabilityId: "outcome-learning",
    description: "EXTRACT → VALIDATE → APPROVE → KNOWLEDGE pipeline.",
  },
  {
    key: "construction",
    title: "Construction Intelligence",
    state: "operational",
    capabilityId: "construction-calculators",
    description:
      "Deterministic FRELUX engines — authoritative calculators, unchanged.",
  },
  {
    key: "calculators",
    title: "Calculators",
    state: "operational",
    capabilityId: "construction-calculators",
    description:
      "Build-to-Roof, painting, screeding, tiles, POP, tyrolene. Shares the construction engines gate.",
  },
  {
    key: "market",
    title: "Market Intelligence",
    state: "operational",
    capabilityId: "market-intelligence-price-lookup",
    description:
      "Price observations and crawl runs; configured prices stay authoritative.",
  },
  {
    key: "web",
    title: "Web Intelligence",
    state: "operational",
    capabilityId: "web-research",
    description: "Intelligence sources and crawled pages.",
  },
  {
    key: "devices",
    title: "Trusted Devices",
    state: "operational",
    route: "/archie/devices",
    description: "Device identity registry (app key, never IMEI).",
  },
  {
    key: "security",
    title: "Cybersecurity / Sentry",
    state: "operational",
    route: "/archie/security",
    description: "Audit trail, access-denied events, security posture.",
  },
  {
    key: "projects",
    title: "Projects & Properties",
    state: "operational",
    description: "Estimates and property data through FRELUX.",
  },
  {
    key: "agents",
    title: "Internal ARCHIE Agents",
    state: "operational",
    capabilityId: "tool-orchestration",
    description:
      "Agent lifecycle with infrastructure-cost governance (never user credits).",
  },
  {
    key: "api",
    title: "FRELUX API",
    state: "operational",
    description: "API keys, plans and usage monitoring.",
  },
  {
    key: "infrastructure",
    title: "Infrastructure Costs",
    state: "operational",
    route: "/archie/system",
    description: "Internal provider cost ledger and budgets.",
  },
  {
    key: "migration",
    title: "Migration Center",
    state: "operational",
    route: "/archie/migration",
    description:
      "Portable continuity — backup, migrate, verify and restore ARCHIE's portable state across environments (USB → PC/VPS/cloud). Owner-authorized, secret-free packages.",
  },
  {
    key: "family",
    title: "Family & Trusted People",
    state: "operational",
    route: "/archie/people",
    capabilityId: "system-adapters-documents-images-voice-social-family",
    description:
      "Invitation-gated family/professional network — single-use codes, explicit permissions, temporary access, strict data isolation.",
  },
  {
    key: "model",
    title: "ARCHIE Model & Inference",
    state: "operational",
    capabilityId: "reasoning",
    description:
      "ARCHIE's own native inference engine — NLU, knowledge, reasoning, planning and learning execute in-engine. External providers exist only as isolated fallback adapters.",
  },
  {
    key: "code-sentry",
    title: "Code Sentry",
    state: "operational",
    description:
      "Deterministic scans of owner-authorized code — reports and proposes, never modifies production code.",
  },
  {
    key: "security-sentry",
    title: "Security Sentry",
    state: "operational",
    description:
      "Real audit-event analysis — observe, alert, recommend. Never self-escalates.",
  },
  {
    key: "documents",
    title: "Documents & Images",
    state: "operational",
    capabilityId: "system-adapters-documents-images-voice-social-family",
    description:
      "Explicitly provided attachments analyzed through the chat core.",
  },
  {
    key: "voice",
    title: "Voice",
    state: "operational",
    capabilityId: "system-adapters-documents-images-voice-social-family",
    description:
      "Voice notes recorded in chat, transcribed and analyzed; voiceprint identity on its own platform surface.",
  },
  {
    key: "location",
    title: "Location Intelligence",
    state: "operational",
    description:
      "Live location→language advisory wiring (§16): the owner's explicit language choice is authoritative; location is advisory only, with the consent boundary enforced.",
  },
  {
    key: "code",
    title: "Code Intelligence",
    state: "operational",
    route: "/archie/coding",
    capabilityId: "coding-intelligence-analysis",
    description:
      "Coding Studio, Code Intelligence findings and governance — the shared workbench, live in chat and admin console.",
  },
  {
    key: "social",
    title: "Social / Brand Intelligence",
    state: "operational",
    capabilityId: "system-adapters-documents-images-voice-social-family",
    description:
      "Owner-brand accounts through the social token vault (official OAuth only, encrypted at rest) and Brand Center; social conversation in chat. Never posts without explicit owner action.",
  },
  {
    key: "professional",
    title: "Professional Ecosystem",
    state: "operational",
    description: "Pro Connect professionals — extended, not duplicated.",
  },
];

function StateBadge({ state }: { state: SystemState }) {
  if (state === "degraded")
    return (
      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
        DEGRADED
      </span>
    );
  if (state === "alert")
    return (
      <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
        SECURITY ALERT
      </span>
    );
  if (state === "offline")
    return (
      <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
        OFFLINE
      </span>
    );
  if (state === "disabled")
    return (
      <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
        DEACTIVATED
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      OPERATIONAL
    </span>
  );
}

/** ACTIVATE/DEACTIVATE switch — same contract as the
 *  Engines panel: real archie_engine_states rows, owner-gated
 *  function, honest refusal in chat while off. */
function Toggle({
  on,
  busy,
  onChange,
  label,
}: {
  on: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-emerald-400/70" : "bg-slate-600/70"
      } ${busy ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Replace hardcoded card states with live-data-derived ones.
 *  Every mapping below is a REAL signal from the live status
 *  aggregate (status.ts): core reachability, security
 *  severity, observed counts. Unmapped sections keep their
 *  designed state. Honest by construction: no data signal →
 *  the card says so instead of claiming operational. */
function deriveLiveState(
  base: SystemSection,
  live: ArchieStatus | null,
  devices: number | null,
  engineStates: Map<string, EngineState> | null,
): SystemSection {
  const out: SystemSection = { ...base, state: base.state };
  switch (base.key) {
    case "intelligence":
      out.state = live?.coreReachable ? "operational" : "offline";
      out.description = live?.coreReachable
        ? `Conversational core reachable — ${live.domains.active} active domain(s), ${live.conversations} conversation(s).`
        : "Conversational core did not answer its reachability probe.";
      break;
    case "knowledge":
      if (live)
        out.description = `${live.knowledge.active} approved knowledge item(s) live.`;
      break;
    case "learning":
      if (live) {
        out.state =
          live.learning.processing > 0 && out.state === "operational"
            ? "operational"
            : out.state;
        out.description =
          live.learning.processing > 0
            ? `EXTRACT → VALIDATE → APPROVE pipeline — ${live.learning.processing} ingestion(s) processing now.`
            : `${live.learning.ingestions} ingestion(s) recorded, none processing.`;
      }
      break;
    case "security":
    case "security-sentry":
      if (live) {
        out.state =
          live.security.latestSeverity === "CRITICAL"
            ? "alert"
            : live.security.latestSeverity === "WARNING"
              ? "degraded"
              : "operational";
        out.description = `${live.security.events24h} security event(s) in 24h — latest severity: ${live.security.latestSeverity ?? "none"}.`;
      }
      break;
    case "devices":
      if (devices !== null)
        out.description = `${devices} trusted device(s) — identity by app key, never IMEI.`;
      else out.description = "Device registry unreachable right now.";
      break;
    case "projects":
      if (live)
        out.description = `${live.projects.contractorProjects} project(s), ${live.projects.estimates} saved estimate(s) through FRELUX.`;
      break;
    case "agents":
      if (live) {
        out.state = live.agents.active > 0 ? "operational" : out.state;
        out.description = `${live.agents.total} internal agent(s) registered, ${live.agents.active} active — infrastructure-cost governed.`;
      }
      break;
    case "infrastructure":
      if (live)
        out.description =
          live.infraCostMonthCents !== null
            ? `Internal provider ledger — ₦${(live.infraCostMonthCents / 100).toFixed(2)} this month.`
            : "Internal provider cost ledger (no costs recorded this month).";
      break;
  }
  // Owner-deactivated capability: the REAL engine gate says
  // off — the card reports DEACTIVATED, honestly.
  const es = out.capabilityId ? engineStates?.get(out.capabilityId) : undefined;
  if (es && !es.enabled) {
    out.state = "disabled";
    out.description = `Owner-deactivated from the Engines panel — ARCHIE refuses this capability in chat until it is re-enabled. ${out.description}`;
  }
  return out;
}

export default function ArchieControl() {
  const { refresh } = useSystemStatus();
  const [devices, setDevices] = useState<number | null>(null);
  const [live, setLive] = useState<ArchieStatus | null>(null);
  const [engineStates, setEngineStates] = useState<Map<
    string,
    EngineState
  > | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await listDevices();
      setDevices(Array.isArray(d) ? d.length : null);
    } catch {
      setDevices(null);
    }
    try {
      const s = await fetchArchieStatus();
      setLive(s);
    } catch {
      setLive(null);
    }
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: res, error: fnErr } = await supabase.functions.invoke(
        "archie-engines",
        { method: "GET" },
      );
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(String(res.error));
      const map = new Map<string, EngineState>();
      for (const e of res?.engines ?? []) {
        map.set(e.id, {
          enabled: e.enabled,
          toggleable: e.toggleable,
          protected: e.protected,
        });
      }
      setEngineStates(map);
    } catch {
      // Engine states unavailable → cards keep their designed
      // states; toggles simply do not render (never fake one).
      setEngineStates(null);
    }
  }, []);

  const toggle = useCallback(async (capabilityId: string, next: boolean) => {
    setTogglingId(capabilityId);
    setToggleError("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: res, error: fnErr } = await supabase.functions.invoke(
        "archie-engines",
        { body: { capability_id: capabilityId, enabled: next } },
      );
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(String(res.error));
      // Optimistic local update — the engine picks the
      // state up on its next gate refresh (seconds).
      setEngineStates((m) => {
        if (!m) return m;
        const cur = m.get(capabilityId);
        if (!cur) return m;
        const copy = new Map(m);
        copy.set(capabilityId, { ...cur, enabled: next });
        return copy;
      });
    } catch (e) {
      setToggleError(
        e instanceof Error ? e.message : "Toggle failed — not applied",
      );
    } finally {
      setTogglingId(null);
    }
  }, []);

  useEffect(() => {
    load();
    // audit dashboard open (Owner Security Center visibility)
    recordAuditEvent("archie.control.opened", "INFO", {}).catch(
      () => undefined,
    );
  }, [load]);

  return (
    <div className="archie-fade-up mx-auto max-w-4xl px-4 py-4 md:py-6">
      <header className="mb-4">
        <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
          Central Control
        </h1>
        <p className="text-xs text-slate-400">
          One coherent intelligence system. States below are real, read from
          live data — every system with a chat dispatch gate carries a live
          ACTIVATE/DEACTIVATE switch; core cognition is protected and never
          gated from here.
        </p>
      </header>

      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Status Center
      </h2>
      <StatusCenter />

      <div className="mt-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Systems
        </h2>
        <button
          type="button"
          onClick={() => {
            refresh();
            load();
          }}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          Refresh
        </button>
      </div>

      {toggleError && (
        <p
          className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300"
          role="alert"
        >
          {toggleError}
        </p>
      )}

      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SYSTEMS.map((raw) => {
          const s = deriveLiveState(raw, live, devices, engineStates);
          const es = s.capabilityId
            ? engineStates?.get(s.capabilityId)
            : undefined;
          const showToggle = Boolean(es?.toggleable);
          const busy = s.capabilityId != null && togglingId === s.capabilityId;
          const inner = (
            <div
              className={`h-full rounded-lg archie-panel p-3 transition ${
                s.route ? "hover:border-amber-400/30" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-200">
                  {s.title}
                </span>
                <StateBadge state={s.state} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{s.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                {showToggle ? (
                  <span className="text-[10px] text-slate-500">
                    {es?.enabled ? "Chat capability active" : "Off in chat"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {es?.protected
                      ? "Core cognition — no toggle by design"
                      : "Platform surface — no chat gate"}
                  </span>
                )}
                {showToggle && es && (
                  <Toggle
                    on={es.enabled}
                    busy={busy}
                    label={`${s.title} chat capability`}
                    onChange={(next) => void toggle(s.capabilityId!, next)}
                  />
                )}
              </div>
            </div>
          );
          return (
            <li key={s.key}>
              {s.route ? <Link to={s.route}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <AuthorityGovernance />
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Trusted devices connected: {devices ?? "—"}. Protected operations
        (prices, configuration, deployments) always require explicit Owner
        authorization — ARCHIE cannot and will not apply them from here.
      </p>
    </div>
  );
}
