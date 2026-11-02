/**
 * Smart Defaults
 * Remembers last-used calculator settings and pre-fills them on next visit.
 * Per-calculator-type persistence in localStorage.
 */

const STORAGE_KEY = 'frelux_smart_defaults';

interface DefaultSettings {
  paintCalc?: {
    unit?: 'meters' | 'feet';
    projectType?: string;
    coats?: number;
    wasteMargin?: number;
    paintType?: string;
    includePrimer?: boolean;
  };
  costEstimate?: {
    unit?: 'meters' | 'feet';
    currency?: string;
    includeLabor?: boolean;
    laborRate?: number;
    paintType?: string;
  };
  screedingCalc?: {
    unit?: 'meters' | 'feet';
    screedingType?: string;
    thickness?: number;
  };
  tileCalc?: {
    unit?: 'meters' | 'feet';
    tileSize?: string;
    wasteMargin?: number;
  };
  popCalc?: {
    unit?: 'meters' | 'feet';
    designType?: string;
  };
}

function getDefaults(): DefaultSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDefaults(settings: DefaultSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

/** Save paint calculator settings */
export function savePaintCalcDefaults(settings: DefaultSettings['paintCalc']): void {
  const all = getDefaults();
  all.paintCalc = { ...all.paintCalc, ...settings };
  saveDefaults(all);
}

/** Load paint calculator settings */
export function loadPaintCalcDefaults(): NonNullable<DefaultSettings['paintCalc']> {
  return getDefaults().paintCalc ?? {};
}

/** Save cost estimate settings */
export function saveCostEstimateDefaults(settings: DefaultSettings['costEstimate']): void {
  const all = getDefaults();
  all.costEstimate = { ...all.costEstimate, ...settings };
  saveDefaults(all);
}

/** Load cost estimate settings */
export function loadCostEstimateDefaults(): NonNullable<DefaultSettings['costEstimate']> {
  return getDefaults().costEstimate ?? {};
}

/** Save screeding calculator settings */
export function saveScreedingDefaults(settings: DefaultSettings['screedingCalc']): void {
  const all = getDefaults();
  all.screedingCalc = { ...all.screedingCalc, ...settings };
  saveDefaults(all);
}

/** Load screeding calculator settings */
export function loadScreedingDefaults(): NonNullable<DefaultSettings['screedingCalc']> {
  return getDefaults().screedingCalc ?? {};
}

/** Save tile calculator settings */
export function saveTileDefaults(settings: DefaultSettings['tileCalc']): void {
  const all = getDefaults();
  all.tileCalc = { ...all.tileCalc, ...settings };
  saveDefaults(all);
}

/** Load tile calculator settings */
export function loadTileDefaults(): NonNullable<DefaultSettings['tileCalc']> {
  return getDefaults().tileCalc ?? {};
}

/** Save POP calculator settings */
export function savePopDefaults(settings: DefaultSettings['popCalc']): void {
  const all = getDefaults();
  all.popCalc = { ...all.popCalc, ...settings };
  saveDefaults(all);
}

/** Load POP calculator settings */
export function loadPopDefaults(): NonNullable<DefaultSettings['popCalc']> {
  return getDefaults().popCalc ?? {};
}

/** Track recently used calculators (for quick access) */
const RECENT_KEY = 'frelux_recent_tools';

export interface RecentTool {
  path: string;
  label: string;
  icon: string;
  visitedAt: string;
}

export function trackRecentTool(path: string, label: string, icon: string): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const items: RecentTool[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter(i => i.path !== path);
    filtered.unshift({ path, label, icon, visitedAt: new Date().toISOString() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 6)));
  } catch { /* ignore */ }
}

export function getRecentTools(): RecentTool[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
