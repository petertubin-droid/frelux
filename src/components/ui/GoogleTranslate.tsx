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
 */
export async function applyGoogleLanguage(lang: Language): Promise<void> {
  const combo = await waitForGoogleCombo();
  if (!combo) return;
  const target = isGoogleTranslatedLanguage(lang)
    ? mapToGoogleLanguage(lang)
    : "en";
  if (combo.value === target) return;
  combo.value = target;
  combo.dispatchEvent(new Event("change"));
}

/**
 * Single mount point: renders the hidden widget anchor, injects the
 * script, and re-aims translation whenever the visitor's language
 * changes (switcher, drawer, restored preference). Skips the admin
 * console so admin-authored content is never machine-translated.
 */
export function GoogleTranslateSync({ language }: { language: Language }) {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) injectGoogleTranslateScript();
  }, [isAdminRoute]);

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
