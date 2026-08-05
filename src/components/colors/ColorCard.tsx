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
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/colors/paint/${color.slug}`} className="block">
        <div
          className="relative flex aspect-square items-center justify-center transition-transform duration-300 group-hover:scale-105"
          style={{ background: color.hex_code }}
        >
          <span className="text-sm font-bold uppercase tracking-widest opacity-70" style={{ color: textColor }}>
            {color.hex_code}
          </span>
          {color.is_trending && (
            <span className="absolute left-2 top-2 rounded-full bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Trending
            </span>
          )}
          {color.is_featured && !color.is_trending && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Featured
            </span>
          )}
        </div>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(color.id);
          }}
          className={classNames(
            'absolute right-2 top-2 rounded-full p-1.5 transition-all',
            isFavorited ? 'bg-white text-red-500' : 'bg-white/80 text-neutral-400 hover:text-red-500'
          )}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={classNames('h-4 w-4', isFavorited && 'fill-current')} />
        </button>
      )}
      <div className="p-3">
        <Link to={`/colors/paint/${color.slug}`}>
          <h3 className="truncate text-sm font-bold text-brand-navy group-hover:text-brand-purple">{color.name}</h3>
        </Link>
        <p className="mt-0.5 text-xs text-neutral-400">
          {color.is_interior && color.is_exterior ? 'Interior / Exterior' : color.is_interior ? 'Interior' : 'Exterior'}
        </p>
      </div>
    </div>
  );
}
