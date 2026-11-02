/**
 * Buyer: one request, its quotations, and the order it creates.
 *
 * Quotations are listed with the notes that matter for a fair comparison -
 * currency, line shape, validity - and awarding is server-side so the order
 * total comes from the stored quotation, not from the page.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import {
  awardQuote,
  confirmDelivery,
  fetchOrderEvents,
  fetchOrders,
  fetchRequest,
  orderStatusLabel,
  requestStatusLabel,
  openDispute,
} from "@/lib/suppliers/procurement";
import { quoteComparisonNote } from "@/lib/suppliers/comparison";
import { publicBadge } from "@/lib/suppliers/verification";
import type {
  MaterialOrder,
  MaterialOrderEvent,
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestQuote,
} from "@/lib/suppliers/types";

type QuoteRow = MaterialRequestQuote & {
  supplier_profiles: Record<string, unknown> | null;
};

export default function ProcurementRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [items, setItems] = useState<MaterialRequestItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [events, setEvents] = useState<MaterialOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [disputeText, setDisputeText] = useState("");

  useSeo(
    request
      ? {
          title: `${request.title} · material request ${request.reference}`,
          description:
            "Compare supplier quotations line by line and award the material request.",
          canonicalPath: `/procurement/${request.id}`,
          noIndex: true,
        }
      : null,
  );

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [detail, orderResult] = await Promise.all([
      fetchRequest(id),
      fetchOrders(user.id, "buyer"),
    ]);
    setRequest(detail.request);
    setItems(detail.items);
    setQuotes(detail.quotes as QuoteRow[]);
    const related = orderResult.orders.filter(
      (order) => order.request_id === id,
    );
    setOrders(related);
    if (related[0]) {
      const { events: orderEvents } = await fetchOrderEvents(related[0].id);
      setEvents(orderEvents);
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const award = async (quoteId: string) => {
    if (!id) return;
    setBusy(quoteId);
    setError(null);
    const { error: awardError } = await awardQuote(id, quoteId);
    setBusy(null);
    if (awardError) setError(awardError);
    else {
      setNotice(
        "Quotation accepted. The order has been created and the other quotations declined.",
      );
      load();
    }
  };

  const confirm = async (orderId: string) => {
    setBusy(orderId);
    const { error: confirmError } = await confirmDelivery(orderId);
    setBusy(null);
    if (confirmError) setError(confirmError);
    else {
      setNotice("Delivery confirmed.");
      load();
    }
  };

  const dispute = async (orderId: string) => {
    setBusy(orderId);
    const { error: disputeError } = await openDispute(orderId, disputeText);
    setBusy(null);
    if (disputeError) setError(disputeError);
    else {
      setNotice("Dispute recorded and sent for review.");
      setDisputeText("");
      load();
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading request…
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Request not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          It may belong to another buyer, or the link is wrong.
        </p>
        <Link to="/procurement" className="mt-4 inline-block">
          <Button variant="outline">Back to requests</Button>
        </Link>
      </div>
    );
  }

  const isBuyer = user?.id === request.buyer_id;
  const comparisonNotes = quoteComparisonNote(
    quotes.map((quote) => ({
      supplier_id: quote.supplier_id,
      total: Number(quote.total),
      currency: quote.currency,
      lead_time_days: quote.lead_time_days,
      valid_until: quote.valid_until,
      lines: (quote.lines ?? []).map((line) => ({
        description: line.description,
        unit: line.unit,
        quantity: line.quantity,
      })),
    })),
  );
  const order = orders[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/procurement"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {request.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {request.reference} ·{" "}
            {[request.neighbourhood, request.city].filter(Boolean).join(", ") ||
              request.market_code}{" "}
            ·{" "}
            {request.needed_by
              ? `needed by ${request.needed_by}`
              : "date flexible"}
          </p>
          {request.notes ? (
            <p className="mt-1 text-sm text-slate-600">{request.notes}</p>
          ) : null}
        </div>
        <Badge variant="secondary">{requestStatusLabel(request.status)}</Badge>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Requested materials
        </h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-2"
            >
              <span className="text-slate-700">
                {item.product_name}
                {item.specification ? (
                  <span className="text-slate-400">
                    {" "}
                    · {item.specification}
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-slate-500">
                {Number(item.quantity)} {item.unit}
                {item.target_price
                  ? ` · target ${formatByCode(item.target_price, request.currency)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {order ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Truck className="h-4 w-4" /> Order {order.reference}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {orderStatusLabel(order.status)} ·{" "}
            {formatByCode(order.total, order.currency)} (including{" "}
            {formatByCode(order.delivery_fee, order.currency)} delivery) ·
            payment {order.payment_status}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Payment is arranged directly with the supplier in this phase. FRELUX
            stores no card details; when card payments are enabled they will run
            through a payment provider that returns only a reference.
          </p>

          {["dispatched", "delivered"].includes(order.status) ? (
            <Button
              size="sm"
              className="mt-3"
              disabled={busy === order.id}
              onClick={() => confirm(order.id)}
            >
              {busy === order.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm delivery
            </Button>
          ) : null}

          {events.length > 0 ? (
            <ol className="mt-3 space-y-1 text-xs text-slate-600">
              {events.map((event) => (
                <li key={event.id}>
                  {new Date(event.created_at).toLocaleString()} ·{" "}
                  {orderStatusLabel(event.status)}
                  {event.note ? ` · ${event.note}` : ""}
                </li>
              ))}
            </ol>
          ) : null}

          {!["completed", "cancelled", "disputed"].includes(order.status) ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <textarea
                value={disputeText}
                onChange={(e) => setDisputeText(e.target.value)}
                rows={2}
                placeholder="Something wrong with this order? Describe it and FRELUX will review."
                className="w-full rounded-md border border-slate-200 p-2 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={disputeText.trim().length < 10 || busy === order.id}
                onClick={() => dispute(order.id)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> Record a problem
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Quotations ({quotes.length})
        </h2>
        {comparisonNotes.length > 0 ? (
          <ul className="mt-2 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {comparisonNotes.map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>
        ) : null}

        {quotes.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No quotations yet. Suppliers in this market can see the request and
            quote per line.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {quotes.map((quote) => {
              const supplier = quote.supplier_profiles ?? {};
              const badge = publicBadge(
                supplier.verification_level as string | undefined,
              );
              const accepted = quote.status === "accepted";
              return (
                <li
                  key={quote.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {String(supplier.company_name ?? "Supplier")}
                      </p>
                      <p className="text-xs text-slate-500">
                        <Badge variant="outline" className="mr-2 text-[10px]">
                          {badge.label}
                        </Badge>
                        {[supplier.neighbourhood, supplier.city]
                          .filter(Boolean)
                          .join(", ")}
                        {quote.lead_time_days !== null
                          ? ` · ${quote.lead_time_days} day lead time`
                          : ""}
                        {quote.valid_until
                          ? ` · valid to ${quote.valid_until}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-slate-900">
                        {formatByCode(quote.total, quote.currency)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatByCode(quote.subtotal, quote.currency)} +{" "}
                        {formatByCode(quote.delivery_fee, quote.currency)}{" "}
                        delivery
                      </p>
                    </div>
                  </div>

                  <table className="mt-3 w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1 font-medium">Line</th>
                        <th className="pb-1 text-right font-medium">Qty</th>
                        <th className="pb-1 text-right font-medium">Rate</th>
                        <th className="pb-1 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(quote.lines ?? []).map((line, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="py-1 text-slate-700">
                            {line.description}
                            <span className="text-slate-400">
                              {" "}
                              · {line.unit}
                            </span>
                          </td>
                          <td className="py-1 text-right">{line.quantity}</td>
                          <td className="py-1 text-right">
                            {formatByCode(line.unit_rate, quote.currency)}
                          </td>
                          <td className="py-1 text-right">
                            {formatByCode(
                              line.quantity * line.unit_rate,
                              quote.currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {quote.notes ? (
                    <p className="mt-2 text-xs text-slate-600">{quote.notes}</p>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2">
                    {accepted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                      </span>
                    ) : isBuyer &&
                      request.status !== "awarded" &&
                      quote.status === "submitted" ? (
                      <Button
                        size="sm"
                        disabled={busy === quote.id}
                        onClick={() => award(quote.id)}
                      >
                        {busy === quote.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Accept quotation
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {quote.status}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
