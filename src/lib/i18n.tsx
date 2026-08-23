/**
 * Translation System for FRELUX
 * Supports English (default), Yoruba, Hausa, Igbo, and Nigerian Pidgin.
 * Uses localStorage to persist language preference.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'yo' | 'ha' | 'ig' | 'pidgin' | 'efik' | 'tiv' | 'ijaw' | 'kanuri' | 'nupe' | 'fulfulde' | 'ebira' | 'ibibio' | 'igala' | 'urhobo' | 'eso';

export const LANGUAGES: { value: Language; label: string; nativeLabel: string; flag: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { value: 'yo', label: 'Yoruba', nativeLabel: 'Yorùbá', flag: '🇳🇬' },
  { value: 'ha', label: 'Hausa', nativeLabel: 'Hausa', flag: '🇳🇬' },
  { value: 'ig', label: 'Igbo', nativeLabel: 'Igbo', flag: '🇳🇬' },
  { value: 'pidgin', label: 'Pidgin', nativeLabel: 'Naija', flag: '🇳🇬' },
  { value: 'efik', label: 'Efik', nativeLabel: 'Usem Efik', flag: '🇳🇬' },
  { value: 'tiv', label: 'Tiv', nativeLabel: 'Zwa Tiv', flag: '🇳🇬' },
  { value: 'ijaw', label: 'Ijaw', nativeLabel: 'Izon', flag: '🇳🇬' },
  { value: 'kanuri', label: 'Kanuri', nativeLabel: 'Kanuri', flag: '🇳🇬' },
  { value: 'nupe', label: 'Nupe', nativeLabel: 'Nupe', flag: '🇳🇬' },
  { value: 'fulfulde', label: 'Fulfulde', nativeLabel: 'Fulfulde', flag: '🇳🇬' },
  { value: 'ebira', label: 'Ebira', nativeLabel: 'Ebira', flag: '🇳🇬' },
  { value: 'ibibio', label: 'Ibibio', nativeLabel: 'Ibibio', flag: '🇳🇬' },
  { value: 'igala', label: 'Igala', nativeLabel: 'Igala', flag: '🇳🇬' },
  { value: 'urhobo', label: 'Urhobo', nativeLabel: 'Urhobo', flag: '🇳🇬' },
  { value: 'eso', label: 'Esan', nativeLabel: 'Esan', flag: '🇳🇬' },
];

type TranslationKey = string;

// Translation dictionary — covers calculator labels, navigation, and common UI
const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {},
  efik: {},
  tiv: {},
  ijaw: {},
  kanuri: {},
  nupe: {},
  fulfulde: {},
  ebira: {},
  ibibio: {},
  igala: {},
  urhobo: {},
  eso: {},
  yo: {
    'calc.title': 'Kọmputa Paint',
    'calc.subtitle': 'Yọ iwọn iye paint ti iṣẹ rẹ nilo',
    'calc.project_type': 'Iru iṣẹ',
    'calc.room': 'Yara',
    'calc.house': 'Ile',
    'calc.exterior': 'Ita ile',
    'calc.fence': 'Ilopo',
    'calc.dimensions': 'Iwọn yara',
    'calc.length': 'Gigun',
    'calc.width': 'Iwọn',
    'calc.wall_height': 'Ga opi',
    'calc.doors': 'Ile igbẹnu',
    'calc.windows': 'Ferese',
    'calc.coats': 'Ipele paint',
    'calc.paint_type': 'Iru paint',
    'calc.calculate': 'Siro',
    'calc.result': 'Eto rẹ',
    'calc.paint_required': 'Paint ti a nilo',
    'calc.paintable_area': 'Agbegbe ti a le pọ',
    'calc.coverage_rate': 'Iyọsọ paint',
    'calc.continue': 'Tẹsiwaju',
    'calc.start_over': 'Bẹrẹ tun',
    'nav.calculators': 'Kọmputa',
    'nav.colors': 'Awọ',
    'nav.learn': 'Ẹkọ',
    'nav.get_started': 'Bẹrẹ',
    'common.save': 'Fi pamọ',
    'common.share': 'Pin',
    'common.export': 'Gbe jade',
    'common.cancel': 'Nkọ',
    'common.loading': 'Nkọjú...',
    'common.error': 'Aṣiṣe',
  },
  ha: {
    'calc.title': 'Kwamfutar Fenti',
    'calc.subtitle': 'Kiyasin adadin fenti aikin ku yake buƙata',
    'calc.project_type': 'Nau\'in aikin',
    'calc.room': 'Daki',
    'calc.house': 'Gida',
    'calc.exterior': 'Wajen gida',
    'calc.fence': 'Ganuwa',
    'calc.dimensions': 'Girma na daki',
    'calc.length': 'Tsawo',
    'calc.width': 'Faɗin',
    'calc.wall_height': 'Tsayin bango',
    'calc.doors': 'Koofofi',
    'calc.windows': 'Tagogi',
    'calc.coats': 'Layin fenti',
    'calc.paint_type': 'Nau\'in fenti',
    'calc.calculate': 'Lissafta',
    'calc.result': 'Sakamakon ku',
    'calc.paint_required': 'Fenti da ake buƙata',
    'calc.paintable_area': 'Yankin da za a finta',
    'calc.coverage_rate': 'Adadin rufewa',
    'calc.continue': 'Ci gaba',
    'calc.start_over': 'Fara daga baya',
    'nav.calculators': 'Kwamfuta',
    'nav.colors': 'Launuka',
    'nav.learn': 'Koyo',
    'nav.get_started': 'Fara',
    'common.save': 'Ajiya',
    'common.share': 'Raba',
    'common.export': 'Fitar',
    'common.cancel': 'Soke',
    'common.loading': 'Ana loda...',
    'common.error': 'Kuskure',
  },
  ig: {
    'calc.title': 'Mgbakọ Paint',
    'calc.subtitle': 'Tụọ ego paint ọrụ gị chọrọ',
    'calc.project_type': 'Ụdị ọrụ',
    'calc.room': 'Ụlọ',
    'calc.house': 'Ụlọ dum',
    'calc.exterior': 'N\'èzí ụlọ',
    'calc.fence': 'Mgba',
    'calc.dimensions': 'Ntụle ụlọ',
    'calc.length': 'Ogologo',
    'calc.width': 'Obosara',
    'calc.wall_height': 'Elu mgbidi',
    'calc.doors': 'Ụzọ',
    'calc.windows': 'Windọ',
    'calc.coats': 'Oge npị',
    'calc.paint_type': 'Ụdị paint',
    'calc.calculate': 'Gbakọọ',
    'calc.result': 'Nke gị',
    'calc.paint_required': 'Paint a chọrọ',
    'calc.paintable_area': 'Ebe a ga-epị',
    'calc.coverage_rate': 'Ọsịsọ ịkpuchi',
    'calc.continue': 'Gaa n\'ihu',
    'calc.start_over': 'Malite ọzọ',
    'nav.calculators': 'Mgbakọ',
    'nav.colors': 'Agba',
    'nav.learn': 'Mmuta',
    'nav.get_started': 'Malite',
    'common.save': 'Doba',
    'common.share': 'Kekọrịta',
    'common.export': 'Wepụ',
    'common.cancel': 'Kagbuo',
    'common.loading': 'Na-ebu...',
    'common.error': 'Nsogbu',
  },
  pidgin: {
    'calc.title': 'Paint Calculator',
    'calc.subtitle': 'Calculate how much paint your work need',
    'calc.project_type': 'Wetin you dey paint',
    'calc.room': 'Room',
    'calc.house': 'Full house',
    'calc.exterior': 'Outside',
    'calc.fence': 'Fence',
    'calc.dimensions': 'Room size',
    'calc.length': 'Long',
    'calc.width': 'Wide',
    'calc.wall_height': 'How tall be wall',
    'calc.doors': 'Door',
    'calc.windows': 'Window',
    'calc.coats': 'How many layers',
    'calc.paint_type': 'Type of paint',
    'calc.calculate': 'Calculate am',
    'calc.result': 'Your result',
    'calc.paint_required': 'Paint wey you need',
    'calc.paintable_area': 'Area wey you go paint',
    'calc.coverage_rate': 'How far paint go reach',
    'calc.continue': 'Continue',
    'calc.start_over': 'Start again',
    'nav.calculators': 'Calculators',
    'nav.colors': 'Colors',
    'nav.learn': 'Learn',
    'nav.get_started': 'Start now',
    'common.save': 'Save am',
    'common.share': 'Share am',
    'common.export': 'Export am',
    'common.cancel': 'Cancel',
    'common.loading': 'Dey load...',
    'common.error': 'Wahala',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('frelux_lang') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('frelux_lang', language);
    document.documentElement.setAttribute('lang', language);
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
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
