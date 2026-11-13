import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { DbLearnArticle } from "@/types/database";

/**
 * Topic-only list of articles: category, title and reading time, with no cover
 * imagery. Used for the related and recently published blocks on an article
 * page, where a wall of thumbnails competed with the article being read.
 */
export function ArticleTopicList({
  items,
  label,
}: {
  items: DbLearnArticle[];
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card/60"
    >
      {items.map((a) => (
        <li key={a.id}>
          <Link
            to={`/learn/${a.slug}/`}
            className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
          >
            <span className="min-w-0 flex-1">
              {a.category_slug ? (
                <span className="block text-xs font-semibold uppercase tracking-wider text-brand-purple">
                  {a.category_slug.replace(/-/g, " ")}
                </span>
              ) : null}
              <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
                {a.title ?? "Untitled article"}
              </span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {a.read_time_minutes
                ? `${a.read_time_minutes} min`
                : a.published_at
                  ? new Date(a.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
