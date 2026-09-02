import { useState, useRef, useEffect, useCallback } from 'react';
import { FolderOpen, ChevronDown, Loader2, Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useUserTemplates } from '@/lib/useTemplates';
import { getPublicTemplates } from '@/lib/templates';
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
  const [publicTemplates, setPublicTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadPublic = useCallback(async () => {
    setPublicLoading(true);
    try {
      const data = await getPublicTemplates({ calculatorType });
      setPublicTemplates(data);
    } catch {
      setPublicTemplates([]);
    } finally {
      setPublicLoading(false);
    }
  }, [calculatorType]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open) loadPublic();
  }, [open, loadPublic]);

  const isLoading = loading || publicLoading;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-purple/30 hover:bg-primary/5 hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/80 dark:hover:border-brand-purple/30 dark:hover:bg-primary/10"
      >
        <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
        Templates
        <ChevronDown className={classNames('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-xl border border-border bg-card shadow-lg dark:border-white/10 dark:bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Loading templates...
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {/* Public / built-in templates */}
              {publicTemplates.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Built-in Templates</p>
                  <div className="space-y-0.5">
                    {publicTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onLoad(t);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
                      >
                        <Bookmark className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium text-foreground dark:text-primary-foreground">
                            {t.name}
                          </p>
                          {t.description && (
                            <p className="truncate text-[11px] text-muted-foreground dark:text-muted-foreground">
                              {t.description}
                            </p>
                          )}
                        </div>
                        {t.is_featured && <Bookmark className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User templates */}
              {user && (
                <div>
                  {publicTemplates.length > 0 && <div className="my-1 border-t border-border/50 dark:border-white/5" />}
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">My Templates</p>
                  {templates.length === 0 ? (
                    <p className="px-3 py-3 text-center text-xs text-muted-foreground dark:text-muted-foreground">
                      No saved templates yet. Use "Save as Template" to create one.
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onLoad(t);
                            setOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium text-foreground dark:text-primary-foreground">
                              {t.name}
                            </p>
                            {t.description && (
                              <p className="truncate text-[11px] text-muted-foreground dark:text-muted-foreground">
                                {t.description}
                              </p>
                            )}
                          </div>
                          {t.is_favorite && <Bookmark className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!user && publicTemplates.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    No templates available.
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground dark:text-muted-foreground">
                    <a href="/login" className="font-semibold text-brand-purple hover:underline">Sign in</a> to save your own.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
