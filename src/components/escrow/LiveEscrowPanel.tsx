import { useCallback, useEffect, useState } from "react";
import { Banknote, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import NewEscrowContractForm from "@/components/escrow/NewEscrowContractForm";
import {
  contractFigures,
  describeStatus,
  fetchMilestones,
  fetchMyEscrowContracts,
  formatMinor,
  refundEscrow,
  releaseEscrowMilestone,
  startEscrowCheckout,
  type EscrowContractRow,
  type EscrowMilestoneRow,
} from "@/lib/payments/escrow-client";

type Busy = string | null;

/**
 * Real escrow contracts for the signed-in buyer. Reads what row level security
 * allows and asks the server to move money; nothing here writes a balance.
 */
export default function LiveEscrowPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [contracts, setContracts] = useState<EscrowContractRow[]>([]);
  const [milestones, setMilestones] = useState<
    Record<string, EscrowMilestoneRow[]>
  >({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const load = useCallback(async () => {
    setState("loading");
    setMessage(null);
    try {
      const rows = await fetchMyEscrowContracts();
      setContracts(rows);
      const pairs = await Promise.all(
        rows.map(
          async (row) => [row.id, await fetchMilestones(row.id)] as const,
        ),
      );
      setMilestones(Object.fromEntries(pairs));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function fund(contract: EscrowContractRow) {
    setBusy(contract.id);
    setMessage(null);
    try {
      const url = await startEscrowCheckout(contract.id);
      window.location.assign(url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Checkout could not start.",
      );
      setBusy(null);
    }
  }

  async function release(
    contract: EscrowContractRow,
    milestone: EscrowMilestoneRow,
  ) {
    setBusy(milestone.id);
    setMessage(null);
    try {
      const result = await releaseEscrowMilestone(contract.id, milestone.id);
      const payout = Number(result.seller_payout_minor ?? 0);
      setMessage(`Released ${formatMinor(payout)} to ${contract.seller_name}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Release failed.");
    } finally {
      setBusy(null);
    }
  }

  async function refund(contract: EscrowContractRow) {
    setBusy(contract.id);
    setMessage(null);
    try {
      const result = await refundEscrow(contract.id);
      setMessage(
        `Refund started for ${formatMinor(Number(result.refunded_minor ?? 0))}.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refund failed.");
    } finally {
      setBusy(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
        Checking your escrow contracts...
      </div>
    );
  }

  if (state === "error" || contracts.length === 0) {
    if (compact) return null;
    return (
      <div className="space-y-4">
        {state === "error" && (
          <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm font-semibold text-foreground">
            Your escrow contracts could not be loaded.
          </p>
        )}
        <NewEscrowContractForm />
      </div>
    );
  }

  return (
    <section aria-labelledby="live-escrow" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="live-escrow" className="text-lg font-extrabold text-foreground">
          Your live escrow contracts
        </h2>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">
          {message}
        </p>
      )}

      <details className="rounded-2xl border border-border/60 bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Start another escrow contract
        </summary>
        <div className="mt-4">
          <NewEscrowContractForm />
        </div>
      </details>

      {contracts.map((contract) => {
        const figures = contractFigures(contract);
        const copy = describeStatus(contract.status);
        const rows = milestones[contract.id] ?? [];
        return (
          <article
            key={contract.id}
            className="rounded-2xl border border-border/60 bg-card p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {contract.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {contract.seller_name} - ref {contract.reference_code}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {copy.label}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Contract</dt>
                <dd className="font-semibold text-foreground">
                  {formatMinor(Number(contract.total_minor), contract.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Held</dt>
                <dd className="font-semibold text-foreground">
                  {formatMinor(figures.inEscrowMinor, contract.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Seller earned</dt>
                <dd className="font-semibold text-foreground">
                  {formatMinor(figures.sellerNetMinor, contract.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fee</dt>
                <dd className="font-semibold text-foreground">
                  {(Number(contract.fee_basis_points) / 100).toFixed(1)}%
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-sm text-muted-foreground">{copy.detail}</p>

            {rows.length > 0 && (
              <ul className="mt-4 divide-y divide-border/60">
                {rows.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {milestone.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMinor(
                          Number(milestone.amount_minor),
                          contract.currency,
                        )}{" "}
                        - {milestone.state}
                      </p>
                    </div>
                    {milestone.state === "pending" &&
                      contract.status !== "pending_payment" && (
                        <Button
                          size="sm"
                          disabled={busy === milestone.id}
                          onClick={() => void release(contract, milestone)}
                        >
                          <CheckCircle2
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          {busy === milestone.id ? "Releasing..." : "Release"}
                        </Button>
                      )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {contract.status === "pending_payment" && (
                <Button
                  disabled={busy === contract.id}
                  onClick={() => void fund(contract)}
                >
                  <Banknote className="mr-2 h-4 w-4" aria-hidden="true" />
                  {busy === contract.id
                    ? "Opening checkout..."
                    : "Pay into escrow"}
                </Button>
              )}
              {figures.refundableMinor > 0 &&
                contract.status !== "pending_payment" && (
                  <Button
                    variant="outline"
                    disabled={busy === contract.id}
                    onClick={() => void refund(contract)}
                  >
                    Refund held funds
                  </Button>
                )}
              {contract.status !== "pending_payment" && (
                <a
                  href="https://dashboard.paystack.com/#/transactions"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Provider ledger
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
