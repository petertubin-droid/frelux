import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { handleChunkLoadError, isChunkLoadError } from "@/lib/chunk-reload";

/**
 * Lazy-load wrapper that catches dynamic import errors, attempts a safe page
 * reload if stale chunk hashes are detected, or retries transient network errors.
 */
export function lazyWithRetry<
  P = Record<string, unknown>,
  T extends ComponentType<P> = ComponentType<P>,
>(
  factory: () => Promise<{ default: T }>,
  componentName = "component",
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error)) {
        if (handleChunkLoadError(error)) {
          // Returning an unsettled promise keeps the UI in Suspense fallback
          // until the page reload completes, avoiding uncaught error boundary trips.
          return new Promise<{ default: T }>(() => {});
        }
      }

      // Retry once after a brief delay for transient network blips
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return await factory();
      } catch (retryError) {
        if (isChunkLoadError(retryError)) {
          handleChunkLoadError(retryError);
        }
        if (import.meta.env.DEV) {
          console.error(
            `[lazyWithRetry] Failed to load component: ${componentName}`,
            retryError,
          );
        }
        throw retryError;
      }
    }
  });
}
