import { useState, useRef, useEffect } from 'react';
import { FolderOpen, ChevronDown, Loader2, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useUserTemplates } from '@/lib/useTemplates';
import type { CalculatorType, DbCalculatorTemplate } from '@/types/database';
import { classNames } from '@/lib/utils';

interface LoadTemplateButtonProps {
  calculatorType: CalculatorType;
  onLoad: (template: DbCalculatorTemplate) => void;
}

export default function LoadTemplateButton({ calculatorType, onLoad }: LoadTemplateButtonProps) {
  const { user } = useAuth();
  const { templates, loading } = useUserTemplates(calculatorType);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:bg-brand-purple/5 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300 dark:hover:border-brand-purple/30 dark:hover:bg-brand-purple/10"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        My Templates
        <ChevronDown className={classNames('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-white/10 dark:bg-brand-navy-mid">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No saved templates yet.
              </p>
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                Use "Save as Template" to create one.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onLoad(t);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-900 dark:text-white">
                      {t.name}
                    </p>
                    {t.description && (
                      <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        {t.description}
                      </p>
                    )}
                  </div>
                  {t.is_favorite && <Star className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
