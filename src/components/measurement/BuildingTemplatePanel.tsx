import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultPresetUnit,
  displayDimension,
  findBuildingPreset,
  getBuildingPresets,
  type BuildingPreset,
  type RoomDraft,
} from "@/lib/measurement/building-presets";
import {
  draftsToSchedule,
  scheduleTotals,
  type ScheduleTotals,
} from "@/lib/measurement/building-schedule";
import type { ScheduleInput } from "@/lib/takeoff/types";
import {
  groupBuildingPresets,
  presetFloorAreaM2,
} from "@/lib/measurement/building-type-catalogue";

/**
 * Load an editable market building schedule into an area-based calculator.
 * It produces only geometry; each caller retains its existing calculation and
 * pricing engine. Wall opening deductions are stated assumptions.
 */
export function BuildingTemplatePanel({
  marketCode,
  surface,
  maxRoomCount,
  onChange,
}: {
  marketCode: string;
  surface: "wall" | "floor";
  /** Limits expanded room/wall rows for calculators with bounded schedules. */
  maxRoomCount?: number;
  onChange: (
    areaM2: number,
    totals?: ScheduleTotals,
    schedule?: ScheduleInput,
  ) => void;
}) {
  const unit = defaultPresetUnit(marketCode) as "feet" | "meters";
  const presets = useMemo(() => getBuildingPresets(marketCode), [marketCode]);
  const availablePresets = useMemo(
    () =>
      maxRoomCount
        ? presets.filter(
            (preset) =>
              preset.rooms.reduce(
                (sum, room) => sum + Math.max(1, room.quantity),
                0,
              ) <= maxRoomCount,
          )
        : presets,
    [maxRoomCount, presets],
  );
  const groups = useMemo(
    () => groupBuildingPresets(availablePresets),
    [availablePresets],
  );
  const [presetId, setPresetId] = useState("");
  const [rooms, setRooms] = useState<RoomDraft[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const makeMetrics = useCallback(
    (drafts: RoomDraft[]) => {
      const schedule = draftsToSchedule(drafts, unit);
      const totals = scheduleTotals(schedule);
      return {
        schedule,
        totals,
        areaM2: surface === "wall" ? totals.netWallAreaM2 : totals.floorAreaM2,
      };
    },
    [surface, unit],
  );

  useEffect(() => {
    if (!presetId) return;
    const metrics = makeMetrics(rooms);
    onChangeRef.current(metrics.areaM2, metrics.totals, metrics.schedule);
  }, [makeMetrics, presetId, rooms]);

  function apply(id: string) {
    setPresetId(id);
    const preset = findBuildingPreset(marketCode, id);
    if (!preset) {
      setRooms([]);
      if (!id) {
        const metrics = makeMetrics([]);
        onChangeRef.current(0, metrics.totals, metrics.schedule);
      }
      return;
    }
    setRooms(
      preset.rooms.map((room, index) => ({
        id: `${preset.id}-room-${index}`,
        spaceType: room.spaceType,
        label: room.label,
        length: displayDimension(room.lengthM, unit),
        width: displayDimension(room.widthM, unit),
        height: displayDimension(room.heightM ?? preset.wallHeightM, unit),
        quantity: room.quantity,
        doors: room.doors,
        windows: room.windows,
      })),
    );
  }

  function updateRoom(id: string, patch: Partial<RoomDraft>) {
    setRooms((current) => {
      const otherCount = current
        .filter((room) => room.id !== id)
        .reduce((sum, room) => sum + Math.max(1, room.quantity), 0);
      return current.map((room) => {
        if (room.id !== id) return room;
        const updated = { ...room, ...patch };
        if (!maxRoomCount || patch.quantity === undefined) return updated;
        const cap = Math.max(1, maxRoomCount - otherCount);
        return {
          ...updated,
          quantity: Math.max(
            1,
            Math.min(Math.round(updated.quantity || 1), cap),
          ),
        };
      });
    });
  }

  function addRoom() {
    setRooms((current) => {
      const currentCount = current.reduce(
        (sum, room) => sum + Math.max(1, room.quantity),
        0,
      );
      if (maxRoomCount && currentCount >= maxRoomCount) return current;
      return [
        ...current,
        {
          id: `custom-room-${Date.now()}-${current.length}`,
          spaceType: "other",
          label: `Custom room ${current.length + 1}`,
          length: 0,
          width: 0,
          height: 0,
          quantity: 1,
          doors: 0,
          windows: 0,
        },
      ];
    });
  }

  function removeRoom(id: string) {
    setRooms((current) => current.filter((room) => room.id !== id));
  }

  const metrics = makeMetrics(rooms);
  const preset: BuildingPreset | undefined = presetId
    ? findBuildingPreset(marketCode, presetId)
    : undefined;
  const unitLabel = unit === "feet" ? "ft" : "m";
  const roomCount = rooms.reduce(
    (sum, room) => sum + Math.max(1, room.quantity),
    0,
  );

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Building template area"
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor="finish-building-type"
          className="block text-sm font-semibold text-foreground"
        >
          Building type (optional)
        </label>
        <Link
          to="/building-types"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Room schedules
        </Link>
      </div>
      <select
        id="finish-building-type"
        className="input-field"
        value={presetId}
        onChange={(event) => apply(event.target.value)}
      >
        <option value="">Enter the area yourself</option>
        <option value="custom">Custom building / room schedule</option>
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

      {(preset || presetId === "custom") && (
        <div className="mt-3 space-y-3">
          {preset && (
            <p className="text-xs text-muted-foreground">
              {preset.description}. {rooms.length} room types,{" "}
              {presetFloorAreaM2(preset).toFixed(0)} m² template floor area.
              Edit every measurement before relying on the result.
            </p>
          )}
          <div className="space-y-2">
            {rooms.map((room) => (
              <fieldset
                key={room.id}
                className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-4"
              >
                <legend className="sr-only">{room.label} measurements</legend>
                <label className="col-span-2 block text-xs font-medium text-muted-foreground sm:col-span-4">
                  Room type / label
                  <input
                    type="text"
                    className="input-field"
                    value={room.label}
                    onChange={(event) =>
                      updateRoom(room.id, { label: event.target.value })
                    }
                    aria-label={`Room type for ${room.label}`}
                    maxLength={80}
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Length ({unitLabel})
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="input-field"
                    value={room.length || ""}
                    onChange={(event) =>
                      updateRoom(room.id, {
                        length: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Width ({unitLabel})
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="input-field"
                    value={room.width || ""}
                    onChange={(event) =>
                      updateRoom(room.id, { width: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Height ({unitLabel})
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="input-field"
                    value={room.height || ""}
                    onChange={(event) =>
                      updateRoom(room.id, {
                        height: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Identical rooms
                  <input
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
                </label>
                {surface === "wall" && (
                  <>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Doors per room
                      <input
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
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Windows per room
                      <input
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
                    </label>
                  </>
                )}
                <div className="col-span-2 flex items-end sm:col-span-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
                    onClick={() => removeRoom(room.id)}
                  >
                    Remove room
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              onClick={addRoom}
              disabled={!!maxRoomCount && roomCount >= maxRoomCount}
            >
              + Add custom room
            </button>
            <p
              className="text-sm font-semibold text-foreground"
              aria-live="polite"
            >
              {metrics.areaM2.toFixed(2)} m²{" "}
              {surface === "wall" ? "net wall area" : "floor area"}
            </p>
          </div>
          {maxRoomCount && (
            <p className="text-xs text-muted-foreground">
              This calculator supports up to {maxRoomCount} rooms in a schedule.
            </p>
          )}
          {surface === "wall" && (
            <p className="text-xs text-muted-foreground">
              Door and window counts use assumed standard sizes (door 0.9 × 2.1
              m; window 1.2 × 1.5 m) and are deducted per room. Confirm actual
              opening dimensions on site; openings that cannot fit on a room
              wall are not deducted.
            </p>
          )}
          {preset && (
            <p className="text-xs text-muted-foreground">
              Template dimensions are starting assumptions, not verified plans.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default BuildingTemplatePanel;
