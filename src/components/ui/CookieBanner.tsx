import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, BarChart3, Megaphone, Check, X, Settings2, Cookie } from 'lucide-react';
import { useCookieConsent } from '@/lib/useCookieConsent';
import { COOKIE_CATEGORIES, type CookieCategory } from '@/lib/cookie-consent';

/**
 * Premium Cookie Consent Banner
 *
 * Glassmorphism design matching the FRELUX design system.
 * Appears on first visit (or when consent expires / version changes).
 * Three actions: Accept All, Reject All, or Customize.
 * Customize expands to show per-category toggles.
 */
export function CookieBanner() {
  const { showBanner, accept, reject, save, dismiss } = useCookieConsent();
  const [customizing, setCustomizing] = useState(false);
  const [choices, setChoices] = useState<Record<CookieCategory, boolean>>({
    essential: true,
    analytics: true,
    advertising: true,
  });

  if (!showBanner) return null;

  const handleCustomize = () => {
    setCustomizing(true);
  };

  const handleSaveChoices = () => {
    save(choices);
    setCustomizing(false);
  };

  const toggleCategory = (key: CookieCategory) => {
    if (key === 'essential') return; // can't toggle essential
    setChoices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const categoryIcons: Record<CookieCategory, typeof Shield> = {
    essential: Shield,
    analytics: BarChart3,
    advertising: Megaphone,
  };

  return (
    <>
      {/* Scrim — subtle darkening to draw focus, but non-blocking */}
      <div
        className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px] animate-[fade-in_0.2s_ease-out]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Banner */}
      <div
        className="fixed inset-x-0 bottom-0 z-[91] flex justify-center px-4 pb-4 sm:pb-6"
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-banner-title"
      >
        <div className="w-full max-w-3xl animate-[cookie-slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="glass dark:glass-dark rounded-2xl shadow-2xl shadow-brand-purple-deep/10 dark:shadow-black/40 border border-white/30 dark:border-white/10 overflow-hidden">
            {/* Gradient top accent */}
            <div className="h-[3px] bg-gradient-to-r from-brand-purple via-brand-purple-light to-brand-purple-lighter" />

            <div className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20">
                  <Cookie className="h-5 w-5 text-brand-purple dark:text-brand-purple-lighter" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="cookie-banner-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">
                    Cookie Preferences
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-500 leading-relaxed">
                    We use cookies to power essential features, improve the site with analytics, and keep tools free with relevant ads.
                    You choose what to allow.{' '}
                    <Link
                      to="/cookie-policy"
                      className="font-medium text-brand-purple dark:text-brand-purple-lighter hover:text-brand-purple-dark dark:hover:text-white underline underline-offset-2 decoration-brand-purple/30 transition-colors"
                    >
                      Learn more
                    </Link>
                  </p>
                </div>
                {/* Close button (dismiss without saving — banner returns next visit) */}
                <button
                  onClick={dismiss}
                  className="flex-shrink-0 grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4.5 w-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
                </button>
              </div>

              {/* Customization panel (expandable) */}
              {customizing && (
                <div className="mb-5 space-y-2.5 animate-[slide-down_0.25s_ease-out] overflow-hidden">
                  {COOKIE_CATEGORIES.map(({ key, label, description, required }) => {
                    const Icon = categoryIcons[key];
                    const enabled = choices[key];
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5"
                      >
                        <div className="flex-shrink-0 mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 dark:bg-white/5">
                          <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{label}</span>
                            {required && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-purple dark:text-brand-purple-lighter bg-brand-purple/10 dark:bg-brand-purple/15 px-1.5 py-0.5 rounded">
                                Always on
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
                        </div>
                        {/* Toggle */}
                        <button
                          onClick={() => toggleCategory(key)}
                          disabled={required}
                          className={`flex-shrink-0 relative h-6 w-11 rounded-full transition-colors duration-200 ${
                            enabled
                              ? 'bg-brand-purple'
                              : 'bg-neutral-200 dark:bg-neutral-700'
                          } ${required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-purple-dark dark:hover:bg-brand-purple-light'}`}
                          aria-label={`Toggle ${label}`}
                          role="switch"
                          aria-checked={enabled}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
                {customizing ? (
                  <>
                    <button
                      onClick={() => setCustomizing(false)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveChoices}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-purple rounded-xl shadow-sm hover:bg-brand-purple-dark hover:shadow-md active:scale-[0.98] transition-all duration-200"
                    >
                      <Check className="h-4 w-4" />
                      Save Preferences
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={reject}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Reject Non-Essential
                    </button>
                    <button
                      onClick={handleCustomize}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings2 className="h-4 w-4" />
                      Customize
                    </button>
                    <button
                      onClick={accept}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-purple rounded-xl shadow-sm hover:bg-brand-purple-dark hover:shadow-md active:scale-[0.98] transition-all duration-200"
                    >
                      Accept All
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
