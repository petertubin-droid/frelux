import { useMemo, useState } from "react";
import {
  defaultPresetUnit,
  findBuildingPreset,
  getBuildingPresets,
  presetToRoomDrafts,
  type RoomDraft,
  type RoomUnitChoice,
} from "@/lib/measurement/building-presets";
import {
  draftsToSchedule,
  scheduleTotals,
  type AppliedBuilding,
} from "@/lib/measurement/building-schedule";
import { groupBuildingPresets } from "@/lib/measurement/building-type-catalogue";
import type { ScheduleInput } from "@/lib/takeoff/types";
import type { SpaceType } from "@/lib/measurement/types";
import { PlanMeasurementImporter } from "./PlanMeasurementImporter";

export type { AppliedBuilding };

/**
 * Pick a building type, adjust the rooms, and hand the whole building to a
 * quantity engine.
 *
 * Unlike the finish calculators' template panel, this one does not reduce the
 * building to a single area: it emits the full schedule, because masonry and
 * plastering need the wall runs, the heights and the openings separately. Every
 * edit is applied immediately, so the engine always measures what is on screen.
 */
export function BuildingSchedulePanel({
  marketCode,
  onChange,
  onClear,
  initialDrafts,
  initialLabel,
}: {
  marketCode: string;
  onChange: (applied: AppliedBuilding | null) => void;
  onClear: () => void;
  /** Rooms to reopen with, so a building edited elsewhere is not lost. */
  initialDrafts?: RoomDraft[];
  initialLabel?: string;
}) {
  const unit = defaultPresetUnit(marketCode) as RoomUnitChoice;
  const presets = useMemo(() => getBuildingPresets(marketCode), [marketCode]);
  const groups = useMemo(() => groupBuildingPresets(presets), [presets]);
  const [presetId, setPresetId] = useState("");
  const [rooms, setRooms] = useState<RoomDraft[]>(() => initialDrafts ?? []);
  const [label, setLabel] = useState(initialLabel ?? "");
  const unitLabel = unit === "feet" ? "ft" : "m";

  const emit = (drafts: RoomDraft[], nextLabel: string) => {
    const schedule = draftsToSchedule(drafts, unit, { label: nextLabel });
    setLabel(nextLabel);
    onChange({
      schedule,
      totals: scheduleTotals(schedule),
      label: nextLabel,
      unit,
      drafts,
    });
  };

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (!id) {
      setRooms([]);
      onClear();
      return;
    }
    const preset = findBuildingPreset(marketCode, id);
    if (!preset) {
      setRooms([]);
      onClear();
      return;
    }
    const drafts = presetToRoomDrafts(preset, unit);
    setRooms(drafts);
    emit(drafts, preset.label);
  };

  const updateRoom = (id: string, patch: Partial<RoomDraft>) => {
    setRooms((current) => {
      const next = current.map((room) =>
        room.id === id ? { ...room, ...patch } : room,
      );
      emit(next, currentLabel);
      return next;
    });
  };

  const addRoom = () => {
    const next: RoomDraft[] = [
      ...rooms,
      {
        id: `custom-room-${rooms.length + 1}`,
        spaceType: "bedroom" as SpaceType,
        label: `Room ${rooms.length + 1}`,
        // A custom room starts at a believable size in whichever unit the market
        // reads in: 3 m, or 10 ft which is 3.05 m.
        length: unit === "feet" ? 10 : 3,
        width: unit === "feet" ? 10 : 3,
        height: rooms[0]?.height ?? (unit === "feet" ? 9 : 2.7),
        quantity: 1,
        doors: 1,
        windows: 1,
      },
    ];
    setRooms(next);
    emit(next, currentLabel);
  };

  const removeRoom = (id: string) => {
    const next = rooms.filter((room) => room.id !== id);
    setRooms(next);
    if (next.length === 0) {
      setPresetId("");
      onClear();
      return;
    }
    emit(next, currentLabel);
  };

  const currentPreset = presetId
    ? findBuildingPreset(marketCode, presetId)
    : undefined;
  const currentLabel = currentPreset?.label ?? "Custom building";
  const totals = rooms.length
    ? scheduleTotals(draftsToSchedule(rooms, unit, { label: currentLabel }))
    : null;

  return (
    <section
      aria-labelledby="building-schedule-heading"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="building-schedule-heading"
          className="text-sm font-semibold text-foreground"
        >
          Measure a whole building
        </h2>
        <button
          type="button"
          className="inline-flex min-h-6 items-center text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => {
            setPresetId("");
            setRooms([]);
            onClear();
          }}
        >
          Clear building
        </button>
      </div>

      <div className="mb-4">
        <PlanMeasurementImporter />
      </div>

      <label
        htmlFor="building-schedule-type"
        className="block text-xs font-medium text-muted-foreground"
      >
        Building type
      </label>
      <select
        id="building-schedule-type"
        className="input-field mt-1"
        value={presetId}
        onChange={(event) => applyPreset(event.target.value)}
      >
        <option value="">Measure one wall or surface instead</option>
        {groups.map((group) => (
          <optgroup key={group.category} label={group.label}>
            {group.presets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex min-h-6 items-center text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={addRoom}
        >
          Add a room
        </button>
        <span className="text-xs text-muted-foreground">
          Use this for a size the templates do not cover.
        </span>
      </div>

      {rooms.length > 0 && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {currentLabel}. {rooms.length} room{" "}
            {rooms.length === 1 ? "type" : "types"}, measured in {unitLabel}.
            Every quantity below is recomputed from these rooms.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <caption className="sr-only">
                Room schedule: length, width, height, identical count, doors and
                windows
              </caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="p-1 font-medium">
                    Room
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Length ({unitLabel})
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Width ({unitLabel})
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Height ({unitLabel})
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Identical
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Doors
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    Windows
                  </th>
                  <th scope="col" className="p-1 font-medium">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-t border-border/60">
                    <th
                      scope="row"
                      className="p-1 text-left font-medium text-foreground"
                    >
                      <input
                        aria-label={`Room name, ${room.label}`}
                        className="input-field"
                        value={room.label}
                        onChange={(event) =>
                          updateRoom(room.id, { label: event.target.value })
                        }
                      />
                    </th>
                    {(["length", "width", "height"] as const).map((key) => (
                      <td key={key} className="p-1">
                        <label
                          className="sr-only"
                          htmlFor={`${room.id}-${key}`}
                        >
                          {`${room.label} ${key} in ${unitLabel}`}
                        </label>
                        <input
                          id={`${room.id}-${key}`}
                          type="number"
                          min={0}
                          step="0.1"
                          className="input-field"
                          value={room[key] || ""}
                          onChange={(event) =>
                            updateRoom(room.id, {
                              [key]: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <label
                        className="sr-only"
                        htmlFor={`${room.id}-quantity`}
                      >
                        {`Identical copies of ${room.label}`}
                      </label>
                      <input
                        id={`${room.id}-quantity`}
                        type="number"
                        min={1}
                        step={1}
                        className="input-field"
                        value={room.quantity}
                        onChange={(event) =>
                          updateRoom(room.id, {
                            quantity: Math.max(
                              1,
                              Math.round(Number(event.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="p-1">
                      <label className="sr-only" htmlFor={`${room.id}-doors`}>
                        {`Doors in ${room.label}`}
                      </label>
                      <input
                        id={`${room.id}-doors`}
                        type="number"
                        min={0}
                        step={1}
                        className="input-field"
                        value={room.doors}
                        onChange={(event) =>
                          updateRoom(room.id, {
                            doors: Math.max(
                              0,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="p-1">
                      <label className="sr-only" htmlFor={`${room.id}-windows`}>
                        {`Windows in ${room.label}`}
                      </label>
                      <input
                        id={`${room.id}-windows`}
                        type="number"
                        min={0}
                        step={1}
                        className="input-field"
                        value={room.windows}
                        onChange={(event) =>
                          updateRoom(room.id, {
                            windows: Math.max(
                              0,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="p-1">
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
                        onClick={() => removeRoom(room.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totals && (
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Rooms</dt>
                <dd className="font-medium text-foreground">
                  {totals.roomCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Wall run</dt>
                <dd className="font-medium text-foreground">
                  {totals.wallRunM.toFixed(1)} m
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net wall area</dt>
                <dd className="font-medium text-foreground">
                  {totals.netWallAreaM2.toFixed(2)} m²
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Floor area</dt>
                <dd className="font-medium text-foreground">
                  {totals.floorAreaM2.toFixed(2)} m²
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Openings deducted</dt>
                <dd className="font-medium text-foreground">
                  {totals.openingsAreaM2.toFixed(2)} m²
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Wall heights</dt>
                <dd className="font-medium text-foreground">
                  {totals.wallHeights.join(", ")} m
                </dd>
              </div>
            </dl>
          )}

          {totals && totals.unplacedOpeningCount > 0 && (
            <p
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-foreground"
            >
              {totals.unplacedOpeningCount} opening
              {totals.unplacedOpeningCount === 1 ? "" : "s"} wider or larger
              than any wall of its room, so{" "}
              {totals.unplacedOpeningCount === 1 ? "it is" : "they are"} not
              deducted from the wall area. Widen the room or correct the opening
              to have it measured.
            </p>
          )}

          {totals && totals.assumedOpeningCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {totals.assumedOpeningCount} opening
              {totals.assumedOpeningCount === 1 ? "" : "s"} measured at the
              standard sizes, a door at 0.9 × 2.1 m and a window at 1.2 × 1.5 m,
              because the template counts openings rather than measuring them.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default BuildingSchedulePanel;
