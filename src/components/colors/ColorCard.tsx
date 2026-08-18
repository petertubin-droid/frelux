import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { DbPaintColor } from '@/types/database';
import { readableTextColor } from '@/lib/colors';
import { classNames } from '@/lib/utils';

interface Props {
  color: DbPaintColor;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ColorCard({ color, isFavorited, onToggleFavorite }: Props) {
  const textColor = readableTextColor(color.hex_code);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium hover:border-neutral-200">
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
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-orange backdrop-blur-sm">
              Trending
            </span>
          )}
          {color.is_featured && !color.is_trending && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-purple backdrop-blur-sm">
              Featured
            </span>
          )}

          {/* Bottom gradient for depth */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-20"
            style={{ background: `linear-gradient(to top, ${textColor === '#FFFFFF' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)'}, transparent)` }}
          />
        </div>
      </Link>

      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(color.id);
          }}
          className={classNames(
            'absolute right-3 bottom-16 rounded-full p-2 backdrop-blur-md transition-all duration-200',
            isFavorited ? 'bg-white text-red-500 shadow-sm' : 'bg-white/60 text-neutral-400 hover:bg-white hover:text-red-500'
          )}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={classNames('h-4 w-4', isFavorited && 'fill-current')} />
        </button>
      )}

      {/* Info bar */}
      <div className="px-3.5 py-3">
        <Link to={`/colors/paint/${color.slug}`}>
          <h3 className="truncate text-sm font-bold text-neutral-900 transition-colors group-hover:text-brand-purple">{color.name}</h3>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-[11px] text-neutral-400">
            {color.is_interior && color.is_exterior ? 'Interior / Exterior' : color.is_interior ? 'Interior' : 'Exterior'}
          </p>
        </div>
      </div>
    </div>
  );
}
