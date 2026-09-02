import { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';
import { detectAdBlocker } from '@/lib/ad-block-detection';
import { logAdEvent } from '@/lib/ad-config';

/**
 * Non-intrusive ad block notice (Issue #10).
 * Shows a dismissible banner asking users to disable their ad blocker.
 * Does NOT block access to features — just a gentle nudge.
 */
export function AdBlockNotice() {
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    detectAdBlocker().then((isBlocked) => {
      if (isBlocked) {
        setBlocked(true);
        // Track ad block rate for analytics
        logAdEvent({
          event_type: 'error',
          metadata: { error: 'ad_blocker_detected' },
        }).catch(() => {});
      }
    });
  }, []);

  if (!blocked || dismissed) return null;

  return (
    <div className="fixed bottom-36 right-4 z-[45] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-4 shadow-lg dark:border-border border-border dark:bg-background sm:bottom-20 sm:max-w-sm">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card-foreground/90"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-brand-purple" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">Ad blocker detected</h3>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            Frelux is free because of ads. Please consider disabling your ad blocker so we can keep building tools for you.
          </p>
        </div>
      </div>
    </div>
  );
}
