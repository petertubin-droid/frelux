import { useCallback, useRef, useState } from "react";
import {
  ConstructionExtractionError,
  requestConstructionExtraction,
  type DocumentKind,
} from "@/lib/construction-extraction";
import {
  buildingFromMeasurements,
  measurementsFromExtraction,
  type PlanMeasurements,
} from "@/lib/takeoff/plan-measurements";
import { useBuildingSize } from "@/lib/measurement/building-size-context";

/**
 * Read a drawing and put the measurements it states into the measured building.
 *
 * The screen is deliberately narrow: it shows what the reader found, with the
 * unit and the evidence, and it will not fill the form with a value that was
 * guessed by eye. It never names a quantity of material or a price; the engines
 * do that after the numbers are in.
 */

const KINDS: { id: DocumentKind; label: string }[] = [
  { id: "architectural_plan", label: "Building plan" },
  { id: "roof_plan", label: "Roof plan" },
  { id: "building_photo", label: "Site photograph" },
];

const MAX_BYTES = 10 * 1024 * 1024;

function ValueRow({
  label,
  metres,
  unit,
  raw,
  source,
  evidence,
}: {
  label: string;
  metres: number;
  unit: string;
  raw: number;
  source: string;
  evidence?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">
        {metres.toFixed(2)} m
        {unit !== "m" ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            read as {raw} {unit}
          </span>
        ) : null}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{source.replace(/_/g, " ")}</span>
        {evidence ? (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{evidence}</span>
        ) : null}
      </dd>
    </div>
  );
}

export function PlanMeasurementImporter() {
  const { setBuilding } = useBuildingSize();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("architectural_plan");
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [measurements, setMeasurements] = useState<PlanMeasurements | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const reset = useCallback(() => {
    setMeasurements(null);
    setConfirmed(false);
    setStatus("");
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      reset();
      setError("");
      if (file.size > MAX_BYTES) {
        setFileName("");
        setDataUrl("");
        setError("That file is larger than 10MB. Use a smaller image, or type the measurements.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setDataUrl(String(reader.result || ""));
        setFileName(file.name);
      };
      reader.onerror = () => {
        setDataUrl("");
        setError("That file could not be read. Try another file, or type the measurements.");
      };
      reader.readAsDataURL(file);
    },
    [reset],
  );

  const analyse = useCallback(async () => {
    if (!dataUrl) return;
    reset();
    setError("");
    setBusy(true);
    try {
      const extraction = await requestConstructionExtraction({ documentKind: kind, documentDataUrl: dataUrl });
      const outcome = measurementsFromExtraction(extraction);
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setMeasurements(outcome.measurements);
    } catch (caught) {
      setError(
        caught instanceof ConstructionExtractionError
          ? caught.message
          : "The drawing could not be read. You can still type the measurements.",
      );
    } finally {
      setBusy(false);
    }
  }, [dataUrl, kind, reset]);

  const apply = useCallback(() => {
    if (!measurements) return;
    const building = buildingFromMeasurements(measurements);
    setBuilding(building);
    setStatus(
      `Measured building filled from ${fileName || "the drawing"}: ${measurements.length.value.toFixed(2)} m by ${measurements.width.value.toFixed(2)} m, ${measurements.storeyHeight.value.toFixed(2)} m storey height, ${measurements.storeys.value} floor${measurements.storeys.value === 1 ? "" : "s"}. Net wall area ${building.totals.netWallAreaM2.toFixed(2)} m².`,
    );
  }, [fileName, measurements, setBuilding]);

  const blocked = !!measurements && measurements.needsConfirmation.length > 0 && !confirmed;

  return (
    <section
      aria-labelledby="plan-measurements-heading"
      className="rounded-xl border border-border bg-card p-4"
    >
      <h2 id="plan-measurements-heading" className="text-sm font-semibold text-foreground">
        Read measurements from a plan
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        The reader reports the dimensions the drawing states. It does not size materials or prices;
        the calculators do that from the numbers below, and you can edit them afterwards.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-foreground">
          Document
          <select
            className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as DocumentKind);
              reset();
            }}
          >
            {KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          aria-label="Plan file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium"
          onClick={() => inputRef.current?.click()}
        >
          {fileName ? "Choose another file" : "Choose a plan"}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!dataUrl || busy}
          onClick={() => void analyse()}
        >
          {busy ? "Reading the drawing" : "Read measurements"}
        </button>
      </div>

      {fileName ? (
        <p className="mt-2 text-xs text-muted-foreground">{fileName} selected.</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {measurements ? (
        <div className="mt-3 rounded-lg border border-border p-3">
          <dl className="grid gap-2 text-sm">
            <ValueRow
              label="Building length"
              metres={measurements.length.value}
              unit={measurements.length.unit}
              raw={measurements.length.rawValue}
              source={measurements.length.source}
              evidence={measurements.length.evidence}
            />
            <ValueRow
              label="Building width"
              metres={measurements.width.value}
              unit={measurements.width.unit}
              raw={measurements.width.rawValue}
              source={measurements.width.source}
              evidence={measurements.width.evidence}
            />
            <ValueRow
              label="Storey height"
              metres={measurements.storeyHeight.value}
              unit={measurements.storeyHeight.unit}
              raw={measurements.storeyHeight.rawValue}
              source={measurements.storeyHeight.source}
              evidence={measurements.storeyHeight.evidence}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Floors</dt>
              <dd className="font-medium text-foreground">
                {measurements.storeys.value}
                {measurements.storeys.assumed ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">assumed</span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Doors</dt>
              <dd className="font-medium text-foreground">
                {measurements.doors.count} at {measurements.doors.widthM.toFixed(2)} by{" "}
                {measurements.doors.heightM.toFixed(2)} m
                {measurements.doors.assumedSize ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">size assumed</span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Windows</dt>
              <dd className="font-medium text-foreground">
                {measurements.windows.count} at {measurements.windows.widthM.toFixed(2)} by{" "}
                {measurements.windows.heightM.toFixed(2)} m
                {measurements.windows.assumedSize ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">size assumed</span>
                ) : null}
              </dd>
            </div>
          </dl>

          {measurements.needsConfirmation.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <ul className="list-disc pl-4">
                {measurements.needsConfirmation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <label className="mt-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>I have checked these against the drawing.</span>
              </label>
            </div>
          ) : null}

          <button
            type="button"
            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={blocked}
            onClick={apply}
          >
            Fill the measured building
          </button>
        </div>
      ) : null}

      {status ? (
        <p role="status" className="mt-3 text-sm text-foreground">
          {status}
        </p>
      ) : null}
    </section>
  );
}

export default PlanMeasurementImporter;
