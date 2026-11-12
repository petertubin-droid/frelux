import { useCallback, useState } from "react";
import {
  turnstileConfigured,
  turnstileErrorMessage,
  verifyTurnstileToken,
  type TurnstileCheck,
} from "@/lib/turnstile";

/**
 * One bot check per form. `gate()` must be awaited immediately
 * before the request it protects: the widget token is single-use.
 * A failed check clears the token and remounts the challenge
 * through `attempt`, so the visitor can simply solve it again.
 */
export function useTurnstileGate(action: string) {
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reset = useCallback(() => {
    setToken(null);
    setAttempt((n) => n + 1);
  }, []);

  const gate = useCallback(async (): Promise<TurnstileCheck> => {
    if (!turnstileConfigured) return { ok: true, reason: "not-configured" };
    const verdict = await verifyTurnstileToken(token, action);
    if (!verdict.ok) reset();
    return verdict;
  }, [action, token, reset]);

  return {
    token,
    setToken,
    gate,
    reset,
    attempt,
    required: turnstileConfigured,
    errorMessage: turnstileErrorMessage,
  };
}
