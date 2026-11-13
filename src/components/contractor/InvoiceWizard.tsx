import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { getSafeError } from "@/lib/safeError";
import { useLanguage } from "@/lib/i18n";
import { invoiceTotals } from "@/lib/project-money";
import { createProjectInvoice } from "@/lib/contractor";
import type { DbProjectInvoice } from "@/types/database";

/**
 * Guided invoice creation.
 *
 * One question per screen, the way a contractor actually answers them: what
 * the bill is for, how much, whether tax applies, when it is due, then a
 * review. Each step is a real fieldset with native radios, so a screen reader
 * announces the group and the chosen option instead of a pile of buttons, and
 * the progress bar carries a real value rather than a decorative width.
 *
 * Anyone who already knows the shape of an invoice can leave at any point
 * through "Use the full form", which keeps the fast single-screen path.
 */

type StepKey = "purpose" | "amount" | "tax" | "dates" | "review";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "purpose", label: "Purpose" },
  { key: "amount", label: "Amount" },
  { key: "tax", label: "Tax" },
  { key: "dates", label: "Dates" },
  { key: "review", label: "Review" },
];

const PURPOSES = [
  {
    value: "stage",
    label: "Stage or milestone",
    hint: "Work completed to a stated point",
  },
  {
    value: "materials",
    label: "Materials supply",
    hint: "Goods delivered to site",
  },
  { value: "labour", label: "Labour", hint: "Crew time and trades" },
  {
    value: "variation",
    label: "Variation",
    hint: "Extra work outside the agreed scope",
  },
  { value: "final", label: "Final account", hint: "Closing the job" },
  {
    value: "other",
    label: "Something else",
    hint: "Describe it in your own words",
  },
] as const;

const DUE_PRESETS = [
  { value: "receipt", label: "On receipt", days: 0 },
  { value: "7", label: "7 days", days: 7 },
  { value: "14", label: "14 days", days: 14 },
  { value: "30", label: "30 days", days: 30 },
] as const;

type Purpose = (typeof PURPOSES)[number]["value"];
type TaxChoice = "none" | "vat" | "custom";
type DueChoice = (typeof DUE_PRESETS)[number]["value"] | "custom";

const today = () => new Date().toISOString().slice(0, 10);

/** Adds calendar days to an ISO date without drifting across a timezone. */
export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return isoDate;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export interface InvoiceWizardProps {
  projectId: string;
  currency: string;
  money: (value: number) => string;
  /** Billed so far, shown as context on the amount step. */
  alreadyBilled?: number;
  onCreated: (invoice: DbProjectInvoice) => void | Promise<void>;
  onSwitchToForm: () => void;
  onCancel: () => void;
}

