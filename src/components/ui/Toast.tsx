import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

type ToastType = "success" | "warning" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: {
    type?: ToastType;
    variant?: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
};

const iconColors: Record<ToastType, string> = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
  info: "text-blue-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type: typeArg,
      variant,
      title,
      message,
      duration = 4000,
    }: {
      type?: ToastType;
      variant?: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }) => {
      const type = typeArg ?? variant ?? "info";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
    },
    [remove],
  );

  // STABLE CONTEXT IDENTITY (bug fix 2026-09-11): the value
  // object was rebuilt with fresh closures on every render, so
  // every consumer that puts success/error in a useCallback or
  // useEffect dependency list got a new function every time a
  // toast appeared or auto-dismissed. DeveloperPortal, for
  // example, recreated its load() on every toast change and
  // its load effect refired — showing a toast triggered a
  // full API reload, and the transient busy state disabled
  // buttons mid-click (a CI-only test flake with the same
  // root cause). Memoizing the helpers makes the context
  // value referentially stable across toast state changes.
  const success = useCallback(
    (title: string, message?: string) =>
      toast({ type: "success", title, message }),
    [toast],
  );
  const warning = useCallback(
    (title: string, message?: string) =>
      toast({ type: "warning", title, message }),
    [toast],
  );
  const error = useCallback(
    (title: string, message?: string) =>
      toast({ type: "error", title, message }),
    [toast],
  );
  const info = useCallback(
    (title: string, message?: string) => toast({ type: "info", title, message }),
    [toast],
  );
  const value: ToastContextValue = useMemo(
    () => ({ toast, success, warning, error, info }),
    [toast, success, warning, error, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:top-6 sm:items-end sm:px-6">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={classNames(
                "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 shadow-lg animate-toast-in",
                styles[t.type],
              )}
              role="alert"
            >
              <Icon
                className={classNames(
                  "mt-0.5 h-5 w-5 shrink-0",
                  iconColors[t.type],
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && (
                  <p className="mt-0.5 text-xs opacity-80">{t.message}</p>
                )}
              </div>
              <Button variant="ghost"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </Button>
              {/* Auto-dismiss progress bar */}
              {t.duration > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
                  style={{
                    animation: `toast-progress ${t.duration}ms linear forwards`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
