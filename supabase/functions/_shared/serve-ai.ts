// =========================================================
// serve-ai — the AI edge boundary.
//
// Every user-facing AI function is wrapped here instead of
// serveWithCors directly, so the paid-subscription-or-purchased-credit
// rule is applied once and cannot drift per function.
//
// Order of work:
//   1. CORS/preflight (serveWithCors).
//   2. Paywall: subscriber, admin, or one PURCHASED AI credit.
//   3. On a 5xx response or a thrown error the purchased credit is
//      refunded, so a provider failure never bills the buyer.
// =========================================================
import { serveWithCors } from "./serve.ts";
import { requirePaidAiAccess } from "./paid-ai-guard.ts";

type Handler = (req: Request) => Response | Promise<Response>;

export function serveAi(handler: Handler, featureKey?: string): unknown {
  return serveWithCors(async (req: Request): Promise<Response> => {
    const gate = await requirePaidAiAccess(req, {
      consumePurchased: true,
      featureKey,
    });

    if (!gate.ok) return gate.response;

    try {
      const response = await handler(req);
      if (response.status >= 500 && gate.release) await gate.release();
      return response;
    } catch (error) {
      if (gate.release) await gate.release();
      throw error;
    }
  });
}
