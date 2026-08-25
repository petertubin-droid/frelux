import { useState, useEffect, useCallback } from 'react';
import {
  getStoredConsent,
  _shouldShowBanner,
  acceptAll,
  rejectAll,
  saveConsent,
  withdrawConsent,
  type CookieConsent,
  type CookieCategory,
} from '@/lib/cookie-consent';

/**
 * React hook for cookie consent state.
 * Returns: { consent, showBanner, accept, reject, save, withdraw, dismiss }
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(getStoredConsent());
  const [showBanner, setShowBanner] = useState(false);

  // On mount — check if banner should show
  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    setShowBanner(stored === null);
  }, []);

  // Listen for external changes (e.g. from settings page)
  useEffect(() => {
    function onChange() {
      const stored = getStoredConsent();
      setConsent(stored);
      setShowBanner(stored === null);
    }

    window.addEventListener('frelux:cookie-consent', onChange);
    window.addEventListener('frelux:cookie-consent-withdrawn', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      window.removeEventListener('frelux:cookie-consent', onChange);
      window.removeEventListener('frelux:cookie-consent-withdrawn', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const accept = useCallback(() => {
    const c = acceptAll('banner');
    setConsent(c);
    setShowBanner(false);
  }, []);

  const reject = useCallback(() => {
    const c = rejectAll('banner');
    setConsent(c);
    setShowBanner(false);
  }, []);

  const save = useCallback((categories: Record<CookieCategory, boolean>) => {
    const c = saveConsent(categories, 'banner');
    setConsent(c);
    setShowBanner(false);
  }, []);

  const withdraw = useCallback(() => {
    withdrawConsent();
    setConsent(null);
    setShowBanner(true);
  }, []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
  }, []);

  return { consent, showBanner, accept, reject, save, withdraw, dismiss };
}
