import { useCallback, useMemo, useRef, useState } from "react";
import {
  ConstructionExtractionError,
  requestConstructionExtraction,
  type DocumentKind,
} from "@/lib/construction-extraction";
import {
  buildingFromMeasurements,
  measurementsFromExtraction,
  roofFromExtraction,
  roomReconciliation,
  roomsFromExtraction,
  type PlanMeasurements,
  type PlanRoof,
  type RoomReading,
} from "@/lib/takeoff/plan-measurements";
import { savePlanRoof } from "@/lib/measurement/plan-roof-store";
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
  const [roomReading, setRoomReading] = useState<RoomReading | null>(null);
  const [roof, setRoof] = useState<PlanRoof | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const reset = useCallback(() => {
    setMeasurements(null);
    setRoomReading(null);
    setRoof(null);
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

      // A roof plan is read for the roof calculators, not for a wall schedule:
      // it carries pitch, overhang and the roof's own overall dimensions.
      if (kind === "roof_plan") {
        const outcome = roofFromExtraction(extraction);
        if (!outcome.ok) {
          setError(outcome.reason);
          return;
        }
        setRoof(outcome.roof);
        return;
      }

      const outcome = measurementsFromExtraction(extraction);
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setMeasurements(outcome.measurements);
      setRoomReading(roomsFromExtraction(extraction, outcome.measurements.storeyHeight.value));
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

  const applyRoof = useCallback(() => {
    if (!roof) return;
    savePlanRoof(roof);
    setStatus(
      `Roof saved for the roof calculators: ${roof.lengthM.toFixed(2)} m by ${roof.widthM.toFixed(2)} m, pitch ${roof.pitchDegrees.toFixed(2)} degrees (${roof.risePer12.toFixed(2)} rise per 12), overhang ${roof.overhangM.toFixed(2)} m${roof.shape ? `, shape ${roof.shape}` : ""}.`,
    );
  }, [roof]);

  const apply = useCallback(() => {
    if (!measurements) return;
    const rooms = roomReading?.rooms ?? [];
    const building = buildingFromMeasurements(measurements, rooms);
    setBuilding(building);
    const shape = rooms.length
      ? `${rooms.length} room${rooms.length === 1 ? "" : "s"} inside a ${measurements.length.value.toFixed(2)} m by ${measurements.width.value.toFixed(2)} m footprint`
      : `${measurements.length.value.toFixed(2)} m by ${measurements.width.value.toFixed(2)} m envelope`;
    setStatus(
      `Measured building filled from ${fileName || "the drawing"}: ${shape}, ${measurements.storeyHeight.value.toFixed(2)} m storey height. Net wall area ${building.totals.netWallAreaM2.toFixed(2)} m².`,
    );
  }, [fileName, measurements, roomReading, setBuilding]);

  const reconciliation = useMemo(
    () => (measurements && roomReading ? roomReconciliation(measurements, roomReading.rooms) : null),
    [measurements, roomReading],
  );

  // Anything the reader could not use is named before the form is filled, and
  // nothing is filled until those lines have been read and accepted.
  const cautionLines = useMemo(() => {
    if (!measurements || !roomReading) return [];
    const lines = [...measurements.needsConfirmation];
    if (roomReading.refused.length > 0) {
      lines.push(
        `${roomReading.refused.length} room${roomReading.refused.length === 1 ? "" : "s"} could not be read and will not be in the schedule: ${roomReading.refused
          .map((r) => `${r.label} (${r.reason})`)
          .join("; ")}.`,
      );
    }
    if (reconciliation?.overMeasured) lines.push(reconciliation.note);
    return lines;
  }, [measurements, roomReading, reconciliation]);

  const blocked = !!measurements && cautionLines.length > 0 && !confirmed;

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

      {roof ? (
        <div className="mt-3 rounded-lg border border-border p-3">
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Roof length and width</dt>
              <dd className="font-medium text-foreground">
                {roof.lengthM.toFixed(2)} m by {roof.widthM.toFixed(2)} m
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Pitch</dt>
              <dd className="font-medium text-foreground">
                {roof.pitchDegrees.toFixed(2)} degrees
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {roof.risePer12.toFixed(2)} rise per 12
                </span>
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Eave overhang</dt>
              <dd className="font-medium text-foreground">{roof.overhangM.toFixed(2)} m</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Ridge</dt>
              <dd className="font-medium text-foreground">
                {roof.ridgeLengthM === null ? "not stated" : `${roof.ridgeLengthM.toFixed(2)} m`}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Shape</dt>
              <dd className="font-medium text-foreground">{roof.shape ?? "not stated"}</dd>
            </div>
          </dl>

          {roof.needsConfirmation.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <ul className="list-disc pl-4">
                {roof.needsConfirmation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            onClick={applyRoof}
          >
            Use in the roof calculators
          </button>
        </div>
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

          {roomReading && roomReading.rooms.length > 0 ? (
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-foreground">Rooms on the drawing</h3>
              <ul className="mt-1 divide-y divide-border text-sm">
                {roomReading.rooms.map((room) => (
                  <li key={room.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-1">
                    <span className="text-foreground">{room.label}</span>
                    <span className="text-muted-foreground">
                      {room.lengthM.toFixed(2)} by {room.widthM.toFixed(2)} m
                      <span className="ml-2">
                        {room.heightM.toFixed(2)} m high
                        {room.heightAssumed ? " (storey height)" : ""}
                      </span>
                      <span className="ml-2">
                        {room.doors} door{room.doors === 1 ? "" : "s"}, {room.windows} window
                        {room.windows === 1 ? "" : "s"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {reconciliation ? (
                <p className="mt-2 text-xs text-muted-foreground">{reconciliation.note}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Rooms are measured as separate spaces, so a wall between two rooms is measured on both
                of its faces. That is the right quantity for plaster and paint, and it is not the
                external wall quantity for blockwork.
              </p>
            </div>
          ) : null}

          {cautionLines.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <ul className="list-disc pl-4">
                {cautionLines.map((line) => (
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
            {roomReading && roomReading.rooms.length > 0
              ? "Fill the measured rooms"
              : "Fill the measured building"}
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
