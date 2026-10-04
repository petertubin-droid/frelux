import { useEffect, useState } from "react";
import { Save, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput,
} from "@/components/admin/AdminUi";
import {
  DISPLAY_CURRENCIES,
  type DisplayCurrencyConfig,
} from "@/lib/international/fx-display";

/**
 * Admin: Currency & FX Rates (International Phase A).
 *
 * The owner enables the visitor display-currency switcher and sets how
 * many units of each currency ONE NAIRA buys. Estimates always
 * calculate in Naira; these rates convert amounts for DISPLAY only and
 * are always labelled approximate on the site. A currency with no
 * rate stays in the picker marked "no rate" and shows Naira values.
 *
 * Saved to site_settings.display_currencies (jsonb).
 */
export default function AdminCurrencySettings() {
  const [enabled, setEnabled] = useState(false);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from("site_settings")
          .select("id, display_currencies")
          .limit(1)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        const cfg =
          data &&
          typeof data.display_currencies === "object" &&
          data.display_currencies
            ? (data.display_currencies as DisplayCurrencyConfig)
            : null;
        if (data?.id) setRowId(data.id);
        if (cfg) {
          setEnabled(!!cfg.enabled);
          setNote(cfg.note ?? "");
          const asStrings: Record<string, string> = {};
          for (const [code, rate] of Object.entries(cfg.rates ?? {})) {
            asStrings[code] = String(rate);
          }
          setRates(asStrings);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      // Only store usable positive numbers; anything else is dropped
      // rather than guessed at on the public site.
      const numericRates: Record<string, number> = {};
      for (const [code, raw] of Object.entries(rates)) {
        const parsed = Number.parseFloat(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          numericRates[code] = parsed;
        }
      }
      const cfg: DisplayCurrencyConfig & { updated_at: string } = {
        enabled,
        rates: numericRates,
        note: note || undefined,
        updated_at: new Date().toISOString(),
      };
      const { error: updateErr } = await supabase
        .from("site_settings")
        .update({ display_currencies: cfg })
        .eq("id", rowId ?? "");
      if (updateErr) throw updateErr;
      setSavedAt(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <AdminHeader
          title="Currency & FX Rates"
          subtitle="Loading display-currency configuration…"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader
        title="Currency & FX Rates"
        subtitle="Let visitors view Naira estimates in their own currency. Display-only: calculations always stay in Naira."
      />

      {error && <StateMessage type="error" title="Error" message={error} />}

      <AdminCard>
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Display currency switcher</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When enabled, a currency picker appears in the navbar next to the
            language switcher. Disabled hides it completely.
          </p>
        </div>
        <div className="space-y-3">
          <Toggle
            label="Enable visitor currency switcher"
            checked={enabled}
            onChange={setEnabled}
          />
          <div className="rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            Amounts shown in a visitor currency are labelled approximate and
            converted from Naira at your rates. The calculator itself always
            computes in Naira, so results stay exact.
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-3">
          <h3 className="text-sm font-semibold">FX rates</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How many units of the currency ONE NAIRA buys. Example: if 1 USD =
            1,540 NGN, enter 0.000649. Leave blank to offer the currency with
            Naira values ("no rate").
          </p>
        </div>
        <div className="space-y-3">
          {DISPLAY_CURRENCIES.filter((c) => c.code !== "NGN").map((c) => (
            <AdminField key={c.code} label={`${c.name} (${c.symbol})`}>
              <AdminInput
                value={rates[c.code] ?? ""}
                onChange={(e) =>
                  setRates((prev) => ({ ...prev, [c.code]: e.target.value }))
                }
                placeholder={`units per 1 NGN, e.g. 0.000649`}
                inputMode="decimal"
              />
            </AdminField>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Review note</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional note shown only here, e.g. "Rates reviewed 2026-10-04".
          </p>
        </div>
        <AdminField label="Note">
          <AdminInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Rates reviewed 2026-10-04"
          />
        </AdminField>
      </AdminCard>

      <div className="flex items-center gap-3">
        <AdminButton onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save currency settings"}
        </AdminButton>
        {savedAt && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