export function InvoiceWizard(props: InvoiceWizardProps) {
  const { t: tr } = useLanguage();
  const [stepIndex, setStepIndex] = useState(0);
  const [purpose, setPurpose] = useState<Purpose>("stage");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [taxChoice, setTaxChoice] = useState<TaxChoice>("none");
  const [customRate, setCustomRate] = useState("");
  const [issued, setIssued] = useState(today());
  const [dueChoice, setDueChoice] = useState<DueChoice>("14");
  const [dueCustom, setDueCustom] = useState(addDays(today(), 14));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const customRateRef = useRef<HTMLInputElement | null>(null);
  const dueCustomRef = useRef<HTMLInputElement | null>(null);

  const step = STEPS[stepIndex];

  const taxRate = useMemo(() => {
    if (taxChoice === "none") return 0;
    if (taxChoice === "vat") return 7.5;
    const parsed = Number(customRate);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [taxChoice, customRate]);

  const { subtotal, taxAmount, total } = invoiceTotals(
    Number(amount) || 0,
    taxRate,
  );

  const dueDate = useMemo(() => {
    if (dueChoice === "custom") return dueCustom;
    const preset = DUE_PRESETS.find((option) => option.value === dueChoice);
    return addDays(issued, preset ? preset.days : 0);
  }, [dueChoice, dueCustom, issued]);

  const goto = (index: number) => {
    setError(null);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
    // Move focus to the step heading so the change is announced and the next
    // Tab lands inside the new step rather than back at the top of the page.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const validateStep = (): string | null => {
    if (step.key === "amount") {
      if (!Number.isFinite(subtotal) || subtotal <= 0) {
        amountRef.current?.focus();
        return tr("Enter the amount you are billing before continuing.");
      }
    }
    if (step.key === "tax" && taxChoice === "custom") {
      const parsed = Number(customRate);
      if (!Number.isFinite(parsed) || parsed < 0) {
        customRateRef.current?.focus();
        return tr("Enter a tax rate of zero or more, or choose no tax.");
      }
    }
    if (step.key === "dates") {
      if (dueChoice === "custom" && dueCustom < issued) {
        dueCustomRef.current?.focus();
        return tr("The payment date cannot fall before the invoice date.");
      }
      if (dueDate < issued) {
        dueCustomRef.current?.focus();
        return tr("The payment date cannot fall before the invoice date.");
      }
    }
    return null;
  };

  const handleNext = () => {
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    goto(stepIndex + 1);
  };

  const purposeTitle = () => {
    if (title.trim()) return title.trim();
    const match = PURPOSES.find((option) => option.value === purpose);
    return match ? tr(match.label) : "";
  };

  const submit = async (asDraft: boolean) => {
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const invoice = await createProjectInvoice(
        props.projectId,
        props.currency,
        {
          title: purposeTitle(),
          issued_at: issued,
          due_at: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          status: asDraft ? "draft" : "sent",
          notes: null,
        },
      );
      setStatus(
        asDraft
          ? `${tr("Draft saved as")} ${invoice.number}`
          : `${tr("Invoice raised as")} ${invoice.number}`,
      );
      await props.onCreated(invoice);
    } catch (err) {
      setError(getSafeError(err, "Could not raise the invoice."));
    } finally {
      setBusy(false);
    }
  };

  const progressText = `${tr("Step")} ${stepIndex + 1} ${tr("of")} ${STEPS.length}: ${tr(step.label)}`;

  return (
    <div className="rounded-2xl border border-violet-200/60 bg-card p-4 shadow-sm sm:p-6 dark:border-violet-500/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {tr("Guided invoice")}
          </p>
          <h4
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {tr(step.label)}
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onCancel}
          aria-label={tr("Close guided invoice")}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={progressText}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-violet-600 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-violet-600/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            {tr("Step")} {stepIndex + 1} {tr("of")} {STEPS.length}
          </span>
        </div>
      </div>

      {error && (
        <p
          id="wizard-error"
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {status && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
        >
          {status}
        </p>
      )}

      <div className="mt-4">
        {step.key === "purpose" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-foreground">
              {tr("What is this invoice for?")}
            </legend>
            <p className="mb-3 text-xs text-muted-foreground">
              {tr("Pick the closest match. It becomes the invoice title.")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PURPOSES.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-input bg-background p-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                >
                  <input
                    type="radio"
                    name="invoice-purpose"
                    value={option.value}
                    checked={purpose === option.value}
                    onChange={() => setPurpose(option.value)}
                    className="mt-0.5 h-4 w-4 accent-violet-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {tr(option.label)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tr(option.hint)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label
                htmlFor="wizard-title"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {tr("Title on the invoice")}
              </label>
              <input
                id="wizard-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={tr("Stage 2, blockwork and plaster")}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {tr("Leave empty to use")}: {purposeTitle()}
              </p>
            </div>
          </fieldset>
        )}

        {step.key === "amount" && (
          <div>
            <label
              htmlFor="wizard-amount"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              {tr("Amount before tax")}
            </label>
            <input
              ref={amountRef}
              id="wizard-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(error) && subtotal <= 0}
              aria-describedby={error ? "wizard-error" : "wizard-amount-help"}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-lg tabular-nums text-foreground"
            />
            <p
              id="wizard-amount-help"
              className="mt-1 text-xs text-muted-foreground"
            >
              {typeof props.alreadyBilled === "number" &&
              props.alreadyBilled > 0
                ? `${props.money(props.alreadyBilled)} ${tr("already billed on this project.")}`
                : tr("Bill what the client owes, before tax.")}
            </p>
          </div>
        )}

        {step.key === "tax" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-foreground">
              {tr("Does tax apply?")}
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
                <input
                  type="radio"
                  name="invoice-tax"
                  value="none"
                  checked={taxChoice === "none"}
                  onChange={() => setTaxChoice("none")}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-foreground">{tr("No tax")}</span>
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
                <input
                  type="radio"
                  name="invoice-tax"
                  value="vat"
                  checked={taxChoice === "vat"}
                  onChange={() => setTaxChoice("vat")}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-foreground">
                  {tr("VAT at 7.5%")}
                </span>
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
                <input
                  type="radio"
                  name="invoice-tax"
                  value="custom"
                  checked={taxChoice === "custom"}
                  onChange={() => setTaxChoice("custom")}
                  className="h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-foreground">
                  {tr("Other rate")}
                </span>
              </label>
            </div>
            {taxChoice === "custom" && (
              <div className="mt-3">
                <label
                  htmlFor="wizard-tax-rate"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {tr("Tax rate (%)")}
                </label>
                <input
                  ref={customRateRef}
                  id="wizard-tax-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={customRate}
                  onChange={(event) => setCustomRate(event.target.value)}
                  aria-invalid={Boolean(error) && !(Number(customRate) >= 0)}
                  aria-describedby={error ? "wizard-error" : undefined}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums text-foreground"
                />
              </div>
            )}
          </fieldset>
        )}

        {step.key === "dates" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-foreground">
              {tr("When is it due?")}
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wizard-issued"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {tr("Invoice date")}
                </label>
                <input
                  id="wizard-issued"
                  type="date"
                  value={issued}
                  onChange={(event) => {
                    setIssued(event.target.value);
                    if (dueChoice === "custom") return;
                    const preset = DUE_PRESETS.find(
                      (o) => o.value === dueChoice,
                    );
                    setDueCustom(
                      addDays(event.target.value, preset ? preset.days : 0),
                    );
                  }}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <label
                  htmlFor="wizard-due"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {tr("Payment date")}
                </label>
                <select
                  id="wizard-due"
                  value={dueChoice}
                  onChange={(event) =>
                    setDueChoice(event.target.value as DueChoice)
                  }
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {DUE_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {tr(option.label)}
                    </option>
                  ))}
                  <option value="custom">{tr("Pick a date")}</option>
                </select>
              </div>
            </div>
            {dueChoice === "custom" && (
              <div className="mt-3">
                <label
                  htmlFor="wizard-due-custom"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {tr("Due on")}
                </label>
                <input
                  ref={dueCustomRef}
                  id="wizard-due-custom"
                  type="date"
                  value={dueCustom}
                  onChange={(event) => setDueCustom(event.target.value)}
                  aria-invalid={Boolean(error) && dueDate < issued}
                  aria-describedby={error ? "wizard-error" : undefined}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {tr("Due")}: {dueDate}
            </p>
          </fieldset>
        )}

        {step.key === "review" && (
          <div>
            <h5 className="text-sm font-semibold text-foreground">
              {tr("Check before you raise it")}
            </h5>
            <dl className="mt-3 grid gap-2 text-sm">
              {[
                [tr("For"), purposeTitle() || tr("Not set")],
                [tr("Before tax"), props.money(subtotal)],
                [
                  tr("Tax"),
                  taxAmount > 0
                    ? `${props.money(taxAmount)} (${taxRate}%)`
                    : tr("None"),
                ],
                [tr("Total"), props.money(total)],
                [tr("Invoice date"), issued],
                [tr("Payment date"), dueDate],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b py-1.5 last:border-0"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {tr(
                "A sent invoice is billed immediately and can still be marked void. A draft stays out of the totals.",
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => goto(stepIndex - 1)}
              disabled={busy}
              className="min-h-11"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {tr("Back")}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={props.onSwitchToForm}
            disabled={busy}
            className="min-h-11"
          >
            {tr("Use the full form")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {stepIndex < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={busy}
              className="min-h-11 w-full bg-violet-600 text-white hover:bg-violet-700 sm:w-auto"
            >
              {tr("Next")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => void submit(true)}
                disabled={busy}
                className="min-h-11 w-full text-muted-foreground hover:text-foreground sm:w-auto"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                {tr("Save as draft")}
              </Button>
              <Button
                onClick={() => void submit(false)}
                disabled={busy}
                className="min-h-11 w-full bg-violet-600 text-white hover:bg-violet-700 sm:w-auto"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                {busy ? tr("Raising") : tr("Raise invoice")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
