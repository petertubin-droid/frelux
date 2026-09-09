import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Search,
  PlayCircle,
  TestTube2,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { useAuth } from "@/lib/auth";
import {
  listSources,
  createSource,
  updateSource,
  removeSource,
  enableSource,
  disableSource,
  triggerCrawl,
  testSource,
  searchWeb,
  type SourceDraft,
} from "@/lib/learning/web-intelligence/intel-client";
import type { IntelligenceSource } from "@/lib/learning/web-intelligence/types";

const SOURCE_TYPES = [
  "PRICE",
  "PRODUCT",
  "MANUFACTURER",
  "SUPPLIER",
  "CONSTRUCTION_KNOWLEDGE",
  "STANDARD_CODE",
  "MARKET",
  "COMPETITOR",
  "GENERAL_REFERENCE",
];
const RELIABILITIES = ["AUTHORITATIVE", "HIGH", "MEDIUM", "LOW", "UNVERIFIED"];
const FREQUENCIES = ["MANUAL", "HOURLY", "DAILY", "WEEKLY", "MONTHLY"];

const emptyDraft: SourceDraft = {
  name: "",
  base_url: "",
  source_type: "PRICE",
  country: "NG",
  language: "en",
  allowed_paths: ["/"],
  crawl_frequency: "MANUAL",
  max_pages: 10,
  enabled: false,
  is_price_source: true,
  is_product_source: false,
  is_knowledge_source: false,
  learning_eligible: true,
  reliability: "UNVERIFIED",
};

