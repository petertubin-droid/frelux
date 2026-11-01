/**
 * FRELUX Market Intelligence: listed-company quotes and candles.
 *
 * Ground rules this function enforces:
 *  - A price only ever comes from a configured provider. With no key set the
 *    function answers `configured: false` and the UI says so; it never fills
 *    the gap with a made-up number.
 *  - Every response carries the provider, its own as-of timestamp, and whether
 *    the feed is delayed, so the page can label it truthfully.
 *  - Quotes are cached in mi_stock_quotes for the provider's configured refresh
 *    window, so a page view does not spend an API call.
 *  - Provider failures are caught per provider, recorded on mi_provider_config,
 *    and the next provider is tried. Nothing throws to the browser.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";

type Action = "quotes" | "candles" | "status";

interface QuoteRow {
  symbol: string;
  price: number;
  previous_close: number | null;
  change_abs: number | null;
  change_pct: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  market_cap: number | null;
  currency: string | null;
  exchange: string | null;
  provider: string;
  is_delayed: boolean;
  as_of: string | null;
}

interface Candle {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

const RANGE_DAYS: Record<string, number> = {
  "1W": 7,
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 366,
  "5Y": 1830,
  MAX: 7300,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let payload: { action?: Action; symbols?: string[]; symbol?: string; range?: string } = {};
  try {
    payload = req.method === "POST" ? await req.json() : {};
  } catch {
    payload = {};
  }
  const url = new URL(req.url);
  const action = (payload.action ?? (url.searchParams.get("action") as Action) ?? "status") as Action;

  const finnhub = Deno.env.get("FINNHUB_API_KEY") ?? "";
  const fmp = Deno.env.get("FMP_API_KEY") ?? "";
  const twelve = Deno.env.get("TWELVE_DATA_API_KEY") ?? "";
  const alpha = Deno.env.get("ALPHA_VANTAGE_API_KEY") ?? "";

  const configured = Boolean(finnhub || fmp || twelve || alpha);

  async function noteProviderFailure(slug: string, message: string) {
    await db
      .from("mi_provider_config")
      .update({ last_error: message.slice(0, 300), last_error_at: new Date().toISOString() })
      .eq("slug", slug);
  }

  async function noteProviderOk(slug: string) {
    await db
      .from("mi_provider_config")
      .update({ last_ok_at: new Date().toISOString(), last_error: null })
      .eq("slug", slug);
  }

  // ── status ────────────────────────────────────────────────────────────
  if (action === "status") {
    const { data } = await db
      .from("mi_provider_config")
      .select("slug,label,capabilities,requires_key,key_env_var,is_enabled,update_frequency_minutes,last_ok_at,last_error,last_error_at");
    return jsonResponse({
      configured,
      providers: (data ?? []).map((p) => ({
        ...p,
        has_key:
          p.slug === "finnhub" ? Boolean(finnhub)
          : p.slug === "fmp" ? Boolean(fmp)
          : p.slug === "twelvedata" ? Boolean(twelve)
          : p.slug === "alphavantage" ? Boolean(alpha)
          : true,
      })),
      message: configured
        ? "Market data provider configured."
        : "No market data provider key is configured. Quotes and candles are unavailable until FINNHUB_API_KEY, FMP_API_KEY, TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY is set as an edge function secret.",
    });
  }

  // ── quotes ────────────────────────────────────────────────────────────
  if (action === "quotes") {
    const symbols = (payload.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 40);

    // Serve anything still inside its refresh window first.
    if (symbols.length) {
      const { data: cached } = await db
        .from("mi_stock_quotes")
        .select("*")
        .in("symbol", symbols);
      const fresh = (cached ?? []).filter(
        (q) => q.fetched_at && Date.now() - new Date(q.fetched_at).getTime() < 10 * 60_000,
      );
      if (fresh.length === symbols.length) {
        return jsonResponse({ configured, quotes: fresh, served_from_cache: true, provider: fresh[0]?.provider ?? null });
      }
    }

    if (!configured) {
      return jsonResponse({ configured: false, quotes: [], message: "No market data provider key is configured." });
    }

    const rows: QuoteRow[] = [];
    const errors: string[] = [];

    async function push(row: QuoteRow) {
      rows.push(row);
      await db.from("mi_stock_quotes").upsert({ ...row, fetched_at: new Date().toISOString() }, { onConflict: "symbol" });
    }

    for (const symbol of symbols) {
      let done = false;

      if (finnhub && !done) {
        try {
          const q = (await fetchJson(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhub}`,
          )) as Record<string, unknown>;
          const price = num(q.c);
          if (price && price > 0) {
            await push({
              symbol,
              price,
              previous_close: num(q.pc),
              change_abs: num(q.d),
              change_pct: num(q.dp),
              day_high: num(q.h),
              day_low: num(q.l),
              volume: null,
              market_cap: null,
              currency: null,
              exchange: null,
              provider: "finnhub",
              is_delayed: true,
              as_of: q.t ? new Date(Number(q.t) * 1000).toISOString() : null,
            });
            await noteProviderOk("finnhub");
            done = true;
          }
        } catch (err) {
          errors.push(`finnhub ${symbol}: ${(err as Error).message}`);
          await noteProviderFailure("finnhub", (err as Error).message);
        }
      }

      if (fmp && !done) {
        try {
          const list = (await fetchJson(
            `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${fmp}`,
          )) as Record<string, unknown>[];
          const q = list?.[0];
          const price = num(q?.price);
          if (price && price > 0) {
            await push({
              symbol,
              price,
              previous_close: num(q.previousClose),
              change_abs: num(q.change),
              change_pct: num(q.changesPercentage),
              day_high: num(q.dayHigh),
              day_low: num(q.dayLow),
              volume: num(q.volume),
              market_cap: num(q.marketCap),
              currency: null,
              exchange: (q.exchange as string) ?? null,
              provider: "fmp",
              is_delayed: true,
              as_of: (q.timestamp as string) ? new Date(String(q.timestamp)).toISOString() : null,
            });
            await noteProviderOk("fmp");
            done = true;
          }
        } catch (err) {
          errors.push(`fmp ${symbol}: ${(err as Error).message}`);
          await noteProviderFailure("fmp", (err as Error).message);
        }
      }

      if (twelve && !done) {
        try {
          const q = (await fetchJson(
            `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${twelve}`,
          )) as Record<string, unknown>;
          const price = num(q.close);
          if (price && price > 0) {
            await push({
              symbol,
              price,
              previous_close: num(q.previous_close),
              change_abs: num(q.change),
              change_pct: num(q.percent_change),
              day_high: num(q.high),
              day_low: num(q.low),
              volume: num(q.volume),
              market_cap: null,
              currency: (q.currency as string) ?? null,
              exchange: (q.exchange as string) ?? null,
              provider: "twelvedata",
              is_delayed: true,
              as_of: new Date().toISOString(),
            });
            await noteProviderOk("twelvedata");
            done = true;
          }
        } catch (err) {
          errors.push(`twelvedata ${symbol}: ${(err as Error).message}`);
          await noteProviderFailure("twelvedata", (err as Error).message);
        }
      }
    }

    return jsonResponse({
      configured: true,
      quotes: rows,
      served_from_cache: false,
      errors: errors.slice(0, 6),
      message: rows.length ? undefined : "No provider returned a price for these symbols.",
    });
  }

  // ── candles ───────────────────────────────────────────────────────────
  if (action === "candles") {
    const symbol = (payload.symbol ?? url.searchParams.get("symbol") ?? "").toUpperCase();
    const range = (payload.range ?? url.searchParams.get("range") ?? "1M").toUpperCase();
    if (!symbol) return jsonResponse({ error: "symbol required" }, 400);
    const days = RANGE_DAYS[range] ?? 31;
    const from = new Date(Date.now() - days * 86_400_000);
    const to = new Date();

    const { data: cached } = await db
      .from("mi_stock_candles")
      .select("ts,open,high,low,close,volume,provider,fetched_at")
      .eq("symbol", symbol)
      .gte("ts", from.toISOString())
      .order("ts", { ascending: true });

    const freshEnough =
      (cached ?? []).length > 1 &&
      cached![cached!.length - 1].fetched_at &&
      Date.now() - new Date(cached![cached!.length - 1].fetched_at as string).getTime() < 6 * 3_600_000;

    if (freshEnough) {
      return jsonResponse({ configured, symbol, range, candles: cached, served_from_cache: true });
    }

    if (!configured) {
      return jsonResponse({
        configured: false,
        symbol,
        range,
        candles: [],
        message: "No market data provider key is configured.",
      });
    }

    let candles: Candle[] = [];
    let provider: string | null = null;
    let error: string | null = null;

    const fromSec = Math.floor(from.getTime() / 1000);
    const toSec = Math.floor(to.getTime() / 1000);

    if (finnhub && candles.length === 0) {
      try {
        const res = (await fetchJson(
          `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${fromSec}&to=${toSec}&token=${finnhub}`,
        )) as Record<string, unknown>;
        if (res?.s === "ok" && Array.isArray(res.t)) {
          const t = res.t as number[], o = res.o as number[], h = res.h as number[];
          const l = res.l as number[], c = res.c as number[], v = (res.v as number[]) ?? [];
          candles = t.map((ts, i) => ({
            ts: new Date(ts * 1000).toISOString(),
            open: o[i], high: h[i], low: l[i], close: c[i], volume: v[i] ?? null,
          }));
          provider = "finnhub";
          await noteProviderOk("finnhub");
        }
      } catch (err) {
        error = `finnhub: ${(err as Error).message}`;
        await noteProviderFailure("finnhub", (err as Error).message);
      }
    }

    if (fmp && candles.length === 0) {
      try {
        const res = (await fetchJson(
          `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&apikey=${fmp}`,
        )) as { historical?: { date: string; open: number; high: number; low: number; close: number; volume: number }[] };
        candles = (res.historical ?? [])
          .map((d) => ({
            ts: new Date(`${d.date}T00:00:00Z`).toISOString(),
            open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume ?? null,
          }))
          .reverse();
        if (candles.length) {
          provider = "fmp";
          await noteProviderOk("fmp");
        }
      } catch (err) {
        error = `fmp: ${(err as Error).message}`;
        await noteProviderFailure("fmp", (err as Error).message);
      }
    }

    if (twelve && candles.length === 0) {
      try {
        const res = (await fetchJson(
          `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=5000&apikey=${twelve}`,
        )) as { values?: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] };
        candles = (res.values ?? [])
          .map((d) => ({
            ts: new Date(`${d.datetime}T00:00:00Z`).toISOString(),
            open: Number(d.open), high: Number(d.high), low: Number(d.low),
            close: Number(d.close), volume: d.volume ? Number(d.volume) : null,
          }))
          .filter((c) => new Date(c.ts) >= from)
          .reverse();
        if (candles.length) {
          provider = "twelvedata";
          await noteProviderOk("twelvedata");
        }
      } catch (err) {
        error = `twelvedata: ${(err as Error).message}`;
        await noteProviderFailure("twelvedata", (err as Error).message);
      }
    }

    if (candles.length && provider) {
      await db.from("mi_stock_candles").upsert(
        candles.map((c) => ({ ...c, symbol, interval: "1d", provider })),
        { onConflict: "symbol,interval,ts" },
      );
    }

    return jsonResponse({
      configured: true,
      symbol,
      range,
      provider,
      candles,
      error,
      message: candles.length ? undefined : "The provider returned no candles for this range.",
    });
  }

  return jsonResponse({ error: "unknown action" }, 400);
});
