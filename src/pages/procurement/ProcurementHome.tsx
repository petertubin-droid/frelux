/**
 * Buyer: material requests list and order tracking.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Plus,
  ClipboardList,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import {
  fetchMyRequests,
  fetchOrders,
  confirmDelivery,
  orderStatusLabel,
  requestStatusLabel,
} from "@/lib/suppliers/procurement";
import type { MaterialOrder, MaterialRequest } from "@/lib/suppliers/types";

export default function ProcurementHome() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useSeo({
    title: "Material requests and order tracking",
    description:
      "Post a material request, collect supplier quotations, compare them like for like, award an order and confirm delivery on FRELUX.",
    canonicalPath: "/procurement",
  });

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    const [requestResult, orderResult] = await Promise.all([
      fetchMyRequests(userId),
      fetchOrders(userId, "buyer"),
    ]);
    setRequests(requestResult.requests);
    setOrders(orderResult.orders);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load(user.id);
    else setLoading(false);
  }, [user, load]);

  const confirm = async (orderId: string) => {
    setBusy(orderId);
    setError(null);
    const { error: confirmError } = await confirmDelivery(orderId);
    setBusy(null);
    if (confirmError) setError(confirmError);
    else {
      setNotice("Delivery confirmed. The order is now complete.");
      if (user) load(user.id);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your requests…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Material requests
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to post a request and collect quotations from suppliers in
          your market.
        </p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Material requests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ask several suppliers for the same list, then compare their
            quotations line by line.
          </p>
        </div>
        <Link to="/procurement/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New request
          </Button>
        </Link>
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

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList className="h-4 w-4" /> Your requests
        </h2>
        {requests.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No requests yet. Post one and it becomes visible to suppliers in
            that market, who can send quotations.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/procurement/${request.id}`}
                      className="text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {request.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {request.reference} ·{" "}
                      {[request.neighbourhood, request.city]
                        .filter(Boolean)
                        .join(", ") || request.market_code}{" "}
                      ·{" "}
                      {request.needed_by
                        ? `needed by ${request.needed_by}`
                        : "date flexible"}
                    </p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                    {requestStatusLabel(request.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Truck className="h-4 w-4" /> Orders
        </h2>
        {orders.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No orders yet. Awarding a quotation creates the order here, with its
            delivery record.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {order.reference}
                    </p>
                    <p className="text-xs text-slate-500">
                      {orderStatusLabel(order.status)} ·{" "}
                      {formatByCode(order.total, order.currency)} · payment{" "}
                      {order.payment_status}
                    </p>
                    {order.delivered_at ? (
                      <p className="text-[11px] text-slate-500">
                        Delivered{" "}
                        {new Date(order.delivered_at).toLocaleDateString()}
                        {order.delivery_confirmed_by
                          ? " and confirmed by you"
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {["dispatched", "delivered"].includes(order.status) ? (
                      <Button
                        size="sm"
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
                    <Link
                      to={`/procurement/${order.request_id}`}
                      className="text-xs text-sky-700 hover:underline"
                    >
                      View request
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
