import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Globe, Check, X } from "lucide-react";
import {
  useLanguage,
  stripLocaleFromPathname,
  LANGUAGES,
  type Language,
} from "@/lib/i18n";
import { detectSuggestedLanguage } from "@/lib/international/locale-suggest";
import { Button } from "@/components/ui/shadcn/button";

/**
 * Location-aware language consent prompt (worldwide-first).
 *
 * When the visitor's location (timezone) or browser language maps to
 * a supported FRELUX language that differs from the current one, a
 * small bilingual card asks — with explicit consent — whether to
 * switch. Never applies a language silently:
 *  - Accept → switches to the language and navigates to its locale
 *    URL (/fr/... etc.), the SEO-language surface.
 *  - Decline → remembered per language; never asked again for it.
 * Suppressed entirely once the visitor has explicitly chosen a
 * language via the switcher, or when browsing a locale URL.
 */

const PROMPT_STORAGE_KEY = "frelux.localePrompt";
const CHOSEN_STORAGE_KEY = "frelux_lang_chosen";

/** Question in the suggested language itself, so it reads natively
 * even while the page is still English. */
const PROMPT_COPY: Record<
  Exclude<Language, "en">,
  { question: string; decline: string; country: string }
> = {
  fr: {
    question:
      "Vous semblez naviguer depuis la France. Afficher Frelux en français ?",
    decline: "Non, merci",
    country: "France",
  },
  es: {
    question: "Parece que navegas desde España. ¿Ver Frelux en español?",
    decline: "No, gracias",
    country: "Spain",
  },
  de: {
    question:
      "Sie scheinen aus Deutschland zu browsen. Frelux auf Deutsch anzeigen?",
    decline: "Nein, danke",
    country: "Germany",
  },
  pt: {
    question:
      "Parece que você navega de Portugal ou do Brasil. Ver o Frelux em português?",
    decline: "Não, obrigado",
    country: "Portugal",
  },
  ru: {
    question: "Похоже, вы заходите из России. Показать Frelux на русском?",
    decline: "Нет, спасибо",
    country: "Russia",
  },
  id: {
    question:
      "Anda tampaknya menjelajah dari Indonesia. Tampilkan Frelux dalam Bahasa Indonesia?",
    decline: "Tidak, terima kasih",
    country: "Indonesia",
  },
  sw: {
    question:
      "Inaonekana unatembelea kutoka Afrika Mashariki. Onyesha Frelux kwa Kiswahili?",
    decline: "Hapana, asante",
    country: "East Africa",
  },
  ar: {
    question:
      "يبدو أنك تتصفح من المنطقة العربية. هل تريد عرض Frelux باللغة العربية؟",
    decline: "لا، شكراً",
    country: "the Arab region",
  },
  hi: {
    question:
      "आप प्रतीत होते हैं भारत से ब्राउज़ कर रहे हैं। Frelux को हिन्दी में दिखाएँ?",
    decline: "नहीं, धन्यवाद",
    country: "India",
  },
  zh: {
    question: "您似乎正在从中国浏览。以中文显示 Frelux？",
    decline: "不用了，谢谢",
    country: "China",
  },
};

type PromptHistory = Record<string, "accepted" | "dismissed">;

function readHistory(): PromptHistory {
  try {
    const raw = localStorage.getItem(PROMPT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function recordOutcome(lang: Language, outcome: "accepted" | "dismissed") {
  try {
    const history = readHistory();
    history[lang] = outcome;
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage unavailable (private mode) — the prompt just stays inert
  }
}

export function LocalePrompt() {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [suggested, setSuggested] = useState<Language | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Consent hygiene: never ask on a locale URL (the visitor already
    // chose a language surface), never after an explicit switcher
    // choice, and never twice for the same language.
    if (stripLocaleFromPathname(location.pathname) !== location.pathname) {
      setSuggested(null);
      return;
    }
    if (language !== "en") {
      // A non-English session is already active (URL locale on mount
      // or a prior switch): nothing to suggest.
      setSuggested(null);
      return;
    }
    try {
      if (localStorage.getItem(CHOSEN_STORAGE_KEY)) {
        setSuggested(null);
        return;
      }
      const history = readHistory();
      const detection = detectSuggestedLanguage();
      if (!detection || detection === language || history[detection]) {
        setSuggested(null);
        return;
      }
      if (!cancelled) setSuggested(detection);
    } catch {
      setSuggested(null);
    }
    return () => {
      cancelled = true;
    };
  }, [language, location.pathname]);

  if (!suggested) return null;

  const meta = LANGUAGES.find((l) => l.value === suggested);
  const copy = PROMPT_COPY[suggested as Exclude<Language, "en">];
  if (!copy || !meta) return null;

  const accept = () => {
    recordOutcome(suggested, "accepted");
    setLanguage(suggested);
    // Land on the locale URL so the address bar, hreflang surface and
    // every future visit reflect the choice.
    navigate(
      `/${suggested}${stripLocaleFromPathname(location.pathname)}${location.search}`,
    );
    setSuggested(null);
  };

  const decline = () => {
    recordOutcome(suggested, "dismissed");
    setSuggested(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Language suggestion"
      className="fixed bottom-24 right-4 z-[70] w-[calc(100vw-2rem)] max-w-xs animate-[fade-in_0.25s_ease-out] rounded-xl border border-brand-purple/20 bg-card/95 p-4 shadow-lg shadow-brand-purple/10 backdrop-blur-md dark:border-white/10 dark:bg-card/95 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg"
          aria-hidden="true"
        >
          {meta.flag}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-card-foreground dark:text-primary-foreground">
            {copy.question}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            You appear to be browsing from {copy.country}. View Frelux in{" "}
            {meta.label}?
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="ghost"
          type="button"
          onClick={accept}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check aria-hidden="true" className="h-3.5 w-3.5" />
          {meta.nativeLabel}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={decline}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-white/5"
        >
          <X aria-hidden="true" className="h-3 w-3" />
          {copy.decline}
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[9px] leading-snug text-muted-foreground/70">
        <Globe aria-hidden="true" className="h-3 w-3 shrink-0" />
        Detected locally from your timezone and browser settings. Never shared.
      </p>
    </div>
  );
}
