/* eslint-disable react-refresh/only-export-components */
/**
 * Translation System for FRELUX
 *
 * Worldwide language layer. Every registered language has:
 *  1. a locale URL prefix (/es/, /fr/, /de/, /pt/, /ru/,
 *     /id/, /sw/, /ar/, /hi/, /zh/ - plus /en/), routed by App's
 *     LocaleAwareRoutes. Locale URLs are CLIENT-SIDE language
 *     switching, not crawlable SEO pages: prerender emits one
 *     content-bearing page per route (English), so locale URLs are
 *     absent from the sitemap and canonicalize to the English page.
 *     Listing them in the sitemap previously shipped 1,871 duplicate
 *     home pages to Google (Search Console kept ~107 of 2,058 URLs).
 *     Restore hreflang + sitemap entries only once locale URLs carry
 *     genuinely translated content.
 *  2. real React-level chrome translations (nav labels and common
 *     actions) so locale URLs render translated chrome without the
 *     Google Translate widget. Keys are the English source strings;
 *     t() falls back to the key itself, so unstranslated strings keep
 *     rendering English instead of breaking.
 *
 * The Google Translate widget stays as a whole-page convenience for
 * logged-in visitors; locale URLs are the SEO surface.
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

/** URL path prefix per language - every language gets a locale URL. */
export const LOCALE_ROUTES: { value: Language; path: string }[] = LANGUAGES.map(
  (l) => ({ value: l.value, path: l.value }),
);

export function localeFromPathname(pathname: string): Language | null {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m && LANGUAGES.some((l) => l.value === m[1])
    ? (m[1] as Language)
    : null;
}

/** "/es/pricing" -> "/pricing"; "/es" -> "/"; untouched otherwise. */
export function stripLocaleFromPathname(pathname: string): string {
  const loc = localeFromPathname(pathname);
  if (!loc) return pathname;
  const rest = pathname.slice(`/${loc}`.length);
  return rest === "" ? "/" : rest;
}

type TranslationKey = string;

