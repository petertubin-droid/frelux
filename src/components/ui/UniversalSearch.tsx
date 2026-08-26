import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  hex?: string;
  href?: string;
}

export default function UniversalSearch({
  placeholder = 'Search...',
  items,
  onSelect,
  onQueryChange,
  className,
}: {
  placeholder?: string;
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.sublabel?.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div ref={ref} className={classNames('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onQueryChange?.(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid py-2.5 pl-10 pr-9 text-sm text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-500 dark:text-neutral-500 transition-colors focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              onQueryChange?.('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-500 hover:text-neutral-600 dark:text-neutral-300"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid py-1 shadow-xl animate-tooltip-in">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:bg-white/5"
            >
              {item.hex && (
                <span className="h-5 w-5 shrink-0 rounded-md ring-1 ring-black/5" style={{ backgroundColor: item.hex }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{item.label}</p>
                {item.sublabel && <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">{item.sublabel}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
