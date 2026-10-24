/* eslint-disable react-refresh/only-export-components */
/**
 * Translation System for FRELUX
 *
 * Worldwide language layer. Every registered language has:
 *  1. a locale URL prefix (/es/, /fr/, /de/, /pt/, /ru/,
 *     /id/, /sw/, /ar/, /hi/, /zh/ - plus /en/), routed by App's
 *     LocaleAwareRoutes. Since the 2026-10-23 i18n batch the server
 *     serves locale URLs with 200 (URL durable: shared links,
 *     bookmarks and refreshes keep the locale; netlify.toml) and an
 *     X-Robots-Tag: noindex header keeps them out of the index
 *     (public/_headers) — stronger than the previous canonical-only
 *     approach that produced Search Console's duplicate reports.
 *     Locale URLs are still NOT SEO pages: prerender emits one
 *     content-bearing page per route (English), locale URLs stay
 *     absent from the sitemap, and hreflang + sitemap entries return
 *     only once locale URLs carry genuinely translated content.
 *     /en/ stays a 301 to / (English is the default origin).
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
// Currency grouping follows the active language (i18n batch 2026-10-23).
import { setActiveCurrencyLocale } from "@/lib/international/currency-format";

export type Language =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru"
  | "id"
  | "sw"
  | "ar"
  | "hi"
  | "zh"
  | "ja"
  | "nl";

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
  { value: "ja", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵" },
  { value: "nl", label: "Dutch", nativeLabel: "Nederlands", flag: "🇳🇱" },
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Calculadora de pintura",
    "Estimate how many paint buckets your project requires, step by step.":
      "Estima cuántos botes de pintura necesita tu proyecto, paso a paso.",
    "Project type": "Tipo de proyecto",
    Measurements: "Medidas",
    "Surface details": "Detalles de superficie",
    "Provide the dimensions of the area you're painting.":
      "Introduce las dimensiones del área que vas a pintar.",
    Length: "Largo",
    "Fence length": "Largo de la cerca",
    "Width (Optional if not applicable)": "Ancho (opcional si no aplica)",
    "Wall height": "Altura de la pared",
    "Fence height": "Altura de la cerca",
    Calculate: "Calcular",
    "Calculate Again": "Calcular de nuevo",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Cuenta",
    Business: "Negocios",
    Plan: "Plan",
    "Saved Estimates & Projects": "Estimaciones y proyectos guardados",
    "My Job Listings": "Mis ofertas de trabajo",
    "My Products": "Mis productos",
    "Contractor Workspace": "Área del contratista",
    Analytics: "Analítica",
    "Brand Studio": "Estudio de marca",
    Home: "Inicio",
    Tools: "Herramientas",
    Market: "Mercado",
    Projects: "Proyectos",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Calculateur de peinture",
    "Estimate how many paint buckets your project requires, step by step.":
      "Estimez le nombre de pots de peinture nécessaires pour votre projet, étape par étape.",
    "Project type": "Type de projet",
    Measurements: "Dimensions",
    "Surface details": "Détails de la surface",
    "Provide the dimensions of the area you're painting.":
      "Indiquez les dimensions de la zone à peindre.",
    Length: "Longueur",
    "Fence length": "Longueur de la clôture",
    "Width (Optional if not applicable)":
      "Largeur (facultatif si non applicable)",
    "Wall height": "Hauteur du mur",
    "Fence height": "Hauteur de la clôture",
    Calculate: "Calculer",
    "Calculate Again": "Calculer à nouveau",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Compte",
    Business: "Entreprise",
    Plan: "Abonnement",
    "Saved Estimates & Projects": "Devis et projets enregistrés",
    "My Job Listings": "Mes annonces d'emploi",
    "My Products": "Mes produits",
    "Contractor Workspace": "Espace entrepreneur",
    Analytics: "Statistiques",
    "Brand Studio": "Studio de marque",
    Home: "Accueil",
    Tools: "Outils",
    Market: "Marché",
    Projects: "Projets",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Farbrechner",
    "Estimate how many paint buckets your project requires, step by step.":
      "Schätzen Sie Schritt für Schritt, wie viele Farbeimer Ihr Projekt benötigt.",
    "Project type": "Projekttyp",
    Measurements: "Maße",
    "Surface details": "Oberflächendetails",
    "Provide the dimensions of the area you're painting.":
      "Geben Sie die Maße des zu streichenden Bereichs an.",
    Length: "Länge",
    "Fence length": "Zaunlänge",
    "Width (Optional if not applicable)": "Breite (optional, falls zutreffend)",
    "Wall height": "Wandhöhe",
    "Fence height": "Zaunhöhe",
    Calculate: "Berechnen",
    "Calculate Again": "Erneut berechnen",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Konto",
    Business: "Geschäft",
    Plan: "Tarif",
    "Saved Estimates & Projects":
      "Gespeicherte Kostenvoranschläge und Projekte",
    "My Job Listings": "Meine Stellenanzeigen",
    "My Products": "Meine Produkte",
    "Contractor Workspace": "Auftragnehmer-Bereich",
    Analytics: "Analyse",
    "Brand Studio": "Markenstudio",
    Home: "Startseite",
    Tools: "Werkzeuge",
    Market: "Marktplatz",
    Projects: "Projekte",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Calculadora de tinta",
    "Estimate how many paint buckets your project requires, step by step.":
      "Estime quantas latas de tinta seu projeto precisa, passo a passo.",
    "Project type": "Tipo de projeto",
    Measurements: "Medidas",
    "Surface details": "Detalhes da superfície",
    "Provide the dimensions of the area you're painting.":
      "Informe as dimensões da área que você vai pintar.",
    Length: "Comprimento",
    "Fence length": "Comprimento do muro",
    "Width (Optional if not applicable)":
      "Largura (opcional, se não se aplicar)",
    "Wall height": "Altura da parede",
    "Fence height": "Altura do muro",
    Calculate: "Calcular",
    "Calculate Again": "Calcular novamente",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Conta",
    Business: "Negócios",
    Plan: "Plano",
    "Saved Estimates & Projects": "Estimativas e projetos guardados",
    "My Job Listings": "Minhas vagas de trabalho",
    "My Products": "Meus produtos",
    "Contractor Workspace": "Área do empreiteiro",
    Analytics: "Análises",
    "Brand Studio": "Estúdio de marca",
    Home: "Início",
    Tools: "Ferramentas",
    Market: "Mercado",
    Projects: "Projetos",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Калькулятор краски",
    "Estimate how many paint buckets your project requires, step by step.":
      "Оцените, сколько вёдер краски нужно для вашего проекта, шаг за шагом.",
    "Project type": "Тип проекта",
    Measurements: "Размеры",
    "Surface details": "Детали поверхности",
    "Provide the dimensions of the area you're painting.":
      "Укажите размеры окрашиваемой площади.",
    Length: "Длина",
    "Fence length": "Длина забора",
    "Width (Optional if not applicable)":
      "Ширина (необязательно, если не требуется)",
    "Wall height": "Высота стены",
    "Fence height": "Высота забора",
    Calculate: "Рассчитать",
    "Calculate Again": "Рассчитать снова",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Аккаунт",
    Business: "Бизнес",
    Plan: "Тариф",
    "Saved Estimates & Projects": "Сохранённые расчёты и проекты",
    "My Job Listings": "Мои объявления о работе",
    "My Products": "Мои товары",
    "Contractor Workspace": "Кабинет подрядчика",
    Analytics: "Аналитика",
    "Brand Studio": "Студия бренда",
    Home: "Главная",
    Tools: "Инструменты",
    Market: "Рынок",
    Projects: "Проекты",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Kalkulator cat",
    "Estimate how many paint buckets your project requires, step by step.":
      "Perkirakan berapa kaleng cat yang dibutuhkan proyek Anda, langkah demi langkah.",
    "Project type": "Jenis proyek",
    Measurements: "Ukuran",
    "Surface details": "Detail permukaan",
    "Provide the dimensions of the area you're painting.":
      "Masukkan dimensi area yang akan dicat.",
    Length: "Panjang",
    "Fence length": "Panjang pagar",
    "Width (Optional if not applicable)": "Lebar (opsional jika tidak berlaku)",
    "Wall height": "Tinggi dinding",
    "Fence height": "Tinggi pagar",
    Calculate: "Hitung",
    "Calculate Again": "Hitung lagi",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Akun",
    Business: "Bisnis",
    Plan: "Paket",
    "Saved Estimates & Projects": "Estimasi dan proyek tersimpan",
    "My Job Listings": "Lowongan pekerjaan saya",
    "My Products": "Produk saya",
    "Contractor Workspace": "Area kontraktor",
    Analytics: "Analitik",
    "Brand Studio": "Studio merek",
    Home: "Beranda",
    Tools: "Alat",
    Market: "Pasar",
    Projects: "Proyek",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "Kikokotoo cha rangi",
    "Estimate how many paint buckets your project requires, step by step.":
      "Kadiria ni ndoo ngapi za rangi mradi wako unahitaji, hatua kwa hatua.",
    "Project type": "Aina ya mradi",
    Measurements: "Vipimo",
    "Surface details": "Maelezo ya uso",
    "Provide the dimensions of the area you're painting.":
      "Weka vipimo ya eneo unalotaka kupaka rangi.",
    Length: "Urefu",
    "Fence length": "Urefu wa ua",
    "Width (Optional if not applicable)": "Upana (si lazima kama haitumiki)",
    "Wall height": "Kimo cha ukuta",
    "Fence height": "Kimo cha ua",
    Calculate: "Kokotoa",
    "Calculate Again": "Kokotoa tena",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "Akaunti",
    Business: "Biashara",
    Plan: "Mpango",
    "Saved Estimates & Projects": "Makadirio na miradi iliyohifadhiwa",
    "My Job Listings": "Matangazo yangu ya kazi",
    "My Products": "Bidhaa zangu",
    "Contractor Workspace": "Eneo la mkandarasi",
    Analytics: "Uchambuzi",
    "Brand Studio": "Studio ya chapa",
    Home: "Nyumbani",
    Tools: "Zana",
    Market: "Soko",
    Projects: "Miradi",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "حاسبة الطلاء",
    "Estimate how many paint buckets your project requires, step by step.":
      "قدّر عدد علب الطلاء التي يحتاجها مشروعك، خطوة بخطوة.",
    "Project type": "نوع المشروع",
    Measurements: "القياسات",
    "Surface details": "تفاصيل السطح",
    "Provide the dimensions of the area you're painting.":
      "أدخل أبعاد المنطقة التي سترسمها.",
    Length: "الطول",
    "Fence length": "طول السياج",
    "Width (Optional if not applicable)": "العرض (اختياري إن لم يكن مطلوبًا)",
    "Wall height": "ارتفاع الجدار",
    "Fence height": "ارتفاع السياج",
    Calculate: "احسب",
    "Calculate Again": "احسب مرة أخرى",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "الحساب",
    Business: "الأعمال",
    Plan: "الخطة",
    "Saved Estimates & Projects": "التقديرات والمشاريع المحفوظة",
    "My Job Listings": "إعلاناتي الوظيفية",
    "My Products": "منتجاتي",
    "Contractor Workspace": "مساحة المقاول",
    Analytics: "التحليلات",
    "Brand Studio": "استوديو العلامة التجارية",
    Home: "الرئيسية",
    Tools: "الأدوات",
    Market: "السوق",
    Projects: "المشاريع",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "पेंट कैलकुलेटर",
    "Estimate how many paint buckets your project requires, step by step.":
      "अनुमान लगाएं कि आपकी परियोजना को कितने पेंट के डिब्बे चाहिए, कदम दर कदम।",
    "Project type": "परियोजना प्रकार",
    Measurements: "माप",
    "Surface details": "सतह विवरण",
    "Provide the dimensions of the area you're painting.":
      "पेंट किए जाने वाले क्षेत्र के आयाम दर्ज करें।",
    Length: "लंबाई",
    "Fence length": "बाड़ की लंबाई",
    "Width (Optional if not applicable)": "चौड़ाई (यदि लागू न हो तो वैकल्पिक)",
    "Wall height": "दीवार की ऊंचाई",
    "Fence height": "बाड़ की ऊंचाई",
    Calculate: "गणना करें",
    "Calculate Again": "फिर से गणना करें",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "खाता",
    Business: "व्यवसाय",
    Plan: "योजना",
    "Saved Estimates & Projects": "सहेजे गए अनुमान और प्रोजेक्ट",
    "My Job Listings": "मेरी नौकरी सूचनाएँ",
    "My Products": "मेरे उत्पाद",
    "Contractor Workspace": "ठेकेदार कार्यक्षेत्र",
    Analytics: "विश्लेषण",
    "Brand Studio": "ब्रांड स्टूडियो",
    Home: "होम",
    Tools: "औज़ार",
    Market: "बाज़ार",
    Projects: "प्रोजेक्ट",
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

    // Paint Calculator chrome (i18n deepening)
    "Paint Calculator": "油漆计算器",
    "Estimate how many paint buckets your project requires, step by step.":
      "逐步估算您的项目需要多少桶油漆。",
    "Project type": "项目类型",
    Measurements: "尺寸",
    "Surface details": "表面详情",
    "Provide the dimensions of the area you're painting.":
      "请输入您要粉刷的区域尺寸。",
    Length: "长度",
    "Fence length": "围栏长度",
    "Width (Optional if not applicable)": "宽度（如不适用可留空）",
    "Wall height": "墙高",
    "Fence height": "围栏高度",
    Calculate: "计算",
    "Calculate Again": "重新计算",
    // Nav chrome (account dropdown, sections, mobile bottom nav)
    Account: "账户",
    Business: "商业",
    Plan: "套餐",
    "Saved Estimates & Projects": "已保存的估算和项目",
    "My Job Listings": "我的招聘信息",
    "My Products": "我的产品",
    "Contractor Workspace": "承包商工作区",
    Analytics: "数据分析",
    "Brand Studio": "品牌工作室",
    Home: "主页",
    Tools: "工具",
    Market: "市场",
    Projects: "项目",
  },
  ja: {
    "Every trade. Every cost. One platform.":
      "すべての職種、すべてのコスト、ひとつのプラットフォーム。",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "FRELUXは、1つの部屋から建物全体、基礎から屋根まで、測定値を正確な資材数量と市場で検証済みの実際のコストに変換します。写真を撮るだけでAI見積もりを作成し、プロフェッショナルな数量明細書（BOQ）を生成し、準備ができたら認証済みの専門業者を雇えます。無料で、多言語に対応しています。",
    "Start Estimating Free": "無料で見積もりを開始",
    "Try the AI Photo Estimator": "AI写真見積もりを試す",
    Calculators: "計算ツール",
    "Construction Tools": "建設ツール",
    Marketplace: "マーケットプレイス",
    Pricing: "料金",
    "AI Studio": "AIスタジオ",
    "Learn Hub": "ラーニングハブ",
    About: "会社概要",
    Contact: "お問い合わせ",
    "My Profile": "マイプロフィール",
    Dashboard: "ダッシュボード",
    "My Estimates": "見積もり一覧",
    "Calculator Templates": "計算テンプレート",
    "Browse Marketplace": "マーケットを見る",
    "My Projects": "マイプロジェクト",
    Clients: "クライアント",
    Rewards: "リワード",
    "Sign in": "ログイン",
    "Sign out": "ログアウト",
    "Get Started": "はじめる",
    "Paint Calculator": "塗料計算ツール",
    "Estimate how many paint buckets your project requires, step by step.":
      "ステップごとに、プロジェクトに必要な塗料の缶数を見積もります。",
    "Project type": "プロジェクトの種類",
    Measurements: "寸法",
    "Surface details": "表面の詳細",
    "Provide the dimensions of the area you're painting.":
      "塗装する面積の寸法を入力してください。",
    Length: "長さ",
    "Fence length": "フェンスの長さ",
    "Width (Optional if not applicable)": "幅（該当しない場合は省略可）",
    "Wall height": "壁の高さ",
    "Fence height": "フェンスの高さ",
    Calculate: "計算",
    "Calculate Again": "再計算",
    Account: "アカウント",
    Business: "ビジネス",
    Plan: "プラン",
    "Saved Estimates & Projects": "保存した見積もりとプロジェクト",
    "My Job Listings": "求人一覧",
    "My Products": "商品一覧",
    "Contractor Workspace": "工事業者ワークスペース",
    Analytics: "分析",
    "Brand Studio": "ブランドスタジオ",
    Home: "ホーム",
    Tools: "ツール",
    Market: "マーケット",
    Projects: "プロジェクト",
  },
  nl: {
    "Every trade. Every cost. One platform.":
      "Elk vak. Elke kostenpost. Eén platform.",
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, whether it's a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you’re ready. Free, available in multiple languages.":
      "FRELUX zet uw afmetingen om in exacte materiaalhoeveelheden en echte, marktverifieerde kosten, van één kamer tot een volledig gebouw, van fundering tot dak. Maak een foto voor een AI-raming, genereer een professioneel bestek (BOQ) en huur geverifieerde vakmensen in wanneer u er klaar voor bent. Gratis, in meerdere talen.",
    "Start Estimating Free": "Gratis ramingen maken",
    "Try the AI Photo Estimator": "Probeer de AI-foto-estimator",
    Calculators: "Calculators",
    "Construction Tools": "Bouwgereedschap",
    Marketplace: "Marktplaats",
    Pricing: "Prijzen",
    "AI Studio": "AI-studio",
    "Learn Hub": "Leercentrum",
    About: "Over ons",
    Contact: "Contact",
    "My Profile": "Mijn profiel",
    Dashboard: "Dashboard",
    "My Estimates": "Mijn ramingen",
    "Calculator Templates": "Calculatorsjablonen",
    "Browse Marketplace": "Marktplaats bekijken",
    "My Projects": "Mijn projecten",
    Clients: "Klanten",
    Rewards: "Beloningen",
    "Sign in": "Inloggen",
    "Sign out": "Uitloggen",
    "Get Started": "Aan de slag",
    "Paint Calculator": "Verfcalculator",
    "Estimate how many paint buckets your project requires, step by step.":
      "Schat stap voor stap hoeveel verfbakken uw project nodig heeft.",
    "Project type": "Projecttype",
    Measurements: "Afmetingen",
    "Surface details": "Oppervlaktedetails",
    "Provide the dimensions of the area you're painting.":
      "Voer de afmetingen in van het gebied dat u gaat schilderen.",
    Length: "Lengte",
    "Fence length": "Heklengte",
    "Width (Optional if not applicable)":
      "Breedte (optioneel indien niet van toepassing)",
    "Wall height": "Muurhoogte",
    "Fence height": "Hekhoogte",
    Calculate: "Berekenen",
    "Calculate Again": "Opnieuw berekenen",
    Account: "Account",
    Business: "Zakelijk",
    Plan: "Plannen",
    "Saved Estimates & Projects": "Opgeslagen ramingen en projecten",
    "My Job Listings": "Mijn vacatures",
    "My Products": "Mijn producten",
    "Contractor Workspace": "Aannemerswerkruimte",
    Analytics: "Analyses",
    "Brand Studio": "Merkenstudio",
    Home: "Startpagina",
    Tools: "Gereedschap",
    Market: "Markt",
    Projects: "Projecten",
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
    // Currency presentation follows the active language: the Intl
    // language tag ("fr") resolves grouping/decimal separators for
    // every formatByCode/formatWithSymbol call without an explicit
    // locale option (i18n batch 2026-10-23).
    setActiveCurrencyLocale(language === "en" ? null : language);
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
