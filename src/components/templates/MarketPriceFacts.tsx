import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  fetchMarketRoleMappings,
  resolveMaterialPriceByRole,
  evidenceSentence,
  type ResolvedMaterialPrice,
} from "@/lib/estimation/market-materials";
import { bundledTileMaterials } from "@/lib/international/bundled-book";
import type { DbTileMaterial } from "@/types/database";
import {
  ROLES_BY_TYPE,
  ROLE_LABELS,
} from "../../../scripts/lib/template-price-roles.mjs";
import { useLanguage } from "@/lib/i18n";

/**
 * Stored unit prices for the materials one template consumes, in one market.
 *
 * The prerendered page already carries this table (scripts/lib/market-price-
 * facts.mjs renders it from the same three tables at build time), so this
 * component is what keeps the hydrated page saying the same thing. It shows
 * only the market's OWN rows: nothing inherited from another country, no
 * converted figures, and no arithmetic. Quantities and totals stay with the
 * deterministic engines when the template is run.
 */
export default function MarketPriceFacts({
  marketCode,
  templateType,
  countryName,
}: {
  marketCode: string;
  templateType: string;
  countryName: string;
}) {
  const { t } = useLanguage();
  const roles = useMemo(
    () =>
      (ROLES_BY_TYPE as Record<string, readonly string[]>)[templateType] ?? [],
    [templateType],
  );
  const [rows, setRows] = useState<ResolvedMaterialPrice[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [tileRows, setTileRows] = useState<DbTileMaterial[] | null>(null);
  const isTile = templateType === "tile";

  useEffect(() => {
    let cancelled = false;
    if (isTile) {
      // Tiles are priced from the tile catalog, not estimation_prices, and the
      // catalog refuses to substitute Nigeria for an unconfigured market.
      (async () => {
        try {
          const { data } = await bundledTileMaterials(undefined, marketCode);
          if (cancelled) return;
          setTileRows(data);
          setStatus("ready");
        } catch {
          if (!cancelled) setStatus("error");
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (roles.length === 0) {
      setStatus("ready");
      setRows([]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const mappings = await fetchMarketRoleMappings(marketCode);
        const available = new Set(mappings.map((m) => m.role));
        const resolved = await Promise.all(
          roles
            .filter((role) => available.has(role as never))
            .map((role) =>
              resolveMaterialPriceByRole(role as never, marketCode),
            ),
        );
        if (cancelled) return;
        // Own rows only, matching the prerendered table.
        setRows(
          resolved.filter(
            (row): row is ResolvedMaterialPrice =>
              row != null && row.resolved_market === marketCode,
          ),
        );
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketCode, roles, isTile]);

  if (!isTile && roles.length === 0) return null;

  return (
    <section
      className="mt-6 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-card"
      aria-label={t("Material prices in this market")}
    >
      <h2 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
        {t("Material prices in")} {countryName}
      </h2>

      {status === "loading" && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t("Loading stored prices")}
        </p>
      )}

      {status === "error" && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t(
            "Stored prices could not be loaded. The calculator still uses the market price book when you run it.",
          )}
        </p>
      )}

      {status === "ready" && isTile && tileRows && tileRows.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t(
            "No tile material row is configured for this market. The tiling calculator asks for your own adhesive and grout prices instead of substituting another country's, and the estimate labels every line as entered rather than observed.",
          )}
        </p>
      )}

      {status === "ready" && isTile && tileRows && tileRows.length > 0 && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Adhesive and grout prices the tiling calculator uses here, with the coverage each pack is expected to give. Tiles themselves are priced from the size and grade you enter.",
            )}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground dark:border-white/10">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {t("Material")}
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {t("Coverage")}
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    {t("Unit price")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tileRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0 dark:border-white/5"
                  >
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {row.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {row.package_size != null
                          ? `${row.package_size} ${row.package_unit ?? row.unit ?? ""}`.trim()
                          : row.unit}
                      </span>
                    </th>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {row.coverage_rate != null && row.coverage_unit
                        ? `${row.coverage_rate} ${row.coverage_unit}`
                        : t("Not stored")}
                    </td>
                    <td className="py-2">
                      {row.unit_price != null
                        ? `${row.currency} ${Number(row.unit_price).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                        : t("Not stored")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {status === "ready" && !isTile && rows && rows.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t(
            "The price book holds no verified row for the materials this template consumes in this market. Those lines are marked as a reference rate in the estimate rather than filled from another country.",
          )}
        </p>
      )}

      {status === "ready" && !isTile && rows && rows.length > 0 && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Unit prices as stored, not an estimate. The calculator multiplies them by the quantities your own measurements produce.",
            )}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground dark:border-white/10">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {t("Material")}
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {t("Unit price")}
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    {t("Source")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.role}
                    className="border-b border-border/40 last:border-0 dark:border-white/5"
                  >
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {(ROLE_LABELS as Record<string, string>)[row.role] ??
                        row.role}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {row.material.name}
                      </span>
                    </th>
                    <td className="py-2 pr-3">
                      {row.price.currency}{" "}
                      {Number(row.price.price).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {row.price.price_source || evidenceSentence(row.evidence)}
                      {row.price.effective_date
                        ? ` (${row.price.effective_date})`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
