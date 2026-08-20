/**
 * Accessibility Context — high-contrast mode and accessibility settings
 * Persists in localStorage. Adds 'accessibility-mode' class to <html>.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AccessibilityContextValue {
  highContrast: boolean;
  toggleHighContrast: () => void;
  largeText: boolean;
  toggleLargeText: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  highContrast: false,
  toggleHighContrast: () => {},
  largeText: false,
  toggleLargeText: () => {},
  reducedMotion: false,
  toggleReducedMotion: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('frelux_a11y_hc') === 'true');
  const [largeText, setLargeText] = useState(() => localStorage.getItem('frelux_a11y_large') === 'true');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('frelux_a11y_motion') === 'true');

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.classList.add('accessibility-mode');
    else root.classList.remove('accessibility-mode');
    localStorage.setItem('frelux_a11y_hc', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (largeText) root.classList.add('large-text');
    else root.classList.remove('large-text');
    localStorage.setItem('frelux_a11y_large', String(largeText));
  }, [largeText]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.classList.add('reduced-motion');
    else root.classList.remove('reduced-motion');
    localStorage.setItem('frelux_a11y_motion', String(reducedMotion));
  }, [reducedMotion]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        toggleHighContrast: () => setHighContrast((p) => !p),
        largeText,
        toggleLargeText: () => setLargeText((p) => !p),
        reducedMotion,
        toggleReducedMotion: () => setReducedMotion((p) => !p),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility() {
  return useContext(AccessibilityContext);
}
