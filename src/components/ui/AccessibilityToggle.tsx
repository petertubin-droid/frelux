import { useState, useRef, useEffect } from 'react';
import { Accessibility, ChevronDown, Contrast, Type, Zap, Check } from 'lucide-react';
import { useAccessibility } from '@/lib/accessibility';
import { classNames } from '@/lib/utils';

export function AccessibilityToggle({ compact = false }: { compact?: boolean }) {
  const { highContrast, toggleHighContrast, largeText, toggleLargeText, reducedMotion, toggleReducedMotion } = useAccessibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCount = [highContrast, largeText, reducedMotion].filter(Boolean).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={classNames(
          'relative inline-flex items-center gap-1.5 rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200',
          compact && 'p-1.5',
          activeCount > 0 && 'text-brand-purple hover:text-brand-purple',
        )}
        aria-label="Accessibility settings"
      >
        <Accessibility className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-purple text-[8px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-neutral-200/40 bg-white/95 py-1.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-brand-navy-mid/95">
          <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">Accessibility</p>

          <button
            type="button"
            onClick={toggleHighContrast}
            className={classNames(
              'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              highContrast ? 'bg-brand-purple/5 text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5',
            )}
          >
            <Contrast className="h-4 w-4" />
            <span className="flex-1 text-left">High contrast</span>
            {highContrast && <Check className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={toggleLargeText}
            className={classNames(
              'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              largeText ? 'bg-brand-purple/5 text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5',
            )}
          >
            <Type className="h-4 w-4" />
            <span className="flex-1 text-left">Larger text</span>
            {largeText && <Check className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={toggleReducedMotion}
            className={classNames(
              'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              reducedMotion ? 'bg-brand-purple/5 text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5',
            )}
          >
            <Zap className="h-4 w-4" />
            <span className="flex-1 text-left">Reduce motion</span>
            {reducedMotion && <Check className="h-4 w-4" />}
          </button>

          <div className="mt-1 border-t border-neutral-100 px-4 py-2 dark:border-white/5">
            <p className="text-xs text-neutral-400">Settings saved to your device.</p>
          </div>
        </div>
      )}
    </div>
  );
}
