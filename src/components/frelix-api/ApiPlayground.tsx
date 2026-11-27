// =========================================================
// API Interactive Sandbox & Playground
//
// Allows builders and evaluators to test deterministic FRELUX
// calculation engines and AI endpoints directly from the browser
// with real JSON payloads and live execution metrics.
// =========================================================

"use client";

import React, { useState } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Cpu,
  RefreshCw,
} from "lucide-react";
import type { ApiKeyRow } from "@/lib/frelix-api/portal-client";

interface EndpointPreset {
  id: string;
  name: string;
  method: "GET" | "POST";
  path: string;
  category: "Calculators" | "Discovery" | "Market Intelligence";
  defaultBody: string;
  description: string;
}

const PRESETS: EndpointPreset[] = [
  {
    id: "screeding",
    name: "Screeding Takeoff",
    method: "POST",
    path: "/v1/calculators/screeding",
    category: "Calculators",
    description:
      "Calculates cement, sharp sand bags, and water volume for floor/wall screeding.",
    defaultBody: JSON.stringify(
      {
        input: {
          length: 6,
          width: 5,
          thickness_mm: 25,
          mix_ratio: "1:4",
        },
      },
      null,
      2,
    ),
  },
  {
    id: "tiling_wall",
    name: "Wall Tiling Takeoff",
    method: "POST",
    path: "/v1/calculators/tiling_wall",
    category: "Calculators",
    description:
      "Computes tile cartons, cement, grout, and spacer requirements for wall surfaces.",
    defaultBody: JSON.stringify(
      {
        input: {
          room_length: 4.5,
          room_width: 3.2,
          wall_height: 2.8,
          tile_width_cm: 30,
          tile_length_cm: 60,
          waste_percentage: 10,
        },
      },
      null,
      2,
    ),
  },
  {
    id: "paint",
    name: "Paint Takeoff",
    method: "POST",
    path: "/v1/calculators/paint",
    category: "Calculators",
    description:
      "Calculates primer, emulsion drums, and labor coverage for wall takeoffs.",
    defaultBody: JSON.stringify(
      {
        input: {
          surface_area_sqm: 120,
          coats: 2,
          surface_condition: "normal",
        },
      },
      null,
      2,
    ),
  },
  {
    id: "pop",
    name: "POP Ceiling Takeoff",
    method: "POST",
    path: "/v1/calculators/pop",
    category: "Calculators",
    description:
      "Calculates Plaster of Paris bags, gauze, binding wire, and cornices.",
    defaultBody: JSON.stringify(
      {
        input: {
          room_length: 5,
          room_width: 4,
          design_complexity: "standard",
        },
      },
      null,
      2,
    ),
  },
  {
    id: "capabilities",
    name: "Capabilities Registry",
    method: "GET",
    path: "/v1/capabilities",
    category: "Discovery",
    description:
      "Lists all canonical deterministic calculation engines and AI capabilities.",
    defaultBody: "{}",
  },
  {
    id: "market_prices",
    name: "Market Material Prices",
    method: "GET",
    path: "/v1/market/prices",
    category: "Market Intelligence",
    description: "Returns verified regional material pricing benchmarks.",
    defaultBody: "{}",
  },
  {
    id: "regions_ng",
    name: "Regional Profile (NG)",
    method: "GET",
    path: "/v1/regions/NG",
    category: "Market Intelligence",
    description:
      "Returns regional construction standards, measurement units, and local codes.",
    defaultBody: "{}",
  },
];

interface Props {
  apiKeys: ApiKeyRow[];
  prefilledKey?: string;
}

