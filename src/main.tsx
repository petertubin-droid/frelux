import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrandingProvider } from '@/lib/branding';
import { ThemeProvider } from '@/lib/theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrandingProvider>
        <App />
      </BrandingProvider>
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

// TEMP DEBUG — remove after diagnosing width overflow
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;top:0;left:0;z-index:999999;background:red;color:white;font:12px monospace;padding:4px;';
      const dw = document.documentElement.scrollWidth;
      const iw = window.innerWidth;
      const bw = document.body.scrollWidth;
      badge.textContent = `iw:${iw} dw:${dw} bw:${bw} diff:${dw - iw}`;
      document.body.appendChild(badge);
    }, 800);
  });
}
