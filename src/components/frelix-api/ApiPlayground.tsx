// =========================================================
// API Interactive Sandbox & Playground
//
// Allows builders and evaluators to test deterministic FRELUX
// calculation engines and discovery endpoints directly from
// the browser with real JSON payloads and live execution metrics.
// =========================================================

"use client";

import React, { useState, useEffect } from "react";
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
  Terminal,
  ShieldAlert,
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
    id: "tiling_floor",
    name: "Floor Tiling Takeoff",
    method: "POST",
    path: "/v1/calculators/tiling_floor",
    category: "Calculators",
    description:
      "Floor tiles, adhesive/cement mortar, grout, and wastage allowance.",
    defaultBody: JSON.stringify(
      {
        input: {
          length: 5,
          width: 4,
          tile_width_cm: 60,
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
    id: "roof_geometry",
    name: "Roof Geometry",
    method: "POST",
    path: "/v1/calculators/roof_geometry",
    category: "Calculators",
    description:
      "True surface pitch multiplier, hip/valley lengths, and fascia requirements.",
    defaultBody: JSON.stringify(
      {
        input: {
          building_length: 12,
          building_width: 10,
          pitch_degrees: 30,
          overhang_meters: 0.6,
          roof_type: "hip",
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
    id: "plans",
    name: "API Plans & Pricing",
    method: "GET",
    path: "/v1/plans",
    category: "Discovery",
    description:
      "Active quota limits, rate limits, and regional configurations from frelux_api_plans.",
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
  const [rawKeyInput, setRawKeyInput] = useState<string>(prefilledKey || "");
  const [bodyText, setBodyText] = useState<string>(PRESETS[0].defaultBody);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<
    Record<string, string>
  >({});
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  useEffect(() => {
    if (prefilledKey) {
      setRawKeyInput(prefilledKey);
    }
  }, [prefilledKey]);

  const handlePresetChange = (preset: EndpointPreset) => {
    setSelectedPreset(preset);
    setBodyText(preset.defaultBody);
    setStatus(null);
    setLatencyMs(null);
    setResponseBody(null);
    setResponseHeaders({});
  };

  const isPublicDiscovery =
    selectedPreset.path === "/v1" ||
    selectedPreset.path === "/v1/capabilities" ||
    selectedPreset.path === "/v1/plans";

  const getBaseUrl = () => {
    return import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/frelix-api`
      : "https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/frelix-api";
  };

  const handleExecute = async () => {
    setLoading(true);
    setStatus(null);
    setResponseBody(null);
    setLatencyMs(null);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${selectedPreset.path}`;

    // Token: only attach Authorization if user provided a raw key or if not public
    const token = rawKeyInput.trim();

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
          k.toLowerCase().startsWith("x-frelux-") ||
          k.toLowerCase() === "content-type" ||
          k.toLowerCase() === "x-request-id" ||
          k.toLowerCase() === "cache-control"
        ) {
          hdrs[k] = v;
        }
      });
      setResponseHeaders(hdrs);

      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        setResponseBody(JSON.stringify(parsed, null, 2));
      } catch {
        setResponseBody(text);
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(elapsed);
      setStatus(500);
      setResponseBody(
        JSON.stringify(
          {
            error: "Failed to connect to FRELUX API gateway.",
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

  const handleCopyResponse = async () => {
    if (!responseBody) return;
    try {
      await navigator.clipboard.writeText(responseBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyCurl = async () => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${selectedPreset.path}`;
    const token = rawKeyInput.trim() || "FLX-YOUR_API_KEY";
    const authHeader =
      isPublicDiscovery && !rawKeyInput.trim()
        ? ""
        : `  -H "Authorization: Bearer ${token}" \\\n`;

    let curlCmd = `curl -X ${selectedPreset.method} "${url}" \\\n${authHeader}  -H "Content-Type: application/json"`;
    if (selectedPreset.method === "POST") {
      try {
        const compact = JSON.stringify(JSON.parse(bodyText));
        curlCmd += ` \\\n  -d '${compact}'`;
      } catch {
        curlCmd += ` \\\n  -d '${bodyText.replace(/\n/g, "")}'`;
      }
    }

    try {
      await navigator.clipboard.writeText(curlCmd);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm text-foreground">
      {/* Sandbox Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Cpu className="h-4 w-4" />
            <span>Interactive Sandbox</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            Live API Console &amp; Engine Tester
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test canonical calculation formulas and discovery contracts against
            the live edge gateway.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyCurl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground transition-colors self-start sm:self-auto"
        >
          {copiedCurl ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>cURL Copied</span>
            </>
          ) : (
            <>
              <Terminal className="h-3.5 w-3.5" />
              <span>Copy cURL</span>
            </>
          )}
        </button>
      </div>

      {/* Preset Selector */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-2">
          Select Endpoint Preset
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = selectedPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-background hover:bg-muted text-foreground"
                }`}
              >
                <span
                  className={`text-[10px] uppercase font-bold px-1 py-0.2 rounded ${
                    preset.method === "POST"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {preset.method}
                </span>
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedPreset.description}
        </p>
      </div>

      {/* Credentials Bar */}
      <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3.5">
        <label
          htmlFor="playground-raw-key"
          className="block text-xs font-semibold mb-1"
        >
          API Authentication Token
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="playground-raw-key"
            type="password"
            value={rawKeyInput}
            onChange={(e) => setRawKeyInput(e.target.value)}
            placeholder={
              isPublicDiscovery
                ? "Optional for this endpoint (e.g. FLX-...)"
                : "Paste raw API key (FLX-...) or generate one above"
            }
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {rawKeyInput && (
            <button
              type="button"
              onClick={() => setRawKeyInput("")}
              className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          {isPublicDiscovery ? (
            <span className="text-blue-500 dark:text-blue-400 font-medium">
              ℹ Public discovery endpoints do not require an API key.
            </span>
          ) : (
            <span>
              ℹ FRELUX stores only SHA-256 hashes of keys. Paste the raw secret
              you copied at creation time.
            </span>
          )}
        </div>
      </div>

      {/* Request & Response Split Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left Column: Request Payload */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Request Body (JSON)</span>
            {selectedPreset.method === "GET" && (
              <span className="text-[11px] text-muted-foreground">
                GET requests have no payload
              </span>
            )}
          </div>
          <div className="relative flex-1">
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              disabled={selectedPreset.method === "GET"}
              rows={12}
              className="w-full h-full min-h-[220px] rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 resize-y"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[280px]">
              {selectedPreset.method} {selectedPreset.path}
            </span>
            <button
              type="button"
              onClick={handleExecute}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Execute Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Gateway Response */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Gateway Response</span>
              {status !== null && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status >= 200 && status < 300
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {status}{" "}
                  {status === 200
                    ? "OK"
                    : status === 401
                      ? "Unauthorized"
                      : status === 400
                        ? "Bad Request"
                        : ""}
                </span>
              )}
              {latencyMs !== null && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Clock className="h-3 w-3" />
                  {latencyMs}ms
                </span>
              )}
            </div>

            {responseBody && (
              <button
                type="button"
                onClick={handleCopyResponse}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="relative flex-1">
            <pre className="w-full h-full min-h-[220px] max-h-[360px] overflow-auto rounded-xl border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed text-foreground">
              {responseBody ? (
                <code>{responseBody}</code>
              ) : (
                <span className="text-muted-foreground italic">
                  Press &quot;Execute Request&quot; to test this endpoint. Live
                  response output and telemetry will appear here.
                </span>
              )}
            </pre>
          </div>

          {/* Telemetry Headers */}
          {Object.keys(responseHeaders).length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2 text-[10px] font-mono text-muted-foreground space-y-0.5">
              {Object.entries(responseHeaders).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="font-semibold">{k}:</span>
                  <span className="truncate max-w-[240px]">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
