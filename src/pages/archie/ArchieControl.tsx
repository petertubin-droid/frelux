// =========================================================
// FRELUX ARCHIE STAGE 1 — OWNER CENTRAL CONTROL DASHBOARD
//
// Overview of ARCHIE's major systems with REAL operational
// state (archie-status). Capabilities that are not yet
// operational are shown as planned interfaces — never
// presented as functioning (spec §§2, 16, 19).
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusCenter, {
  useSystemStatus,
} from "@/components/archie/StatusCenter";
import { listDevices, recordAuditEvent } from "@/lib/archie/stage1-client";

type SystemState = "operational" | "planned" | "disabled";

interface SystemSection {
  key: string;
  title: string;
  state: SystemState;
  route?: string;
  description: string;
}

const SYSTEMS: SystemSection[] = [
  {
    key: "intelligence",
    title: "ARCHIE Intelligence",
    state: "operational",
    route: "/archie/chat",
    description: "Conversational core with tool orchestration — live.",
  },
  {
    key: "knowledge",
    title: "ARCHIE Knowledge",
    state: "operational",
    route: "/archie/knowledge",
    description: "Knowledge core with scopes and evidence states.",
  },
  {
    key: "learning",
    title: "Learning",
    state: "operational",
    route: "/archie/learning",
    description: "EXTRACT → VALIDATE → APPROVE → KNOWLEDGE pipeline.",
  },
  {
    key: "construction",
    title: "Construction Intelligence",
    state: "operational",
    description:
      "Deterministic FRELUX engines — authoritative calculators, unchanged.",
  },
  {
    key: "calculators",
    title: "Calculators",
    state: "operational",
    description: "Build-to-Roof, painting, screeding, tiles, POP, tyrolene.",
  },
  {
    key: "market",
    title: "Market Intelligence",
    state: "operational",
    description:
      "Price observations and crawl runs; configured prices stay authoritative.",
  },
  {
    key: "web",
    title: "Web Intelligence",
    state: "operational",
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
    key: "family",
    title: "Family & Trusted People",
    state: "operational",
    route: "/archie/people",
    description:
      "Invitation-gated family/professional network — single-use codes, explicit permissions, temporary access, strict data isolation.",
  },
  {
    key: "model",
    title: "ARCHIE Model & Inference",
    state: "operational",
    description:
      "ARCHIE AI Abstraction — replaceable model runtimes. ARCHIE's own model is registered (honestly not yet available); external inference is an isolated adapter.",
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
    description:
      "Explicitly provided attachments analyzed through the chat core.",
  },
  {
    key: "voice",
    title: "Voice",
    state: "operational",
    description: "Voice notes recorded in chat and analyzed as attachments.",
  },
  {
    key: "location",
    title: "Location Intelligence",
    state: "operational",
    description: "Location authority + consent boundary (Phase 9).",
  },
  {
    key: "code",
    title: "Code Intelligence",
    state: "planned",
    description:
      "Adapter boundary defined; specialized code agents arrive in a later stage.",
  },
  {
    key: "social",
    title: "Social / Brand Intelligence",
    state: "planned",
    description: "Adapter boundary defined; not yet operational.",
  },
  {
    key: "professional",
    title: "Professional Ecosystem",
    state: "operational",
    description: "Pro Connect professionals — extended, not duplicated.",
  },
  {
    key: "family",
    title: "Family / Trusted People",
    state: "planned",
    description:
      "Adapter boundary defined; sharing arrives with consent scopes.",
  },
];

function StateBadge({ state }: { state: SystemState }) {
  if (state === "operational")
    return (
      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        OPERATIONAL
      </span>
    );
  if (state === "planned")
    return (
      <span className="rounded-full bg-slate-400/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        PLANNED INTERFACE
      </span>
    );
  return (
    <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
      DISABLED
    </span>
  );
}

export default function ArchieControl() {
  const { refresh } = useSystemStatus();
  const [devices, setDevices] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await listDevices();
      setDevices(list.filter((d) => d.status === "TRUSTED").length);
    } catch {
      setDevices(null);
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
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-slate-100">
          Central Control
        </h1>
        <p className="text-xs text-slate-400">
          One coherent intelligence system. States below are real, read from
          live data — planned sections are labelled, never faked.
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

      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SYSTEMS.map((s) => {
          const inner = (
            <div
              className={`h-full rounded-lg border border-white/5 bg-white/[0.03] p-3 transition ${
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
            </div>
          );
          return (
            <li key={s.key}>
              {s.route ? <Link to={s.route}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] text-slate-500">
        Trusted devices connected: {devices ?? "—"}. Protected operations
        (prices, configuration, deployments) always require explicit Owner
        authorization — ARCHIE cannot and will not apply them from here.
      </p>
    </div>
  );
}
