/**
 * FRELUX Font Library — 60 real Google Fonts organized by category.
 *
 * Fonts are loaded dynamically via the Google Fonts CSS API.
 * Only the active fonts (max 7) are loaded on the site at any time.
 * Preview fonts in the admin panel are lazy-loaded on demand.
 */

export type FontCategory =
  | 'Premium Modern'
  | 'Luxury'
  | 'Corporate'
  | 'Clean Minimalist'
  | 'Geometric'
  | 'Editorial'
  | 'Elegant'
  | 'Bold / Strong'
  | 'Technology'
  | 'Construction'
  | 'Friendly Professional'
  | 'Condensed'
  | 'Display / Headline';

export interface FontFamily {
  /** Google Fonts family name (exact) */
  family: string;
  /** Display label */
  name: string;
  category: FontCategory;
  /** CSS font-family stack with fallbacks */
  stack: string;
  /** Google Fonts weights to load */
  weights: number[];
  /** Whether this is a good body text font (readable at small sizes) */
  goodForBody: boolean;
  /** Whether this is a good heading font (impact at large sizes) */
  goodForHeadings: boolean;
}

const F = (
  family: string,
  category: FontCategory,
  weights: number[],
  goodForBody: boolean,
  goodForHeadings: boolean,
): FontFamily => ({
  family,
  name: family,
  category,
  weights,
  goodForBody,
  goodForHeadings,
  stack: `'${family}', system-ui, -apple-system, sans-serif`,
});

export const FONT_LIBRARY: FontFamily[] = [
  // Premium Modern
  F('Inter', 'Premium Modern', [400, 500, 600, 700], true, true),
  F('Plus Jakarta Sans', 'Premium Modern', [400, 500, 600, 700, 800], true, true),
  F('DM Sans', 'Premium Modern', [400, 500, 600, 700], true, true),
  F('Manrope', 'Premium Modern', [400, 500, 600, 700, 800], true, true),
  F('Outfit', 'Premium Modern', [400, 500, 600, 700, 800], true, true),

  // Luxury
  F('Cormorant Garamond', 'Luxury', [400, 500, 600, 700], true, true),
  F('Playfair Display', 'Luxury', [400, 500, 600, 700, 800, 900], false, true),
  F('Bodoni Moda', 'Luxury', [400, 500, 600, 700, 800, 900], false, true),
  F('Marcellus', 'Luxury', [400], false, true),

  // Corporate
  F('IBM Plex Sans', 'Corporate', [400, 500, 600, 700], true, true),
  F('Roboto', 'Corporate', [400, 500, 700], true, true),
  F('Source Sans 3', 'Corporate', [400, 500, 600, 700], true, true),
  F('Noto Sans', 'Corporate', [400, 500, 600, 700], true, true),
  F('Work Sans', 'Corporate', [400, 500, 600, 700], true, true),

  // Clean Minimalist
  F('Poppins', 'Clean Minimalist', [400, 500, 600, 700], true, true),
  F('Montserrat', 'Clean Minimalist', [400, 500, 600, 700, 800], true, true),
  F('Mulish', 'Clean Minimalist', [400, 500, 600, 700, 800], true, true),
  F('Hanken Grotesk', 'Clean Minimalist', [400, 500, 600, 700], true, true),

  // Geometric
  F('Space Grotesk', 'Geometric', [400, 500, 600, 700], true, true),
  F('Sora', 'Geometric', [400, 500, 600, 700, 800], true, true),
  F('Lexend', 'Geometric', [400, 500, 600, 700], true, true),
  F('Figtree', 'Geometric', [400, 500, 600, 700, 800], true, true),
  F('Unbounded', 'Geometric', [400, 500, 600, 700, 800], false, true),

  // Editorial
  F('Lora', 'Editorial', [400, 500, 600, 700], true, true),
  F('Merriweather', 'Editorial', [400, 700, 900], true, true),
  F('Newsreader', 'Editorial', [400, 500, 600, 700], true, true),
  F('Spectral', 'Editorial', [400, 500, 600, 700, 800], true, true),
  F('Fraunces', 'Editorial', [400, 500, 600, 700, 800, 900], true, true),

  // Elegant
  F('EB Garamond', 'Elegant', [400, 500, 600, 700, 800], true, true),
  F('Libre Baskerville', 'Elegant', [400, 700], true, true),
  F('Crimson Pro', 'Elegant', [400, 500, 600, 700, 800, 900], true, true),
  F('Prata', 'Elegant', [400], false, true),

  // Bold / Strong
  F('Archivo', 'Bold / Strong', [400, 500, 600, 700, 800, 900], true, true),
  F('Anton', 'Bold / Strong', [400], false, true),
  F('Oswald', 'Bold / Strong', [400, 500, 600, 700], true, true),
  F('Barlow Condensed', 'Bold / Strong', [400, 500, 600, 700], true, true),
  F('Teko', 'Bold / Strong', [400, 500, 600, 700], false, true),

  // Technology
  F('JetBrains Mono', 'Technology', [400, 500, 600, 700], true, false),
  F('Space Mono', 'Technology', [400, 700], true, false),
  F('Chakra Petch', 'Technology', [400, 500, 600, 700], true, true),
  F('Rajdhani', 'Technology', [400, 500, 600, 700], true, true),

  // Construction / Architecture
  F('Archivo Black', 'Construction', [400], false, true),
  F('Saira', 'Construction', [400, 500, 600, 700, 800, 900], true, true),
  F('Barlow', 'Construction', [400, 500, 600, 700, 800, 900], true, true),
  F('Kanit', 'Construction', [400, 500, 600, 700, 800, 900], true, true),

  // Friendly Professional
  F('Nunito', 'Friendly Professional', [400, 500, 600, 700, 800], true, true),
  F('Quicksand', 'Friendly Professional', [400, 500, 600, 700], true, true),
  F('Comfortaa', 'Friendly Professional', [400, 500, 600, 700], true, true),
  F('Bricolage Grotesque', 'Friendly Professional', [400, 500, 600, 700, 800], true, true),
  F('Be Vietnam Pro', 'Friendly Professional', [400, 500, 600, 700], true, true),

  // Condensed
  F('Roboto Condensed', 'Condensed', [400, 700], true, true),
  F('PT Sans Narrow', 'Condensed', [400, 700], true, true),
  F('Saira Condensed', 'Condensed', [400, 500, 600, 700, 800], true, true),

  // Display / Headline
  F('Bebas Neue', 'Display / Headline', [400], false, true),
  F('Cinzel', 'Display / Headline', [400, 500, 600, 700, 800, 900], false, true),
  F('Righteous', 'Display / Headline', [400], false, true),
  F('Philosopher', 'Display / Headline', [400, 700], true, true),
  F('Syne', 'Display / Headline', [400, 500, 600, 700, 800], false, true),
  F('Caveat', 'Display / Headline', [400, 500, 600, 700], false, false),
  F('Abril Fatface', 'Display / Headline', [400], false, true),
  F('Yeseva One', 'Display / Headline', [400], false, true),
  F('Libre Caslon Display', 'Display / Headline', [400], false, true),
  F('DM Serif Display', 'Display / Headline', [400], false, true),
  F('Alfa Slab One', 'Display / Headline', [400], false, true),
];

