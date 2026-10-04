/* eslint-disable react-refresh/only-export-components */
/**
 * Translation System for FRELUX
 * Supports English (default) and worldwide languages (Spanish, French,
 * German, Portuguese, Russian, Indonesian, Swahili, Arabic, Hindi,
 * Chinese) via Google Translate. Uses localStorage to persist language
 * preference.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { GoogleTranslateSync } from "@/components/ui/GoogleTranslate";

export type Language =
  "en" | "es" | "fr" | "de" | "pt" | "ru" | "id" | "sw" | "ar" | "hi" | "zh";

export const LANGUAGES: {
  value: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { value: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { value: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { value: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { value: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { value: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇵🇹" },
  { value: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  {
    value: "id",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    flag: "🇮🇩",
  },
  { value: "sw", label: "Swahili", nativeLabel: "Kiswahili", flag: "🇰🇪" },
  { value: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { value: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳" },
];

type TranslationKey = string;

// Translation dictionary, covers calculator labels, navigation, and common UI
const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {},
  es: {},
  fr: {},
  de: {},
  pt: {},
  ru: {},
  id: {},
  sw: {},
  ar: {},
  hi: {},
  zh: {},
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("frelux_lang");
    // A stored value that is no longer a registered language (e.g. a
    // removed one) falls back to English rather than breaking the app.
    return LANGUAGES.some((l) => l.value === stored)
      ? (stored as Language)
      : "en";
  });

  useEffect(() => {
    localStorage.setItem("frelux_lang", language);
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
  }

  function t(key: string): string {
    const dict = translations[language];
    if (!dict) return key;
    return dict[key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <GoogleTranslateSync language={language} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
