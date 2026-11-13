import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  AD_FREE_PROMPT_STORAGE_KEY_DISMISSED,
  AD_FREE_PROMPT_STORAGE_KEY_LAST_SHOWN,
  DEFAULT_INITIAL_DELAY_MS,
  DEFAULT_PERIODIC_INTERVAL_MS,
  DEFAULT_AUTO_DISMISS_MS,
  DEFAULT_DISMISS_COOLDOWN_MS,
  isRouteExcluded,
  safeGetStorage,
  safeSetStorage,
} from "./ad-free-prompt-config";

export interface AdFreePromptNoticeProps {
  initialDelayMs?: number;
  periodicIntervalMs?: number;
  autoDismissMs?: number;
  dismissCooldownMs?: number;
  onShow?: () => void;
  onDismiss?: () => void;
}

export default function AdFreePromptNotice({
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  periodicIntervalMs = DEFAULT_PERIODIC_INTERVAL_MS,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  dismissCooldownMs = DEFAULT_DISMISS_COOLDOWN_MS,
  onShow,
  onDismiss,
}: AdFreePromptNoticeProps) {
  const { t } = useLanguage();
  const { isPaid } = useAuth();
  const location = useLocation();

  const [visible, setVisible] = useState(false);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const triggerShow = useCallback(() => {
    const now = Date.now();
    safeSetStorage(AD_FREE_PROMPT_STORAGE_KEY_LAST_SHOWN, now);
    setVisible(true);
    if (onShow) onShow();

    clearAutoDismiss();
    if (autoDismissMs > 0) {
      autoDismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, autoDismissMs);
    }
  }, [autoDismissMs, clearAutoDismiss, onShow]);

  const dismiss = useCallback(() => {
    clearAutoDismiss();
    setVisible(false);
    const now = Date.now();
    safeSetStorage(AD_FREE_PROMPT_STORAGE_KEY_DISMISSED, now);
    if (onDismiss) onDismiss();
  }, [clearAutoDismiss, onDismiss]);

  const handleCtaClick = useCallback(() => {
    clearAutoDismiss();
    setVisible(false);
    safeSetStorage(AD_FREE_PROMPT_STORAGE_KEY_DISMISSED, Date.now());
  }, [clearAutoDismiss]);

  useEffect(() => {
    // Subscribed/pro users never see ad removal prompts
    if (isPaid) {
      setVisible(false);
      clearAutoDismiss();
      return;
    }

    // Do not show on excluded checkout, pricing, or admin pages
    if (isRouteExcluded(location.pathname)) {
      setVisible(false);
      clearAutoDismiss();
      return;
    }

    const checkAndSchedule = () => {
      const now = Date.now();
      const dismissedAt = safeGetStorage(AD_FREE_PROMPT_STORAGE_KEY_DISMISSED);

      if (dismissedAt && now - dismissedAt < dismissCooldownMs) {
        return null;
      }

      const lastShownAt = safeGetStorage(AD_FREE_PROMPT_STORAGE_KEY_LAST_SHOWN);

      if (!lastShownAt) {
        return initialDelayMs;
      } else {
        const elapsed = now - lastShownAt;
        return Math.max(0, periodicIntervalMs - elapsed);
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    let intervalTimer: ReturnType<typeof setInterval> | null = null;

    const delay = checkAndSchedule();
    if (delay !== null) {
      if (delay <= 0) {
        triggerShow();
      } else {
        timer = setTimeout(() => {
          triggerShow();
        }, delay);
      }
    }

    // Also run a recurring periodic check every minute or periodic interval
    const checkCadence = Math.min(Math.max(1000, periodicIntervalMs), 60000);
    intervalTimer = setInterval(() => {
      const now = Date.now();
      const dismissedAt = safeGetStorage(AD_FREE_PROMPT_STORAGE_KEY_DISMISSED);
      if (dismissedAt && now - dismissedAt < dismissCooldownMs) return;

      const lastShownAt = safeGetStorage(AD_FREE_PROMPT_STORAGE_KEY_LAST_SHOWN);
      if (lastShownAt && now - lastShownAt >= periodicIntervalMs) {
        triggerShow();
      }
    }, checkCadence);

    return () => {
      if (timer) clearTimeout(timer);
      if (intervalTimer) clearInterval(intervalTimer);
      clearAutoDismiss();
    };
  }, [
    isPaid,
    location.pathname,
    initialDelayMs,
    periodicIntervalMs,
    dismissCooldownMs,
    triggerShow,
    clearAutoDismiss,
  ]);

  if (!visible || isPaid || isRouteExcluded(location.pathname)) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={t("Ad-free subscription notice")}
      className="border-t border-brand-purple/20 bg-background/95 dark:bg-card/95 backdrop-blur-xl shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top-2"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        {/* Left message & badge */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20 dark:text-brand-purple-lighter">
            <Crown className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block rounded-full bg-accent-green/15 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-green">
                {t("Ad-Free")}
              </span>
              <span className="whitespace-nowrap">
                {t("Tired of advertisements?")}
              </span>
            </span>
            <span className="text-xs text-muted-foreground hidden md:inline truncate">
              {t(
                "Subscribe to FRELUX Pro for zero ads, priority speed, and unlimited engineering calculations.",
              )}
            </span>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/pricing"
            onClick={handleCtaClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
          >
            <span>{t("Remove Ads")}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("Dismiss ad-free notice")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
