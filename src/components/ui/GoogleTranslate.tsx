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
import { useEffect } from "react";
import type { Language } from "@/lib/i18n";

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
 */
export async function applyGoogleLanguage(
  lang: Language,
  force = false,
): Promise<void> {
  setGoogleTranslateCookie(lang);

  const combo = await waitForGoogleCombo();
  if (!combo) return;
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
    return;
  }

  if (combo.value === target && !force) return;

  if (combo.value === target && force) {
    combo.value = "";
    setTimeout(() => {
      combo.value = target;
      combo.dispatchEvent(new Event("change"));
    }, 25);
    return;
  }

  combo.value = target;
  combo.dispatchEvent(new Event("change"));
}

/**
 * Single mount point: renders the hidden widget anchor, injects the
 * script, and re-aims translation whenever the visitor's language
 * changes (switcher, drawer, restored preference). Also ensures client-side
 * SPA route transitions and asynchronously loaded content (articles, calculators)
 * are re-translated when an international language is active.
 * Skips the admin console so admin-authored content is never machine-translated.
 */
export function GoogleTranslateSync({ language }: { language: Language }) {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) injectGoogleTranslateScript();
  }, [isAdminRoute]);

  // Apply language whenever `language` state changes
  useEffect(() => {
    if (isAdminRoute) return;
    let cancelled = false;
    (async () => {
      const combo = await waitForGoogleCombo();
      if (cancelled || !combo) return;
      await applyGoogleLanguage(language);
    })();
    return () => {
      cancelled = true;
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
  );
}
