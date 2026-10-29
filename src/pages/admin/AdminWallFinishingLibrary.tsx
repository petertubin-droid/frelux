import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminHeader,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { supabase } from "@/lib/supabase";
import {
  WALL_FINISHING_LIBRARY_MARKETS,
  WALL_FINISHING_THEMES,
} from "@/lib/wallfinishing/knowledge-library";
import { useLanguage } from "@/lib/i18n";

type Topic = {
  id: string;
  market_code: string;
  candidate_key: string;
  title: string;
  topic_type: string;
  verification_status: string;
};
type Source = {
  id: string;
  topic_id: string;
  title: string;
  url: string;
  publisher: string;
  claim_scope: string;
  review_status: string;
};
type Slot = {
  topic_id: string;
  market_code: string;
  theme_key: string;
  language_code: string;
  article_id: string | null;
};
type Article = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category_slug: string;
};
const EMPTY_SOURCE = { title: "", url: "", publisher: "", claim_scope: "" };
export default function AdminWallFinishingLibrary() {
  const { t: tr } = useLanguage();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<
    { slug: string; name: string }[]
  >([]);
  const [marketStatus, setMarketStatus] = useState<
    {
      market_code: string;
      has_native_catalog: boolean;
      coverage_status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [market, setMarket] = useState("NG");
  const [topicId, setTopicId] = useState("");
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [articleDraft, setArticleDraft] = useState({
    theme: "overview",
    language: "en",
    category: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
  });
  const selectedTopics = useMemo(
    () => topics.filter((t) => t.market_code === market),
    [topics, market],
  );
  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedSlot = slots.find(
    (s) =>
      s.topic_id === topicId &&
      s.theme_key === articleDraft.theme &&
      s.language_code === articleDraft.language,
  );
  async function refresh() {
    setLoading(true);
    setError("");
    const results = await Promise.all([
      supabase
        .from("learn_wall_finishing_topics")
        .select(
          "id,market_code,candidate_key,title,topic_type,verification_status",
        )
        .order("market_code")
        .order("title"),
      supabase
        .from("learn_wall_finishing_sources")
        .select("id,topic_id,title,url,publisher,claim_scope,review_status")
        .order("created_at"),
      supabase
        .from("learn_wall_finishing_article_slots")
        .select("topic_id,market_code,theme_key,language_code,article_id"),
      supabase
        .from("learn_articles")
        .select(
          "id,slug,title,content,excerpt,category_slug,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,status",
        )
        .not("wall_topic_id", "is", null),
      supabase.from("learn_categories").select("slug,name").order("sort_order"),
      supabase
        .from("learn_wall_finishing_market_status")
        .select("market_code,has_native_catalog,coverage_status"),
    ]);
    const failed = results.find((r) => r.error);
    if (failed) {
      setError(
        failed.error?.message ??
          "Could not load library records. Apply the new migration, then refresh.",
      );
      setLoading(false);
      return;
    }
    setTopics((results[0].data ?? []) as Topic[]);
    setSources((results[1].data ?? []) as Source[]);
    setSlots((results[2].data ?? []) as Slot[]);
    setArticles((results[3].data ?? []) as Article[]);
    setCategories((results[4].data ?? []) as { slug: string; name: string }[]);
    setMarketStatus((results[5].data ?? []) as typeof marketStatus);
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!selectedTopics.some((t) => t.id === topicId))
      setTopicId(selectedTopics[0]?.id ?? "");
  }, [selectedTopics, topicId]);
  useEffect(() => {
    if (!articleDraft.category && categories.length)
      setArticleDraft((d) => ({ ...d, category: categories[0].slug }));
  }, [categories, articleDraft.category]);
  async function updateTopic(id: string, status: string) {
    setBusy(true);
    setError("");
    const { error: e } = await supabase
      .from("learn_wall_finishing_topics")
      .update({ verification_status: status })
      .eq("id", id);
    if (e) setError(e.message);
    else {
      setNotice("Topic review status saved.");
      await refresh();
    }
    setBusy(false);
  }
  async function addSource() {
    if (
      !topicId ||
      !source.title ||
      !source.url ||
      !source.publisher ||
      !source.claim_scope
    )
      return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase
      .from("learn_wall_finishing_sources")
      .insert({
        topic_id: topicId,
        ...source,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
    if (e) setError(e.message);
    else {
      setSource(EMPTY_SOURCE);
      setNotice(
        "Citation added as pending review. It is not public until accepted.",
      );
      await refresh();
    }
    setBusy(false);
  }
  async function reviewSource(id: string, status: string) {
    setBusy(true);
    setError("");
    const { error: e } = await supabase
      .from("learn_wall_finishing_sources")
      .update({ review_status: status })
      .eq("id", id);
    if (e) setError(e.message);
    else {
      setNotice(`Citation marked ${status}.`);
      await refresh();
    }
    setBusy(false);
  }
  async function saveDraft() {
    if (
      !selectedTopic ||
      !selectedSlot ||
      !articleDraft.title.trim() ||
      !articleDraft.slug.trim() ||
      !articleDraft.content.trim() ||
      !articleDraft.category
    )
      return;
    setBusy(true);
    setError("");
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error: e } = await supabase
      .from("learn_articles")
      .insert({
        slug: articleDraft.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-|-$/g, ""),
        title: articleDraft.title.trim(),
        excerpt: articleDraft.excerpt.trim() || null,
        content: articleDraft.content,
        category_slug: articleDraft.category,
        author: user?.email ?? "FRELUX Editorial",
        status: "draft",
        wall_market_code: market,
        wall_topic_id: topicId,
        wall_article_theme: articleDraft.theme,
        wall_language_code: articleDraft.language,
        editorial_review_status: "draft",
      })
      .select("id")
      .single();
    if (e) setError(e.message);
    else if (data) {
      const { error: slotError } = await supabase
        .from("learn_wall_finishing_article_slots")
        .update({ article_id: data.id })
        .eq("topic_id", topicId)
        .eq("theme_key", articleDraft.theme)
        .eq("language_code", articleDraft.language);
      if (slotError)
        setError(
          `Article draft saved, but its slot link failed: ${slotError.message}`,
        );
      else {
        setNotice(
          "Draft saved. Publish only after the topic and at least one relevant citation have been reviewed; the database enforces these gates.",
        );
        setArticleDraft((d) => ({
          ...d,
          title: "",
          slug: "",
          excerpt: "",
          content: "",
        }));
        await refresh();
      }
    }
    setBusy(false);
  }
  async function updateArticle(
    article: Article,
    patch: Record<string, string | null>,
  ) {
    setBusy(true);
    setError("");
    const { error: e } = await supabase
      .from("learn_articles")
      .update(patch)
      .eq("id", article.id);
    if (e) setError(e.message);
    else {
      setNotice("Article updated.");
      await refresh();
    }
    setBusy(false);
  }
  const verifiedCount = topics.filter(
    (t) => t.verification_status === "verified",
  ).length;
  const acceptedCount = sources.filter(
    (s) => s.review_status === "accepted",
  ).length;
  const publishedCount = articles.filter(
    (a) => (a as Article & { status?: string }).status === "published",
  ).length;
  return (
    <div className="space-y-6">
      <AdminHeader
        title={tr("Wall Finishing Knowledge Library")}
        subtitle="Research, citations and market-specific articles. Catalog entries are candidates, not verified local guidance."
        action={
          <AdminButton variant="secondary" onClick={() => void refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {tr("Refresh")}
          </AdminButton>
        }
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
        >
          {notice}
        </div>
      )}
      {loading ? (
        <div className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminCard>
              <p className="text-xs text-muted-foreground">
                {tr("Candidate topics")}
              </p>
              <p className="mt-1 text-2xl font-bold">{topics.length}</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs text-muted-foreground">
                {tr("Verified topics / accepted citations")}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {verifiedCount} / {acceptedCount}
              </p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs text-muted-foreground">
                {tr("Published market articles")}
              </p>
              <p className="mt-1 text-2xl font-bold">{publishedCount}</p>
            </AdminCard>
          </div>
          <AdminCard>
            <h2 className="font-semibold">{tr("Market evidence coverage")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A native catalog means candidate records exist; it does not mean
              the local practice has been independently researched.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {marketStatus.map((row) => (
                <div
                  key={row.market_code}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <b>{row.market_code}</b>
                  <span className="ml-2 text-muted-foreground">
                    {row.has_native_catalog
                      ? "Catalog candidates"
                      : "No native catalog"}
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.coverage_status.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard>
              <h2 className="font-semibold">
                {tr("Review market topic and citations")}
              </h2>
              <div className="mt-4 grid gap-3">
                <AdminField label="Market">
                  <AdminSelect
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                  >
                    {WALL_FINISHING_LIBRARY_MARKETS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.countryName} ({m.code})
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
                <AdminField label="Candidate topic">
                  <AdminSelect
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                  >
                    {selectedTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
                {selectedTopic && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {selectedTopic.candidate_key} · {selectedTopic.topic_type}
                    </p>
                    <AdminField label="Verification status">
                      <AdminSelect
                        disabled={busy}
                        value={selectedTopic.verification_status}
                        onChange={(e) =>
                          void updateTopic(selectedTopic.id, e.target.value)
                        }
                      >
                        <option value="candidate">{tr("Candidate")}</option>
                        <option value="verified">
                          {tr("Verified for this market")}
                        </option>
                        <option value="rejected">{tr("Rejected")}</option>
                      </AdminSelect>
                    </AdminField>
                    <div className="space-y-2">
                      {sources
                        .filter((s) => s.topic_id === topicId)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="rounded-xl border border-border p-3"
                          >
                            <div className="flex justify-between gap-2">
                              <div>
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-brand-purple"
                                >
                                  {s.title}{" "}
                                  <ExternalLink className="inline h-3 w-3" />
                                </a>
                                <p className="text-xs text-muted-foreground">
                                  {s.publisher} · {s.review_status}
                                </p>
                                <p className="mt-1 text-xs">
                                  Scope: {s.claim_scope}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <AdminButton
                                  disabled={busy}
                                  variant="success"
                                  onClick={() =>
                                    void reviewSource(s.id, "accepted")
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </AdminButton>
                                <AdminButton
                                  disabled={busy}
                                  variant="secondary"
                                  onClick={() =>
                                    void reviewSource(s.id, "rejected")
                                  }
                                >
                                  {tr("Reject")}
                                </AdminButton>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <h3 className="text-sm font-semibold">
                        {tr("Add citation (starts pending)")}
                      </h3>
                      <div className="mt-3 grid gap-3">
                        <AdminField label="Source title">
                          <AdminInput
                            value={source.title}
                            onChange={(e) =>
                              setSource({ ...source, title: e.target.value })
                            }
                          />
                        </AdminField>
                        <AdminField label="Source URL">
                          <AdminInput
                            type="url"
                            value={source.url}
                            onChange={(e) =>
                              setSource({ ...source, url: e.target.value })
                            }
                          />
                        </AdminField>
                        <AdminField label="Publisher">
                          <AdminInput
                            value={source.publisher}
                            onChange={(e) =>
                              setSource({
                                ...source,
                                publisher: e.target.value,
                              })
                            }
                          />
                        </AdminField>
                        <AdminField label="Claims this source supports">
                          <AdminTextarea
                            value={source.claim_scope}
                            onChange={(e) =>
                              setSource({
                                ...source,
                                claim_scope: e.target.value,
                              })
                            }
                          />
                        </AdminField>
                        <AdminButton
                          disabled={
                            busy ||
                            !source.title ||
                            !source.url ||
                            !source.publisher ||
                            !source.claim_scope
                          }
                          onClick={() => void addSource()}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {tr("Save pending citation")}
                        </AdminButton>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AdminCard>
            <AdminCard>
              <h2 className="font-semibold">
                {tr("Create a market article draft")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Only write content supported by the cited local sources.
                Publication is database-gated on verified topic, accepted
                citation, and recorded editorial review.
              </p>
              {selectedTopic && (
                <div className="mt-4 grid gap-3">
                  <AdminField label="Topic">
                    <AdminSelect
                      value={topicId}
                      onChange={(e) => setTopicId(e.target.value)}
                    >
                      {selectedTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Article theme">
                    <AdminSelect
                      value={articleDraft.theme}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          theme: e.target.value,
                        })
                      }
                    >
                      {WALL_FINISHING_THEMES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Article language">
                    <AdminInput
                      value={articleDraft.language}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          language: e.target.value.trim().toLowerCase(),
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Learn category">
                    <AdminSelect
                      value={articleDraft.category}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          category: e.target.value,
                        })
                      }
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Title">
                    <AdminInput
                      value={articleDraft.title}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          title: e.target.value,
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="URL slug">
                    <AdminInput
                      value={articleDraft.slug}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          slug: e.target.value,
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Excerpt">
                    <AdminTextarea
                      value={articleDraft.excerpt}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          excerpt: e.target.value,
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Article content">
                    <AdminTextarea
                      value={articleDraft.content}
                      onChange={(e) =>
                        setArticleDraft({
                          ...articleDraft,
                          content: e.target.value,
                        })
                      }
                    />
                  </AdminField>
                  <p className="text-xs text-muted-foreground">
                    {selectedSlot
                      ? `Slot ready: ${selectedSlot.language_code} · ${selectedSlot.theme_key}${selectedSlot.article_id ? " (already occupied)" : ""}`
                      : "No matching slot for this language. Use the market’s seeded language or ask an administrator to add a slot."}
                  </p>
                  <AdminButton
                    disabled={
                      busy ||
                      !selectedSlot ||
                      Boolean(selectedSlot?.article_id) ||
                      !articleDraft.title ||
                      !articleDraft.slug ||
                      !articleDraft.content ||
                      !articleDraft.category
                    }
                    onClick={() => void saveDraft()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {tr("Save draft")}
                  </AdminButton>
                </div>
              )}
            </AdminCard>
          </div>
          <AdminCard>
            <h2 className="font-semibold">
              {tr("Draft review and publication")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Editing the title/content is supported here; changing a draft to
              published will be rejected unless all evidence and review gates
              are met.
            </p>
            <div className="mt-4 space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdminField label="Title">
                      <AdminInput
                        defaultValue={article.title}
                        onBlur={(e) =>
                          e.target.value !== article.title &&
                          void updateArticle(article, { title: e.target.value })
                        }
                      />
                    </AdminField>
                    <AdminField label="Slug">
                      <AdminInput
                        defaultValue={article.slug}
                        onBlur={(e) =>
                          e.target.value !== article.slug &&
                          void updateArticle(article, { slug: e.target.value })
                        }
                      />
                    </AdminField>
                  </div>
                  <AdminField label="Content">
                    <AdminTextarea
                      defaultValue={article.content}
                      onBlur={(e) =>
                        e.target.value !== article.content &&
                        void updateArticle(article, { content: e.target.value })
                      }
                    />
                  </AdminField>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {article.slug} · {article.category_slug}
                    </span>
                    <AdminButton
                      disabled={busy}
                      variant="success"
                      onClick={() =>
                        void updateArticle(article, {
                          editorial_review_status: "approved",
                          status: "published",
                          published_at: new Date().toISOString(),
                        })
                      }
                    >
                      {tr("Approve & publish")}
                    </AdminButton>
                    <AdminButton
                      disabled={busy}
                      variant="secondary"
                      onClick={() =>
                        void updateArticle(article, {
                          editorial_review_status: "rejected",
                          status: "draft",
                        })
                      }
                    >
                      {tr("Reject")}
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
