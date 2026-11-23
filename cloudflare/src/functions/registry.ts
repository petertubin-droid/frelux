/**
 * Functions that run inside the Worker instead of proxying to Supabase.
 *
 * The gateway checks this registry first and only falls back to the Supabase
 * proxy for names that are not here, so a port can be rolled back by deleting
 * one line. Wave 1 is the public, stateless surface; webhooks move last,
 * after each provider URL is repointed deliberately.
 */
import type { ApiEnv } from "../api";
import { health } from "./health";
import { verifyCopyGet } from "./verify-copy-get";
import { priceIndexApi } from "./price-index-api";
import { turnstileVerify } from "./turnstile-verify";

export type NativeHandler = (
  request: Request,
  env: ApiEnv,
  url: URL,
  cors: Record<string, string>,
) => Promise<Response> | Response;

export const NATIVE_FUNCTIONS: Record<string, NativeHandler> = {
  health,
  "verify-copy-get": verifyCopyGet,
  "price-index-api": priceIndexApi,
  "turnstile-verify": turnstileVerify,
};
