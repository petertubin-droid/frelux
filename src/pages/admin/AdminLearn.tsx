import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  AlertCircle,
  BookOpen,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput,
  AdminIconButton,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { MediaUploader } from "@/components/admin/MediaUploader";
import type {
  DbLearnCategory,
  DbLearnArticle,
  DbLearnArticleFaq,
  DbLearnArticleInsert,
  LearnArticleStatus,
} from "@/types/database";
import { classNames } from "@/lib/utils";
import {
  checkGoogleCompliance,
  type GoogleComplianceReport,
} from "@/lib/google-compliance";
import { Button } from "@/components/ui/shadcn/button";

type Status = "loading" | "ready" | "error";

export default function AdminLearn() {
  const [tab, setTab] = useState<
    "articles" | "categories" | "faqs" | "inserts"
  >("articles");
  const [articles, setArticles] = useState<DbLearnArticle[]>([]);
  const [categories, setCategories] = useState<DbLearnCategory[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbLearnArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [faqArticleFilter, setFaqArticleFilter] = useState<string>("all");
  const [faqs, setFaqs] = useState<Record<string, DbLearnArticleFaq[]>>({});
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [editingFaq, setEditingFaq] = useState<{
    articleId: string;
    faq: DbLearnArticleFaq | null;
  } | null>(null);
  const [inserts, setInserts] = useState<
    Record<string, DbLearnArticleInsert[]>
  >({});
  const [editingInsert, setEditingInsert] = useState<{
    articleId: string;
    insert: DbLearnArticleInsert | null;
  } | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setStatus("loading");
    setError("");
    try {
      const [artRes, catRes] = await Promise.all([
        supabase
          .from("learn_articles")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("learn_categories")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);
      setArticles((artRes.data ?? []) as DbLearnArticle[]);
      setCategories((catRes.data ?? []) as DbLearnCategory[]);

      // Load FAQs grouped by article
      const faqRes = await supabase
        .from("learn_article_faqs")
        .select("*")
        .order("sort_order", { ascending: true });
      const faqMap: Record<string, DbLearnArticleFaq[]> = {};
      (faqRes.data ?? []).forEach((f: DbLearnArticleFaq) => {
        if (!faqMap[f.article_id]) faqMap[f.article_id] = [];
        faqMap[f.article_id].push(f);
      });
      setFaqs(faqMap);

      // Load in-article inserts grouped by article
      const insertRes = await supabase
        .from("learn_article_inserts")
        .select("*")
        .order("sort_order", { ascending: true });
      const insertMap: Record<string, DbLearnArticleInsert[]> = {};
      (insertRes.data ?? []).forEach((ins: DbLearnArticleInsert) => {
        if (!insertMap[ins.article_id]) insertMap[ins.article_id] = [];
        insertMap[ins.article_id].push(ins);
      });
      setInserts(insertMap);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setStatus("error");
    }
  }

  async function handleSave(
    article: Partial<DbLearnArticle> & {
      slug: string;
      title: string;
      category_slug: string;
    },
  ) {
    setMutationError(null);
    let result;
    if (editing) {
      result = await supabase
        .from("learn_articles")
        .update({ ...article, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
    } else {
      result = await supabase.from("learn_articles").insert(article);
    }
    if (result.error) {
      setMutationError(result.error.message);
      return;
    }
    setShowEditor(false);
    setEditing(null);
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this article?")) return;
    setMutationError(null);
    const { error: delError } = await supabase
      .from("learn_articles")
      .delete()
      .eq("id", id);
    if (delError) {
      setMutationError(delError.message);
      return;
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleTogglePublished(article: DbLearnArticle) {
    const newStatus: LearnArticleStatus =
      article.status === "published" ? "draft" : "published";
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "published" && !article.published_at)
      updates.published_at = new Date().toISOString();
    setMutationError(null);
    const { error: updateError } = await supabase
      .from("learn_articles")
      .update(updates)
      .eq("id", article.id);
    if (updateError) {
      setMutationError(updateError.message);
      return;
    }
    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id
          ? {
              ...a,
              status: newStatus,
              published_at: (updates.published_at as string) ?? a.published_at,
            }
          : a,
      ),
    );
  }

  async function handleToggleCategoryActive(cat: DbLearnCategory) {
    setMutationError(null);
    const { error: updateError } = await supabase
      .from("learn_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (updateError) {
      setMutationError(updateError.message);
      return;
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id ? { ...c, is_active: !c.is_active } : c,
      ),
    );
  }

  async function handleSaveFaq(
    articleId: string,
    question: string,
    answer: string,
  ) {
    setMutationError(null);
    if (editingFaq?.faq) {
      const { error: updError } = await supabase
        .from("learn_article_faqs")
        .update({ question, answer, updated_at: new Date().toISOString() })
        .eq("id", editingFaq.faq.id);
      if (updError) {
        setMutationError(updError.message);
        return;
      }
    } else {
      const existingCount = faqs[articleId]?.length ?? 0;
      const { error: insError } = await supabase
        .from("learn_article_faqs")
        .insert({
          article_id: articleId,
          question,
          answer,
          sort_order: existingCount,
          is_active: true,
        });
      if (insError) {
        setMutationError(insError.message);
        return;
      }
    }
    setEditingFaq(null);
    loadAll();
  }

  async function handleDeleteFaq(id: string, articleId: string) {
    setMutationError(null);
    const { error: delError } = await supabase
      .from("learn_article_faqs")
      .delete()
      .eq("id", id);
    if (delError) {
      setMutationError(delError.message);
      return;
    }
    setFaqs((prev) => ({
      ...prev,
      [articleId]: (prev[articleId] ?? []).filter((f) => f.id !== id),
    }));
  }

  async function handleToggleFaq(faq: DbLearnArticleFaq) {
    setMutationError(null);
    const { error: updError } = await supabase
      .from("learn_article_faqs")
      .update({
        is_active: !faq.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", faq.id);
    if (updError) {
      setMutationError(updError.message);
      return;
    }
    setFaqs((prev) => ({
      ...prev,
      [faq.article_id]: (prev[faq.article_id] ?? []).map((f) =>
        f.id === faq.id ? { ...f, is_active: !f.is_active } : f,
      ),
    }));
  }

  async function handleSaveInsert(
    articleId: string,
    fields: Pick<
      DbLearnArticleInsert,
      "insert_type" | "title" | "body" | "position_type" | "position_heading_id"
    >,
  ) {
    setMutationError(null);
    if (!fields.title.trim()) {
      setMutationError("Insert title is required.");
      return;
    }
    if (!fields.body.trim()) {
      setMutationError("Insert body is required.");
      return;
    }
    if (editingInsert?.insert) {
      const { error: updError } = await supabase
        .from("learn_article_inserts")
        .update({
          ...fields,
          position_heading_id:
            fields.position_type === "after_heading"
              ? fields.position_heading_id
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingInsert.insert.id);
      if (updError) {
        setMutationError(updError.message);
        return;
      }
    } else {
      const existingCount = inserts[articleId]?.length ?? 0;
      const { error: insError } = await supabase
        .from("learn_article_inserts")
        .insert({
          article_id: articleId,
          ...fields,
          position_heading_id:
            fields.position_type === "after_heading"
              ? fields.position_heading_id
              : null,
          sort_order: existingCount,
          is_active: true,
        });
      if (insError) {
        setMutationError(insError.message);
        return;
      }
    }
    setEditingInsert(null);
    loadAll();
  }

  async function handleDeleteInsert(id: string, articleId: string) {
    setMutationError(null);
    const { error: delError } = await supabase
      .from("learn_article_inserts")
      .delete()
      .eq("id", id);
    if (delError) {
      setMutationError(delError.message);
      return;
    }
    setInserts((prev) => ({
      ...prev,
      [articleId]: (prev[articleId] ?? []).filter((i) => i.id !== id),
    }));
  }

  async function handleToggleInsert(ins: DbLearnArticleInsert) {
    setMutationError(null);
    const { error: updError } = await supabase
      .from("learn_article_inserts")
      .update({
        is_active: !ins.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ins.id);
    if (updError) {
      setMutationError(updError.message);
      return;
    }
    setInserts((prev) => ({
      ...prev,
      [ins.article_id]: (prev[ins.article_id] ?? []).map((i) =>
        i.id === ins.id ? { ...i, is_active: !i.is_active } : i,
      ),
    }));
  }

  // AI-assisted insert drafting — calls the ai-learn-assistant edge
  // function (Gemini). Returns a {title, body} draft the admin can edit
  // before saving. Admin-only on the server side as well.
  async function handleAiDraftInsert(articleId: string, insertType: string) {
    const article = articles.find((a) => a.id === articleId);
    if (!article) return;
    setAiDrafting(true);
    setMutationError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-learn-assistant`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "generate_insert",
          insertType,
          content: article.content.slice(0, 10000),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMutationError(json?.error ?? "AI drafting failed. Try again.");
        return;
      }
      // Model returns JSON — tolerate code fences around it.
      let draft: { title?: string; body?: string } | null = null;
      try {
        const cleaned = String(json.result)
          .replace(/^\s*```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/, "")
          .trim();
        draft = JSON.parse(cleaned);
      } catch {
        draft = null;
      }
      if (!draft?.body) {
        setMutationError(
          "AI returned an unexpected draft. Try again or write it manually.",
        );
        return;
      }
      // Capture the narrowed draft into consts — TS cannot carry the
      // guard above into the closure below because `draft` is a mutable let.
      const draftBody: string = draft.body;
      const draftTitle: string | undefined = draft.title;
      setEditingInsert((prev) => {
        const base = prev ?? { articleId, insert: null };
        const current =
          base.insert ??
          ({
            id: "",
            article_id: articleId,
            insert_type: insertType as DbLearnArticleInsert["insert_type"],
            title: "",
            body: "",
            position_type: "top",
            position_heading_id: null,
            sort_order: 0,
            is_active: true,
            created_at: "",
            updated_at: "",
          } as DbLearnArticleInsert);
        return {
          articleId,
          insert: {
            ...current,
            insert_type: insertType as DbLearnArticleInsert["insert_type"],
            title: draftTitle?.trim() || current.title || "Untitled",
            body: draftBody.trim(),
          },
        };
      });
    } catch {
      setMutationError("AI drafting failed. Check your connection and retry.");
    } finally {
      setAiDrafting(false);
    }
  }

  function toggleArticleExpanded(articleId: string) {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }

  if (status === "loading")
    return (
      <>
        <AdminHeader
          title="Learn"
          subtitle="Manage educational articles and categories."
        />
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching content."
        />
      </>
    );
  if (status === "error")
    return (
      <>
        <AdminHeader
          title="Learn"
          subtitle="Manage educational articles and categories."
        />
        <StateMessage type="error" title="Error" message={error} />
      </>
    );

  return (
    <>
      <AdminHeader
        title="Learn"
        subtitle="Manage educational articles and categories."
        action={
          tab === "articles" ? (
            <AdminButton
              onClick={() => {
                setEditing(null);
                setShowEditor(true);
              }}
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> New Article
            </AdminButton>
          ) : undefined
        }
      />

      {mutationError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />{" "}
          {mutationError}
        </div>
      )}

      {/* Tab switcher */}
      <div className="mb-6 inline-flex rounded-lg border border-border bg-card dark:border-white/5 dark:bg-card p-1">
        {(["articles", "categories", "faqs", "inserts"] as const).map((t) => (
          <AdminButton
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={classNames(
              "rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-brand-purple",
            )}
          >
            {t}
          </AdminButton>
        ))}
      </div>

      {/* Articles tab */}
      {tab === "articles" && !showEditor && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {articles.length === 0 ? (
            <StateMessage
              type="empty"
              title="No articles yet"
              message="Create your first article to publish in the Learn section."
              action={
                <AdminButton onClick={() => setShowEditor(true)}>
                  <Plus aria-hidden="true" className="h-4 w-4" /> New Article
                </AdminButton>
              }
            />
          ) : (
            articles.map((article) => (
              <div key={article.id} className="card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <p className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
                      {article.title}
                    </p>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        article.status === "published"
                          ? "bg-accent-green/15 text-accent-green"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {article.status}
                    </span>
                    {article.is_featured && (
                      <span className="rounded-full bg-accent-orange/15 px-2 py-0.5 text-[10px] font-semibold text-accent-orange">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground dark:text-muted-foreground">
                    {article.category_slug.replace(/-/g, " ")} ·{" "}
                    {new Date(article.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Toggle
                    checked={article.status === "published"}
                    onChange={() => handleTogglePublished(article)}
                  />
                  <AdminIconButton
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setEditing(article);
                      setShowEditor(true);
                    }}
                    className="rounded-md p-2 text-muted-foreground hover:text-brand-purple"
                  >
                    <Pencil className="h-4 w-4" />
                  </AdminIconButton>
                  <AdminIconButton
                    variant="ghost"
                    type="button"
                    onClick={() => handleDelete(article.id)}
                    className="rounded-md p-2 text-muted-foreground/80 hover:text-red-500"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </AdminIconButton>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Article editor */}
      {tab === "articles" && showEditor && (
        <ArticleEditor
          article={editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditing(null);
          }}
        />
      )}

      {/* Categories tab */}
      {tab === "categories" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <BookOpen aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                    {cat.name}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    /{cat.slug} · Order {cat.sort_order}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {cat.is_active ? "Active" : "Inactive"}
                </span>
                <Toggle
                  checked={cat.is_active}
                  onChange={() => handleToggleCategoryActive(cat)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* FAQs tab */}
      {tab === "faqs" && (
        <div className="space-y-2">
          <div className="mb-4">
            <AdminSelect
              value={faqArticleFilter}
              onChange={(e) => setFaqArticleFilter(e.target.value)}
              className="max-w-xs"
            >
              <option value="all">All articles ({articles.length})</option>
              <option value="with-faqs">With FAQs only</option>
              <option value="without-faqs">Without FAQs only</option>
            </AdminSelect>
          </div>
          {articles
            .filter((a) => {
              if (faqArticleFilter === "with-faqs")
                return (faqs[a.id]?.length ?? 0) > 0;
              if (faqArticleFilter === "without-faqs")
                return (faqs[a.id]?.length ?? 0) === 0;
              return true;
            })
            .map((article) => {
              const articleFaqs = faqs[article.id] ?? [];
              const isExpanded = expandedArticles.has(article.id);
              return (
                <div key={article.id} className="card overflow-hidden">
                  <Button
                    variant="ghost"
                    onClick={() => toggleArticleExpanded(article.id)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <HelpCircle className="h-4 w-4 text-brand-purple" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
                        {article.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {articleFaqs.length} FAQ
                        {articleFaqs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        article.status === "published"
                          ? "bg-accent-green/15 text-accent-green"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {article.status}
                    </span>
                  </Button>
                  {isExpanded && (
                    <div className="border-t border-border/50 dark:border-white/5 p-3">
                      {editingFaq?.articleId === article.id && (
                        <div className="mb-3 rounded-lg border border-brand-purple/20 bg-primary/5 p-3 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {editingFaq.faq ? "Edit FAQ" : "New FAQ"}
                          </h4>
                          <AdminField label="Question">
                            <AdminInput
                              value={editingFaq.faq?.question ?? ""}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  faq: editingFaq.faq
                                    ? {
                                        ...editingFaq.faq,
                                        question: e.target.value,
                                      }
                                    : {
                                        id: "",
                                        article_id: article.id,
                                        question: e.target.value,
                                        answer: "",
                                        sort_order: 0,
                                        is_active: true,
                                        created_at: "",
                                        updated_at: "",
                                      },
                                })
                              }
                            />
                          </AdminField>
                          <AdminField label="Answer">
                            <AdminTextarea
                              rows={3}
                              value={editingFaq.faq?.answer ?? ""}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  faq: editingFaq.faq
                                    ? {
                                        ...editingFaq.faq,
                                        answer: e.target.value,
                                      }
                                    : {
                                        id: "",
                                        article_id: article.id,
                                        question: "",
                                        answer: e.target.value,
                                        sort_order: 0,
                                        is_active: true,
                                        created_at: "",
                                        updated_at: "",
                                      },
                                })
                              }
                            />
                          </AdminField>
                          <div className="flex gap-2">
                            <AdminButton
                              onClick={() =>
                                handleSaveFaq(
                                  article.id,
                                  editingFaq.faq?.question ?? "",
                                  editingFaq.faq?.answer ?? "",
                                )
                              }
                            >
                              <Check className="h-4 w-4" /> Save FAQ
                            </AdminButton>
                            <AdminButton onClick={() => setEditingFaq(null)}>
                              Cancel
                            </AdminButton>
                          </div>
                        </div>
                      )}
                      {articleFaqs.length > 0 ? (
                        <div className="space-y-2">
                          {articleFaqs.map((faq, idx) => (
                            <div
                              key={faq.id}
                              className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-white/5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                                  <span className="text-brand-purple">
                                    Q{idx + 1}:
                                  </span>{" "}
                                  {faq.question}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                                  {faq.answer}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Toggle
                                  checked={faq.is_active}
                                  onChange={() => handleToggleFaq(faq)}
                                />
                                <AdminIconButton
                                  variant="ghost"
                                  type="button"
                                  onClick={() =>
                                    setEditingFaq({
                                      articleId: article.id,
                                      faq,
                                    })
                                  }
                                  className="rounded-md p-2 text-muted-foreground hover:text-brand-purple"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </AdminIconButton>
                                <AdminIconButton
                                  variant="ghost"
                                  type="button"
                                  onClick={() =>
                                    handleDeleteFaq(faq.id, article.id)
                                  }
                                  className="rounded-md p-2 text-muted-foreground/80 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AdminIconButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">
                          No FAQs yet for this article.
                        </p>
                      )}
                      {editingFaq?.articleId !== article.id && (
                        <AdminButton
                          onClick={() =>
                            setEditingFaq({ articleId: article.id, faq: null })
                          }
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4" /> Add FAQ
                        </AdminButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
      {/* Inserts tab */}
      {tab === "inserts" && (
        <div className="space-y-2">
          <p className="mb-3 text-xs text-muted-foreground">
            Insert cards render inline in the article body — top (below the
            cover image), after a specific heading, or bottom (above FAQs). Use
            AI Draft to generate a starting point, then edit before saving.
          </p>
          {articles.map((article) => {
            const articleInserts = inserts[article.id] ?? [];
            const isExpanded = expandedArticles.has(article.id);
            return (
              <div key={article.id} className="card overflow-hidden">
                <Button
                  variant="ghost"
                  onClick={() => toggleArticleExpanded(article.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Sparkles className="h-4 w-4 text-brand-purple" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
                      {article.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {articleInserts.length} insert
                      {articleInserts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      article.status === "published"
                        ? "bg-accent-green/15 text-accent-green"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {article.status}
                  </span>
                </Button>
                {isExpanded && (
                  <div className="border-t border-border/50 dark:border-white/5 p-3">
                    {editingInsert?.articleId === article.id && (
                      <InsertEditor
                        key={editingInsert.insert?.id ?? "new"}
                        draft={editingInsert.insert}
                        aiDrafting={aiDrafting}
                        onSave={(fields) =>
                          handleSaveInsert(article.id, fields)
                        }
                        onCancel={() => setEditingInsert(null)}
                        onAiDraft={(insertType) =>
                          handleAiDraftInsert(article.id, insertType)
                        }
                      />
                    )}
                    {articleInserts.length > 0 ? (
                      <div className="space-y-2">
                        {articleInserts.map((ins) => (
                          <div
                            key={ins.id}
                            className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-white/5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                                <span className="text-brand-purple">
                                  {INSERT_TYPE_LABELS[ins.insert_type] ??
                                    ins.insert_type}
                                  :
                                </span>{" "}
                                {ins.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                                {ins.body.split("\n")[0].slice(0, 140)}
                                {ins.body.length > 140 ? "…" : ""}
                              </p>
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                {ins.position_type === "after_heading"
                                  ? `after "${ins.position_heading_id}"`
                                  : ins.position_type}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Toggle
                                checked={ins.is_active}
                                onChange={() => handleToggleInsert(ins)}
                              />
                              <AdminIconButton
                                variant="ghost"
                                type="button"
                                onClick={() =>
                                  setEditingInsert({
                                    articleId: article.id,
                                    insert: ins,
                                  })
                                }
                                className="rounded-md p-2 text-muted-foreground hover:text-brand-purple"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </AdminIconButton>
                              <AdminIconButton
                                variant="ghost"
                                type="button"
                                onClick={() =>
                                  handleDeleteInsert(ins.id, article.id)
                                }
                                className="rounded-md p-2 text-muted-foreground/80 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </AdminIconButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        No inserts yet for this article.
                      </p>
                    )}
                    {editingInsert?.articleId !== article.id && (
                      <AdminButton
                        onClick={() =>
                          setEditingInsert({
                            articleId: article.id,
                            insert: null,
                          })
                        }
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4" /> Add Insert
                      </AdminButton>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const INSERT_TYPE_LABELS: Record<string, string> = {
  summary: "Summary",
  key_takeaways: "Key Takeaways",
  what_to_watch: "What to Watch",
  pro_tip: "Pro Tip",
  stat_highlight: "Stat",
  quote: "Quote",
};

const INSERT_POSITIONS = ["top", "after_heading", "bottom"] as const;
const INSERT_TYPES = [
  "summary",
  "key_takeaways",
  "what_to_watch",
  "pro_tip",
  "stat_highlight",
  "quote",
] as const;

// =========================================================
// In-Article Insert Editor (with AI-assisted drafting)
// =========================================================
function InsertEditor({
  draft,
  aiDrafting,
  onSave,
  onCancel,
  onAiDraft,
}: {
  draft: DbLearnArticleInsert | null;
  aiDrafting: boolean;
  onSave: (fields: {
    insert_type: DbLearnArticleInsert["insert_type"];
    title: string;
    body: string;
    position_type: DbLearnArticleInsert["position_type"];
    position_heading_id: string | null;
  }) => void;
  onCancel: () => void;
  onAiDraft: (insertType: string) => void;
}) {
  const [insertType, setInsertType] = useState<
    DbLearnArticleInsert["insert_type"]
  >(draft?.insert_type ?? "summary");
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [positionType, setPositionType] = useState<
    DbLearnArticleInsert["position_type"]
  >(draft?.position_type ?? "top");
  const [headingId, setHeadingId] = useState(draft?.position_heading_id ?? "");

  const isList = ["summary", "key_takeaways", "what_to_watch"].includes(
    insertType,
  );

  return (
    <div className="mb-3 rounded-lg border border-brand-purple/20 bg-primary/5 p-3 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {draft ? "Edit Insert" : "New Insert"}
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label="Insert type">
          <AdminSelect
            value={insertType}
            onChange={(e) =>
              setInsertType(
                e.target.value as DbLearnArticleInsert["insert_type"],
              )
            }
          >
            {INSERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {INSERT_TYPE_LABELS[t]}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="Position">
          <AdminSelect
            value={positionType}
            onChange={(e) =>
              setPositionType(
                e.target.value as DbLearnArticleInsert["position_type"],
              )
            }
          >
            {INSERT_POSITIONS.map((t) => (
              <option key={t} value={t}>
                {t === "after_heading" ? "after heading" : t}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      </div>

      {positionType === "after_heading" && (
        <AdminField
          label="Target heading ID"
          hint="Slugified text of the ## / ### heading, e.g. 'how-to-mix-screeding-paint'. Visible in the URL when you click a heading in the TOC."
        >
          <AdminInput
            type="text"
            value={headingId}
            onChange={(e) => setHeadingId(e.target.value)}
          />
        </AdminField>
      )}

      <AdminField label="Title">
        <AdminInput
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </AdminField>

      <AdminField
        label="Body"
        hint={
          isList
            ? "One item per line — rendered as a bulleted list."
            : insertType === "stat_highlight"
              ? "One stat per line as: stat | short explanation."
              : "Plain paragraph text."
        }
      >
        <AdminTextarea
          rows={isList ? 5 : 3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </AdminField>

      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          onClick={() => onAiDraft(insertType)}
          disabled={aiDrafting}
          className="gap-1.5"
        >
          {aiDrafting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          )}
          {aiDrafting ? "Drafting…" : "AI Draft"}
        </AdminButton>
        <AdminButton
          type="button"
          onClick={() =>
            onSave({
              insert_type: insertType,
              title,
              body,
              position_type: positionType,
              position_heading_id: headingId.trim() || null,
            })
          }
        >
          <Check className="h-4 w-4" /> Save Insert
        </AdminButton>
        <AdminButton type="button" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
      <p className="text-[10px] text-muted-foreground">
        AI Draft is optional assistance — review and edit the generated text
        before saving. Nothing is stored until you press Save Insert.
      </p>
    </div>
  );
}

// =========================================================
// Article Editor
// =========================================================
function ArticleEditor({
  article,
  categories,
  onSave,
  onCancel,
}: {
  article: DbLearnArticle | null;
  categories: DbLearnCategory[];
  onSave: (
    data: Partial<DbLearnArticle> & {
      slug: string;
      title: string;
      category_slug: string;
    },
  ) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    slug: article?.slug ?? "",
    title: article?.title ?? "",
    excerpt: article?.excerpt ?? "",
    content: article?.content ?? "",
    category_slug: article?.category_slug ?? categories[0]?.slug ?? "",
    cover_image_url: article?.cover_image_url ?? "",
    author: article?.author ?? "",
    read_time_minutes: article?.read_time_minutes ?? 5,
    status: article?.status ?? "draft",
    is_featured: article?.is_featured ?? false,
    meta_title: article?.meta_title ?? "",
    meta_description: article?.meta_description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complianceReport, setComplianceReport] =
    useState<GoogleComplianceReport | null>(null);
  const [showCompliance, setShowCompliance] = useState(false);

  function runComplianceCheck(): GoogleComplianceReport {
    return checkGoogleCompliance({
      slug: form.slug.trim(),
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      category_slug: form.category_slug,
      author: form.author.trim() || null,
      read_time_minutes: Number(form.read_time_minutes) || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_keywords: null,
      cover_image_url: form.cover_image_url.trim() || null,
      status: form.status,
      is_featured: form.is_featured,
    });
  }

  async function handleSubmit() {
    if (!form.slug.trim() || !form.title.trim() || !form.category_slug) {
      setError("Slug, title, and category are required.");
      return;
    }
    // Google compliance gate — block publishing non-compliant articles
    if (form.status === "published") {
      const report = runComplianceCheck();
      if (!report.compliant) {
        setComplianceReport(report);
        setShowCompliance(true);
        setError(
          `Article fails Google compliance check (${report.blockingIssues.length} blocking issue(s)). Fix issues or save as draft.`,
        );
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const data: Record<string, unknown> = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        category_slug: form.category_slug,
        cover_image_url: form.cover_image_url.trim() || null,
        author: form.author.trim() || null,
        read_time_minutes: Number(form.read_time_minutes) || null,
        status: form.status,
        is_featured: form.is_featured,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      };
      if (form.status === "published" && !article?.published_at) {
        data.published_at = new Date().toISOString();
      }
      onSave(
        data as Partial<DbLearnArticle> & {
          slug: string;
          title: string;
          category_slug: string;
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          {article ? "Edit Article" : "New Article"}
        </h2>
        <AdminIconButton variant="ghost" type="button" onClick={onCancel}>
          <X aria-hidden="true" className="h-4 w-4" />
        </AdminIconButton>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Title">
          <AdminInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </AdminField>
        <AdminField
          label="Slug"
          hint="URL friendly identifier, e.g. how to paint a wall"
        >
          <AdminInput
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </AdminField>
      </div>

      <AdminField label="Category">
        <AdminSelect
          value={form.category_slug}
          onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </AdminSelect>
      </AdminField>

      <AdminField
        label="Excerpt"
        hint="Short summary shown in article cards and search results."
      >
        <AdminTextarea
          rows={2}
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
        />
      </AdminField>

      <AdminField
        label="Content"
        hint="Markdown formatted article body. Supports headings, lists, bold, and code blocks."
      >
        <AdminTextarea
          className="font-mono text-sm"
          rows={12}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="# Introduction&#10;Write your article here…"
        />
      </AdminField>

      <div className="grid gap-4 sm:grid-cols-2">
        <MediaUploader
          label="Cover Image"
          value={form.cover_image_url}
          onChange={(url) => setForm({ ...form, cover_image_url: url })}
          folder="learn"
        />
        <AdminField label="Author">
          <AdminInput
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Read Time (minutes)">
          <AdminInput
            type="number"
            min={1}
            value={form.read_time_minutes}
            onChange={(e) =>
              setForm({ ...form, read_time_minutes: Number(e.target.value) })
            }
          />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as LearnArticleStatus })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </AdminSelect>
        </AdminField>
      </div>

      <AdminCard className="bg-muted/50 dark:bg-white/5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          SEO Settings
        </h3>
        <div className="space-y-4">
          <AdminField
            label="Meta Title"
            hint="Overrides the default page title for search engines."
          >
            <AdminInput
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
            />
          </AdminField>
          <AdminField
            label="Meta Description"
            hint="Overrides the default description for search engines."
          >
            <AdminTextarea
              rows={2}
              value={form.meta_description}
              onChange={(e) =>
                setForm({ ...form, meta_description: e.target.value })
              }
            />
          </AdminField>
        </div>
      </AdminCard>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <AdminInput
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) =>
              setForm({ ...form, is_featured: e.target.checked })
            }
            className="h-4 w-4 rounded border-border text-brand-purple focus:ring-brand-purple"
          />
          Featured article
        </label>
      </div>

      {/* Google Compliance Checker */}
      <div className="flex items-center gap-3">
        <AdminButton
          type="button"
          onClick={() => {
            setComplianceReport(runComplianceCheck());
            setShowCompliance(true);
          }}
        >
          <AlertCircle aria-hidden="true" className="h-4 w-4" /> Check Google
          Compliance
        </AdminButton>
      </div>

      {showCompliance && complianceReport && (
        <AdminCard
          className={classNames(
            "space-y-2",
            complianceReport.compliant
              ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5"
              : "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
              Google Compliance Report
            </h3>
            <AdminIconButton
              variant="ghost"
              type="button"
              onClick={() => setShowCompliance(false)}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </AdminIconButton>
          </div>
          <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
            Score: {complianceReport.score}/100 —{" "}
            {complianceReport.compliant
              ? "✅ Compliant"
              : "❌ Not compliant for publishing"}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={classNames(
                "rounded-full px-2 py-1 font-semibold",
                complianceReport.eeattAssessment.experience === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              Experience: {complianceReport.eeattAssessment.experience}
            </span>
            <span
              className={classNames(
                "rounded-full px-2 py-1 font-semibold",
                complianceReport.eeattAssessment.expertise === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              Expertise: {complianceReport.eeattAssessment.expertise}
            </span>
            <span
              className={classNames(
                "rounded-full px-2 py-1 font-semibold",
                complianceReport.eeattAssessment.authoritativeness === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              Authoritativeness:{" "}
              {complianceReport.eeattAssessment.authoritativeness}
            </span>
            <span
              className={classNames(
                "rounded-full px-2 py-1 font-semibold",
                complianceReport.eeattAssessment.trustworthiness === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              Trustworthiness:{" "}
              {complianceReport.eeattAssessment.trustworthiness}
            </span>
          </div>
          {complianceReport.blockingIssues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                Blocking Issues
              </p>
              {complianceReport.blockingIssues.map((issue, i) => (
                <p key={i} className="text-xs text-red-600">
                  {issue}
                </p>
              ))}
            </div>
          )}
          {complianceReport.advisoryIssues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Advisory Issues
              </p>
              {complianceReport.advisoryIssues.map((issue, i) => (
                <p key={i} className="text-xs text-amber-600">
                  {issue}
                </p>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>Cancel</AdminButton>
        <AdminButton onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Article"}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
