import { Link } from "react-router-dom";
import { Clock, ImageOff } from "lucide-react";
import type { DbLearnArticle } from "@/types/database";

/** Shared article card used across the Learn hub landing and library
 *  listing pages. */
export default function ArticleCard({ article }: { article: DbLearnArticle }) {
  return (
    <Link
      to={`/learn/${article.slug}/`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/5 dark:bg-card"
    >
      {article.cover_image_url ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-muted/50 to-primary/5 dark:from-white/5 dark:to-primary/10">
          <ImageOff className="h-7 w-7 text-muted-foreground/80" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-purple">
          {article.category_slug.replace(/-/g, " ")}
        </span>
        <h3 className="font-display text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2 dark:text-muted-foreground">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
          {article.read_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.read_time_minutes} min read
            </span>
          )}
          {article.published_at && (
            <span>
              {new Date(article.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