export const FONT_CATEGORIES: FontCategory[] = [
  'Premium Modern',
  'Luxury',
  'Corporate',
  'Clean Minimalist',
  'Geometric',
  'Editorial',
  'Elegant',
  'Bold / Strong',
  'Technology',
  'Construction',
  'Friendly Professional',
  'Condensed',
  'Display / Headline',
];

/** Default typography config (matches current FRELUX fonts) */
export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  body: 'Inter',
  headings: 'Plus Jakarta Sans',
  navigation: 'Inter',
  buttons: 'Inter',
  calculatorTitles: 'Plus Jakarta Sans',
  calculatorResults: 'Plus Jakarta Sans',
  admin: 'Inter',
};

import type { TypographyConfig } from '@/types/database';

export type TypographyArea =
  | 'body'
  | 'headings'
  | 'navigation'
  | 'buttons'
  | 'calculatorTitles'
  | 'calculatorResults'
  | 'admin';

export type { TypographyConfig };

export const TYPOGRAPHY_AREAS: { key: TypographyArea; label: string; description: string }[] = [
  { key: 'body', label: 'Global / Body Text', description: 'Default font for all body text, paragraphs, and general content.' },
  { key: 'headings', label: 'Headings', description: 'Font for all headings (H1 through H6) across the site.' },
  { key: 'navigation', label: 'Navigation / Menu', description: 'Font for navigation bars, menus, and links.' },
  { key: 'buttons', label: 'Buttons', description: 'Font for button labels and call-to-action text.' },
  { key: 'calculatorTitles', label: 'Calculator Titles', description: 'Font for calculator page titles and headers.' },
  { key: 'calculatorResults', label: 'Calculator Results', description: 'Font for calculator result numbers and displays.' },
  { key: 'admin', label: 'Admin Interface', description: 'Font for the admin dashboard and panel text.' },
];

/** Get a font family object by family name */
export function getFont(family: string): FontFamily | undefined {
  return FONT_LIBRARY.find((f) => f.family === family);
}

/** Build the CSS font-family stack for a given family name with fallbacks */
export function fontStack(family: string): string {
  const font = getFont(family);
  if (font) return font.stack;
  // Unknown font — provide generic fallback
  return `'${family}', system-ui, -apple-system, sans-serif`;
}
