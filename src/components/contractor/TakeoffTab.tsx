/**
 * Takeoff studio.
 *
 * The measured schedule and the bill the engine derives from it, side by side.
 * Every number in the bill is computed by src/lib/takeoff from the dimension the
 * contractor typed, and every line can show its working.
 *
 * No figure on this screen is inferred: an empty field stays empty and the
 * engine reports what it could not measure rather than filling the gap.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Plus,
  Ruler,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { getSafeError } from "@/lib/safeError";
import {
  ALL_SCOPES,
  SCOPE_LABELS,
  runTakeoff,
  takeoffToCsv,
  roomsFromCandidates,
  type ScheduleCandidate,
  type ScheduleReaderResult,
  type ScheduleInput,
  type TakeoffLine,
  type TakeoffScope,
  type TakeoffSpecs,
  type LengthUnit,
} from "@/lib/takeoff";
import { extractScheduleFromPdf } from "@/lib/takeoff/pdf-schedule";
import {
  deleteProjectTakeoff,
  fetchProjectTakeoffs,
  saveProjectTakeoff,
  type DbProjectTakeoff,
} from "@/lib/takeoff/persistence";

const DEFAULT_SCOPES: TakeoffScope[] = [
  "blockwork",
  "render",
  "paint",
  "floor_tiles",
  "screed",
  "skirting",
];

const UNIT_LABEL: Record<string, string> = {
  m2: "m²",
  m3: "m³",
  m: "m",
  nr: "nr",
  kg: "kg",
  L: "L",
  packs: "packs",
};

const newRoom = (index: number) => ({
  id: `room-${Date.now()}-${index}`,
  label: `Room ${index + 1}`,
  walls: [
    {
      id: `wall-${Date.now()}-${index}-1`,
      length: 0,
      height: 0,
      unit: "m" as LengthUnit,
      openings: [],
    },
  ],
  floor: {
    id: `floor-${Date.now()}-${index}`,
    length: 0,
    width: 0,
    unit: "m" as LengthUnit,
  },
});

const emptySchedule = (): ScheduleInput => ({
  id: "takeoff",
  label: "Takeoff",
  rooms: [newRoom(0)],
});

const numberFrom = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const optionalNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

function NumberField({
  id,
  label,
  value,
  onChange,
  step = "0.01",
  suffix,
  describedBy,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
  describedBy?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
        {suffix ? <span className="ml-1 font-normal">{suffix}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
    </div>
  );
}

function Derivation({ line }: { line: TakeoffLine }) {
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        Show working
      </summary>
      <div className="mt-1 space-y-1 border-l border-border pl-3">
        <p className="text-foreground">{line.derivation.formula}</p>
        <ul className="space-y-0.5">
          {Object.entries(line.derivation.inputs).map(([key, value]) => (
            <li key={key}>
              <span className="font-medium text-foreground/80">{key}</span>:{" "}
              {value}
            </li>
          ))}
        </ul>
        {line.derivation.steps?.length ? (
          <ol className="space-y-0.5">
            {line.derivation.steps.map((step) => (
              <li key={step.label}>
                {step.label}: {step.value}
                {step.unit ? ` ${step.unit}` : ""}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </details>
  );
}

function ScopeChip({
  scope,
  active,
  onToggle,
}: {
  scope: TakeoffScope;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-violet-600 bg-violet-600 text-white"
          : "border-input bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {SCOPE_LABELS[scope]}
    </button>
  );
}

export interface TakeoffTabProps {
  projectId: string;
  projectName: string;
}

export function TakeoffTab({ projectId, projectName }: TakeoffTabProps) {
  const [schedule, setSchedule] = useState<ScheduleInput>(emptySchedule);
  const [scopes, setScopes] = useState<TakeoffScope[]>(DEFAULT_SCOPES);
  const [specs, setSpecs] = useState<TakeoffSpecs>({});
  const [name, setName] = useState(`${projectName} takeoff`);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<DbProjectTakeoff[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [imported, setImported] = useState<ScheduleReaderResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importHeight, setImportHeight] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const result = useMemo(
    () => runTakeoff(schedule, { scopes, specs }),
    [schedule, scopes, specs],
  );

  const reloadSaved = useCallback(async () => {
    try {
      const rows = await fetchProjectTakeoffs(projectId);
      setSaved(rows);
      setLoadError(null);
    } catch (err) {
      setLoadError(getSafeError(err, "Could not load saved takeoffs."));
    }
  }, [projectId]);

  useEffect(() => {
    void reloadSaved();
  }, [reloadSaved]);

  const updateRoom = (
    roomIndex: number,
    next: ScheduleInput["rooms"][number],
  ) => {
    setSchedule((current) => ({
      ...current,
      rooms: current.rooms.map((room, index) =>
        index === roomIndex ? next : room,
      ),
    }));
  };

  const addRoom = () => {
    setSchedule((current) => ({
      ...current,
      rooms: [...current.rooms, newRoom(current.rooms.length)],
    }));
  };

  const removeRoom = (roomIndex: number) => {
    setSchedule((current) => ({
      ...current,
      rooms: current.rooms.filter((_, index) => index !== roomIndex),
    }));
  };

  const toggleScope = (scope: TakeoffScope) => {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  };

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const row = await saveProjectTakeoff({
        id: savedId ?? undefined,
        projectId,
        name,
        schedule,
        scopes,
        specs,
        result,
      });
      setSavedId(row.id);
      setNotice("Takeoff saved.");
      await reloadSaved();
    } catch (err) {
      setError(getSafeError(err, "Could not save the takeoff."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!savedId) return;
    try {
      setBusy(true);
      setError(null);
      await deleteProjectTakeoff(savedId);
      setSavedId(null);
      setNotice("Saved takeoff deleted.");
      await reloadSaved();
    } catch (err) {
      setError(getSafeError(err, "Could not delete the takeoff."));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSaved = (row: DbProjectTakeoff) => {
    setSavedId(row.id);
    setName(row.name);
    setSchedule((row.schedule as unknown as ScheduleInput) ?? emptySchedule());
    setScopes((row.scopes as TakeoffScope[]) ?? DEFAULT_SCOPES);
    setSpecs((row.specs as TakeoffSpecs) ?? {});
    setNotice(
      `Opened ${row.name}. The bill was re-measured from its schedule.`,
    );
  };

  const handlePdf = async (file: File) => {
    try {
      setReading(true);
      setImportError(null);
      setImported(null);
      setNotice(null);
      const read = await extractScheduleFromPdf(file);
      setImported(read);
      setSelected(
        read.candidates
          .filter((candidate) => candidate.confidence !== "low")
          .map((candidate) => candidate.id),
      );
      if (read.scanned) {
        setNotice(
          "This PDF has no readable text, so it is a scan. Nothing was read from it.",
        );
      } else if (!read.candidates.length) {
        setNotice("No room dimensions were found in the readable text.");
      }
    } catch (err) {
      setImportError(getSafeError(err, "Could not read that PDF."));
    } finally {
      setReading(false);
    }
  };

  const applyImport = () => {
    if (!imported) return;
    const chosen = imported.candidates.filter((candidate) =>
      selected.includes(candidate.id),
    );
    if (!chosen.length) {
      setImportError("Select at least one room to add.");
      return;
    }
    const height = optionalNumber(importHeight) ?? 0;
    const rooms = roomsFromCandidates(chosen, height);
    setSchedule((current) => {
      const measured = current.rooms.filter(
        (room) =>
          (room.walls ?? []).some(
            (wall) => wall.length > 0 && wall.height > 0,
          ) || (room.floor?.length ?? 0) > 0,
      );
      return { ...current, rooms: [...measured, ...rooms] };
    });
    setImported(null);
    setSelected([]);
    setImportError(null);
    setNotice(
      `${chosen.length} room${chosen.length === 1 ? "" : "s"} added from the plan${
        height > 0
          ? "."
          : ". Their walls have no height yet, so nothing is measurable until you enter one."
      }`,
    );
  };

  const toggleCandidate = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const exportCsv = () => {
    const csv = takeoffToCsv(result);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "takeoff"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const assumedCount = result.assumedLineCount;
  const statusText = `${result.lines.length} bill lines, ${result.totals.length} units, ${assumedCount} with assumed inputs`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Ruler aria-hidden="true" className="h-4 w-4 text-violet-600" />
            Takeoff studio
          </h3>
          <p className="text-sm text-muted-foreground">
            Measure the rooms, choose the work, and read the bill the engine
            derives from your dimensions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!result.lines.length}
          >
            <Download aria-hidden="true" className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 text-white hover:bg-violet-700"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            <Save aria-hidden="true" className="mr-1 h-4 w-4" />
            Save takeoff
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section
          className="min-w-0 space-y-4"
          aria-labelledby="takeoff-schedule-heading"
        >
          <h4 id="takeoff-schedule-heading" className="sr-only">
            Measured schedule
          </h4>

          <div className="rounded-lg border border-border bg-card p-3">
            <label
              htmlFor="takeoff-name"
              className="block text-xs font-medium text-muted-foreground"
            >
              Takeoff name
            </label>
            <input
              id="takeoff-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {saved.length ? (
              <div className="mt-3">
                <label
                  htmlFor="takeoff-open"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Open a saved takeoff
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="takeoff-open"
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                    defaultValue=""
                    onChange={(event) => {
                      const row = saved.find(
                        (item) => item.id === event.target.value,
                      );
                      if (row) handleOpenSaved(row);
                    }}
                  >
                    <option value="" disabled>
                      Choose a saved takeoff
                    </option>
                    {saved.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete()}
                    disabled={!savedId || busy}
                    aria-label="Delete the saved takeoff"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <fieldset className="rounded-lg border border-border bg-card p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Work to measure
            </legend>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((scope) => (
                <ScopeChip
                  key={scope}
                  scope={scope}
                  active={scopes.includes(scope)}
                  onToggle={() => toggleScope(scope)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowSpecs((current) => !current)}
              aria-expanded={showSpecs}
              aria-controls="takeoff-specs"
              className="mt-3 rounded text-xs font-medium text-violet-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-violet-300"
            >
              {showSpecs ? "Hide material assumptions" : "Material assumptions"}
            </button>
            {showSpecs ? (
              <div
                id="takeoff-specs"
                className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                <NumberField
                  id="spec-block-length"
                  label="Block length"
                  suffix="mm"
                  step="5"
                  value={specs.blockwork?.blockLengthMm ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      blockwork: {
                        ...current.blockwork,
                        blockLengthMm: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-block-height"
                  label="Block height"
                  suffix="mm"
                  step="5"
                  value={specs.blockwork?.blockHeightMm ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      blockwork: {
                        ...current.blockwork,
                        blockHeightMm: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-render"
                  label="Render thickness"
                  suffix="mm"
                  step="1"
                  value={specs.render?.thicknessMm ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      render: {
                        ...current.render,
                        thicknessMm: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-coats"
                  label="Paint coats"
                  step="1"
                  value={specs.paint?.coats ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      paint: { ...current.paint, coats: optionalNumber(value) },
                    }))
                  }
                />
                <NumberField
                  id="spec-coverage"
                  label="Paint coverage"
                  suffix="m²/L"
                  step="0.5"
                  value={specs.paint?.coverageM2PerLitre ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      paint: {
                        ...current.paint,
                        coverageM2PerLitre: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-tile"
                  label="Tile size"
                  suffix="mm"
                  step="50"
                  value={specs.tiles?.tileLengthMm ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      tiles: {
                        ...current.tiles,
                        tileLengthMm: optionalNumber(value),
                        tileWidthMm: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-screed"
                  label="Screed thickness"
                  suffix="mm"
                  step="5"
                  value={specs.screed?.thicknessMm ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      screed: {
                        ...current.screed,
                        thicknessMm: optionalNumber(value),
                      },
                    }))
                  }
                />
                <NumberField
                  id="spec-skirting"
                  label="Skirting board"
                  suffix="m"
                  step="0.1"
                  value={specs.skirting?.boardLengthM ?? 0}
                  onChange={(value) =>
                    setSpecs((current) => ({
                      ...current,
                      skirting: {
                        ...current.skirting,
                        boardLengthM: optionalNumber(value),
                      },
                    }))
                  }
                />
                <p className="col-span-2 self-end text-xs text-muted-foreground sm:col-span-1">
                  Blank fields use the documented default for that material.
                </p>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="min-w-0 rounded-lg border border-border bg-card p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Import from a plan PDF
            </legend>
            <p className="text-xs text-muted-foreground">
              Reads the dimension text printed on the sheet. A scanned plan
              carries no text and is refused rather than guessed at.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-0">
                <label
                  htmlFor="takeoff-pdf"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Plan PDF
                </label>
                <input
                  id="takeoff-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handlePdf(file);
                  }}
                  className="mt-1 block w-full min-w-0 text-xs text-muted-foreground file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:text-foreground"
                />
              </div>
              <div className="w-28">
                <NumberField
                  id="import-height"
                  label="Wall height"
                  suffix="m"
                  step="0.05"
                  value={optionalNumber(importHeight) ?? 0}
                  onChange={setImportHeight}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={applyImport}
                disabled={!imported || !selected.length}
              >
                Add selected rooms
              </Button>
            </div>
            {reading ? (
              <p
                aria-live="polite"
                className="mt-2 text-xs text-muted-foreground"
              >
                Reading the sheet.
              </p>
            ) : null}
            {importError ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {importError}
              </p>
            ) : null}
            {imported ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {imported.pagesRead} page{imported.pagesRead === 1 ? "" : "s"}{" "}
                  read, {imported.candidates.length} room dimension
                  {imported.candidates.length === 1 ? "" : "s"} found,{" "}
                  {imported.openings.length} opening dimension
                  {imported.openings.length === 1 ? "" : "s"} set aside.
                  {imported.scaleNotes.length
                    ? ` Scale note ${imported.scaleNotes.join(", ")} was read but not applied.`
                    : ""}
                </p>
                {imported.candidates.length ? (
                  <ul className="space-y-2">
                    {imported.candidates.map((candidate) => (
                      <li
                        key={candidate.id}
                        className="rounded-md border border-border/70 p-2 text-sm"
                      >
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(candidate.id)}
                            onChange={() => toggleCandidate(candidate.id)}
                            className="mt-1 h-4 w-4"
                            aria-label={`Include ${candidate.label}`}
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-foreground">
                              {candidate.label}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {candidate.length} × {candidate.width} m
                            </span>
                            <span className="ml-2 rounded bg-muted px-1 text-xs uppercase tracking-wide text-muted-foreground">
                              {candidate.confidence}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Read from: {candidate.evidence}
                            </span>
                            {candidate.notes.length ? (
                              <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                                {candidate.notes.join(" ")}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {imported.openings.length ? (
                  <p className="text-xs text-muted-foreground">
                    Set aside as openings:{" "}
                    {imported.openings.map((opening) => opening.raw).join(", ")}
                    . Add them to a wall once the room exists.
                  </p>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          {schedule.rooms.map((room, roomIndex) => (
            <fieldset
              key={room.id}
              className="min-w-0 rounded-lg border border-border bg-card p-3"
            >
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {room.label || `Room ${roomIndex + 1}`}
              </legend>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`room-label-${room.id}`}
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    Room name
                  </label>
                  <input
                    id={`room-label-${room.id}`}
                    value={room.label ?? ""}
                    onChange={(event) =>
                      updateRoom(roomIndex, {
                        ...room,
                        label: event.target.value,
                      })
                    }
                    className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRoom(roomIndex)}
                  aria-label={`Remove ${room.label || `room ${roomIndex + 1}`}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {(room.walls ?? []).map((wall, wallIndex) => (
                  <div
                    key={wall.id}
                    className="rounded-md border border-border/70 p-2"
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <NumberField
                        id={`wall-length-${wall.id}`}
                        label={`Wall ${wallIndex + 1} length`}
                        value={wall.length}
                        onChange={(value) => {
                          const walls = (room.walls ?? []).map((item, index) =>
                            index === wallIndex
                              ? { ...item, length: numberFrom(value) }
                              : item,
                          );
                          updateRoom(roomIndex, { ...room, walls });
                        }}
                      />
                      <NumberField
                        id={`wall-height-${wall.id}`}
                        label={`Wall ${wallIndex + 1} height`}
                        value={wall.height}
                        onChange={(value) => {
                          const walls = (room.walls ?? []).map((item, index) =>
                            index === wallIndex
                              ? { ...item, height: numberFrom(value) }
                              : item,
                          );
                          updateRoom(roomIndex, { ...room, walls });
                        }}
                      />
                      <div className="min-w-0">
                        <label
                          htmlFor={`wall-unit-${wall.id}`}
                          className="block text-xs font-medium text-muted-foreground"
                        >
                          Unit
                        </label>
                        <select
                          id={`wall-unit-${wall.id}`}
                          value={wall.unit ?? "m"}
                          onChange={(event) => {
                            const walls = (room.walls ?? []).map(
                              (item, index) =>
                                index === wallIndex
                                  ? {
                                      ...item,
                                      unit: event.target.value as LengthUnit,
                                    }
                                  : item,
                            );
                            updateRoom(roomIndex, { ...room, walls });
                          }}
                          className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                        >
                          <option value="m">m</option>
                          <option value="mm">mm</option>
                          <option value="ft">ft</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const walls = (room.walls ?? []).filter(
                              (_, index) => index !== wallIndex,
                            );
                            updateRoom(roomIndex, { ...room, walls });
                          }}
                          aria-label={`Remove wall ${wallIndex + 1}`}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {(wall.openings ?? []).length ? (
                      <ul className="mt-2 space-y-2">
                        {(wall.openings ?? []).map((opening, openingIndex) => (
                          <li
                            key={opening.id}
                            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                          >
                            <NumberField
                              id={`opening-width-${opening.id}`}
                              label={`Opening ${openingIndex + 1} width`}
                              value={opening.width}
                              onChange={(value) => {
                                const openings = (wall.openings ?? []).map(
                                  (item, index) =>
                                    index === openingIndex
                                      ? { ...item, width: numberFrom(value) }
                                      : item,
                                );
                                const walls = (room.walls ?? []).map(
                                  (item, index) =>
                                    index === wallIndex
                                      ? { ...item, openings }
                                      : item,
                                );
                                updateRoom(roomIndex, { ...room, walls });
                              }}
                            />
                            <NumberField
                              id={`opening-height-${opening.id}`}
                              label={`Opening ${openingIndex + 1} height`}
                              value={opening.height}
                              onChange={(value) => {
                                const openings = (wall.openings ?? []).map(
                                  (item, index) =>
                                    index === openingIndex
                                      ? { ...item, height: numberFrom(value) }
                                      : item,
                                );
                                const walls = (room.walls ?? []).map(
                                  (item, index) =>
                                    index === wallIndex
                                      ? { ...item, openings }
                                      : item,
                                );
                                updateRoom(roomIndex, { ...room, walls });
                              }}
                            />
                            <div className="min-w-0">
                              <label
                                htmlFor={`opening-kind-${opening.id}`}
                                className="block text-xs font-medium text-muted-foreground"
                              >
                                Kind
                              </label>
                              <select
                                id={`opening-kind-${opening.id}`}
                                value={opening.kind ?? "door"}
                                onChange={(event) => {
                                  const openings = (wall.openings ?? []).map(
                                    (item, index) =>
                                      index === openingIndex
                                        ? {
                                            ...item,
                                            kind: event.target.value as
                                              "door" | "window" | "opening",
                                          }
                                        : item,
                                  );
                                  const walls = (room.walls ?? []).map(
                                    (item, index) =>
                                      index === wallIndex
                                        ? { ...item, openings }
                                        : item,
                                  );
                                  updateRoom(roomIndex, { ...room, walls });
                                }}
                                className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                              >
                                <option value="door">Door</option>
                                <option value="window">Window</option>
                                <option value="opening">Opening</option>
                              </select>
                            </div>
                            <div className="flex items-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Remove opening ${openingIndex + 1}`}
                                onClick={() => {
                                  const openings = (wall.openings ?? []).filter(
                                    (_, index) => index !== openingIndex,
                                  );
                                  const walls = (room.walls ?? []).map(
                                    (item, index) =>
                                      index === wallIndex
                                        ? { ...item, openings }
                                        : item,
                                  );
                                  updateRoom(roomIndex, { ...room, walls });
                                }}
                              >
                                <Trash2
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <button
                      type="button"
                      className="mt-2 rounded text-xs font-medium text-violet-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-violet-300"
                      onClick={() => {
                        const openings = [
                          ...(wall.openings ?? []),
                          {
                            id: `opening-${Date.now()}-${openingIndexSeed()}`,
                            kind: "door" as const,
                            width: 0.9,
                            height: 2.1,
                            unit: "m" as LengthUnit,
                          },
                        ];
                        const walls = (room.walls ?? []).map((item, index) =>
                          index === wallIndex ? { ...item, openings } : item,
                        );
                        updateRoom(roomIndex, { ...room, walls });
                      }}
                    >
                      Add door or window
                    </button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const walls = [
                      ...(room.walls ?? []),
                      {
                        id: `wall-${Date.now()}-${room.walls?.length ?? 0}`,
                        length: 0,
                        height: 0,
                        unit: "m" as LengthUnit,
                        openings: [],
                      },
                    ];
                    updateRoom(roomIndex, { ...room, walls });
                  }}
                >
                  <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
                  Add wall
                </Button>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <NumberField
                    id={`floor-length-${room.id}`}
                    label="Floor length"
                    value={room.floor?.length ?? 0}
                    onChange={(value) =>
                      updateRoom(roomIndex, {
                        ...room,
                        floor: {
                          id: room.floor?.id ?? `floor-${room.id}`,
                          length: numberFrom(value),
                          width: room.floor?.width ?? 0,
                          unit: room.floor?.unit ?? "m",
                        },
                      })
                    }
                  />
                  <NumberField
                    id={`floor-width-${room.id}`}
                    label="Floor width"
                    value={room.floor?.width ?? 0}
                    onChange={(value) =>
                      updateRoom(roomIndex, {
                        ...room,
                        floor: {
                          id: room.floor?.id ?? `floor-${room.id}`,
                          length: room.floor?.length ?? 0,
                          width: numberFrom(value),
                          unit: room.floor?.unit ?? "m",
                        },
                      })
                    }
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={`floor-unit-${room.id}`}
                      className="block text-xs font-medium text-muted-foreground"
                    >
                      Floor unit
                    </label>
                    <select
                      id={`floor-unit-${room.id}`}
                      value={room.floor?.unit ?? "m"}
                      onChange={(event) =>
                        updateRoom(roomIndex, {
                          ...room,
                          floor: {
                            id: room.floor?.id ?? `floor-${room.id}`,
                            length: room.floor?.length ?? 0,
                            width: room.floor?.width ?? 0,
                            unit: event.target.value as LengthUnit,
                          },
                        })
                      }
                      className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                    >
                      <option value="m">m</option>
                      <option value="mm">mm</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>
              </div>
            </fieldset>
          ))}

          <Button variant="outline" size="sm" onClick={addRoom}>
            <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
            Add room
          </Button>
        </section>

        <section
          className="min-w-0 space-y-3"
          aria-labelledby="takeoff-bill-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4
              id="takeoff-bill-heading"
              className="text-sm font-semibold text-foreground"
            >
              Bill
            </h4>
            <span className="text-xs text-muted-foreground">{statusText}</span>
          </div>
          <p aria-live="polite" className="sr-only">
            {statusText}
          </p>

          {result.totals.length ? (
            <ul className="flex flex-wrap gap-2">
              {result.totals.map((total) => (
                <li
                  key={total.unit}
                  className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
                >
                  <span className="font-semibold">{total.quantity}</span>{" "}
                  {UNIT_LABEL[total.unit] ?? total.unit}
                </li>
              ))}
            </ul>
          ) : null}

          {result.warnings.length ? (
            <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {result.warnings.map((warning) => (
                <li key={warning} className="flex gap-1">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-3 w-3 shrink-0"
                  />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {result.lines.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <caption className="sr-only">
                  Bill of quantities derived from the measured schedule
                </caption>
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-2 py-1.5">
                      Item
                    </th>
                    <th scope="col" className="px-2 py-1.5 text-right">
                      Qty
                    </th>
                    <th scope="col" className="px-2 py-1.5">
                      Unit
                    </th>
                    <th scope="col" className="px-2 py-1.5">
                      Buy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupByScope(result.lines).map((group) => (
                    <Fragment key={group.scope}>
                      <tr className="bg-card">
                        <th
                          scope="colgroup"
                          colSpan={4}
                          className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300"
                        >
                          {group.scope}
                        </th>
                      </tr>
                      {group.lines.map((line) => (
                        <tr
                          key={line.id}
                          className="border-t border-border/60 align-top"
                        >
                          <td className="px-2 py-1.5">
                            <span className="flex flex-wrap items-center gap-1">
                              {line.description}
                              {line.assumed ? (
                                <span className="rounded bg-amber-100 px-1 text-xs font-medium uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  assumed
                                </span>
                              ) : null}
                            </span>
                            <Derivation line={line} />
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {line.quantity}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">
                            {UNIT_LABEL[line.unit] ?? line.unit}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">
                            {line.purchaseQuantity !== undefined
                              ? `${line.purchaseQuantity} ${line.purchaseUnit ?? ""}`.trim()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Enter a wall length, a height and a floor size, and the bill
              appears here. Nothing is estimated for you.
            </div>
          )}

          {loadError ? (
            <p className="text-xs text-amber-700">{loadError}</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="text-xs text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const groupByScope = (lines: TakeoffLine[]) => {
  const order: string[] = [];
  const map = new Map<string, TakeoffLine[]>();
  for (const line of lines) {
    if (!map.has(line.scope)) {
      map.set(line.scope, []);
      order.push(line.scope);
    }
    map.get(line.scope)?.push(line);
  }
  return order.map((scope) => ({ scope, lines: map.get(scope) ?? [] }));
};

let openingCounter = 0;
const openingIndexSeed = () => {
  openingCounter += 1;
  return openingCounter;
};
