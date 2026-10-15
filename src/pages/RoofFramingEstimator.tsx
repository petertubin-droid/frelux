import { useState } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import {
  calculateRoofFraming,
  type RoofFramingInput,
  type RoofFramingResult,
} from "@/lib/estimation/advanced-takeoff-engine";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const format = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
const blankSections = (): RoofFramingInput["sections"] => ({
  common: { widthIn: 0, depthIn: 0 },
  jack: { widthIn: 0, depthIn: 0 },
  hip: { widthIn: 0, depthIn: 0 },
  ridge: { widthIn: 0, depthIn: 0 },
});

type Form = {
  lengthM: string;
  widthM: string;
  pitchRisePer12: string;
  overhangM: string;
  spacingM: string;
  roofType: "gable" | "hip";
  sections: Record<
    keyof RoofFramingInput["sections"],
    { widthIn: string; depthIn: string }
  >;
  extra: {
    label: string;
    count: string;
    lengthM: string;
    widthIn: string;
    depthIn: string;
  }[];
};
const initialForm = (): Form => ({
  lengthM: "",
  widthM: "",
  pitchRisePer12: "",
  overhangM: "",
  spacingM: "",
  roofType: "gable",
  sections: {
    common: { widthIn: "", depthIn: "" },
    jack: { widthIn: "", depthIn: "" },
    hip: { widthIn: "", depthIn: "" },
    ridge: { widthIn: "", depthIn: "" },
  },
  extra: [],
});

