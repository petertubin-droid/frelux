import { useEffect, useRef } from "react";
import {
  loadTurnstile,
  TURNSTILE_SITE_KEY,
  turnstileConfigured,
  type TurnstileApi,
} from "@/lib/turnstile";

type TurnstileWidgetProps = {
  /** Fixed action name, checked server-side against the token. */
  action: string;
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

/**
 * Renders the Turnstile widget for one form. Mount it with a
 * changing `key` to get a fresh challenge after a failed submit.
 * Renders nothing when no site key is configured.
 */
export function TurnstileWidget({
  action,
  onToken,
  theme = "auto",
  className,
}: TurnstileWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  // Keep the latest callback without re-rendering the widget.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileConfigured) {
      onTokenRef.current(null);
      return;
    }
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        apiRef.current = api;
        widgetId.current = api.render(hostRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme,
          appearance: "always",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      const api = apiRef.current;
      if (api && widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          // The widget is already gone; nothing to clean up.
        }
      }
      widgetId.current = null;
      apiRef.current = null;
    };
  }, [action, theme]);

  if (!turnstileConfigured) return null;

  return (
    <div
      ref={hostRef}
      className={className}
      data-turnstile-action={action}
      // The widget owns its own accessible labelling.
      aria-live="polite"
    />
  );
}
