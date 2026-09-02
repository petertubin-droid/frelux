import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import type { DbPaintColor } from "@/types/database";
import { readableTextColor } from "@/lib/colors";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  color: DbPaintColor;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ColorCard({
  color,
  isFavorited,
  onToggleFavorite,
}: Props) {
  const textColor = readableTextColor(color.hex_code);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-all dark:border-white/5 dark:bg-card duration-300 hover:-translate-y-1.5 hover:shadow-premium hover:border-border dark:hover:border-white/10 animate-fade-in-up">
      <Link to={`/colors/paint/${color.slug}`} className="block">
        {/* Color swatch — large, premium */}
        <div
          className="relative flex aspect-[4/5] items-end justify-start p-3 transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ background: color.hex_code }}
        >
          {/* Hex code overlay */}
          <span
            className="text-xs font-bold uppercase tracking-[0.1em] opacity-50 transition-opacity duration-300 group-hover:opacity-80"
            style={{ color: textColor }}
          >
            {color.hex_code}
          </span>

          {/* Badges */}
          {color.is_trending && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-orange backdrop-blur-sm dark:bg-background/90">
              Trending
            </span>
          )}
          {color.is_featured && !color.is_trending && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-purple backdrop-blur-sm dark:bg-background/90">
              Featured
            </span>
          )}

          {/* Bottom gradient for depth */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-20"
            style={{
              background: `linear-gradient(to top, ${textColor === "#FFFFFF" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.2)"}, transparent)`,
            }}
          />
        </div>
      </Link>

      {/* Favorite button */}
      {onToggleFavorite && (
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(color.id);
          }}
          className={classNames(
            "absolute right-3 bottom-16 rounded-full p-2 backdrop-blur-md transition-all duration-200",
            isFavorited
              ? "bg-card text-red-500 shadow-sm dark:bg-white dark:text-red-500"
              : "bg-white/60 text-muted-foreground hover:bg-card hover:text-red-500 dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/20 dark:hover:text-red-400",
          )}
          aria-label={
            isFavorited ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={isFavorited}
        >
          <Bookmark
            className={classNames(
              "h-4 w-4 transition-transform",
              isFavorited && "fill-current scale-110",
            )}
          />
        </Button>
      )}

      {/* Info bar */}
      <div className="px-3.5 py-3">
        <Link to={`/colors/paint/${color.slug}`}>
          <h3 className="truncate text-sm font-bold text-foreground dark:text-primary-foreground transition-colors group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter">
            {color.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground dark:text-muted-foreground">
            {color.is_interior && color.is_exterior
              ? "Interior / Exterior"
              : color.is_interior
                ? "Interior"
                : "Exterior"}
          </p>
        </div>
      </div>
    </div>
  );
}
