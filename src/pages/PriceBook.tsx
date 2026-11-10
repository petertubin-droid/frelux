import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { useSeo } from "@/lib/seo";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { usePriceBook } from "@/lib/pricing/price-book-context";

/**
 * The contractor's own supplier rates.
 *
 * This page only ever states what the stored data proves: a rate is used in the
 * currency it was quoted in, and a rate in another currency is kept but not
 * applied. Nothing here converts, and nothing claims to reach the market book.
 */
export default function PriceBook() {
  useSeo({
    title: "My price book",
    description:
      "Keep the supplier rates you were actually quoted, so material costs in the calculators use your prices in the currency you pay them in.",
  });

  const { code } = useDisplayCurrency();
  const { book, sync, resolve, saveEntry, removeEntry } = usePriceBook();

  const [slug, setSlug] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState(code);
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // What was saved, kept apart from where it is stored: the storage note is read
  // live from the sync state, so a late account reply corrects the sentence
  // instead of leaving a stale "in this browser".
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const syncNote =
    sync === "synced"
      ? "It is on your account and in this browser."
      : sync === "unsynced"
        ? "It is in this browser; your account copy did not update just now."
        : "It is in this browser.";

  const resolved = useMemo(() => resolve(code), [resolve, code]);
  const appliedCount = Object.keys(resolved.rates).length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = saveEntry({ slug, rate, currency, unit, note });
    if (!saved.ok) {
      setError(saved.reason);
      setSavedSummary(null);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(null);
    setSavedSummary(
      `${saved.entry.slug} saved at ${saved.entry.rate} ${saved.entry.currency} per unit.`,
    );
    setSlug("");
    setRate("");
    setUnit("");
    setNote("");
  }

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Business"
        title="My price book"
        subtitle="The rates you were quoted, kept in the currency you were quoted in."
        breadcrumbs={[{ label: "Home", path: "/" }, { label: "My price book" }]}
      />
      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <section aria-labelledby="price-book-add" className="space-y-3">
            <h2 id="price-book-add" className="text-lg font-semibold">
              Add or update a rate
            </h2>
            <p className="text-sm text-muted-foreground">
              Use the material slug the calculator names, for example
              <span className="font-mono"> fascia-per-meter</span>. Calculators
              apply the rate only in the currency it was quoted in, and your rate
              takes precedence over the market price.
            </p>

            <p className="text-sm" data-testid="price-book-storage">
              {sync === "syncing"
                ? "Reading the rates on your account."
                : sync === "synced"
                  ? "Your rates are saved to your account and to this browser."
                  : sync === "unsynced"
                    ? "Your rates are saved in this browser. The account copy did not update just now and is retried when you return to this tab."
                    : "Your rates are saved in this browser. Sign in to keep them on your account."}
            </p>

            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="price-book-slug" className="text-sm font-medium">
                  Material slug
                </label>
                <input
                  id="price-book-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="fascia-per-meter"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="price-book-rate" className="text-sm font-medium">
                  Rate per unit
                </label>
                <input
                  id="price-book-rate"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="4200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="price-book-currency"
                  className="text-sm font-medium"
                >
                  Currency
                </label>
                <input
                  id="price-book-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="price-book-unit" className="text-sm font-medium">
                  Measure (optional)
                </label>
                <input
                  id="price-book-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="per 3.6 m length"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="price-book-note" className="text-sm font-medium">
                  Note (optional)
                </label>
                <input
                  id="price-book-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ikeja supplier, October quote"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Save rate
                </button>
              </div>
            </form>

            <div role="status" aria-live="polite" className="text-sm">
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : savedSummary ? (
                <p className="text-muted-foreground">
                  {savedSummary} {syncNote}
                </p>
              ) : notice ? (
                <p className="text-muted-foreground">{notice}</p>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="price-book-list" className="space-y-3">
            <h2 id="price-book-list" className="text-lg font-semibold">
              Saved rates
            </h2>
            {book.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rates saved yet. Calculators keep using the market price book
                until you add one.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {appliedCount === 0
                    ? `None of these rates are quoted in ${code}, so none are applied in ${code} calculators.`
                    : `${appliedCount} of ${book.entries.length} rates apply in ${code} calculators.`}
                </p>

                <ul className="divide-y divide-border rounded-lg border border-border">
                  {book.entries.map((entry) => {
                    const used = resolved.rates[entry.slug] !== undefined;
                    return (
                      <li
                        key={entry.slug}
                        className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-mono text-sm break-all">{entry.slug}</p>
                          <p className="text-sm">
                            {entry.rate.toLocaleString()} {entry.currency}
                            {entry.unit ? ` ${entry.unit}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {used
                              ? `Applied in ${code} calculators.`
                              : `Kept, not applied: quoted in ${entry.currency}, and ${code} calculators do not convert it.`}
                            {entry.note ? ` ${entry.note}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeEntry(entry.slug);
                            setNotice(`${entry.slug} removed.`);
                            setSavedSummary(null);
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium"
                          aria-label={`Remove ${entry.slug}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      </Container>
    </>
  );
}
