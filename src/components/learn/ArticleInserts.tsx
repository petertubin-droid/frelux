import {
  AlignLeft,
  CheckCircle2,
  Eye,
  Zap,
  TrendingUp,
  Quote,
  Sparkles,
} from "lucide-react";
import type { DbLearnArticleInsert } from "@/types/database";

/**
 * In-Article Insert blocks — admin-configured content cards rendered
 * inline within Learn articles (Summary, Key Takeaways, What to Watch,
 * Pro Tip, Stat Highlight, Quote).
 *
 * Purely presentational: content, type and placement all come from the
 * learn_article_inserts table (Admin → Learn → Inserts tab).
 */

const LIST_TYPES: DbLearnArticleInsert["insert_type"][] = [
  "summary",
  "key_takeaways",
  "what_to_watch",
];

const INSERT_META: Record<
  DbLearnArticleInsert["insert_type"],
  { label: string; icon: typeof AlignLeft; accent: string; chip: string }
> = {
  summary: {
    label: "Summary",
    icon: AlignLeft,
    accent: "border-l-brand-purple bg-primary/[0.04] dark:bg-primary/[0.07]",
    chip: "bg-brand-purple/10 text-brand-purple",
  },
  key_takeaways: {
    label: "Key Takeaways",
    icon: CheckCircle2,
    accent: "border-l-accent-green bg-accent-green/[0.05] dark:bg-accent-green/[0.07]",
    chip: "bg-accent-green/15 text-accent-green",
  },
  what_to_watch: {
    label: "What to Watch",
    icon: Eye,
    accent: "border-l-accent-orange bg-accent-orange/[0.05] dark:bg-accent-orange/[0.07]",
    chip: "bg-accent-orange/15 text-accent-orange",
  },
  pro_tip: {
    label: "Pro Tip",
    icon: Zap,
    accent: "border-l-brand-purple bg-primary/[0.04] dark:bg-primary/[0.07]",
    chip: "bg-brand-purple/10 text-brand-purple",
  },
  stat_highlight: {
    label: "Stat",
    icon: TrendingUp,
    accent: "border-l-accent-cyan bg-accent-cyan/[0.05] dark:bg-accent-cyan/[0.07]",
    chip: "bg-accent-cyan/15 text-accent-cyan",
  },
  quote: {
    label: "Quote",
    icon: Quote,
    accent: "border-l-muted-foreground/60 bg-muted/40 dark:bg-white/[0.04]",
    chip: "bg-muted text-muted-foreground",
  },
};

function isListInsert(type: DbLearnArticleInsert["insert_type"]) {
  return LIST_TYPES.includes(type);
}

export function ArticleInsertBlock({ insert }: { insert: DbLearnArticleInsert }) {
  const meta = INSERT_META[insert.insert_type] ?? INSERT_META.summary;
  const Icon = meta.icon;

  const lines = insert.body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const isList = isListInsert(insert.insert_type) && lines.length > 0;

  return (
    <aside
      className={`mb-6 rounded-2xl border border-border/80 border-l-4 ${meta.accent} p-5 shadow-sm dark:border-white/10 sm:p-6`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider ${meta.chip}`}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
          {insert.title}
        </h3>
      </div>

      {isList ? (
        <ul className="mt-4 space-y-2.5">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-card-foreground dark:text-muted-foreground/90"
            >
              <Sparkles
                aria-hidden="true"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple/70"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : insert.insert_type === "stat_highlight" ? (
        <div className="mt-4 space-y-2">
          {lines.map((line, i) => {
            const [value, ...rest] = line.split("|");
            const label = rest.join("|").trim();
            return (
              <div key={i} className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-accent-cyan">
                  {value.trim()}
                </span>
                {label && (
                  <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : insert.insert_type === "quote" ? (
        <blockquote className="mt-4 border-l-0 p-0">
          <Quote
            aria-hidden="true"
            className="mb-2 h-5 w-5 text-muted-foreground/50"
          />
          <p className="text-base italic leading-relaxed text-card-foreground dark:text-muted-foreground/90">
            {insert.body}
          </p>
        </blockquote>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-card-foreground dark:text-muted-foreground/90">
          {insert.body}
        </p>
      )}
    </aside>
  );
}