export default function ApiPlayground({ apiKeys, prefilledKey }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<EndpointPreset>(
    PRESETS[0],
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    apiKeys[0]?.id || "manual",
  );
  const [manualKey, setManualKey] = useState<string>(prefilledKey || "");
  const [bodyText, setBodyText] = useState<string>(PRESETS[0].defaultBody);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<
    Record<string, string>
  >({});
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handlePresetChange = (preset: EndpointPreset) => {
    setSelectedPreset(preset);
    setBodyText(preset.defaultBody);
    setStatus(null);
    setLatencyMs(null);
    setResponseBody(null);
    setResponseHeaders({});
  };

  const handleExecute = async () => {
    setLoading(true);
    setStatus(null);
    setResponseBody(null);
    setLatencyMs(null);

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/frelix-api`
      : "https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/frelix-api";

    const url = `${baseUrl}${selectedPreset.path}`;
    const token =
      manualKey.trim() ||
      (apiKeys.find((k) => k.id === selectedKeyId)?.key_prefix ?? "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const t0 = performance.now();
    try {
      let parsedBody: unknown = undefined;
      if (selectedPreset.method === "POST") {
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          setStatus(400);
          setResponseBody(
            JSON.stringify(
              { error: "Invalid JSON in request payload" },
              null,
              2,
            ),
          );
          setLoading(false);
          return;
        }
      }

      const res = await fetch(url, {
        method: selectedPreset.method,
        headers,
        body:
          selectedPreset.method === "POST"
            ? JSON.stringify(parsedBody)
            : undefined,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(elapsed);
      setStatus(res.status);

      const hdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        if (
          k.startsWith("x-") ||
          k === "content-type" ||
          k === "cache-control"
        ) {
          hdrs[k] = v;
        }
      });
      setResponseHeaders(hdrs);

      const data = await res.json().catch(() => null);
      setResponseBody(JSON.stringify(data, null, 2));
    } catch (err) {
      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(elapsed);
      setStatus(500);
      setResponseBody(
        JSON.stringify(
          {
            error: "Request failed to reach gateway",
            details: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!responseBody) return;
    try {
      await navigator.clipboard.writeText(responseBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Control Header */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-bold">Interactive API Sandbox</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Execute test requests against canonical FRELUX engines with live
              execution metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Auth Key:
            </span>
            {apiKeys.length > 0 ? (
              <select
                aria-label="Active API Key"
                value={selectedKeyId}
                onChange={(e) => setSelectedKeyId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-medium focus:ring-1 focus:ring-primary"
              >
                {apiKeys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.key_prefix})
                  </option>
                ))}
                <option value="manual">Manual Bearer Token...</option>
              </select>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Using public test token
              </span>
            )}
          </div>
        </div>

        {selectedKeyId === "manual" && (
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">
              Enter Secret API Key (FLX-...)
            </label>
            <input
              type="password"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="FLX-..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono"
            />
          </div>
        )}

        {/* Preset Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => {
            const active = selectedPreset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase px-1 rounded ${
                    p.method === "POST"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {p.method}
                </span>
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* URL / Method Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center flex-1 rounded-lg border border-border bg-muted/40 font-mono text-xs overflow-hidden">
            <span
              className={`px-3 py-2 font-bold uppercase tracking-wider ${
                selectedPreset.method === "POST"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
              }`}
            >
              {selectedPreset.method}
            </span>
            <span className="px-3 py-2 text-foreground truncate select-all">
              https://freluxtools.com/api{selectedPreset.path}
            </span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleExecute}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all shrink-0 shadow-sm"
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Execute Request</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {selectedPreset.description}
        </p>
      </div>

      {/* Request & Response Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Request Payload Editor */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Request Payload (JSON)
            </span>
            {selectedPreset.method === "GET" && (
              <span className="text-[11px] text-muted-foreground italic">
                GET request (No payload body)
              </span>
            )}
          </div>

          <textarea
            aria-label="Request Payload JSON"
            rows={12}
            disabled={selectedPreset.method === "GET"}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full flex-1 p-3 rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 resize-y"
          />
        </div>

        {/* Live Response Viewer */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gateway Response
              </span>
              {status !== null && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    status >= 200 && status < 300
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {status} {status === 200 ? "OK" : ""}
                </span>
              )}
              {latencyMs !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{latencyMs}ms</span>
                </span>
              )}
            </div>

            {responseBody && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          <div className="relative flex-1 min-h-[240px] rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-xs overflow-auto p-3">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Executing canonical calculation...</span>
              </div>
            ) : responseBody ? (
              <pre className="text-[11px] leading-relaxed whitespace-pre select-all">
                {responseBody}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-6 text-center">
                <Sparkles className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <span>
                  Click &quot;Execute Request&quot; above to see real-time
                  calculation output.
                </span>
              </div>
            )}
          </div>

          {Object.keys(responseHeaders).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 text-[10px] text-muted-foreground font-mono">
              {Object.entries(responseHeaders).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded bg-muted">
                  <span className="text-foreground font-semibold">{k}:</span>{" "}
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
