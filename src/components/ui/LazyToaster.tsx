/**
 * The toast host, loaded after first paint.
 *
 * Sonner is a 52 KB module that draws nothing until something is toasted, yet
 * it sat in the entry chunk and every visitor downloaded it before the page
 * could paint. Mounting it on the first idle slot keeps toasts working while
 * keeping the module off the critical path.
 */
import { Suspense, lazy, useEffect, useState } from "react";

const Toaster = lazy(() =>
  import("./shadcn/toast").then((mod) => ({ default: mod.Toaster })),
);

export function LazyToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const kick = () => setReady(true);
    const idle = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      }
    ).requestIdleCallback;
    if (typeof idle === "function") {
      const handle = idle(kick, { timeout: 1500 });
      return () =>
        (
          window as Window & { cancelIdleCallback?: (h: number) => void }
        ).cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(kick, 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}
