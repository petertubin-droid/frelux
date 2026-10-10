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
// more strings is pure data - no component changes needed. Exported for
// the i18n tests, which assert the hero keys exist in every locale.
export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {},
  es: {
    "Every trade. Every cost. One platform.":
      "Todos los oficios. Todos los costes. Una sola plataforma.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux convierte tus medidas en cantidades exactas de materiales y costes reales verificados en el mercado, ya sea una sola habitación o un edificio completo, desde los cimientos hasta el techo. Haz una foto para obtener un presupuesto con IA, genera un BOQ profesional y contrata profesionales verificados cuando estés listo. Gratis, disponible en varios idiomas.",
    "Start Estimating Free": "Empieza a estimar gratis",
    "Try the AI Photo Estimator": "Prueba el estimador de fotos con IA",
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
    "Every trade. Every cost. One platform.":
      "Tous les corps de métier. Tous les coûts. Une seule plateforme.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux transforme vos mesures en quantités de matériaux exactes et en coûts réels vérifiés sur le marché, qu'il s'agisse d'une pièce ou d'un bâtiment entier, des fondations au toit. Prenez une photo pour obtenir un devis par IA, générez un BOQ professionnel et engagez des pros vérifiés quand vous êtes prêt. Gratuit, disponible en plusieurs langues.",
    "Start Estimating Free": "Commencez à estimer gratuitement",
    "Try the AI Photo Estimator": "Essayez l'estimateur photo IA",
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
    "Every trade. Every cost. One platform.":
      "Jedes Gewerk. Jede Kostenposition. Eine Plattform.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux verwandelt Ihre Maße in exakte Materialmengen und echte, marktgeprüfte Kosten, ob für einen einzelnen Raum oder ein ganzes Gebäude, von der Gründung bis zum Dach. Machen Sie ein Foto für eine KI-Schätzung, erstellen Sie ein professionelles BOQ und beauftragen Sie geprüfte Profis, wenn Sie bereit sind. Kostenlos, in mehreren Sprachen verfügbar.",
    "Start Estimating Free": "Kostenlos kalkulieren",
    "Try the AI Photo Estimator": "KI-Fotoschätzer ausprobieren",
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
    "Every trade. Every cost. One platform.":
      "Todos os ofícios. Todos os custos. Uma só plataforma.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "O Frelux transforma as suas medidas em quantidades exatas de materiais e custos reais verificados no mercado, seja um quarto ou um edifício inteiro, da fundação ao telhado. Tire uma foto para obter um orçamento com IA, gere um BOQ profissional e contrate profissionais verificados quando estiver pronto. Grátis, disponível em vários idiomas.",
    "Start Estimating Free": "Comece a estimar grátis",
    "Try the AI Photo Estimator": "Experimente o estimador de fotos com IA",
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
    "Every trade. Every cost. One platform.":
      "Все отрасли. Все затраты. Одна платформа.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux превращает ваши замеры в точные объемы материалов и реальные, проверенные по рынку затраты: будь то одна комната или целое здание, от фундамента до крыши. Сфотографируйте объект, чтобы получить оценку с помощью ИИ, составьте профессиональную смету (BOQ) и наймите проверенных специалистов, когда будете готовы. Бесплатно, доступно на нескольких языках.",
    "Start Estimating Free": "Рассчитать бесплатно",
    "Try the AI Photo Estimator": "Попробуйте ИИ-оценку по фото",
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
    "Every trade. Every cost. One platform.":
      "Semua bidang. Semua biaya. Satu platform.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux mengubah pengukuran Anda menjadi jumlah material yang tepat dan biaya nyata yang terverifikasi pasar, baik satu ruangan maupun seluruh bangunan, dari fondasi hingga atap. Ambil foto untuk mendapatkan estimasi AI, buat BOQ profesional, dan sewa profesional terverifikasi saat Anda siap. Gratis, tersedia dalam berbagai bahasa.",
    "Start Estimating Free": "Mulai estimasi gratis",
    "Try the AI Photo Estimator": "Coba estimator foto AI",
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
    "Every trade. Every cost. One platform.":
      "Kila ufani. Gharama zote. Jukwaa moja.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux hubadilisha vipimo vyako kuwa kiasi sahihi cha nyenzo na gharama halisi zilizothibitishwa sokoni, iwe chumba kimoja au jengo zima, kutoka msingi hadi paa. Piga picha upate makadirio ya AI, tengeneza BOQ ya kitaalamu, na ajiri wataalamu walioidhinishwa ukiwa tayari. Bila malipo, inapatikana kwa lugha nyingi.",
    "Start Estimating Free": "Anza kukadiria bila malipo",
    "Try the AI Photo Estimator": "Jaribu kikadirio cha picha cha AI",
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
    "Every trade. Every cost. One platform.":
      "كل الحرف. كل التكاليف. منصة واحدة.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "يحوّل Frelux قياساتك إلى كميات مواد دقيقة وتكاليف حقيقية موثقة من السوق، سواء لغرفة واحدة أو لمبنى كامل، من الأساس إلى السطح. التقط صورة للحصول على تقدير بالذكاء الاصطناعي، وأنشئ جدول كميات (BOQ) احترافيًا، وتعاقد مع محترفين موثوقين عندما تكون جاهزًا. مجاني ومتاح بعدة لغات.",
    "Start Estimating Free": "ابدأ التقدير مجانًا",
    "Try the AI Photo Estimator": "جرّب مُقدّر الصور بالذكاء الاصطناعي",
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
    "Every trade. Every cost. One platform.":
      "हर कारीगरी। हर लागत। एक ही प्लेटफ़ॉर्म।",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux आपके मापों को सामग्री की सटीक मात्रा और बाज़ार-सत्यापित वास्तविक लागत में बदल देता है, चाहे एक कमरा हो या पूरी इमारत, नींव से छत तक। AI अनुमान के लिए एक फ़ोटो लें, पेशेवर BOQ बनाएँ और तैयार होने पर सत्यापित पेशेवरों को काम पर रखें। मुफ़त, कई भाषाओं में उपलब्ध।",
    "Start Estimating Free": "नि:शुल्क अनुमान शुरू करें",
    "Try the AI Photo Estimator": "AI फ़ोटो अनुमानक आज़माएँ",
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
    "Every trade. Every cost. One platform.": "所有工种，所有成本，一个平台。",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "Frelux 将您的测量数据转化为精确的材料数量和经市场核实的真实成本，无论是单个房间还是整栋建筑，从地基到屋顶。拍张照片即可获得 AI 估价，生成专业工程量清单（BOQ），并在需要时聘请经过验证的专业人士。免费，支持多种语言。",
    "Start Estimating Free": "免费开始估算",
    "Try the AI Photo Estimator": "试试 AI 照片估算",
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
