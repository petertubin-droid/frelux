/**
 * Onboarding State
 * Tracks whether user has completed the first-visit tour.
 * Lightweight localStorage flag.
 */

const STORAGE_KEY = 'frelux_onboarding_complete';

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function completeOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch { /* ignore */ }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/** Onboarding tour steps */
export interface TourStep {
  target: string;  // CSS selector
  title: string;
  description: string;
  icon: string;
  cta?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="hero"]',
    title: 'Welcome to FRELUX! 👋',
    description: 'Your all-in-one paint calculator and estimation toolkit. Let\'s take a quick 30-second tour.',
    icon: '🎉',
    cta: 'Start tour',
  },
  {
    target: '[data-tour="calculators"]',
    title: 'Paint Calculators',
    description: 'Calculate paint quantities for rooms, walls, fences, and more. Just enter dimensions and we\'ll do the math.',
    icon: '🧮',
    cta: 'Next',
  },
  {
    target: '[data-tour="colors"]',
    title: 'Explore Paint Colors',
    description: 'Browse hundreds of paint colors, match colors from photos, and save your favorites.',
    icon: '🎨',
    cta: 'Next',
  },
  {
    target: '[data-tour="cost"]',
    title: 'Cost Estimation',
    description: 'Get accurate cost estimates including materials, labor, and a printable PDF quote.',
    icon: '💰',
    cta: 'Next',
  },
  {
    target: '[data-tour="ai"]',
    title: 'AI Color Assistant',
    description: 'Not sure which color to pick? Let our AI recommend colors based on your preferences.',
    icon: '🤖',
    cta: 'Next',
  },
  {
    target: '[data-tour="floating"]',
    title: 'Quick Access',
    description: 'Tap this button anytime to jump between calculators. You can also press Cmd+K (or Ctrl+K) for the command palette.',
    icon: '⚡',
    cta: 'Got it!',
  },
];
