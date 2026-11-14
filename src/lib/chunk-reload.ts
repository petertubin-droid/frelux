/**
 * Vite & SPA Dynamic Chunk Loading Error Handler.
 *
 * When a fresh deployment replaces hashed asset files on the server, existing
 * browser tabs or cached HTML can request outdated chunks (e.g.
 * "Failed to fetch dynamically imported module: .../assets/SupportChatWidget-B4cSLKGB.js").
 *
 * This module detects dynamic import failures and triggers a clean, controlled
 * page reload to fetch the latest HTML and bundle hashes. It enforces a strict
 * cooldown via sessionStorage to prevent reload loops if network connectivity
 * fails or an asset is genuinely unreachable.
 */

export const CHUNK_RELOAD_KEY = "frelux_chunk_reload_ts";
export const RELOAD_COOLDOWN_MS = 20_000; // 20-second cooldown

/**
 * Checks whether an error or error message is caused by a missing/stale JS/CSS chunk
 * or a failed dynamic module import.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as Record<string, unknown>).message === "string"
          ? String((error as Record<string, unknown>).message)
          : String(error);

  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch dynamically imported module") ||
    lower.includes("error loading dynamically imported module") ||
    lower.includes("importing a module script failed") ||
    lower.includes("unable to preload css") ||
    lower.includes("loading chunk") ||
    lower.includes("chunkloaderror") ||
    lower.includes("failed to load module script")
  );
}

/**
 * Handles a chunk load error by reloading the page once within the cooldown window.
 * Returns true if a reload was initiated, false otherwise (e.g. within cooldown or not a chunk error).
 */
export function handleChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;

  try {
    if (typeof window === "undefined" || !window.location) return false;

    const now = Date.now();
    const lastReload = parseInt(
      sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0",
      10,
    );

    if (now - lastReload > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // sessionStorage might throw in strict private modes; do not throw
  }

  return false;
}

let installed = false;
let cleanupFn: (() => void) | null = null;

/**
 * Installs global window event listeners for Vite chunk preload errors,
 * script loading errors, and unhandled dynamic import promise rejections.
 */
export function installChunkReloadHandler(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  if (installed && cleanupFn) {
    return cleanupFn;
  }
  installed = true;

  // 1. Vite's native preload error event
  const onPreloadError = (event: Event) => {
    const payload =
      (event as CustomEvent)?.detail ||
      (event as unknown as { payload?: unknown })?.payload ||
      event;
    handleChunkLoadError(payload);
  };
  window.addEventListener("vite:preloadError", onPreloadError);

  // 2. Global runtime error listener for script tags / dynamic imports
  const onError = (event: ErrorEvent) => {
    if (isChunkLoadError(event.error || event.message)) {
      if (handleChunkLoadError(event.error || event.message)) {
        event.preventDefault();
      }
    }
  };
  window.addEventListener("error", onError);

  // 3. Unhandled promise rejections (often thrown by import())
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isChunkLoadError(event.reason)) {
      if (handleChunkLoadError(event.reason)) {
        event.preventDefault();
      }
    }
  };
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  cleanupFn = () => {
    window.removeEventListener("vite:preloadError", onPreloadError);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    installed = false;
    cleanupFn = null;
  };

  return cleanupFn;
}
