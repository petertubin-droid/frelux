import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Printer,
  Download,
  MoreHorizontal,
  Trash2,
  Share2,
  Copy,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { formatByCode } from "@/lib/international/currency-format";
import { downloadCsv } from "@/lib/export-utils";
import { getSafeError } from "@/lib/safeError";
import { useLanguage } from "@/lib/i18n";
import { invoiceTotals } from "@/lib/project-money";
import {
  createProjectInvoice,
  createProjectPayment,
  deleteProjectInvoice,
  deleteProjectPayment,
  fetchProjectInvoices,
  fetchProjectPayments,
  updateProjectInvoice,
} from "@/lib/contractor";
import { summariseLedger } from "@/lib/project-ledger";
import {
  LEDGER_CSV_COLUMNS,
  buildReceiptHtml,
  buildRecordsPackHtml,
  buildStatementText,
  ledgerCsvRows,
} from "@/lib/project-money-documents";
import type {
  DbProjectExpense,
  DbProjectInvoice,
  DbProjectPayment,
  ProjectPaymentMethod,
} from "@/types/database";
import { InvoiceWizard } from "@/components/contractor/InvoiceWizard";

export interface MoneyTabProps {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  currency: string;
  expenses: DbProjectExpense[];
}

const today = () => new Date().toISOString().slice(0, 10);