// Chrome translations keyed by the English source string. Filling in
// more strings is pure data - no component changes needed.
const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {},
  es: {
    Calculators: "Calculadoras",
    "Construction Tools": "Herramientas de construcción",
    Marketplace: "Mercado",
    Pricing: "Precios",
    "AI Studio": "Estudio de IA",
    "Learn Hub": "Centro de aprendizaje",
    About: "Acerca de",
    Contact: "Contacto",
    "My Profile": "Mi perfil",
    Dashboard: "Panel",
    "My Estimates": "Mis estimaciones",
    "Calculator Templates": "Plantillas de calculadoras",
    "Browse Marketplace": "Explorar mercado",
    "My Projects": "Mis proyectos",
    Clients: "Clientes",
    Rewards: "Recompensas",
    "Sign in": "Iniciar sesión",
    "Sign out": "Cerrar sesión",
    "Get Started": "Comenzar",
  },
  fr: {
    Calculators: "Calculatrices",
    "Construction Tools": "Outils de construction",
    Marketplace: "Marché",
    Pricing: "Tarifs",
    "AI Studio": "Studio IA",
    "Learn Hub": "Centre d'apprentissage",
    About: "À propos",
    Contact: "Contact",
    "My Profile": "Mon profil",
    Dashboard: "Tableau de bord",
    "My Estimates": "Mes estimations",
    "Calculator Templates": "Modèles de calculatrices",
    "Browse Marketplace": "Parcourir le marché",
    "My Projects": "Mes projets",
    Clients: "Clients",
    Rewards: "Récompenses",
    "Sign in": "Se connecter",
    "Sign out": "Se déconnecter",
    "Get Started": "Commencer",
  },
  de: {
    Calculators: "Rechner",
    "Construction Tools": "Bauwerkzeuge",
    Marketplace: "Marktplatz",
    Pricing: "Preise",
    "AI Studio": "KI-Studio",
    "Learn Hub": "Lernzentrum",
    About: "Über uns",
    Contact: "Kontakt",
    "My Profile": "Mein Profil",
    Dashboard: "Dashboard",
    "My Estimates": "Meine Kostenvoranschläge",
    "Calculator Templates": "Rechner-Vorlagen",
    "Browse Marketplace": "Marktplatz durchsuchen",
    "My Projects": "Meine Projekte",
    Clients: "Kunden",
    Rewards: "Belohnungen",
    "Sign in": "Anmelden",
    "Sign out": "Abmelden",
    "Get Started": "Loslegen",
  },
  pt: {
    Calculators: "Calculadoras",
    "Construction Tools": "Ferramentas de construção",
    Marketplace: "Mercado",
    Pricing: "Preços",
    "AI Studio": "Estúdio de IA",
    "Learn Hub": "Central de aprendizado",
    About: "Sobre",
    Contact: "Contato",
    "My Profile": "Meu perfil",
    Dashboard: "Painel",
    "My Estimates": "Minhas estimativas",
    "Calculator Templates": "Modelos de calculadoras",
    "Browse Marketplace": "Explorar mercado",
    "My Projects": "Meus projetos",
    Clients: "Clientes",
    Rewards: "Recompensas",
    "Sign in": "Entrar",
    "Sign out": "Sair",
    "Get Started": "Começar",
  },
  ru: {
    Calculators: "Калькуляторы",
    "Construction Tools": "Строительные инструменты",
    Marketplace: "Маркетплейс",
    Pricing: "Тарифы",
    "AI Studio": "ИИ-студия",
    "Learn Hub": "Центр обучения",
    About: "О нас",
    Contact: "Контакты",
    "My Profile": "Мой профиль",
    Dashboard: "Панель управления",
    "My Estimates": "Мои сметы",
    "Calculator Templates": "Шаблоны калькуляторов",
    "Browse Marketplace": "Обзор маркетплейса",
    "My Projects": "Мои проекты",
    Clients: "Клиенты",
    Rewards: "Награды",
    "Sign in": "Войти",
    "Sign out": "Выйти",
    "Get Started": "Начать",
  },
  id: {
    Calculators: "Kalkulator",
    "Construction Tools": "Alat konstruksi",
    Marketplace: "Pasar",
    Pricing: "Harga",
    "AI Studio": "Studio AI",
    "Learn Hub": "Pusat belajar",
    About: "Tentang",
    Contact: "Kontak",
    "My Profile": "Profil saya",
    Dashboard: "Dasbor",
    "My Estimates": "Estimasi saya",
    "Calculator Templates": "Templat kalkulator",
    "Browse Marketplace": "Jelajahi pasar",
    "My Projects": "Proyek saya",
    Clients: "Klien",
    Rewards: "Hadiah",
    "Sign in": "Masuk",
    "Sign out": "Keluar",
    "Get Started": "Mulai",
  },
  sw: {
    Calculators: "Kalkuleta",
    "Construction Tools": "Zana za ujenzi",
    Marketplace: "Soko",
    Pricing: "Bei",
    "AI Studio": "Studio ya AI",
    "Learn Hub": "Kituo cha kujifunza",
    About: "Kuhusu",
    Contact: "Mawasiliano",
    "My Profile": "Wasifu wangu",
    Dashboard: "Dashibodi",
    "My Estimates": "Makadirio yangu",
    "Calculator Templates": "Vigezo vya kalkuleta",
    "Browse Marketplace": "Tazama soko",
    "My Projects": "Miradi yangu",
    Clients: "Wateja",
    Rewards: "Tuzo",
    "Sign in": "Ingia",
    "Sign out": "Toka",
    "Get Started": "Anza",
  },
  ar: {
    Calculators: "حاسبات",
    "Construction Tools": "أدوات البناء",
    Marketplace: "السوق",
    Pricing: "الأسعار",
    "AI Studio": "استوديو الذكاء الاصطناعي",
    "Learn Hub": "مركز التعلم",
    About: "من نحن",
    Contact: "اتصل بنا",
    "My Profile": "ملفي الشخصي",
    Dashboard: "لوحة التحكم",
    "My Estimates": "تقديراتي",
    "Calculator Templates": "قوالب الحاسبات",
    "Browse Marketplace": "استعرض السوق",
    "My Projects": "مشاريعي",
    Clients: "العملاء",
    Rewards: "المكافآت",
    "Sign in": "تسجيل الدخول",
    "Sign out": "تسجيل الخروج",
    "Get Started": "ابدأ الآن",
  },
  hi: {
    Calculators: "कैलकुलेटर",
    "Construction Tools": "निर्माण उपकरण",
    Marketplace: "बाज़ार",
    Pricing: "मूल्य",
    "AI Studio": "एआई स्टूडियो",
    "Learn Hub": "सीखने का केंद्र",
    About: "हमारे बारे में",
    Contact: "संपर्क",
    "My Profile": "मेरी प्रोफ़ाइल",
    Dashboard: "डैशबोर्ड",
    "My Estimates": "मेरे अनुमान",
    "Calculator Templates": "कैलकुलेटर टेम्पलेट्स",
    "Browse Marketplace": "बाज़ार देखें",
    "My Projects": "मेरी परियोजनाएँ",
    Clients: "ग्राहक",
    Rewards: "पुरस्कार",
    "Sign in": "साइन इन",
    "Sign out": "साइन आउट",
    "Get Started": "शुरू करें",
  },
  zh: {
    Calculators: "计算器",
    "Construction Tools": "建筑工具",
    Marketplace: "市场",
    Pricing: "定价",
    "AI Studio": "AI 工作室",
    "Learn Hub": "学习中心",
    About: "关于我们",
    Contact: "联系",
    "My Profile": "我的资料",
    Dashboard: "仪表板",
    "My Estimates": "我的估算",
    "Calculator Templates": "计算器模板",
    "Browse Marketplace": "浏览市场",
    "My Projects": "我的项目",
    Clients: "客户",
    Rewards: "奖励",
    "Sign in": "登录",
    "Sign out": "退出",
    "Get Started": "开始使用",
  },
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
    // A URL locale prefix wins over a stored preference, so crawlable
    // /es/ etc. entry points always render in their own language.
    const urlLocale = localeFromPathname(window.location.pathname);
    if (urlLocale) return urlLocale;
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
    document.documentElement.setAttribute(
      "dir",
      language === "ar" ? "rtl" : "ltr",
    );
  }, [language]);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    // An explicit switcher choice suppresses the location-aware
    // language suggestion permanently (consent hygiene).
    try {
      localStorage.setItem("frelux_lang_chosen", "1");
    } catch {
      // storage unavailable — LocalePrompt stays inert on its own paths
    }
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
