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
      badge.style.cssText = 'position:fixed;top:0;left:0;z-index:999999;background:red;color:white;font:11px monospace;padding:4px;max-width:100vw;white-space:pre-wrap;';
      const iw = document.documentElement.clientWidth;
      const offenders = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > iw + 1 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
          offenders.push(`${el.tagName}.${(el.className||'').toString().slice(0,40)} right:${Math.round(r.right)}`);
        }
      });
      badge.textContent = `iw:${iw}\n` + offenders.slice(0, 8).join('\n');
      document.body.appendChild(badge);
    }, 800);
  });
}
