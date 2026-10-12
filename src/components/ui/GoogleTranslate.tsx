/**
 * Google Translate integration for FRELUX (international edition).
 *
 * The built-in dictionaries (lib/i18n.tsx) cover the UI chrome, but
 * article/calculator content is authored in English only. Google
 * Translate's site widget translates EVERY visible DOM text client-side,
 * which completes the picture for every registered language (English,
 * Spanish, French, German, Portuguese, Russian, Indonesian, Swahili,
 * Arabic, Hindi, Chinese).
 *
 * Google's own banner/toolbar is hidden; our LanguageSwitcher drives the
 * widget programmatically and carries the attribution.
 */
import { useEffect, useRef, useState } from "react";
import { Languages, X } from "lucide-react";
import { LANGUAGES, type Language } from "@/lib/i18n";

/** FRELUX codes that Google spells differently. */
const GT_CODE_OVERRIDES: Partial<Record<Language, string>> = {
  zh: "zh-CN",
};

/**
 * Languages Google Translate does not offer - dictionary-only. All
 * registered languages are currently supported, but the mechanism stays
 * so a future language Google lacks can be added without rework.
 */
const GT_UNSUPPORTED: ReadonlySet<string> = new Set([]);

/** True when the language can be handled by Google Translate. */
export function isGoogleTranslatedLanguage(lang: Language): boolean {
  return !GT_UNSUPPORTED.has(lang);
}

