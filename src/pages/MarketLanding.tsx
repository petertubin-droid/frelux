/**
 * Market landing page (Phase 3 globalization, 2026-10-27).
 *
 * /market/:code serves a data-addressable SEO lander for each of the 32
 * FRELUX markets. All content comes from the per-market bundle
 * (src/lib/international/markets) - the same single source the engines and
 * the CI completeness gate use. No invented claims: every figure on this
 * page is the market's real template default, with an explicit
 * verify-locally note.
 *
 * Visiting the page selects that market (same action as the market
 * dropdown) so every calculator the visitor opens next already uses the
 * right units, block sizes and standards.
 */
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getMarketBundle } from "@/lib/international/markets";
import { useMarket } from "@/lib/international/market-context";
import AdSlot from "@/components/ui/AdSlot";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-4 dark:border-white/10">
      <dt className="w-56 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function MarketLanding() {
  const { code } = useParams<{ code: string }>();
  const upper = (code ?? "").toUpperCase();
  const bundle = getMarketBundle(upper);
  const { marketCode, setMarket } = useMarket();

  const ready = bundle !== null;

  useEffect(() => {
    if (ready && marketCode !== bundle!.code) {
      void setMarket(bundle!.code);
    }
  }, [ready, marketCode, setMarket, bundle]);

  if (!bundle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Market not available</h1>
        <p className="mt-3 text-muted-foreground">
          FRELUX does not currently have a market profile for{" "}
          <span className="font-semibold text-foreground">
            {upper || "this code"}
          </span>
          . All 32 supported markets are listed in the tool library.
        </p>
        <Link
          to="/construction-tools"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Browse all construction tools
        </Link>
      </div>
    );
  }

  const m = bundle.masonry;
  const du = m.defaultUnit;
  const dw = bundle.drywall;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>{" "}
        &rsaquo; Markets &rsaquo; <span>{m.countryName}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold">
        Construction Calculator for {m.countryName} (
        {bundle.wallFinishing.currencySymbol})
      </h1>
      <p className="mt-3 text-muted-foreground">
        Free construction calculators preconfigured for {m.countryName}: local
        wall units, cement bag sizes, electrical and plumbing practice. Every
        calculation on FRELUX can run with this market's template defaults, and
        prices come from the live price database.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { to: "/build-to-roof-estimator", label: "Build-to-Roof Estimator" },
          { to: "/boq-generator", label: "BOQ Generator" },
          { to: "/electrical", label: "Electrical Estimator" },
          { to: "/plumbing", label: "Plumbing Estimator" },
          { to: "/regional-cost-index", label: "Regional Cost Index" },
          { to: "/construction-tools", label: "All Tools" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 dark:border-white/10"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <AdSlot slotKey="market_top" className="mt-8" />

      <section className="mt-8 rounded-xl border border-border bg-card p-6 dark:border-white/10">
        <h2 className="text-lg font-semibold">
          {m.countryName} building-practice defaults
        </h2>
        <dl className="mt-2">
          <Row label="Currency">
            {bundle.wallFinishing.currency} (
            {bundle.wallFinishing.currencySymbol})
          </Row>
          <Row label="Default wall unit">
            {du.name} — {du.lengthMm} × {du.heightMm} × {du.widthMm} mm,{" "}
            {du.isHollow ? "hollow" : "solid"}, {du.standardJointMm} mm standard
            joint
          </Row>
          <Row label="Cement bag weight">{bundle.cementBagWeightKg} kg</Row>
          <Row label="Drywall board (standard)">
            {dw.boardLengthMm} × {dw.boardWidthMm} mm board, {dw.studSpacingMm}{" "}
            mm stud spacing
          </Row>
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-6 dark:border-white/10">
        <h2 className="text-lg font-semibold">Electrical practice</h2>
        <dl className="mt-2">
          <Row label="Standards reference">
            {bundle.electrical.standardsRef}
          </Row>
          <Row label="Nominal voltage">{bundle.electrical.nominalVoltage}</Row>
          <Row label="Typical wiring">
            {bundle.electrical.primaryWiringMethod}
          </Row>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {bundle.electrical.notes}
        </p>
      </section>

      <AdSlot slotKey="market_mid" className="mt-4" />

      <section className="mt-4 rounded-xl border border-border bg-card p-6 dark:border-white/10">
        <h2 className="text-lg font-semibold">Plumbing practice</h2>
        <dl className="mt-2">
          <Row label="Standards reference">{bundle.plumbing.standardsRef}</Row>
          <Row label="Water supply piping">
            {bundle.plumbing.waterSupplyMaterial}
          </Row>
          <Row label="Soil stack size">
            {bundle.plumbing.typicalSoilDrainPipeSize}
          </Row>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {bundle.plumbing.notes}
        </p>
      </section>

      <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-muted-foreground">
        These are template starting defaults for quantity takeoffs, verified
        against the referenced standards at profile level but not a substitute
        for local professional advice. Always confirm sizes, materials and
        current prices with your local supplier or licensed professional before
        purchasing.
      </p>
    </div>
  );
}
