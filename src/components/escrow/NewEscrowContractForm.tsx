import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import {
  createEscrowContract,
  formatMinor,
  parseAmountToMinor,
  stageBalance,
} from "@/lib/payments/escrow-client";

interface StageRow {
  id: number;
  label: string;
  amount: string;
}

let nextRowId = 1;
const newRow = (label: string, amount = ""): StageRow => ({
  id: nextRowId++,
  label,
  amount,
});

/**
 * Creates a real escrow contract and hands the buyer to Paystack.
 * The server owns the totals; this form only checks the stages add up first.
 */
export default function NewEscrowContractForm() {
  const [title, setTitle] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [total, setTotal] = useState("");
  const [rows, setRows] = useState<StageRow[]>([
    newRow("Deposit"),
    newRow("On completion"),
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMinor = parseAmountToMinor(total) ?? 0;
  const stages = useMemo(
    () =>
      rows
        .map((row) => ({
          label: row.label,
          amountMinor: parseAmountToMinor(row.amount) ?? 0,
        }))
        .filter((stage) => stage.amountMinor > 0),
    [rows],
  );
  const balance = stageBalance(totalMinor, stages);
  const ready =
    title.trim().length >= 3 &&
    sellerName.trim().length > 0 &&
    totalMinor > 0 &&
    balance.balanced;

  function updateRow(id: number, patch: Partial<StageRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createEscrowContract({
        title,
        sellerName,
        sellerBankCode: bankCode,
        sellerAccountNumber: accountNumber,
        totalMinor,
        stages,
      });
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The contract could not be created.",
      );
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <h3 className="text-base font-bold text-foreground">
          Start a new escrow contract
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The buyer pays into escrow. Nothing reaches the seller until a stage
          is released, and FRELUX keeps 7 percent of what is released.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-foreground">
            What is being built
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Two bedroom finishing, Lekki"
            maxLength={160}
            required
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-foreground">Seller name</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            value={sellerName}
            onChange={(event) => setSellerName(event.target.value)}
            placeholder="Ade Builders Ltd"
            required
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-foreground">Seller bank code</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            value={bankCode}
            onChange={(event) => setBankCode(event.target.value)}
            placeholder="058"
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-foreground">
            Seller account number
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            placeholder="0123456789"
            inputMode="numeric"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-foreground">
            Contract total (NGN)
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            placeholder="500,000"
            inputMode="decimal"
            required
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          Payment stages
        </legend>
        {rows.map((row, index) => (
          <div key={row.id} className="flex gap-2">
            <input
              aria-label={`Stage ${index + 1} label`}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={row.label}
              onChange={(event) =>
                updateRow(row.id, { label: event.target.value })
              }
              placeholder="Deposit"
            />
            <input
              aria-label={`Stage ${index + 1} amount`}
              className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={row.amount}
              onChange={(event) =>
                updateRow(row.id, { amount: event.target.value })
              }
              placeholder="200,000"
              inputMode="decimal"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove stage ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.id !== row.id),
                )
              }
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((current) => [
              ...current,
              newRow(`Stage ${current.length + 1}`),
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add stage
        </Button>
      </fieldset>

      <p
        className={`text-sm font-medium ${
          balance.balanced
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
        role="status"
      >
        {totalMinor === 0
          ? "Enter the contract total to check the stages."
          : balance.balanced
            ? `Stages add up to ${formatMinor(balance.plannedMinor)}.`
            : balance.remainingMinor > 0
              ? `${formatMinor(balance.plannedMinor)} staged, ${formatMinor(balance.remainingMinor)} still unassigned.`
              : `Stages exceed the total by ${formatMinor(Math.abs(balance.remainingMinor))}.`}
      </p>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!ready || busy}>
        {busy ? "Creating contract..." : "Create and pay into escrow"}
      </Button>
    </form>
  );
}
