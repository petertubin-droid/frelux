import { useMemo, useState } from "react";
import { Layers, Package, Truck, Shield } from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";
import {
  CEMENT_MARKETS,
  MARKET_NAMES,
  PLOT_PRESETS,
  type PlotPresetKey,
} from "@/config/masonry-units";
import {
  CONCRETE_MIXES,
  calculateGermanFloor,
  type ConcreteMixKey,
} from "@/lib/estimation/german-floor";
import { slabVocabulary } from "@/lib/localization/regional-vocabulary";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const chip = (active: boolean) =>
  active
    ? "rounded-lg border border-primary bg-primary/10 px-2.5 py-2 text-xs font-semibold text-foreground"
    : "rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted";
const display = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

const MARKETS = CEMENT_MARKETS.map((code) => ({
  code,
  name: MARKET_NAMES[code] ?? code,
}));

export default function GermanFloorCalculator() {
  const { t } = useLanguage();
  useSeo({
    title:
      "German Floor Calculator: Cement, Sand, Granite and Hardcore | FRELUX",
    description:
      "Calculate the hardcore, blinding, damp proof membrane and concrete for a German floor. Cement bags, sharp sand and granite returned in trips, barrows and cubic metres.",
  });

  const [market, setMarket] = useState("NG");
  const [preset, setPreset] = useState<PlotPresetKey | "custom">("full-plot");
  const [custom, setCustom] = useState({ length: "10", width: "8" });
  const [hardcoreMm, setHardcoreMm] = useState(150);
  const [slabMm, setSlabMm] = useState(100);
  const [mixKey, setMixKey] = useState<ConcreteMixKey>("1:2:4");

  const vocab = slabVocabulary(market);

  const outcome = useMemo(
    () =>
      calculateGermanFloor({
        market,
        plotPreset: preset === "custom" ? null : preset,
        lengthM: Number(custom.length),
        widthM: Number(custom.width),
        hardcoreMm,
        slabMm,
        mixKey,
      }),
    [market, preset, custom.length, custom.width, hardcoreMm, slabMm, mixKey],
  );

  const result = outcome.result;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: t("Construction Tools"), path: "/construction-tools" },
          { label: t("German Floor Calculator") },
        ]}
        eyebrow={t("Concrete")}
        title={t("German Floor Calculator")}
        subtitle={t(
          "Hardcore, blinding, membrane and slab concrete for a ground floor. Quantities only, worked out from the layer thicknesses you set.",
        )}
        actions={
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {t("Market")}
            <select
              aria-label={t("Market")}
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {MARKETS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <Container className="max-w-5xl space-y-10 pb-16 pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="floor-inputs"
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <h2
              id="floor-inputs"
              className="font-heading text-lg font-semibold text-foreground"
            >
              {t("Floor and layers")}
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <span className="text-sm font-medium text-foreground">
                  {t("Floor size")}
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(PLOT_PRESETS) as PlotPresetKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={preset === key}
                      onClick={() => setPreset(key)}
                      className={chip(preset === key)}
                    >
                      {t(PLOT_PRESETS[key].label)}
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        {PLOT_PRESETS[key].idiom}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={preset === "custom"}
                    onClick={() => setPreset("custom")}
                    className={chip(preset === "custom")}
                  >
                    {t("Measure it")}
                  </button>
                </div>

                {preset === "custom" ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        {t("Length (m)")}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={custom.length}
                        onChange={(event) =>
                          setCustom((prev) => ({
                            ...prev,
                            length: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-1`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        {t("Width (m)")}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={custom.width}
                        onChange={(event) =>
                          setCustom((prev) => ({
                            ...prev,
                            width: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-1`}
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div>
                <span className="text-sm font-medium text-foreground">
                  {t(vocab.fillWord)}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[0, 100, 150, 200].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={hardcoreMm === value}
                      onClick={() => setHardcoreMm(value)}
                      className={chip(hardcoreMm === value)}
                    >
                      {value === 0 ? t("None") : `${value} mm`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-foreground">
                  {t("Slab thickness")}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[75, 100, 125, 150].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={slabMm === value}
                      onClick={() => setSlabMm(value)}
                      className={chip(slabMm === value)}
                    >
                      {value} mm
                    </button>
                  ))}
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-foreground">
                  {t("Concrete mix")}
                </legend>
                <div className="mt-2 space-y-2">
                  {(Object.keys(CONCRETE_MIXES) as ConcreteMixKey[]).map(
                    (key) => {
                      const mix = CONCRETE_MIXES[key];
                      const active = mixKey === key;
                      return (
                        <label
                          key={key}
                          className={
                            active
                              ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary bg-primary/5 px-3 py-2"
                              : "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2"
                          }
                        >
                          <input
                            type="radio"
                            name="concrete-mix"
                            value={key}
                            checked={active}
                            onChange={() => setMixKey(key)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-medium text-foreground">
                              {key}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {mix.use}
                            </span>
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>
            </div>
          </section>

          <section
            aria-labelledby="floor-results"
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <h2
              id="floor-results"
              className="font-heading text-lg font-semibold text-foreground"
            >
              {t("What to buy")}
            </h2>

            {outcome.errors.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {outcome.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : result ? (
              <div className="mt-4 space-y-5">
                <p className="text-sm text-muted-foreground">
                  {display(result.areaM2)} m² {t("of floor at a")}{" "}
                  {result.layers.slab.thicknessMm} mm {t("slab")}.
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Package
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.cement.bags)} {result.cement.bagKg} kg{" "}
                        {t("bags of cement")}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {result.mix.key} {t("mix, dry volume")}{" "}
                        {display(result.mix.dryM3)} m³
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.sand.cubicMetres)} m³{" "}
                        {t("of sharp sand")}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {result.sand.trips.length > 0
                          ? result.sand.trips
                              .map(
                                (trip) =>
                                  `${display(trip.count)} ${t("trips")} (${trip.label.replace("Trip ", "")})`,
                              )
                              .join(" · ")
                          : `${display(result.sand.defaultUnitCount)} ${result.sand.defaultUnitLabel}`}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.sand.wheelbarrows)} {t("barrows")} ·{" "}
                        {display(result.sand.headPans)} {t("head pans")}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.aggregate.cubicMetres)} m³{" "}
                        {t(vocab.aggregateWord.toLowerCase())}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {result.aggregate.trips
                          .map(
                            (trip) =>
                              `${display(trip.count)} ${t("trips")} (${trip.label.replace("Trip ", "")})`,
                          )
                          .join(" · ")}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Layers
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.layers.hardcore.purchaseCubicMetres)} m³{" "}
                        {t(vocab.fillWord.toLowerCase())}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.layers.hardcore.thicknessMm)} mm{" "}
                        {t("compacted in layers, ordered loose")} ·{" "}
                        {display(result.layers.blinding.purchaseCubicMetres)} m³{" "}
                        {t("blinding")}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.membrane.orderM2)} m²{" "}
                        {t(vocab.membraneWord.toLowerCase())}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {t("Covers")} {display(result.membrane.netM2)} m²{" "}
                        {t("of floor plus")} {result.membrane.lapPercent}%{" "}
                        {t("for laps between rolls")}
                      </span>
                    </span>
                  </li>
                </ul>

                <div className="rounded-lg bg-muted px-3 py-3">
                  <p className="text-xs font-semibold text-foreground">
                    {t("How this was worked out")}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                    {result.assumptions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <AdSlot slotKey="calculator_inline" />

        <section aria-labelledby="floor-faq" className="space-y-4">
          <h2
            id="floor-faq"
            className="font-heading text-2xl font-bold text-foreground"
          >
            {t("Frequently asked questions")}
          </h2>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("What is a German floor?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "A German floor is the ground bearing slab a Nigerian building sits on. The build up is compacted hardcore, a thin sand blinding, a damp proof membrane, and a reinforced concrete slab. It is called a German floor on site, but the same floor is a ground bearing slab in the UK and a slab on grade in the US, and the quantities come from the same geometry wherever it is built.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many bags of cement for a German floor of 1 plot?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "A full plot is about 465 m². At a 100 mm slab in a 1:2:4 mix, the wet slab is 46.5 m³, which with a 5 percent allowance and a 1.54 dry factor is about 75 m³ of dry concrete. One part of seven is cement, so roughly 10.7 m³, and at 1440 kg per cubic metre in 50 kg bags that is about 310 bags. Read the figure off the calculator for your own slab thickness and mix before you order.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How thick should a German floor slab be?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Residential work is usually 100 mm to 150 mm over a well compacted fill, with reinforcement placed in the lower third of the slab. Anything thinner is hard to keep level and cracks under a loaded wheelbarrow. Confirm the thickness and reinforcement with the engineer on your job, because the slab also carries any internal blockwork that lands on it.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many trips of granite does a German floor need?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Granite is counted from the same mix as the cement, and the calculator shows the count for each tipper size this market sells, because a 5 tonne and a 20 tonne tipper give very different trip counts for the same volume. Buy the aggregate against the cubic metres, not only against the trips, so a short load does not leave the gang standing.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("Does the hardcore depth change the concrete quantity?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "No. Hardcore and blinding sit under the slab and are counted in their own volumes, so deepening the fill adds trips of laterite and blinding sand but leaves the slab concrete unchanged. What the fill must achieve is a level, well compacted surface, because the slab spans the ground rather than bridging soft spots.",
            )}
          </p>
        </section>
      </Container>
    </>
  );
}
