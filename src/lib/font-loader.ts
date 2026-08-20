/**
 * Dynamic Google Fonts loader.
 *
 * Loads only the fonts currently needed — not the entire 60-font library.
 * Each unique font family is loaded once, regardless of how many areas use it.
 * Uses font-display=swap so text renders immediately with fallbacks.
 */

import { getFont, type TypographyConfig } from './font-library';

const loadedFonts = new Set<string>();
const pendingLinks = new Map<string, HTMLLinkElement>();

/**
 * Build a Google Fonts CSS2 URL for a single font family with specified weights.
 */
function buildFontUrl(family: string, weights: number[]): string {
  const familyParam = family.replace(/ /g, '+');
  const weightParam = weights.join(';');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=swap`;
}

/**
 * Load a single font family via a <link> tag.
 * No-op if already loaded (or loading).
 */
export function loadFont(family: string): void {
  if (loadedFonts.has(family) || pendingLinks.has(family)) return;

  const font = getFont(family);
  const weights = font?.weights ?? [400, 500, 600, 700];
  const href = buildFontUrl(family, weights);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'all';
  link.setAttribute('data-font-loader', family);
  document.head.appendChild(link);

  pendingLinks.set(family, link);
  loadedFonts.add(family);

  // Move from pending to fully loaded when the stylesheet loads
  link.addEventListener('load', () => {
    pendingLinks.delete(family);
  });
  link.addEventListener('error', () => {
    pendingLinks.delete(family);
    loadedFonts.delete(family);
  });
}

/**
 * Load all unique fonts from a typography config.
 * Deduplicates so each family loads only once.
 */
export function loadTypographyFonts(config: TypographyConfig): void {
  const families = new Set(Object.values(config));
  families.forEach((family) => {
    if (family) loadFont(family);
  });
}

/**
 * Preload a font for preview purposes (used in admin font picker).
 * Same as loadFont but separated for clarity.
 */
export function preloadFontForPreview(family: string): void {
  loadFont(family);
}

/**
 * Remove all dynamically loaded font links (used for reset).
 * Does not remove the original <link> tags from index.html.
 */
export function clearDynamicFonts(): void {
  document.querySelectorAll('link[data-font-loader]').forEach((el) => el.remove());
  loadedFonts.clear();
  pendingLinks.clear();
}
