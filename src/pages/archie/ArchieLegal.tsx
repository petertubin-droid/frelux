// =========================================================
// ARCHIE LEGAL — LEGAL & GOVERNANCE HUB (PWA)
//
// © 2026 FRENZY. All rights reserved.
//
// The ARCHIE PWA's legal surface: the published legal
// corpus (versioned, owner-approved), the AI disclosure,
// the governance model and the FRENZY copyright notice.
// Uncluttered by design — this page is linked from the
// PWA footer, settings areas and the first-run disclosure.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Shield, ScrollText, Scale, Bot, ArrowLeft } from "lucide-react";
import {
  fetchLegalDocs,
  fetchLegalDoc,
  fetchGovernance,
  type LegalDocSummary,
  type LegalDocFull,
  type GovernanceRule,
} from "@/lib/archie/legal-client";
import {
  ArchiePage,
  ArchieSectionTitle,
  ArchieBadge,
} from "@/components/archie/premium";

const DOC_LABELS: Record<string, string> = {
  terms_of_service: "Terms of Service",
  privacy_policy: "Privacy Policy",
  cookie_policy: "Cookie & Local Storage Policy",
  acceptable_use_policy: "Acceptable Use Policy",
  ai_disclosure: "AI Disclosure",
  ip_notice: "Intellectual Property Notice",
  third_party_disclosure: "Third-Party Services Disclosure",
  memory_data_rights_policy: "Memory & Data Rights Policy",
  connected_device_account_policy: "Connected Device & Account Policy",
  security_responsible_use_policy: "Security & Responsible Use Policy",
};

export default function ArchieLegal() {
  const [docs, setDocs] = useState<LegalDocSummary[]>([]);
  const [disclosure, setDisclosure] = useState<string>("");
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [selected, setSelected] = useState<LegalDocFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [d, g] = await Promise.all([fetchLegalDocs(), fetchGovernance()]);
    if (!d.ok) setError(d.error);
    else {
      setDocs(d.data.documents);
      setDisclosure(d.data.disclosure);
    }
    if (g.ok) setRules(g.data.rules);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(key: string) {
    setError(null);
    const res = await fetchLegalDoc(key);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSelected(res.data.document);
  }

  return (
    <ArchiePage
      title="Legal & Governance"
      subtitle="ARCHIE's legal corpus, AI disclosure and Owner Authority model. Versioned, approval-gated and audited — never silently replaced."
    >
      {/* AI transparency — always visible here, per the AI
          Disclosure document. */}
      <div className="mb-6 rounded-lg border border-border/60 bg-card/50 p-4">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot aria-hidden="true" className="h-4 w-4" /> AI Disclosure
        </div>
        <p className="text-sm text-muted-foreground">{disclosure}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading legal corpus…</p>
      )}

      {selected ? (
        <div className="mb-6">
          <button
            onClick={() => setSelected(null)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> All
            documents
          </button>
          <div className="rounded-lg border border-border/60 bg-card/50 p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {selected.title}
              </h2>
              <ArchieBadge tone="neutral">
                v{selected.version} · effective {selected.effective_date ?? "—"}
              </ArchieBadge>
            </div>
            <pre className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/90">
              {selected.body}
            </pre>
            <p className="mt-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              © 2026 FRENZY. All rights reserved. This document is information
              about the ARCHIE service, not legal advice. Published through
              ARCHIE's versioned document pipeline; see the Admin Legal console
              for revision history.
            </p>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {docs.map((d) => (
              <button
                key={d.doc_key}
                onClick={() => open(d.doc_key)}
                className="rounded-lg border border-border/60 bg-card/50 p-4 text-left transition hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <ScrollText
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {DOC_LABELS[d.doc_key] ?? d.title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Version {d.version}
                      {d.effective_date
                        ? ` · effective ${d.effective_date}`
                        : ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {!loading && !selected && (
        <div className="mt-8">
          <ArchieSectionTitle>Owner Authority & Governance</ArchieSectionTitle>
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Scale aria-hidden="true" className="h-4 w-4" /> Governance model
            </div>
            <div className="space-y-2">
              {(["permitted", "prohibited", "authority"] as const).map(
                (cat) => (
                  <div key={cat}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat === "authority"
                        ? "Owner Authority"
                        : `ARCHIE ${cat === "prohibited" ? "may NOT" : "may"}`}
                    </div>
                    <ul className="space-y-1">
                      {rules
                        .filter((r) => r.category === cat)
                        .map((r) => (
                          <li
                            key={r.rule_key}
                            className="flex items-start gap-1.5 text-sm text-foreground/85"
                          >
                            {cat === "prohibited" ? (
                              <Shield
                                aria-hidden="true"
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              />
                            )}
                            {r.statement}
                          </li>
                        ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        © 2026 FRENZY. All rights reserved. Third-party software, libraries,
        APIs, models, datasets and trademarks remain the property of their
        owners.
      </p>
    </ArchiePage>
  );
}