/** Map a FRELUX language to the Google Translate widget code. */
export function mapToGoogleLanguage(lang: Language): string {
  return GT_CODE_OVERRIDES[lang] ?? lang;
}

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: {
          new (options: unknown, elementId: string): unknown;
          InlineLayout: Record<string, unknown>;
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

let scriptInjected = false;

/** Set the googtrans cookie used by Google Translate across page routes and reloads. */
export function setGoogleTranslateCookie(lang: Language): void {
  if (typeof document === "undefined") return;
  const target =
    isGoogleTranslatedLanguage(lang) && lang !== "en"
      ? mapToGoogleLanguage(lang)
      : "";

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const domainParts = host.split(".");
  const rootDomain =
    domainParts.length > 1 && !host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)
      ? `.${domainParts.slice(-2).join(".")}`
      : "";

  if (target) {
    const val = `/en/${target}`;
    document.cookie = `googtrans=${val}; path=/; SameSite=Lax;`;
    if (!isLocal && rootDomain) {
      document.cookie = `googtrans=${val}; path=/; domain=${rootDomain}; SameSite=Lax;`;
    }
  } else {
    document.cookie =
      "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    if (!isLocal && rootDomain) {
      document.cookie = `googtrans=; path=/; domain=${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
    }
  }
}

/** Inject translate element.js once; the callback builds the hidden widget. */
function injectGoogleTranslateScript(): void {
  if (scriptInjected || document.getElementById("google-translate-script")) {
    scriptInjected = true;
    return;
  }

  window.googleTranslateElementInit = () => {
    try {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google-translate-anchor",
        );
      }
    } catch (err) {
      console.warn("Google Translate init failed:", err);
    }
  };

  const s = document.createElement("script");
  s.id = "google-translate-script";
  s.type = "text/javascript";
  s.async = true;
  s.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(s);
  scriptInjected = true;
}

/**
 * Wait for the widget's hidden combo box. The script loads asynchronously,
 * so poll briefly rather than assume it exists.
 */
function waitForGoogleCombo(
  timeoutMs = 15000,
): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo && combo.options.length > 1) {
        resolve(combo);
      } else if (Date.now() - started > timeoutMs) {
        resolve(null);
      } else {
        setTimeout(tick, 250);
      }
    };
    tick();
  });
}

/**
 * Point Google Translate at a language.
 * 'en' - or a Google-unsupported language - restores the original page.
 * force=true forces a change dispatch even if combo.value already matches target (e.g. after SPA navigation).
 *
 * The googtrans cookie is set IMMEDIATELY, before any widget polling: the
 * widget's own bootstrap reads that cookie on every page load, so keeping it
 * in sync is what makes translation survive reloads and route changes.
 *
 * Returns true when the hidden combo box existed and was driven; false when
 * no combo appeared within waitMs. The modern Google widget often builds no
 * .goog-te-combo select at all, so callers must treat false as "could not
 * translate in-page" and fall back to a reload (the cookie makes the reload
 * work) — silently doing nothing on false was the root cause of "switching
 * language doesn't translate the site".
 */
export async function applyGoogleLanguage(
  lang: Language,
  force = false,
  waitMs = 2500,
): Promise<boolean> {
  setGoogleTranslateCookie(lang);

  const combo = await waitForGoogleCombo(waitMs);
  if (!combo) return false;
  const target =
    isGoogleTranslatedLanguage(lang) && lang !== "en"
      ? mapToGoogleLanguage(lang)
      : "en";

  if (target === "en") {
    const hasEn = Array.from(combo.options).some((o) => o.value === "en");
    const targetVal = hasEn ? "en" : "";
    if (combo.value !== targetVal || force) {
      combo.value = targetVal;
      combo.dispatchEvent(new Event("change"));
    }
    return true;
  }

  if (combo.value === target && !force) return true;

  if (combo.value === target && force) {
    combo.value = "";
    setTimeout(() => {
      combo.value = target;
      combo.dispatchEvent(new Event("change"));
    }, 25);
    return true;
  }

  combo.value = target;
  combo.dispatchEvent(new Event("change"));
  return true;
}

/**
 * sessionStorage key holding the language we last hard-reloaded for.
 * Prevents reload loops while still allowing one reload per language
 * switch (toggling between two languages reloads each time it is needed).
 */
const GT_RELOAD_KEY = "frelux_gt_reload_lang";

/**
 * Give the widget's combo a grace period after a reload before offering
 * the manual fallback link.
 */
const GT_FALLBACK_GRACE_MS = 6000;

/**
 * Small dismissible notice shown only when a language was selected, the
 * widget could not be driven in-page, AND a reload for that language
 * already failed to start a translation. Links the current page through
 * Google Translate so the visitor is never left without a working path.
 */
function TranslateFallbackNotice({
  language,
  onDismiss,
}: {
  language: Language;
  onDismiss: () => void;
}) {
  const langInfo = LANGUAGES.find((l) => l.value === language);
  const href = `https://translate.google.com/translate?sl=en&tl=${mapToGoogleLanguage(language)}&u=${encodeURIComponent(window.location.href)}`;
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[9998] flex max-w-[340px] items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-xl"
    >
      <Languages className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="text-xs leading-relaxed">
        <p className="font-semibold text-card-foreground">
          Automatic translation unavailable
        </p>
        <p className="mt-1 text-muted-foreground">
          The Google Translate widget couldn&#39;t start in this browser.
          You can still read this page in {langInfo?.nativeLabel ?? language}{" "}
          via Google Translate.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block font-medium text-brand-purple underline underline-offset-2 dark:text-brand-purple-lighter"
        >
          Open in Google Translate
        </a>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss translation notice"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Single mount point: renders the hidden widget anchor, injects the
 * script, and re-aims translation whenever the visitor's language
 * changes (switcher, drawer, restored preference). Also ensures client-side
 * SPA route transitions and asynchronously loaded content (articles, calculators)
 * are re-translated when an international language is active.
 * Skips the admin console so admin-authored content is never machine-translated.
 *
 * Hardening for the modern Google widget: it frequently builds no hidden
 * .goog-te-combo select, which used to make every language switch silently
 * no-op (cookie never set, translation never requested). Now:
 *  1. the googtrans cookie is written immediately on every change — the
 *     widget bootstrap reads it at load and is what restores translation
 *     across reloads;
 *  2. a user-initiated switch that cannot be driven via the combo triggers
 *     ONE full reload so the bootstrap can pick the cookie up (toggling
 *     languages reloads each time — a reload is a cheap, guaranteed path);
 *  3. if even the reload didn't start a translation, a dismissible notice
 *     links the page through translate.google.com so the visitor always has
 *     a working path to the translated content.
 */
export function GoogleTranslateSync({ language }: { language: Language }) {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  /** Last language this mount applied (null until the first effect run). */
  const appliedRef = useRef<Language | null>(null);
  const [fallbackFor, setFallbackFor] = useState<Language | null>(null);

  useEffect(() => {
    if (!isAdminRoute) injectGoogleTranslateScript();
  }, [isAdminRoute]);

  // Apply language whenever `language` state changes
  useEffect(() => {
    if (isAdminRoute) {
      appliedRef.current = null;
      return;
    }
    const previous = appliedRef.current;
    appliedRef.current = language;
    let cancelled = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const driven = await applyGoogleLanguage(language);
      if (cancelled) return;

      if (previous !== null && previous !== language) {
        // A deliberate switch away from the previously applied language.
        if (driven) return; // old widget translated in-page — done.

        let reloadedAlready = false;
        try {
          reloadedAlready = sessionStorage.getItem(GT_RELOAD_KEY) === language;
          if (!reloadedAlready) {
            sessionStorage.setItem(GT_RELOAD_KEY, language);
          }
        } catch {
          // Storage unavailable (private mode etc.) — reload anyway.
        }
        if (!reloadedAlready) {
          // Cookie is set; the widget bootstrap restores translation at
          // load. Restoring 'en' works the same way (cookie cleared).
          window.location.reload();
          return;
        }
        if (language !== "en") setFallbackFor(language);
        return;
      }

      // First mount after a hard reload for this language: if the widget
      // still hasn't produced a combo after a grace period, the cookie
      // restore didn't happen either — offer the manual fallback link.
      if (
        previous === null &&
        language !== "en" &&
        document.getElementById("google-translate-script") // widget was injected this load
      ) {
        let didReload = false;
        try {
          didReload = sessionStorage.getItem(GT_RELOAD_KEY) === language;
        } catch {
          didReload = false;
        }
        if (didReload) {
          graceTimer = setTimeout(() => {
            if (cancelled) return;
            if (!document.querySelector(".goog-te-combo")) {
              setFallbackFor(language);
            }
          }, GT_FALLBACK_GRACE_MS);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, [language, isAdminRoute]);

  // Re-apply translation on SPA navigation and async content load events
  useEffect(() => {
    if (isAdminRoute || language === "en") return;

    let timer1: ReturnType<typeof setTimeout> | null = null;
    let timer2: ReturnType<typeof setTimeout> | null = null;

    const reapply = () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      timer1 = setTimeout(() => {
        applyGoogleLanguage(language, true);
      }, 350);
      timer2 = setTimeout(() => {
        applyGoogleLanguage(language, true);
      }, 1200);
    };

    window.addEventListener("popstate", reapply);
    window.addEventListener("frelux:content-loaded", reapply);

    // Monkey-patch pushState and replaceState to detect SPA route changes
    const origPushState = window.history.pushState;
    const origReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const res = origPushState.apply(this, args);
      reapply();
      return res;
    };

    window.history.replaceState = function (...args) {
      const res = origReplaceState.apply(this, args);
      reapply();
      return res;
    };

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      window.removeEventListener("popstate", reapply);
      window.removeEventListener("frelux:content-loaded", reapply);
      window.history.pushState = origPushState;
      window.history.replaceState = origReplaceState;
    };
  }, [language, isAdminRoute]);

  if (isAdminRoute) return null;

  return (
    <>
      {fallbackFor && (
        <TranslateFallbackNotice
          language={fallbackFor}
          onDismiss={() => setFallbackFor(null)}
        />
      )}
      <div
        id="google-translate-anchor"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "160px",
          height: "40px",
          overflow: "hidden",
        }}
      />
    </>
  );
}
