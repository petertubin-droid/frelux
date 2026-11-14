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
import { DisplayPreferencesProvider } from "@/lib/display-preferences";
import { Toaster } from "@/components/ui/shadcn/toast";
import { initErrorMonitor } from "@/lib/errorMonitor";
import { installChunkReloadHandler } from "@/lib/chunk-reload";

// Catch stale chunk 404s after fresh deployment and reload cleanly once
installChunkReloadHandler();
import { shouldUnregisterWorker } from "@/lib/sw-cleanup";
import "./index.css";

// Initialize FRELUX error monitoring, global error listeners
initErrorMonitor();

// Field performance: sampled, and loaded after the shell so it never competes
// with first paint for a request.
if (import.meta.env.PROD) {
  void import("@/lib/perf/vitals").then((m) => m.installVitalsReporter());
}

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <DisplayPreferencesProvider>
              <AccessibilityProvider>
                <BrandingProvider>
                  <App />
                  <Toaster />
                </BrandingProvider>
              </AccessibilityProvider>
            </DisplayPreferencesProvider>
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
    // Reap service workers this app no longer uses. Browsers keep them alive
    // long after the registering code is gone, and a stale ad-network worker
    // keeps serving its old zone on a device that has moved on. Our own
    // /app-sw.js and /sw-push.js, and the ad network's /sw.js, are kept;
    // anything else goes, which is what removes a superseded worker.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          const scriptUrl =
            reg.active?.scriptURL ?? reg.installing?.scriptURL ?? "";
          if (shouldUnregisterWorker(scriptUrl, window.location.origin)) {
            reg.unregister().catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        navigator.serviceWorker.register("/app-sw.js").catch(() => {
          // Service worker registration failed, app still works without offline support
        });
      });
  });
}