const METHODS: { value: ProjectPaymentMethod; label: string }[] = [
  { value: "transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  part_paid:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  unpaid: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  part_paid: "Part paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

const emptyInvoiceForm = () => ({
  title: "",
  subtotal: "",
  taxRate: "",
  issued_at: today(),
  due_at: "",
  notes: "",
  draft: false,
});

const emptyPaymentForm = () => ({
  invoiceId: "",
  amount: "",
  method: "transfer" as ProjectPaymentMethod,
  paid_at: today(),
  reference: "",
  notes: "",
});

function openPrintable(html: string, title: string) {
  const win = window.open("", "_blank", "width=520,height=720");
  if (!win) throw new Error("Allow pop-ups to print this document");
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  win.focus();
  win.print();
}

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function MoneyTab(props: MoneyTabProps) {
  const { t: tr } = useLanguage();
  const { projectId, currency, expenses } = props;

  const [invoices, setInvoices] = useState<DbProjectInvoice[]>([]);
  const [payments, setPayments] = useState<DbProjectPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "invoice" | "payment";
    id: string;
    label: string;
  } | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const invoiceTitleRef = useRef<HTMLInputElement | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const money = useCallback(
    (value: number) => {
      try {
        return formatByCode(value || 0, currency || "XXX", { decimals: 0 });
      } catch {
        return `${currency} ${(value || 0).toLocaleString()}`;
      }
    },
    [currency],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextInvoices, nextPayments] = await Promise.all([
        fetchProjectInvoices(projectId),
        fetchProjectPayments(projectId),
      ]);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setError(null);
    } catch (err) {
      setError(getSafeError(err, "Could not load invoices and payments."));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () =>
      summariseLedger({
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          issued_at: invoice.issued_at,
          due_at: invoice.due_at,
          currency: invoice.currency,
          total: Number(invoice.total),
          status: invoice.status,
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          invoice_id: payment.invoice_id,
          amount: Number(payment.amount),
          currency: payment.currency,
          paid_at: payment.paid_at,
        })),
        expenses: expenses.map((expense) => ({
          amount: Number(expense.amount),
          currency: expense.currency,
          receipt_path: expense.receipt_path,
          receipt_url: expense.receipt_url,
        })),
        currency,
      }),
    [invoices, payments, expenses, currency],
  );

  const invoiceNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const invoice of invoices) map.set(invoice.id, invoice.number);
    return map;
  }, [invoices]);

  const subtotalValue = Number(invoiceForm.subtotal) || 0;
  const taxRateValue = Number(invoiceForm.taxRate) || 0;
  const { taxAmount, total: invoiceTotal } = invoiceTotals(
    subtotalValue,
    taxRateValue,
  );

  const handleInvoiceSubmit = async () => {
    if (subtotalValue <= 0) {
      setError("Enter the amount you are billing before saving.");
      subtotalRef.current?.focus();
      return;
    }
    if (invoiceForm.due_at && invoiceForm.due_at < invoiceForm.issued_at) {
      setError("The due date cannot fall before the issue date.");
      return;
    }
    setBusy(true);
    try {
      await createProjectInvoice(projectId, currency, {
        title: invoiceForm.title.trim() || null,
        issued_at: invoiceForm.issued_at,
        due_at: invoiceForm.due_at || null,
        subtotal: subtotalValue,
        tax_rate: taxRateValue,
        tax_amount: taxAmount,
        total: invoiceTotal,
        status: invoiceForm.draft ? "draft" : "sent",
        notes: invoiceForm.notes.trim() || null,
      });
      setInvoiceForm(emptyInvoiceForm());
      setShowInvoiceForm(false);
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not raise the invoice."));
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentSubmit = async () => {
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter the amount received before saving.");
      amountRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await createProjectPayment(projectId, currency, {
        invoice_id: paymentForm.invoiceId || null,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || null,
        paid_at: paymentForm.paid_at,
        notes: paymentForm.notes.trim() || null,
      });
      setPaymentForm(emptyPaymentForm());
      setShowPaymentForm(false);
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not record the payment."));
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async (invoice: DbProjectInvoice) => {
    setBusy(true);
    try {
      await updateProjectInvoice(invoice.id, { status: "void" });
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not void the invoice."));
    } finally {
      setBusy(false);
    }
  };

  const handleSendInvoice = async (invoice: DbProjectInvoice) => {
    setBusy(true);
    setError(null);
    try {
      await updateProjectInvoice(invoice.id, { status: "sent" });
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not send the invoice."));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteInvoice = async (invoice: DbProjectInvoice) => {
    const attached = payments.filter((row) => row.invoice_id === invoice.id);
    if (attached.length > 0) {
      setPendingDelete(null);
      setError(
        tr(
          "This invoice has payments attached. Delete those payments first, so no money is re-pointed at another bill.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      await deleteProjectInvoice(invoice.id);
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not delete the invoice."));
    } finally {
      setPendingDelete(null);
      setBusy(false);
    }
  };

  const handleDeletePayment = async (payment: DbProjectPayment) => {
    setBusy(true);
    try {
      await deleteProjectPayment(payment.id);
      await load();
    } catch (err) {
      setError(getSafeError(err, "Could not delete the payment."));
    } finally {
      setPendingDelete(null);
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "invoice") {
      const record = invoices.find((row) => row.id === pendingDelete.id);
      if (record) void handleDeleteInvoice(record);
      return;
    }
    const record = payments.find((row) => row.id === pendingDelete.id);
    if (record) void handleDeletePayment(record);
  };

  const handleReceipt = (payment: DbProjectPayment) => {
    const balanceAfter = payment.invoice_id
      ? (summary.invoices.find((invoice) => invoice.id === payment.invoice_id)
          ?.balance ?? null)
      : summary.outstandingTotal;
    try {
      openPrintable(
        buildReceiptHtml({
          projectName: props.projectName,
          clientName: props.clientName,
          receiptNo: payment.receipt_no,
          amount: Number(payment.amount),
          currency: payment.currency,
          method: payment.method,
          reference: payment.reference,
          paidAt: payment.paid_at,
          invoiceNumber: payment.invoice_id
            ? (invoiceNumberById.get(payment.invoice_id) ?? null)
            : null,
          balanceAfter,
        }),
        `Receipt ${payment.receipt_no}`,
      );
    } catch (err) {
      setError(getSafeError(err, "Could not open the receipt."));
    }
  };

  const handleRecordsPack = () => {
    try {
      openPrintable(
        buildRecordsPackHtml({
          projectName: props.projectName,
          clientName: props.clientName,
          currency,
          summary,
          invoices: invoices.map((invoice) => ({
            number: invoice.number,
            issued_at: invoice.issued_at,
            due_at: invoice.due_at,
            total: Number(invoice.total),
            status: invoice.status,
          })),
          payments: payments.map((payment) => ({
            receipt_no: payment.receipt_no,
            paid_at: payment.paid_at,
            amount: Number(payment.amount),
            method: payment.method,
            reference: payment.reference,
          })),
          expenses: expenses.map((expense) => ({
            spent_at: expense.spent_at,
            category: expense.category,
            name: expense.name,
            amount: Number(expense.amount),
            receipt_name: expense.receipt_name,
          })),
        }),
        `${props.projectName} records`,
      );
    } catch (err) {
      setError(getSafeError(err, "Could not open the records pack."));
    }
  };

  const handleCsv = () => {
    const rows = ledgerCsvRows({
      currency,
      invoices: invoices.map((invoice) => ({
        number: invoice.number,
        issued_at: invoice.issued_at,
        total: Number(invoice.total),
      })),
      payments: payments.map((payment) => ({
        receipt_no: payment.receipt_no,
        paid_at: payment.paid_at,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
      })),
      expenses: expenses.map((expense) => ({
        spent_at: expense.spent_at,
        category: expense.category,
        name: expense.name,
        amount: Number(expense.amount),
      })),
    });
    downloadCsv(
      `${props.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-ledger.csv`,
      rows,
      LEDGER_CSV_COLUMNS,
    );
  };

  const statement = () =>
    buildStatementText({
      projectName: props.projectName,
      clientName: props.clientName,
      summary,
    });

  const handleCopyStatement = async () => {
    try {
      await navigator.clipboard.writeText(statement());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch (err) {
      setError(getSafeError(err, "Could not copy the statement."));
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(statement())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const unbilled = invoices
    .filter((row) => row.status === "draft" || row.status === "void")
    .slice()
    .sort((a, b) => b.number.localeCompare(a.number));

  const selectedOpen = paymentForm.invoiceId
    ? (summary.invoices.find((row) => row.id === paymentForm.invoiceId)
        ?.balance ?? 0)
    : 0;
  const paymentInput = Number(paymentForm.amount) || 0;
  const paymentApplied = paymentForm.invoiceId
    ? Math.min(selectedOpen, paymentInput)
    : paymentInput;
  const paymentCredit = Math.max(0, paymentInput - paymentApplied);

  const openInvoices = summary.invoices.filter(
    (invoice) => invoice.balance > 0,
  ).length;

  useEffect(() => {
    if (!showInvoiceForm) return;
    invoiceTitleRef.current?.focus();
  }, [showInvoiceForm]);

  useEffect(() => {
    if (!showMore) return;
    moreMenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !moreMenuRef.current?.contains(target) &&
        !moreButtonRef.current?.contains(target)
      ) {
        setShowMore(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showMore]);

  const cards: {
    label: string;
    value: string;
    tone?: string;
    hero?: boolean;
  }[] = [
    { label: "Billed", value: money(summary.invoicedTotal) },
    { label: "Received", value: money(summary.paidTotal) },
    {
      label: "Outstanding",
      value: money(summary.outstandingTotal),
      tone:
        summary.outstandingTotal > 0
          ? "text-amber-700 dark:text-amber-300"
          : "text-foreground",
      hero: true,
    },
    {
      label: "Overdue",
      value: money(summary.overdueTotal),
      tone:
        summary.overdueTotal > 0 ? "text-red-600 dark:text-red-400" : undefined,
    },
    { label: "Spent", value: money(summary.expenseTotal) },
    {
      label: "Cash after spend",
      value: money(summary.cashPosition),
      tone:
        summary.cashPosition < 0
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {tr("Invoices and payments")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Bill the client, record what arrives, keep the receipts.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="relative"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              setShowMore(false);
              moreButtonRef.current?.focus();
            }}
          >
            <Button
              ref={moreButtonRef}
              variant="outline"
              size="icon"
              aria-haspopup="menu"
              aria-expanded={showMore}
              aria-controls="money-more-menu"
              aria-label={tr("More money actions")}
              onClick={() => setShowMore((open) => !open)}
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </Button>
            {showMore && (
              <div
                ref={moreMenuRef}
                id="money-more-menu"
                role="menu"
                aria-label={tr("More money actions")}
                className="absolute right-0 z-30 mt-1 w-48 rounded-lg border bg-card p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled={loading || undefined}
                  onClick={() => {
                    if (loading) return;
                    setShowMore(false);
                    moreButtonRef.current?.focus();
                    handleRecordsPack();
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted ${loading ? "opacity-50" : ""}`}
                >
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  {tr("Records pack")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled={loading || undefined}
                  onClick={() => {
                    if (loading) return;
                    setShowMore(false);
                    moreButtonRef.current?.focus();
                    handleCsv();
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted ${loading ? "opacity-50" : ""}`}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  {tr("Export CSV")}
                </button>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowWizard((open) => !open);
              setShowInvoiceForm(false);
            }}
            aria-expanded={showWizard}
            aria-controls="invoice-wizard"
          >
            <FileText aria-hidden="true" className="h-4 w-4" />
            {showWizard ? tr("Close guided") : tr("Guided invoice")}
          </Button>
          <Button
            onClick={() => {
              setShowInvoiceForm((open) => !open);
              setShowWizard(false);
            }}
            aria-expanded={showInvoiceForm}
            aria-controls="invoice-form"
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {showInvoiceForm ? (
              <X aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Plus aria-hidden="true" className="h-4 w-4" />
            )}
            {showInvoiceForm ? tr("Close") : tr("Raise invoice")}
          </Button>
        </div>
      </div>

      {error && (
        <p
          id="money-tab-error"
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {pendingDelete && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          <p>
            {tr("Delete")} {pendingDelete.label}?{" "}
            {pendingDelete.kind === "invoice"
              ? tr(
                  "The invoice disappears from the ledger. This cannot be undone.",
                )
              : tr(
                  "The payment disappears and every balance changes. This cannot be undone.",
                )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy}
            >
              {tr("Yes, delete")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={busy}
            >
              {tr("Keep it")}
            </Button>
          </div>
        </div>
      )}

      {summary.currencyMismatch && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {tr(
            "Some records use another currency and were left out of these totals:",
          )}{" "}
          {summary.currencyMismatch.currencies.join(", ")}
        </p>
      )}

      <dl
        aria-live="polite"
        aria-label={tr("Project money at a glance")}
        className="grid gap-3 sm:grid-cols-3"
      >
        {cards.map((card) =>
          card.hero ? (
            <div
              key={card.label}
              className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-card p-4 shadow-sm sm:col-span-3 dark:border-violet-500/20 dark:from-violet-500/10"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr(card.label)}
              </dt>
              <dd
                className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${card.tone ?? "text-foreground"}`}
              >
                {card.value}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {openInvoices === 0
                  ? tr("Nothing awaiting payment")
                  : `${openInvoices} ${tr(openInvoices === 1 ? "invoice awaiting payment" : "invoices awaiting payment")}`}
              </p>
            </div>
          ) : (
            <div key={card.label} className="rounded-xl border bg-card p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr(card.label)}
              </dt>
              <dd
                className={`mt-1 text-base font-semibold tabular-nums ${card.tone ?? "text-foreground"}`}
              >
                {card.value}
              </dd>
            </div>
          ),
        )}
      </dl>

      {summary.credit > 0 && (
        <p className="rounded-lg border bg-card px-3 py-2 text-sm text-foreground">
          {tr("Credit held on this account after every invoice was settled:")}{" "}
          <strong>{money(summary.credit)}</strong>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyStatement}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          {tr("Copy statement")}
        </Button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? tr("Statement copied") : ""}
        </span>
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {tr("Send on WhatsApp")}
        </Button>
      </div>

      {showWizard && (
        <div id="invoice-wizard">
          <InvoiceWizard
            projectId={projectId}
            currency={currency}
            money={money}
            alreadyBilled={summary.invoicedTotal}
            onCreated={async () => {
              await load();
            }}
            onSwitchToForm={() => {
              setShowWizard(false);
              setShowInvoiceForm(true);
            }}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      )}

      {showInvoiceForm && (
        <div
          id="invoice-form"
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-title"
              >
                {tr("What is this invoice for")}
              </label>
              <input
                ref={invoiceTitleRef}
                id="invoice-title"
                type="text"
                value={invoiceForm.title}
                onChange={(event) =>
                  setInvoiceForm({ ...invoiceForm, title: event.target.value })
                }
                placeholder={tr("Stage 2, blockwork and plaster")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-subtotal"
              >
                {tr("Amount before tax")}
              </label>
              <input
                ref={subtotalRef}
                id="invoice-subtotal"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={invoiceForm.subtotal}
                aria-invalid={Boolean(error) && subtotalValue <= 0}
                aria-describedby={error ? "money-tab-error" : undefined}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    subtotal: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-tax"
              >
                {tr("Tax rate (%)")}
              </label>
              <input
                id="invoice-tax"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={invoiceForm.taxRate}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    taxRate: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-issued"
              >
                {tr("Issued")}
              </label>
              <input
                id="invoice-issued"
                type="date"
                value={invoiceForm.issued_at}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    issued_at: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-due"
              >
                {tr("Payment due")}
              </label>
              <input
                id="invoice-due"
                type="date"
                value={invoiceForm.due_at}
                onChange={(event) =>
                  setInvoiceForm({ ...invoiceForm, due_at: event.target.value })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="invoice-notes"
              >
                {tr("Notes")}
              </label>
              <input
                id="invoice-notes"
                type="text"
                value={invoiceForm.notes}
                onChange={(event) =>
                  setInvoiceForm({ ...invoiceForm, notes: event.target.value })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-foreground">
              {tr("Invoice total")}: <strong>{money(invoiceTotal)}</strong>
              {taxAmount > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({tr("tax")} {money(taxAmount)})
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={invoiceForm.draft}
                  onChange={(event) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      draft: event.target.checked,
                    })
                  }
                />
                {tr("Keep as draft")}
              </label>
              <Button
                onClick={handleInvoiceSubmit}
                disabled={busy}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                {tr("Save invoice")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">
            {tr("Invoices")}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPaymentForm((open) => !open)}
            aria-expanded={showPaymentForm}
            aria-controls="payment-form"
          >
            {showPaymentForm ? (
              <X aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Plus aria-hidden="true" className="h-4 w-4" />
            )}
            {showPaymentForm ? tr("Close") : tr("Record payment")}
          </Button>
        </div>

        {showPaymentForm && (
          <div
            id="payment-form"
            className="mt-4 rounded-lg border bg-background p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-invoice"
                >
                  {tr("Against invoice")}
                </label>
                <select
                  id="payment-invoice"
                  value={paymentForm.invoiceId}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      invoiceId: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">
                    {tr("Whole account, oldest bill first")}
                  </option>
                  {summary.invoices
                    .filter((invoice) => invoice.balance > 0)
                    .map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.number} · {money(invoice.balance)} {tr("open")}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-amount"
                >
                  {tr("Amount received")}
                </label>
                <input
                  ref={amountRef}
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={paymentForm.amount}
                  aria-invalid={
                    Boolean(error) && !(Number(paymentForm.amount) > 0)
                  }
                  aria-describedby={error ? "money-tab-error" : undefined}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
                {paymentInput > 0 && paymentForm.invoiceId && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tr("Applies to the bill")}: {money(paymentApplied)}
                    {paymentCredit > 0
                      ? ` · ${tr("Held as credit")}: ${money(paymentCredit)}`
                      : ""}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-method"
                >
                  {tr("Method")}
                </label>
                <select
                  id="payment-method"
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: event.target.value as ProjectPaymentMethod,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  {METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {tr(method.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-date"
                >
                  {tr("Received on")}
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={paymentForm.paid_at}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      paid_at: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-reference"
                >
                  {tr("Reference")}
                </label>
                <input
                  id="payment-reference"
                  type="text"
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: event.target.value,
                    })
                  }
                  placeholder={tr("Transfer narration or cheque number")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="payment-notes"
                >
                  {tr("Notes")}
                </label>
                <input
                  id="payment-notes"
                  type="text"
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handlePaymentSubmit}
                disabled={busy}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {tr("Save payment")}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-4 space-y-2">
            <span role="status" aria-live="polite" className="sr-only">
              {tr("Loading invoices")}
            </span>
            <div aria-hidden="true" className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-9 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        ) : summary.invoices.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed bg-card/60 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {tr("No invoice raised yet.")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr(
                "Raise the first one and every payment, balance and receipt follows from it.",
              )}
            </p>
            <Button
              onClick={() => {
                setShowWizard(true);
                setShowInvoiceForm(false);
              }}
              className="mt-4 min-h-11 bg-violet-600 text-white hover:bg-violet-700"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {tr("Raise the first invoice")}
            </Button>
          </div>
        ) : (
          <div
            role="region"
            aria-label={tr("Invoice list")}
            tabIndex={0}
            className="mt-4 overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">
                {tr(
                  "Invoices with amount billed, amount received, balance and status",
                )}
              </caption>
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-card pb-2 pr-3 font-medium"
                  >
                    {tr("Invoice")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    {tr("Issued")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    {tr("Due")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">
                    {tr("Total")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">
                    {tr("Paid")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">
                    {tr("Balance")}
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    {tr("Status")}
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    {tr("Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.invoices.map((invoice) => {
                  const record = invoices.find((row) => row.id === invoice.id);
                  return (
                    <tr key={invoice.id} className="border-b last:border-0">
                      <td className="sticky left-0 z-10 bg-card py-2 pr-3 font-medium text-foreground">
                        {invoice.number}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {record?.issued_at ?? ""}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {invoice.dueAt ?? tr("None")}
                        {invoice.daysOverdue > 0 && (
                          <span className="ml-1 text-xs text-red-600 dark:text-red-400">
                            {invoice.daysOverdue}d
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-foreground">
                        {money(invoice.total)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {money(invoice.paid)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold tabular-nums text-foreground">
                        {money(invoice.balance)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                        >
                          <span className="sr-only">{`${invoice.number}: `}</span>
                          {tr(STATUS_LABELS[invoice.status])}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {invoice.balance > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPaymentForm({
                                  ...emptyPaymentForm(),
                                  invoiceId: invoice.id,
                                  amount: String(invoice.balance),
                                });
                                setShowPaymentForm(true);
                              }}
                              aria-label={`${tr("Record payment for")} ${invoice.number}`}
                            >
                              <Plus aria-hidden="true" className="h-4 w-4" />
                            </Button>
                          )}
                          {record && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleVoid(record)}
                                disabled={busy || record.status === "void"}
                                aria-label={`${tr("Void")} ${invoice.number}`}
                              >
                                <X aria-hidden="true" className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setError(null);
                                  setPendingDelete({
                                    kind: "invoice",
                                    id: record.id,
                                    label: invoice.number,
                                  });
                                }}
                                disabled={busy}
                                aria-label={`${tr("Delete")} ${invoice.number}`}
                              >
                                <Trash2
                                  aria-hidden="true"
                                  className="h-4 w-4 text-red-500"
                                />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {unbilled.length > 0 && (
        <div className="rounded-xl border border-dashed bg-card/60 p-4">
          <h4 className="text-sm font-semibold text-foreground">
            {tr("Not yet billed")}
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr(
              "Drafts and void invoices stay out of every total until you send one.",
            )}
          </p>
          <ul className="mt-2 divide-y divide-border">
            {unbilled.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.number}
                    {row.title ? ` · ${row.title}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.status === "draft" ? tr("Draft") : tr("Void")} ·{" "}
                    {money(Number(row.total) || 0)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {row.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSendInvoice(row)}
                      disabled={busy}
                      aria-label={`${tr("Send")} ${row.number}`}
                    >
                      <Send aria-hidden="true" className="h-4 w-4" />
                      {tr("Send")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setPendingDelete({
                        kind: "invoice",
                        id: row.id,
                        label: row.number,
                      });
                    }}
                    disabled={busy}
                    aria-label={`${tr("Delete")} ${row.number}`}
                  >
                    <Trash2
                      aria-hidden="true"
                      className="h-4 w-4 text-red-500"
                    />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground">
          {tr("Payments received")}
        </h4>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {tr("No payment recorded yet.")}
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {payment.receipt_no} · {money(Number(payment.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.paid_at} ·{" "}
                    {tr(
                      METHODS.find((method) => method.value === payment.method)
                        ?.label ?? payment.method,
                    )}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                    {payment.invoice_id
                      ? ` · ${tr("against")} ${invoiceNumberById.get(payment.invoice_id) ?? ""}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReceipt(payment)}
                    aria-label={`${tr("Receipt")} ${payment.receipt_no}`}
                  >
                    <Printer aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setPendingDelete({
                        kind: "payment",
                        id: payment.id,
                        label: payment.receipt_no,
                      });
                    }}
                    disabled={busy}
                    aria-label={`${tr("Delete payment")} ${payment.receipt_no}`}
                  >
                    <Trash2
                      aria-hidden="true"
                      className="h-4 w-4 text-red-500"
                    />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {tr(
          "Totals come from recorded invoices and payments only. Attach proof of spend on the Expenses tab.",
        )}
      </p>
    </div>
  );
}
