// Sentry must initialize BEFORE any other code runs
import "./instrument";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BrandingProvider } from "@/lib/branding";
import { ThemeProvider } from "@/lib/theme";
import {
  LanguageProvider,
  detectInitialLanguage,
  ensureLanguageLoaded,
} from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/international/currency-context";
import { AccessibilityProvider } from "@/lib/accessibility";
import { Toaster } from "@/components/ui/shadcn/toast";
import { initErrorMonitor } from "@/lib/errorMonitor";
import "./index.css";

// Initialize FRELUX error monitoring, global error listeners
initErrorMonitor();

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <AccessibilityProvider>
              <BrandingProvider>
                <App />
                <Toaster />
              </BrandingProvider>
            </AccessibilityProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

// Machine dictionaries load per language instead of shipping all of them. The
// visitor's own language is fetched before the first paint, so a /es/ entry page
// renders in Spanish straight away rather than flashing English. English needs
// no fetch at all, and a failed fetch still mounts (curated strings render).
ensureLanguageLoaded(detectInitialLanguage()).finally(mount);

// Register Service Worker for PWA, only in production
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    // Clean up any foreign/third-party service workers that earlier bad
    // deployments may have left registered on visitors' devices (e.g. a
    // Monetag push SW that kept serving pop-ads after the code was fixed).
    // Anything whose script is not our own /sw.js gets unregistered, then
    // the current Workbox SW takes over.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          const scriptUrl =
            reg.active?.scriptURL ?? reg.installing?.scriptURL ?? "";
          try {
            const url = new URL(scriptUrl, window.location.origin);
            if (
              url.origin !== window.location.origin ||
              url.pathname !== "/sw.js"
            ) {
              reg.unregister().catch(() => {});
            }
          } catch {
            reg.unregister().catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Service worker registration failed, app still works without offline support
        });
      });
  });
}
