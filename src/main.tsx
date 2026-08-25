// Sentry must initialize BEFORE any other code runs
import './instrument';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrandingProvider } from '@/lib/branding';
import { ThemeProvider } from '@/lib/theme';
import { LanguageProvider } from '@/lib/i18n';
import { AccessibilityProvider } from '@/lib/accessibility';
import { Toaster } from '@/components/ui/shadcn/toast';
import { initErrorMonitor } from '@/lib/errorMonitor';
import './index.css';

// Initialize FRELUX error monitoring — global error listeners
initErrorMonitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AccessibilityProvider>
          <BrandingProvider>
            <App />
            <Toaster />
          </BrandingProvider>
        </AccessibilityProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);

// Register Service Worker for PWA — only in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works without offline support
    });
  });
}
