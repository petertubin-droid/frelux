/**
 * Admin pane: content translations review console.
 *
 * The review gate that makes localized pages indexable. A machine draft is
 * never public: only status='published' is readable by anon (RLS) and emitted
 * by prerender with hreflang. Publishing here is what turns /es/learn/<slug>/
 * into a real Spanish page instead of a noindex copy of the English one.
 *
 * Flow: pick an article + locale -> generate draft -> edit -> publish.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminInput,
  AdminTextarea,
  StateMessage,
} from "@/components/admin/AdminUi";
import { getSupabase } from "@/lib/supabase-lazy";

type Row = {
  id: string;
  content_type: "article" | "page";
  content_key: string;
  locale: string;
  title: string;
  description: string | null;
  body_md: string | null;
  status: "draft" | "in_review" | "published" | "rejected";
  translator: string | null;
  notes: string | null;
  updated_at: string;
  published_at: string | null;
};

const LOCALES = [
  "es", "fr", "de", "pt", "ru", "id", "sw", "ar", "hi", "zh", "ja", "nl",
];

const STATUS_STYLE: Record<Row["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
};

export default function AdminTranslations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [articleSlug, setArticleSlug] = useState("");
  const [locale, setLocale] = useState("es");
  const [active, setActive] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Partial<Row>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { data, error: err } = await supabase
        .from("content_translations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (err) throw err;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateDraft() {
    if (!articleSlug.trim()) {
      setError("Enter the English article slug to translate.");
      return;
    }
    setBusy("generate");
    setError(null);
    try {
      const supabase = await getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Sign in as an admin first.");
      const { data, error: fnError } = await supabase.functions.invoke(
        "translate-content",
        {
          headers: { Authorization: `Bearer ${token}` },
          body: {
            contentType: "article",
            key: articleSlug.trim(),
            locale,
          },
        },
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setArticleSlug("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(row: Row, status: Row["status"]) {
    setBusy(row.id);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const { error: err } = await supabase
        .from("content_translations")
        .update({
          status,
          reviewer_id: session?.session?.user.id ?? null,
        })
        .eq("id", row.id);
      if (err) throw err;
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveEdits() {
    if (!active) return;
    setBusy(active.id);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { error: err } = await supabase
        .from("content_translations")
        .update({
          title: draft.title ?? active.title,
          description: draft.description ?? active.description,
          body_md: draft.body_md ?? active.body_md,
        })
        .eq("id", active.id);
      if (err) throw err;
      setActive(null);
      setDraft({});
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const published = rows.filter((r) => r.status === "published").length;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Content Translations"
        subtitle={`${rows.length} translation(s), ${published} published. Only published rows are public and get hreflang.`}
      />

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Generate a machine draft</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drafts are never public. Review the text, then publish. English is
          always the source language.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <AdminInput
              value={articleSlug}
              onChange={(e) => setArticleSlug(e.target.value)}
              placeholder="english-article-slug"
            />
          </div>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <AdminButton onClick={generateDraft} disabled={busy === "generate"}>
            {busy === "generate" ? "Translating…" : "Generate draft"}
          </AdminButton>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage type="loading" title="Loading translations…" message="Fetching translations from the database." />
      ) : rows.length === 0 ? (
        <StateMessage
          type="empty"
          title="No translations yet"
          message="Generate a draft above to start the first localized page."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Content</th>
                <th className="p-3">Locale</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Source</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-mono text-xs">{row.content_key}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.content_type}
                    </div>
                  </td>
                  <td className="p-3 uppercase">{row.locale}</td>
                  <td className="max-w-[280px] p-3">{row.title}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {row.translator ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Review"
                        className="rounded p-1.5 hover:bg-muted"
                        onClick={() => {
                          setActive(row);
                          setDraft({
                            title: row.title,
                            description: row.description,
                            body_md: row.body_md,
                          });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {row.status !== "published" && (
                        <button
                          type="button"
                          title="Publish (makes the locale page indexable)"
                          disabled={busy === row.id}
                          className="rounded p-1.5 text-emerald-600 hover:bg-muted"
                          onClick={() => setStatus(row, "published")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      {row.status !== "rejected" && (
                        <button
                          type="button"
                          title="Reject"
                          disabled={busy === row.id}
                          className="rounded p-1.5 text-destructive hover:bg-muted"
                          onClick={() => setStatus(row, "rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Send back for review"
                        disabled={busy === row.id}
                        className="rounded p-1.5 hover:bg-muted"
                        onClick={() => setStatus(row, "in_review")}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Reviewing {active.locale.toUpperCase()} · {active.content_key}
            </h3>
            <AdminButton variant="link" onClick={() => setActive(null)}>
              Close
            </AdminButton>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <AdminInput
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Meta description
              </label>
              <AdminInput
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Body (Markdown)
              </label>
              <AdminTextarea
                rows={16}
                value={draft.body_md ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body_md: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <AdminButton onClick={saveEdits} disabled={busy === active.id}>
                Save edits
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => {
                  void setStatus(active, "published");
                  setActive(null);
                }}
                disabled={busy === active.id}
              >
                Save and publish
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
