/**
 * Finishes a print-pass payment after the gateway redirects back.
 *
 * The checkout functions send the browser to `/document-studio?print=verify&gw=…&doc=…`,
 * and the gateway appends its own reference (Paystack `reference`, Flutterwave
 * `tx_ref`, NOWPayments `orderId`/`invoice_id`). Nothing is unlocked by the
 * return itself: this component hands the reference to document-print-pass,
 * which asks the gateway whether the money actually arrived. A forged return
 * URL therefore issues nothing.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  purchasePrintPass,
  readPrintReturn,
} from "@/lib/documents/document-access";

export default function PrintReturnHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname !== "/document-studio") return;
    const parsed = readPrintReturn(location.search);
    if (!parsed) return;
    // StrictMode runs effects twice; one verification per return URL is enough
    // and a second attempt would be rejected as a reused reference anyway.
    const key = `${parsed.gateway}:${parsed.documentId}:${parsed.reference}`;
    if (handled.current === key) return;
    handled.current = key;

    let active = true;
    (async () => {
      const result = await purchasePrintPass({
        documentId: parsed.documentId,
        gateway: parsed.gateway,
        reference: parsed.reference,
      });
      if (!active) return;
      if (result.ok) {
        toast.success("Payment confirmed. This document can be printed.");
      } else {
        toast.error(result.error);
      }
      // Drop the payment parameters so a refresh cannot replay them.
      navigate("/document-studio", { replace: true });
    })();

    return () => {
      active = false;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
}
