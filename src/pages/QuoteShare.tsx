/**
 * A shared quotation, opened by a client through its link.
 *
 * The page renders the snapshot exactly as it was shared, so a later edit in the
 * studio cannot change what the recipient was sent. It is deliberately not
 * indexed: a quotation belongs to one client, not to search results.
 *
 * Both quote types render here. A market survey shows blank rate and amount
 * columns, or the rates collected so far, and never a commercial mark-up.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Container from "@/components/ui/Container";
import { formatByCode } from "@/lib/international/currency-format";
import { useSeo } from "@/lib/seo";
import { buildBoqPdf } from "@/lib/boq/pdf";
import { openBoqPrint } from "@/lib/boq/print";
import { fetchQuoteShare } from "@/lib/boq/share-queries";
import {
  quoteShareFilename,
  quoteShareHeading,
  type QuoteShareSnapshot,
} from "@/lib/boq/share";
import { saveSealedPdf } from "@/lib/pdf-seal";

const CARD = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

export default function QuoteShare() {
  const { token } = useParams<{ token: string }>();
  const [snapshot, setSnapshot] = useState<QuoteShareSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({
    title: "Shared quotation",
    description:
      "A quotation shared from FRELUX. Open the link to review the measured items, quantities and totals.",
    noIndex: true,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const { snapshot: data, error: err } = await fetchQuoteShare(token);
      if (cancelled) return;
      setSnapshot(data);
      setError(err);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const currency = snapshot?.document.currency ?? "NGN";
  const money = useCallback(
    (value: number) => formatByCode(value || 0, currency, { decimals: 2 }),
    [currency],
  );

  const isSurvey = snapshot?.mode === "market_survey";

  const items = useMemo(
    () =>
      snapshot
        ? snapshot.standard.sections.flatMap((section) =>
            section.subSections.flatMap((sub) =>
              sub.items.map((item) => ({ section, item })),
            ),
          )
        : [],
    [snapshot],
  );

  const downloadPdf = async () => {
    if (!snapshot) return;
    setBusy(true);
    try {
      const pdf = await buildBoqPdf(snapshot.standard, snapshot.document);
      await saveSealedPdf(pdf, quoteShareFilename(snapshot.document, "pdf"), {
        title: `${quoteShareHeading(snapshot.mode)} ${snapshot.document.reference}`,
        subject: `Revision ${snapshot.document.revision}`,
        reference: snapshot.document.reference,
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="py-24 text-center text-sm text-slate-500">
          Opening the quotation…
        </div>
      </Container>
    );
  }

  if (!snapshot) {
    return (
      <Container>
        <div className="py-24 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            This quotation is not available
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            The link may have been revoked or expired. Ask the sender for a
            current link.
          </p>
          {error && <p className="mt-3 text-xs text-slate-400">{error}</p>}
        </div>
      </Container>
    );
  }

  const doc = snapshot.document;
  const summary = snapshot.standard.summary;
  const summaryRows: Array<[string, number, boolean]> = isSurvey
    ? [
        [
          "Market total, rates captured in market",
          summary.measuredWorksTotal,
          true,
        ],
      ]
    : [
        ["Measured works", summary.measuredWorksTotal, false],
        ["Preliminaries", summary.preliminariesAmount, false],
        ["Overhead and profit", summary.overheadProfitAmount, false],
        ["Contingency", summary.contingencyAmount, false],
        ["Subtotal before tax", summary.subtotalBeforeTax, false],
        [summary.taxCategory, summary.taxAmount, false],
        ["Gross total", summary.grossTotal, true],
        ["Retention", summary.retentionAmount, false],
        ["Net payable", summary.netPayableTotal, true],
      ];

  return (
    <Container>
      <div className="mx-auto max-w-5xl py-8">
        <div className={CARD}>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-4">
            <img
              src="/brand/frelux-mark.svg"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-sm font-extrabold tracking-tight text-brand-purple">
              FRELUX
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/70">
              Smart Calc
            </span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">
                {quoteShareHeading(snapshot.mode)}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">
                {doc.title || "Untitled project"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {doc.reference || "No reference"} · Revision {doc.revision} ·{" "}
                {doc.currency}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={busy}
                className="h-9 rounded-lg bg-brand-purple px-3 text-xs font-semibold text-white transition hover:bg-brand-purple/90 disabled:opacity-60"
              >
                {busy ? "Preparing…" : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => openBoqPrint(snapshot.standard, doc)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Print
              </button>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Client
              </dt>
              <dd className="text-slate-900">{doc.client.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Contractor
              </dt>
              <dd className="text-slate-900">{doc.contractor.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Prepared
              </dt>
              <dd className="text-slate-900">{doc.prepared_date || "-"}</dd>
            </div>
            {isSurvey && (
              <>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Market
                  </dt>
                  <dd className="text-slate-900">
                    {doc.survey?.market_city || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Survey date
                  </dt>
                  <dd className="text-slate-900">
                    {doc.survey?.survey_date || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Rates captured
                  </dt>
                  <dd className="text-slate-900">
                    {snapshot.survey.priced_lines} of {snapshot.survey.lines}{" "}
                    lines
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className={`${CARD} mt-4`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.standard.sections.map((section) => (
                  <Fragment key={`sec-${section.code}`}>
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
                      >
                        {section.code} {section.title}
                      </td>
                    </tr>
                    {section.subSections.flatMap((sub) =>
                      sub.items.map((item) => (
                        <tr
                          key={`${section.code}-${item.itemNumber}`}
                          className="border-b border-slate-100"
                        >
                          <td className="px-2 py-2 text-slate-500">
                            {item.itemNumber}
                          </td>
                          <td className="px-2 py-2 text-slate-900">
                            {item.description}
                            {item.specificationRef && (
                              <span className="block text-xs text-slate-500">
                                {item.specificationRef}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            {item.unit}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-900">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-900">
                            {isSurvey && !(item.unitRate > 0)
                              ? "TBC"
                              : money(item.unitRate)}
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-slate-900">
                            {isSurvey && !(item.totalCost > 0)
                              ? "TBC"
                              : money(item.totalCost)}
                          </td>
                        </tr>
                      )),
                    )}
                  </Fragment>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-6 text-center text-slate-500"
                    >
                      No measured items in this document.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ml-auto max-w-sm space-y-1 text-sm">
            {summaryRows.map(([label, value, strong]) => (
              <div
                key={label}
                className="flex justify-between border-b border-slate-100 py-1"
              >
                <span className={strong ? "font-semibold" : "text-slate-600"}>
                  {label}
                </span>
                <span
                  className={
                    strong
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-900"
                  }
                >
                  {money(value)}
                </span>
              </div>
            ))}
          </div>

          {isSurvey && (
            <p className="mt-3 text-xs text-slate-500">
              This is a market survey: measured quantities with rates to be
              completed in the market. No preliminaries, overhead, contingency,
              retention or tax are applied.
            </p>
          )}
        </div>

        {(doc.assumptions.length > 0 || doc.exclusions.length > 0) && (
          <div className={`${CARD} mt-4 text-sm`}>
            {doc.assumptions.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assumptions
                </h2>
                <ol className="mt-1 list-decimal pl-5 text-slate-700">
                  {doc.assumptions.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ol>
              </div>
            )}
            {doc.exclusions.length > 0 && (
              <div className="mt-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Exclusions
                </h2>
                <ol className="mt-1 list-decimal pl-5 text-slate-700">
                  {doc.exclusions.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Shared from FRELUX on {snapshot.shared_at.slice(0, 10)}. Prepared by{" "}
          {doc.prepared_by || "FRELUX"}.
        </p>
      </div>
    </Container>
  );
}
