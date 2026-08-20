import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface TipConfig {
  id: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'inline';
}

const DISMISS_KEY = 'frelux_dismissed_tips';

function isDismissed(id: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? JSON.parse(raw).includes(id) : false;
  } catch {
    return false;
  }
}

function dismiss(id: string): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DISMISS_KEY, JSON.stringify(list));
    }
  } catch { /* ignore */ }
}

/** Inline guided tip with dismiss capability */
export function GuidedTip({ tip, className }: { tip: TipConfig; className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissed(tip.id));
  }, [tip.id]);

  if (!visible) return null;

  return (
    <div className={classNames(
      'flex items-start gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3.5 py-3 dark:border-amber-500/15 dark:bg-amber-500/10',
      className,
    )}>
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{tip.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-600/90 dark:text-amber-400/80">{tip.content}</p>
      </div>
      <button
        onClick={() => { dismiss(tip.id); setVisible(false); }}
        className="shrink-0 rounded p-0.5 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-500/20"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Floating tip that appears on hover near target element */
export function FloatingTip({ tip, children }: { tip: TipConfig; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isDismissed(tip.id));
  }, [tip.id]);

  if (dismissed) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 animate-fade-in-up rounded-xl border border-amber-200/60 bg-white p-3 shadow-xl dark:border-amber-500/15 dark:bg-brand-navy-mid">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{tip.title}</p>
            </div>
            <button onClick={() => { dismiss(tip.id); setDismissed(true); }} className="text-neutral-300 hover:text-neutral-500" aria-label="Dismiss">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{tip.content}</p>
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-200/60 bg-white dark:border-amber-500/15 dark:bg-brand-navy-mid" />
        </div>
      )}
    </div>
  );
}