export default function RoofFramingEstimator() {
  useSeo({
    title: "Roof Framing & Board-Foot Calculator | FRELUX",
    description:
      "Calculate common, jack, hip, and ridge member layouts, lengths, linear metres and board feet for a measured rectangular gable or hip roof.",
  });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<RoofFramingResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const run = () => {
    const response = calculateRoofFraming({
      lengthM: Number(form.lengthM),
      widthM: Number(form.widthM),
      pitchRisePer12: Number(form.pitchRisePer12),
      overhangM: Number(form.overhangM),
      spacingM: Number(form.spacingM),
      roofType: form.roofType,
      sections: Object.fromEntries(
        Object.entries(form.sections).map(([key, section]) => [
          key,
          {
            widthIn: Number(section.widthIn),
            depthIn: Number(section.depthIn),
          },
        ]),
      ) as RoofFramingInput["sections"],
      additionalMembers: form.extra.map((member) => ({
        label: member.label,
        count: Number(member.count),
        lengthM: Number(member.lengthM),
        widthIn: Number(member.widthIn),
        depthIn: Number(member.depthIn),
      })),
    });
    setErrors(response.errors);
    setResult(response.data);
  };
  const addExtra = () =>
    update("extra", [
      ...form.extra,
      { label: "", count: "", lengthM: "", widthIn: "", depthIn: "" },
    ]);
  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Roof structure takeoff"
        title="Roof Framing & Board Feet"
        subtitle="Plan member quantities from a measured rectangular roof, requested rafter spacing, and your selected timber sections. Geometry and board feet stay visible, while complex valleys remain tied to your verified drawing or schedule."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Roof Framing" },
        ]}
      />
      <Container className="py-8 sm:py-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,.8fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">Roof geometry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use measured wall dimensions and choose a simple rectangular roof
              type.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Roof type
                <select
                  className={inputClass}
                  value={form.roofType}
                  onChange={(e) =>
                    update("roofType", e.target.value as Form["roofType"])
                  }
                >
                  <option value="gable">Gable</option>
                  <option value="hip">Equal-pitch hip</option>
                </select>
              </label>
              {(
                [
                  ["lengthM", "Building length (m)"],
                  ["widthM", "Building width (m)"],
                  ["pitchRisePer12", "Roof pitch (rise per 12 horizontal)"],
                  ["overhangM", "Eave overhang (m)"],
                  ["spacingM", "Maximum rafter spacing (m)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm font-medium">
                  {label}
                  <input
                    aria-label={label}
                    className={inputClass}
                    type="number"
                    min="0"
                    step="any"
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="Enter measured/specification value"
                  />
                </label>
              ))}
            </div>
            <h3 className="mt-7 text-base font-semibold">Timber sections</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter actual section dimensions in inches. Board feet are
              calculated only from these inputs.
            </p>
            <div className="mt-3 grid gap-3">
              {(
                Object.keys(form.sections) as Array<keyof Form["sections"]>
              ).map((key) => (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_1fr_1fr] items-end gap-2 rounded-xl bg-muted/35 p-3"
                >
                  <p className="pb-2 text-sm font-medium capitalize">
                    {key === "common"
                      ? "Common rafters"
                      : key === "jack"
                        ? "Jack rafters"
                        : key === "hip"
                          ? "Hip rafters"
                          : "Ridge member"}
                  </p>
                  {(["widthIn", "depthIn"] as const).map((dimension) => (
                    <label
                      key={dimension}
                      className="grid gap-1 text-xs text-muted-foreground"
                    >
                      {dimension === "widthIn" ? "Width (in)" : "Depth (in)"}
                      <input
                        aria-label={`${key} ${dimension}`}
                        className={inputClass}
                        type="number"
                        min="0"
                        step="any"
                        value={form.sections[key][dimension]}
                        onChange={(e) =>
                          update("sections", {
                            ...form.sections,
                            [key]: {
                              ...form.sections[key],
                              [dimension]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  Additional measured members
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add purlins, ties, trimmers or valley members only from a
                  measured drawing or engineer schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={addExtra}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
              >
                + Add schedule row
              </button>
            </div>
            {form.extra.map((member, index) => (
              <div
                key={index}
                className="mt-3 grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-5"
              >
                {(
                  [
                    ["label", "Member label"],
                    ["count", "Count"],
                    ["lengthM", "Length (m)"],
                    ["widthIn", "Width (in)"],
                    ["depthIn", "Depth (in)"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="grid gap-1 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                    <input
                      className={inputClass}
                      type={key === "label" ? "text" : "number"}
                      min={
                        key === "count" ||
                        key === "lengthM" ||
                        key === "widthIn" ||
                        key === "depthIn"
                          ? "0"
                          : undefined
                      }
                      step="any"
                      value={member[key]}
                      onChange={(e) =>
                        update(
                          "extra",
                          form.extra.map((row, i) =>
                            i === index
                              ? { ...row, [key]: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "extra",
                      form.extra.filter((_, i) => i !== index),
                    )
                  }
                  className="text-left text-xs text-destructive"
                >
                  Remove schedule row
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={run}
              className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Calculate framing takeoff
            </button>
            {errors.length > 0 && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50/60 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
              >
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
          </section>
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">
              Quantity schedule
            </p>
            <h2 className="mt-2 text-xl font-bold">Timber report</h2>
            {result ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total board feet
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {format(result.totalBoardFeet)} BF
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total linear timber
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {format(result.totalLinearM)} m
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Ridge length
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {format(result.ridgeLengthM)} m
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Roof rise</p>
                    <p className="mt-1 text-xl font-bold">
                      {format(result.roofRiseM)} m
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-semibold">Member layout</h3>
                  {result.groups.map((group) => (
                    <div
                      key={group.label}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm">{group.label}</b>
                        <span className="text-sm">
                          {group.count} × {format(group.lengthM)} m
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.layout}
                      </p>
                      <p className="mt-1 text-xs font-medium">
                        Section {group.widthIn}″ × {group.depthIn}″ ·{" "}
                        {format(group.boardFeet)} BF
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                  {result.valleyStatus}
                </div>
                <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  {result.assumptions.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Enter measured roof geometry and section sizes. A schedule row
                is available for measured purlins and valleys.
              </p>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}
