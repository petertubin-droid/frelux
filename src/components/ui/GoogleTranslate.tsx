/**
 * Page-translation driver for FRELUX (international edition).
 *
 * Google discontinued its Website Translator widget on 1 October 2026 —
 * element.js no longer creates a language combo and never translates, so
 * the old cookie/combo/reload machinery was removed. The UI chrome keeps
 * using the i18n dictionaries; authored content is translated client-side
 * by the page-translator engine (src/lib/translate/page-translator.ts),
 * which re-applies translation after SPA route changes and async content
 * loads, and shows a last-resort Google Translate link if the endpoint
 * cannot be reached at all.
 *
 * The admin console is never machine-translated.
 */
import { useEffect, useRef, useState } from "react";
import { Languages, X } from "lucide-react";
import { LANGUAGES, type Language } from "@/lib/i18n";
import {
  reapplyCurrentLanguage,
  setPageLanguage,
} from "@/lib/translate/page-translator";

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

/** True when the language can be handled by machine translation. */
export function isGoogleTranslatedLanguage(lang: Language): boolean {
  return !GT_UNSUPPORTED.has(lang);
}

/** Map a FRELUX language to the translation service's language code. */
export function mapToGoogleLanguage(lang: Language): string {
  return GT_CODE_OVERRIDES[lang] ?? lang;
}

/**
 * Small dismissible notice shown only when a language was selected and
 * the translation endpoint could not translate anything (offline, blocked,
 * or the service changed). Links the current page through Google Translate
 * so the visitor is never left without a working path.
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
          We couldn&#39;t translate this page automatically right now. You can
          still read it in {langInfo?.nativeLabel ?? language} via Google
          Translate.
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

/** Subtle indicator while the page content is being translated. */
function TranslatingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9998] flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-2 text-xs font-medium text-card-foreground shadow-lg"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 animate-pulse rounded-full bg-brand-purple"
      />
      Translating…
    </div>
  );
}

/**
 * Single mount point: re-translates the visible page whenever the
 * visitor's language changes (switcher, drawer, restored preference) and
 * after SPA route transitions / asynchronously loaded content.
 * Skips the admin console so admin-authored content is never
 * machine-translated.
 */
export function GoogleTranslateSync({ language }: { language: Language }) {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  const [fallbackFor, setFallbackFor] = useState<Language | null>(null);
  const [busy, setBusy] = useState(false);
  const appliedRef = useRef<Language | null>(null);

  // Translate whenever `language` state changes
  useEffect(() => {
    if (isAdminRoute) {
      appliedRef.current = null;
      setBusy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (language === "en" || !isGoogleTranslatedLanguage(language)) {
        setBusy(true);
        await setPageLanguage("en");
        if (!cancelled) {
          appliedRef.current = language;
          setBusy(false);
        }
        return;
      }
      setBusy(true);
      setFallbackFor(null);
      const ok = await setPageLanguage(mapToGoogleLanguage(language));
      if (cancelled) return;
      appliedRef.current = language;
      setBusy(false);
      if (!ok) setFallbackFor(language);
    })();
    return () => {
      cancelled = true;
    };
  }, [language, isAdminRoute]);

  // Re-apply translation on SPA navigation and async content load events
  useEffect(() => {
    if (
      isAdminRoute ||
      !isGoogleTranslatedLanguage(language) ||
      language === "en"
    )
      return;

    const reapply = () => reapplyCurrentLanguage();

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
      {busy && !fallbackFor && <TranslatingIndicator />}
    </>
  );
}
