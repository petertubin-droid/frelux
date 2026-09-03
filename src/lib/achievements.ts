/**
 * Achievement / Badges System
 * Tracks user milestones and unlocks badges for engagement.
 * Persists in localStorage — works for anonymous users.
 */

const STORAGE_KEY = 'frelux_achievements';
const USAGE_KEY = 'frelux_usage_stats';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  category: 'calculations' | 'colors' | 'projects' | 'social' | 'streak';
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export interface UsageStats {
  totalCalculations: number;
  paintCalcs: number;
  costEstimates: number;
  screedingCalcs: number;
  tileCalcs: number;
  popCalcs: number;
  finishEstimates: number;
  colorsViewed: number;
  colorsFavorited: number;
  projectsSaved: number;
  projectsShared: number;
  aiAssistants: number;
  lastVisit: string;
  visitStreak: number;
  totalVisits: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_calc', title: 'First Calculation', description: 'Complete your first calculation', icon: '🎯', threshold: 1, category: 'calculations' },
  { id: 'calc_5', title: 'Getting Started', description: 'Complete 5 calculations', icon: '📊', threshold: 5, category: 'calculations' },
  { id: 'project_saver', title: 'Project Saver', description: 'Save 3 projects', icon: '💾', threshold: 3, category: 'projects' },
  { id: 'streak_3', title: 'On a Roll', description: 'Visit 3 days in a row', icon: '🔥', threshold: 3, category: 'streak' },
  { id: 'ai_pioneer', title: 'AI Pioneer', description: 'Use an AI assistant tool', icon: '🤖', threshold: 1, category: 'calculations' },
];

function getStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

function defaultStats(): UsageStats {
  return {
    totalCalculations: 0,
    paintCalcs: 0,
    costEstimates: 0,
    screedingCalcs: 0,
    tileCalcs: 0,
    popCalcs: 0,
    finishEstimates: 0,
    colorsViewed: 0,
    colorsFavorited: 0,
    projectsSaved: 0,
    projectsShared: 0,
    aiAssistants: 0,
    lastVisit: '',
    visitStreak: 0,
    totalVisits: 0,
  };
}

function saveStats(stats: UsageStats): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function getUnlocked(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnlocked(list: UnlockedAchievement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

/** Track a calculator usage */
export function trackCalculation(type: 'paint' | 'cost' | 'screeding' | 'tile' | 'pop' | 'finish' | 'ai' | 'painting' | 'tyrolene'): Achievement[] {
  const stats = getStats();
  stats.totalCalculations++;

  if (type === 'paint') stats.paintCalcs++;
  else if (type === 'cost') stats.costEstimates++;
  else if (type === 'screeding') stats.screedingCalcs++;
  else if (type === 'tile') stats.tileCalcs++;
  else if (type === 'pop') stats.popCalcs++;
  else if (type === 'finish') stats.finishEstimates++;
  else if (type === 'ai') stats.aiAssistants++;

  // Check all-rounder: used at least 5 different types
  const _typesUsed = [stats.paintCalcs > 0, stats.costEstimates > 0, stats.screedingCalcs > 0, stats.tileCalcs > 0, stats.popCalcs > 0].filter(Boolean).length;

  saveStats(stats);

  return checkUnlocks(stats);
}

/** Track color views */
export function trackColorView(): Achievement[] {
  const stats = getStats();
  stats.colorsViewed++;
  saveStats(stats);
  return checkUnlocks(stats);
}

/** Track color favorite */
export function trackColorFavorite(): Achievement[] {
  const stats = getStats();
  stats.colorsFavorited++;
  saveStats(stats);
  return checkUnlocks(stats);
}

/** Track project save */
export function trackProjectSave(): Achievement[] {
  const stats = getStats();
  stats.projectsSaved++;
  saveStats(stats);
  return checkUnlocks(stats);
}

/** Track share */
export function trackShare(): Achievement[] {
  const stats = getStats();
  stats.projectsShared++;
  saveStats(stats);
  return checkUnlocks(stats);
}

/** Track daily visit — call on app load */
export function trackVisit(): Achievement[] {
  const stats = getStats();
  const today = new Date().toDateString();

  if (stats.lastVisit !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (stats.lastVisit === yesterday) {
      stats.visitStreak++;
    } else if (stats.lastVisit !== today) {
      stats.visitStreak = 1;
    }
    stats.lastVisit = today;
    stats.totalVisits++;
    saveStats(stats);
  }

  return checkUnlocks(stats);
}

/** Get all unlocked achievements */
export function getAchievements(): { unlocked: UnlockedAchievement[]; stats: UsageStats } {
  return { unlocked: getUnlocked(), stats: getStats() };
}

/** Get recently unlocked (for toast display) */
export function getNewlyUnlocked(): Achievement[] {
  return [];
}

function checkUnlocks(stats: UsageStats): Achievement[] {
  const unlocked = getUnlocked();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const newlyUnlocked: Achievement[] = [];

  const counts: Record<string, number> = {
    'first_calc': stats.totalCalculations,
    'calc_5': stats.totalCalculations,
    'project_saver': stats.projectsSaved,
    'streak_3': stats.visitStreak,
    'ai_pioneer': stats.aiAssistants,
  };

  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id) && (counts[ach.id] ?? 0) >= ach.threshold) {
      unlocked.push({ id: ach.id, unlockedAt: new Date().toISOString() });
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked);
  }

  return newlyUnlocked;
}
