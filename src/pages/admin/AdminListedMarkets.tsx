import { useState } from "react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsyncData } from "@/lib/market-intelligence/use-async";
import type { ProviderStatus } from "@/lib/market-intelligence/data";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type ProviderRow = ProviderStatus["providers"][number];

type CompanyRow = {
  symbol: string;
  name: string;
  sector: string;
  country_code: string;
  is_active: boolean;
};
type NewsRow = {
  id: string;
  headline: string;
  source_name: string;
  category: string;
  published_at: string;
  is_published: boolean;
};
type AccessRow = { user_id: string; granted_at: string; note: string | null };

export default function AdminListedMarkets() {
  const { user, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState("");

  useSeo({
    title: "Listed Markets Control Panel | FRELUX",
    description:
      "Administrator controls for market data providers, companies, news and investor access.",
    canonicalPath: "/admin/listed-markets",
    noIndex: true,
  });

  const state = useAsyncData(async () => {
    const [providers, companies, news, access, docs] = await Promise.all([
      supabase.functions.invoke("market-stocks", {
        body: { action: "status" },
      }),
      supabase
        .from("mi_companies")
        .select("symbol,name,sector,country_code,is_active")
        .order("sort_order"),
      supabase
        .from("mi_market_news")
        .select("id,headline,source_name,category,published_at,is_published")
        .order("published_at", { ascending: false })
        .limit(20),
      supabase
        .from("mi_investor_access")
        .select("user_id,granted_at,note")
        .order("granted_at", { ascending: false }),
      supabase
        .from("mi_investor_documents")
        .select("id,title,doc_type,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return {
      providers: ((providers.data as ProviderStatus | null)?.providers ??
        []) as ProviderRow[],
      companies: (companies.data ?? []) as CompanyRow[],
      news: (news.data ?? []) as NewsRow[],
      access: (access.data ?? []) as AccessRow[],
      documents: (docs.data ?? []) as {
        id: string;
        title: string;
        doc_type: string;
        created_at: string;
      }[],
    };
  }, []);

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <AdminPageHeader
          title={"Administrators only"}
          description={
            <>
              Sign in with an administrator account to manage market
              intelligence.
            </>
          }
        />
      </div>
    );
  }

  async function saveFrequency(slug: string, minutes: number) {
    setBusy(slug);
    const { error } = await supabase
      .from("mi_provider_config")
      .update({ update_frequency_minutes: minutes })
      .eq("slug", slug);
    setMessage(error ? error.message : `Update frequency for ${slug} saved.`);
    setBusy(null);
  }

  async function toggleCompany(symbol: string, next: boolean) {
    setBusy(symbol);
    const { error } = await supabase
      .from("mi_companies")
      .update({ is_active: next })
      .eq("symbol", symbol);
    setMessage(
      error ? error.message : `${symbol} ${next ? "published" : "hidden"}.`,
    );
    setBusy(null);
  }

  async function toggleNews(id: string, next: boolean) {
    setBusy(id);
    const { error } = await supabase
      .from("mi_market_news")
      .update({ is_published: next })
      .eq("id", id);
    setMessage(
      error ? error.message : `Story ${next ? "published" : "unpublished"}.`,
    );
    setBusy(null);
  }

  async function grantAccess() {
    const email = grantEmail.trim().toLowerCase();
    if (!email) return;
    setBusy("grant");
    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();
    if (lookupError || !profile) {
      setMessage(
        lookupError?.message ??
          `No FRELUX account found for ${email}. The investor must register first.`,
      );
      setBusy(null);
      return;
    }
    const { error } = await supabase
      .from("mi_investor_access")
      .insert({
        user_id: profile.id,
        note: `granted by ${user?.email ?? "admin"}`,
      });
    setMessage(error ? error.message : `Investor access granted to ${email}.`);
    setGrantEmail("");
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Administration"
        title="Market Intelligence control panel"
        description="Provider keys live in edge function secrets, never in this page or the client bundle. This panel controls what the public sees and who may open the Investor Centre."
      />

      {message ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">
          Data providers
        </h2>
        {state.status === "loading" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Loading providers…
          </p>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-3">
                  Provider
                </th>
                <th scope="col" className="py-2 pr-3">
                  Capabilities
                </th>
                <th scope="col" className="py-2 pr-3">
                  Key
                </th>
                <th scope="col" className="py-2 pr-3">
                  Refresh (min)
                </th>
                <th scope="col" className="py-2">
                  Last result
                </th>
              </tr>
            </thead>
            <tbody>
              {state.status === "ready" &&
                state.data.providers.map((p) => (
                  <tr key={p.slug} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-foreground">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.slug}
                      </p>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {p.capabilities.join(", ")}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {p.has_key ? (
                        <span className="text-emerald-600">configured</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {p.key_env_var}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        defaultValue={p.update_frequency_minutes}
                        aria-label={`Refresh minutes for ${p.label}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (
                            Number.isFinite(v) &&
                            v > 0 &&
                            v !== p.update_frequency_minutes
                          )
                            void saveFrequency(p.slug, v);
                        }}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {p.last_error ? (
                        <span
                          className="text-red-600"
                          title={p.last_error_at ?? undefined}
                        >
                          {p.last_error.slice(0, 60)}
                        </span>
                      ) : p.last_ok_at ? (
                        `ok ${new Date(p.last_ok_at).toLocaleString()}`
                      ) : (
                        "never called"
                      )}
                    </td>
                  </tr>
                ))}
              {state.status === "ready" && state.data.providers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-sm text-muted-foreground"
                  >
                    No providers registered.
                  </td>
                </tr>
              ) : null}
              {busy && state.status === "ready" ? null : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">
          Investor access
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Account email
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="investor@example.com"
              className="mt-1 block w-64 rounded border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void grantAccess()}
            disabled={busy === "grant"}
            className="rounded-md bg-brand-purple px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Grant access
          </button>
        </div>
        {state.status === "ready" ? (
          state.data.access.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No named investors yet. Administrators reach the centre
              automatically.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {state.data.access.map((a) => (
                <li key={a.user_id}>
                  {a.user_id.slice(0, 8)}… · granted{" "}
                  {new Date(a.granted_at).toLocaleDateString()}
                  {a.note ? ` · ${a.note}` : ""}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">
          Published coverage
        </h2>
        {state.status === "ready" && state.data.news.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No news rows yet. Add curated items with a source and publication
            date in the Supabase table editor; each row must name where it came
            from.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {state.status === "ready" &&
              state.data.news.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {n.headline}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {n.source_name} · {n.category} ·{" "}
                      {new Date(n.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleNews(n.id, !n.is_published)}
                    disabled={busy === n.id}
                    className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {n.is_published ? "Unpublish" : "Publish"}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">
          Company registry
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hiding a company removes it from public pages without deleting its
          history.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {state.status === "ready" &&
            state.data.companies.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => void toggleCompany(c.symbol, !c.is_active)}
                disabled={busy === c.symbol}
                aria-pressed={c.is_active}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  c.is_active
                    ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                    : "border-border text-muted-foreground line-through"
                }`}
              >
                {c.symbol} · {c.sector}
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
