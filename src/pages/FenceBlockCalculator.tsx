import { useMemo, useState } from "react";
import { Ruler, Layers, BrickWall, Truck } from "lucide-react";
import Container from "@/components/ui/Container";
import MeasurementTip from "@/components/ui/MeasurementTip";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";
import {
  PLOT_PRESETS,
  masonryUnitsForMarket,
  type MasonryUnitKey,
  type PlotPresetKey,
} from "@/config/masonry-units";
import { calculateFenceBlockwork } from "@/lib/estimation/fence-blockwork";
import {
  formatHeight,
  regionalVocabulary,
  vocabularyMarkets,
} from "@/lib/localization/regional-vocabulary";

const labelClass = "text-sm font-medium text-foreground";
const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const display = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

const COACH_CHOICES = [3, 4, 5, 6, 7, 8, 9, 10];

export default function FenceBlockCalculator() {
  const { t } = useLanguage();
  useSeo({
    title: "Fence and Coach Block Calculator: Blocks, Cement and Sand | FRELUX",
    description:
      "Work out how many blocks, bags of cement and trips of sharp sand a perimeter fence needs. Enter the plot size, how many coaches high the wall is and the block you are using.",
  });

  const [market, setMarket] = useState("NG");
  const [preset, setPreset] = useState<PlotPresetKey | "custom">("full-plot");
  const [custom, setCustom] = useState({ length: "30.48", width: "15.24" });
  const [coaches, setCoaches] = useState(5);
  const [unitKey, setUnitKey] = useState<MasonryUnitKey>("ng-block-9");
  const [gateWidth, setGateWidth] = useState("3");
  const [gateCoaches, setGateCoaches] = useState("4");
  const [foundationCourses, setFoundationCourses] = useState("3");

  const vocab = regionalVocabulary(market);
  const units = vocabularyMarkets();

  const outcome = useMemo(
    () =>
      calculateFenceBlockwork({
        market,
        plotPreset: preset === "custom" ? null : preset,
        lengthM: Number(custom.length),
        widthM: Number(custom.width),
        coaches,
        unitKey,
        gateWidthM: Number(gateWidth),
        gateCoaches: Number(gateCoaches),
        foundationCourses: Number(foundationCourses),
      }),
    [
      market,
      preset,
      custom.length,
      custom.width,
      coaches,
      unitKey,
      gateWidth,
      gateCoaches,
      foundationCourses,
    ],
  );

  const result = outcome.result;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: t("Construction Tools"), path: "/construction-tools" },
          { label: t("Fence Block Calculator") },
        ]}
        eyebrow={t("Blockwork")}
        title={t("Fence and Coach Block Calculator")}
        subtitle={t(
          "Enter the plot size, how many coaches high the wall is and the block you are using. Every quantity is calculated from the wall geometry and stated with its assumptions.",
        )}
        actions={
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {t("Market")}
            <select
              aria-label={t("Market")}
              value={market}
              onChange={(event) => {
                const next = event.target.value;
                setMarket(next);
                // The block list is built from this market, so the selection
                // has to land on a unit that exists in it. Hard coding
                // ng-block-9 left US on a CMU the radios could not show and
                // left UK and India on a Nigerian block.
                setUnitKey(masonryUnitsForMarket(next)[0].key);
              }}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {units.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.marketName}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <Container className="max-w-5xl space-y-10 pb-16 pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="fence-inputs"
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <h2
              id="fence-inputs"
              className="font-heading text-lg font-semibold text-foreground"
            >
              {t("Three inputs")}
            </h2>

            <div className="mt-4">
              <MeasurementTip what="market, block size and plot measurement" />
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <span className={labelClass}>{t("Land size")}</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(PLOT_PRESETS) as PlotPresetKey[]).map((key) => {
                    const option = PLOT_PRESETS[key];
                    const active = preset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPreset(key)}
                        className={
                          active
                            ? "rounded-lg border border-primary bg-primary/10 px-2 py-2 text-xs font-semibold text-foreground"
                            : "rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                        }
                      >
                        {t(option.label)}
                        <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                          {option.idiom}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={preset === "custom"}
                    onClick={() => setPreset("custom")}
                    className={
                      preset === "custom"
                        ? "rounded-lg border border-primary bg-primary/10 px-2 py-2 text-xs font-semibold text-foreground"
                        : "rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                    }
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
                <label className="block" htmlFor="fence-coaches">
                  <span className={labelClass}>{t(vocab.heightLabel)}</span>
                  <input
                    id="fence-coaches"
                    type="number"
                    min={1}
                    max={40}
                    step={1}
                    inputMode="numeric"
                    value={coaches}
                    onChange={(event) => setCoaches(Number(event.target.value))}
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(vocab.heightHint)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COACH_CHOICES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={coaches === value}
                      onClick={() => setCoaches(value)}
                      className={
                        coaches === value
                          ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs font-semibold"
                          : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block" htmlFor="fence-gate-width">
                  <span className={labelClass}>{t("Gate width (m)")}</span>
                  <input
                    id="fence-gate-width"
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    value={gateWidth}
                    onChange={(event) => setGateWidth(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("0 if the wall has no opening")}
                  </span>
                </label>
                <label className="block" htmlFor="fence-gate-coaches">
                  <span className={labelClass}>
                    {t("Gate height (coaches)")}
                  </span>
                  <input
                    id="fence-gate-coaches"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={gateCoaches}
                    onChange={(event) => setGateCoaches(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("Capped at the wall height")}
                  </span>
                </label>
              </div>

              <label className="block" htmlFor="fence-foundation">
                <span className={labelClass}>
                  {t("Courses below ground (foundation)")}
                </span>
                <input
                  id="fence-foundation"
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  inputMode="numeric"
                  value={foundationCourses}
                  onChange={(event) => setFoundationCourses(event.target.value)}
                  className={`${fieldClass} mt-1`}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t(
                    "Courses below ground level over a strip footing. Enter 0 for a wall counted above ground only",
                  )}
                </span>
              </label>

              <fieldset>
                <legend className={labelClass}>{t("Block size")}</legend>
                <div className="mt-2 space-y-2">
                  {masonryUnitsForMarket(market).map((option) => {
                    const key = option.key;
                    const title = t(option.label);
                    const hint = `${(option.thicknessM * 1000).toFixed(0)} mm thick`;
                    return (
                      <label
                        key={key}
                        className={
                          unitKey === key
                            ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary bg-primary/5 px-3 py-2"
                            : "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2"
                        }
                      >
                        <input
                          type="radio"
                          name="block-size"
                          value={key}
                          checked={unitKey === key}
                          onChange={() => setUnitKey(key)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {hint}, {(option.lengthM * 1000).toFixed(0)} mm
                            long, {(option.heightM * 1000).toFixed(0)} mm high
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </section>

          <section
            aria-labelledby="fence-results"
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <h2
              id="fence-results"
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
                  {t("A wall")} {display(result.wall.coaches)}{" "}
                  {t(vocab.coachWordPlural)} {t("high")}, (
                  {formatHeight(result.wall.heightM, market)}),{" "}
                  {display(result.site.perimeterM)} m {t("of perimeter")}.
                  {result.gate.widthM > 0
                    ? ` ${t("A")} ${display(result.gate.widthM)} m ${t(
                        "gate",
                      )} ${display(result.gate.coaches)} ${t(
                        vocab.coachWordPlural,
                      )} ${t("high is deducted")}.`
                    : ""}
                  {result.foundation.courses > 0
                    ? ` ${display(result.foundation.courses)} ${t(
                        "courses below ground are included over the strip footing",
                      )}.`
                    : ""}
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <BrickWall
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.blocks.total)} {t(result.unit.noun)}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.blocks.net)} {t("laid")} +{" "}
                        {display(result.blocks.breakage)} {t("for breakage")}
                        {result.foundation.blocksTotal > 0
                          ? `, ${display(
                              result.foundation.blocksTotal,
                            )} ${t("of them below ground")}`
                          : ""}
                        {result.gate.deductedAreaM2 > 0
                          ? `, ${display(
                              result.gate.deductedAreaM2,
                            )} m² ${t("opening deducted")}`
                          : ""}
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
                        {display(result.cement.bags)} {t(vocab.cementBagLabel)}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.mortar.dryM3)} m³{" "}
                        {t("of dry mortar at")} 1:{result.mortar.ratio}
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
                          : `${display(result.sand.defaultUnitCount)} ${vocab.sandPurchaseLabel.toLowerCase()}`}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.sand.wheelbarrows)} {t("barrows")} ·{" "}
                        {display(result.sand.headPans)} {t("head pans")}
                      </span>
                    </span>
                  </li>
                  {result.foundation.footingConcreteM3 > 0 ? (
                    <li className="flex items-start gap-3">
                      <Layers
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {display(result.foundation.footingConcreteM3)} m³{" "}
                          {t("of strip footing concrete")}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {display(result.foundation.cementBags)}{" "}
                          {t(vocab.cementBagLabel)} {t("and")}{" "}
                          {display(result.foundation.sandM3)} m³ {t("sand and")}{" "}
                          {display(result.foundation.aggregateM3)} m³{" "}
                          {t("granite in the totals above")}
                        </span>
                      </span>
                    </li>
                  ) : null}
                  <li className="flex items-start gap-3">
                    <Ruler
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-muted-foreground"
                    />
                    <span className="text-sm text-foreground">
                      <strong className="font-semibold">
                        {display(result.wall.areaM2)} m² {t("of wall")}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {display(result.blocks.perSquareMetre)}{" "}
                        {t(vocab.unitWordPlural)} {t("per square metre")}
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

        <section aria-labelledby="fence-faq" className="space-y-4">
          <h2
            id="fence-faq"
            className="font-heading text-2xl font-bold text-foreground"
          >
            {t("Frequently asked questions")}
          </h2>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many 6 inch blocks do I need for a 1 plot fence?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "A full plot measures 100 ft by 50 ft, which is 30.48 m by 15.24 m and gives a perimeter of 91.44 m. A 6 inch block and a 9 inch block have the same face, 450 mm long and 225 mm high, so both take the same count: about 9.25 blocks per square metre of wall once the 10 mm joint is included. At five coaches high, roughly 1.18 m, the wall area is about 107 m² and you need just over 1,000 blocks before breakage. The 6 inch block is thinner, so it uses less mortar, not fewer blocks.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many coaches high should a fence wall be?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Most residential perimeter walls in Nigeria are built between four and seven coaches high, which is 0.94 m to 1.65 m. Check the height your local authority or estate allows before you buy materials: a wall that has to be cut down wastes both blocks and mortar.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many bags of cement will plaster a fence wall?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Plaster is a separate calculation from blockwork. This page returns the cement and sand in the mortar between the blocks only. A 12 mm to 15 mm plaster on both faces of a wall of about 107 m² commonly takes 12 to 16 bags of 50 kg cement in a 1:4 mix, and you should confirm the thickness and mix your mason intends to use before ordering.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("How many trips of sand does a fence need?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Trips depend on the lorry, not just the volume, so the result shows every tipper size this market sells sand in. A 10 tonne tipper carries about 6.25 m³, a 5 tonne tipper about 3.1 m³, and you should pay for the size you actually receive. The same sand is also shown in wheelbarrows and head pans, which is how the gang will measure it out on site.",
            )}
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t("Does this calculator include pillars and a gate?")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "No. It counts a continuous wall around the perimeter. Pillars are usually built in the thicker 9 inch block and add material, and a gate opening reduces the wall area. Work those two out as separate quantities and add them, rather than accepting a single figure that quietly leaves them out.",
            )}
          </p>
        </section>
      </Container>
    </>
  );
}