export default function AdminIntelligenceSources() {
  const { user } = useAuth();
  const [sources, setSources] = useState<IntelligenceSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<SourceDraft>({ ...emptyDraft });
  const [pathsText, setPathsText] = useState("/");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    title: string;
    url: string;
    snippet: string;
    provider: string;
  }> | null>(null);

  const load = useCallback(async () => {
    try {
      setSources(await listSources());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sources");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!draft.name.trim() || !draft.base_url.trim()) {
      setError("Name and base URL are required.");
      return;
    }
    try {
      new URL(draft.base_url.trim());
    } catch {
      setError("Base URL must be a valid absolute http(s) URL.");
      return;
    }
    const allowed_paths = pathsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await createSource({ ...draft, allowed_paths });
    if (!res.ok) setError(res.error ?? "Failed to create source");
    else {
      setNotice(
        "Source registered. It must be explicitly enabled before crawling.",
      );
      setDraft({ ...emptyDraft });
      setPathsText("/");
      await load();
    }
  }, [draft, pathsText, load]);

  const run = useCallback(
    async (
      fn: () => Promise<{
        ok: boolean;
        message?: string;
        error?: string;
        result?: Record<string, unknown>;
      }>,
      key: string,
    ) => {
      setBusy(key);
      setError(null);
      setNotice(null);
      const res = await fn();
      setBusy(null);
      if (!res.ok) setError(res.error ?? "Action failed");
      else
        setNotice(
          res.message ?? JSON.stringify(res.result ?? "Done").slice(0, 300),
        );
      await load();
    },
    [load],
  );

  const search = useCallback(async () => {
    setError(null);
    setSearchResults(null);
    if (!query.trim()) {
      setError("Enter a search query.");
      return;
    }
    setBusy("search");
    const res = await searchWeb(query.trim());
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Search failed");
    else setSearchResults(res.results ?? []);
  }, [query]);

  return (
    <div>
      <AdminHeader
        title="Intelligence Sources"
        subtitle="Register approved external sources for controlled crawling. Sources are off until explicitly enabled; crawling respects robots.txt, rate limits and access restrictions, and extracted information enters the existing learning pipeline (human review required, it can never silently change calculator prices)."
      />
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {/* Register a source */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4" /> Register an approved source
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Source name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="https://example.com"
              value={draft.base_url}
              onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
            />
            <AdminSelect
              value={draft.source_type}
              onChange={(e) =>
                setDraft({ ...draft, source_type: e.target.value })
              }
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={draft.reliability}
              onChange={(e) =>
                setDraft({ ...draft, reliability: e.target.value })
              }
            >
              {RELIABILITIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </AdminSelect>
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Country (e.g. NG)"
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Region (optional)"
              value={draft.region ?? ""}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
            />
            <AdminSelect
              value={draft.crawl_frequency}
              onChange={(e) =>
                setDraft({ ...draft, crawl_frequency: e.target.value })
              }
            >
              {FREQUENCIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </AdminSelect>
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              type="number"
              min={1}
              max={50}
              value={draft.max_pages}
              onChange={(e) =>
                setDraft({ ...draft, max_pages: Number(e.target.value) })
              }
            />
          </div>
          <textarea
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            rows={2}
            placeholder={"Allowed paths (one per line, e.g. /products/)"}
            value={pathsText}
            onChange={(e) => setPathsText(e.target.value)}
          />
          <div className="flex flex-wrap gap-4 text-xs">
            {(
              [
                ["is_price_source", "Price source"],
                ["is_product_source", "Product source"],
                ["is_knowledge_source", "Knowledge source"],
                ["learning_eligible", "Learning eligible"],
                ["enabled", "Enabled now"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={draft[key] as boolean}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <input
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Purpose / notes"
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <AdminButton onClick={add}>Register source</AdminButton>
        </section>

        {/* Search discovery */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4" /> Search intelligence (approved
            provider only)
          </h2>
          <p className="text-xs text-muted-foreground">
            Uses a registered search API, never scrapes search-engine result
            pages. Results are evidence candidates, not verified truth.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border px-2 py-1.5 text-sm"
              placeholder="e.g. current cement price Lagos Nigeria"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <AdminButton onClick={search} disabled={busy === "search"}>
              {busy === "search" ? "Searching…" : "Search"}
            </AdminButton>
          </div>
          {searchResults && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground">No results.</p>
          )}
          {searchResults && searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((r, i) => (
                <li key={i} className="rounded-md border p-2 text-xs">
                  <p className="font-medium">
                    {r.title}{" "}
                    <span className="text-muted-foreground">
                      ({r.provider})
                    </span>
                  </p>
                  <p className="text-muted-foreground break-all">{r.url}</p>
                  <p>{r.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Registered sources */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Registered sources ({sources.length})
          </h2>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {s.name}{" "}
                      <span
                        className={
                          s.enabled
                            ? "text-emerald-700"
                            : "text-muted-foreground"
                        }
                      >
                        {s.enabled ? "· enabled" : "· disabled"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {s.base_url} · {s.source_type} · {s.country}
                      {s.region ? `/${s.region}` : ""} · {s.reliability} ·{" "}
                      {s.crawl_frequency} · max {s.max_pages} pages
                    </p>
                    <p className="text-xs text-muted-foreground">
                      last crawl: {s.last_crawl ?? "never"} · next:{" "}
                      {s.next_crawl ?? "-"} · flags:{" "}
                      {[
                        s.is_price_source && "price",
                        s.is_product_source && "product",
                        s.is_knowledge_source && "knowledge",
                      ]
                        .filter(Boolean)
                        .join(", ") || "none"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <AdminButton
                      onClick={() =>
                        run(() => testSource(s.id), `test-${s.id}`)
                      }
                      disabled={busy === `test-${s.id}`}
                    >
                      <TestTube2 className="h-4 w-4" />{" "}
                      {busy === `test-${s.id}` ? "Testing…" : "Test"}
                    </AdminButton>
                    <AdminButton
                      onClick={() =>
                        run(() => triggerCrawl(s.id), `crawl-${s.id}`)
                      }
                      disabled={busy === `crawl-${s.id}` || !s.enabled}
                    >
                      <PlayCircle className="h-4 w-4" />{" "}
                      {busy === `crawl-${s.id}` ? "Crawling…" : "Crawl now"}
                    </AdminButton>
                    {s.enabled ? (
                      <AdminButton
                        onClick={() =>
                          run(() => disableSource(s.id), `dis-${s.id}`)
                        }
                      >
                        <PowerOff className="h-4 w-4" /> Disable
                      </AdminButton>
                    ) : (
                      <AdminButton
                        onClick={() =>
                          run(() => enableSource(s.id), `en-${s.id}`)
                        }
                      >
                        <Power className="h-4 w-4" /> Enable
                      </AdminButton>
                    )}
                    <AdminButton
                      onClick={() =>
                        run(() => removeSource(s.id), `rm-${s.id}`)
                      }
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </AdminButton>
                  </div>
                </div>
              </div>
            ))}
            {sources.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sources registered yet.
              </p>
            )}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Signed in as {user?.email ?? "unknown"}. The crawler fetches only
          approved sources, identifies itself, respects robots.txt and rate
          limits, and never bypasses CAPTCHAs, authentication or paywalls.
        </p>
      </div>
    </div>
  );
}
