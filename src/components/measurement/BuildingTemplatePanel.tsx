import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  defaultPresetUnit,
  displayDimension,
  findBuildingPreset,
  getBuildingPresets,
  type BuildingPreset,
  type RoomDraft,
} from "@/lib/measurement/building-presets";
import { LENGTH_TO_M } from "@/lib/convert/units";
import {
  groupBuildingPresets,
  presetFloorAreaM2,
} from "@/lib/measurement/building-type-catalogue";
import { draftsToSchedule, scheduleTotals } from "@/lib/measurement/building-schedule";

const M_TO_FT = 1 / LENGTH_TO_M.ft;

function toMetres(value: number, unit: "feet" | "meters"): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "feet" ? value / M_TO_FT : value;
}

function customRoom(index: number, unit: "feet" | "meters"): RoomDraft {
  const dimension = unit === "feet" ? 10 : 3;
  return {
    id: `custom-room-${Date.now()}-${index}`,
    spaceType: "other",
    label: `Custom room ${index + 1}`,
    length: dimension,
    width: dimension,
    height: dimension,
    quantity: 1,
    doors: 0,
    windows: 0,
  };
}

/**
 * Load an editable building schedule into an area-based finish calculator.
 * Wall areas use the same room/opening geometry as the shared takeoff schedule;
 * floor areas sum each room footprint. Product consumption and pricing remain
 * in the calculator's existing deterministic engine.
 */
export function BuildingTemplatePanel({
  marketCode,
  surface,
  onChange,
}: {
  marketCode: string;
  surface: "wall" | "floor";
  onChange: (areaM2: number) => void;
}) {
  const unit = defaultPresetUnit(marketCode) as "feet" | "meters";
  const presets = useMemo(() => getBuildingPresets(marketCode), [marketCode]);
  const groups = useMemo(() => groupBuildingPresets(presets), [presets]);
  const [presetId, setPresetId] = useState("");
  const [rooms, setRooms] = useState<RoomDraft[]>([]);

  function areaOf(drafts: RoomDraft[]): number {
    if (surface === "wall") {
      return scheduleTotals(draftsToSchedule(drafts, unit)).netWallAreaM2;
    }
    return drafts.reduce((total, room) => {
      const length = toMetres(room.length, unit);
      const width = toMetres(room.width, unit);
      return total + length * width * Math.max(1, room.quantity || 1);
    }, 0);
  }

  function apply(id: string) {
    setPresetId(id);
    const preset = findBuildingPreset(marketCode, id);
    if (!preset) {
      setRooms([]);
      onChange(0);
      return;
    }
    const drafts: RoomDraft[] = preset.rooms.map((room, index) => ({
      id: `${preset.id}-room-${index}`,
      spaceType: room.spaceType,
      label: room.label,
      length: displayDimension(room.lengthM, unit),
      width: displayDimension(room.widthM, unit),
      height: displayDimension(room.heightM ?? preset.wallHeightM, unit),
      quantity: room.quantity,
      doors: room.doors,
      windows: room.windows,
    }));
    setRooms(drafts);
    onChange(areaOf(drafts));
  }

  function updateRoom(id: string, patch: Partial<RoomDraft>) {
    setRooms((current) => {
      const next = current.map((room) =>
        room.id === id ? { ...room, ...patch } : room,
      );
      onChange(areaOf(next));
      return next;
    });
  }

  function addRoom() {
    setRooms((current) => {
      const next = [...current, customRoom(current.length, unit)];
      onChange(areaOf(next));
      return next;
    });
  }

  function removeRoom(id: string) {
    setRooms((current) => {
      const next = current.filter((room) => room.id !== id);
      onChange(areaOf(next));
      return next;
    });
  }

  const total = areaOf(rooms);
  const preset: BuildingPreset | undefined = presetId
    ? findBuildingPreset(marketCode, presetId)
    : undefined;
  const unitLabel = unit === "feet" ? "ft" : "m";

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Building template area">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor="finish-building-type" className="block text-sm font-semibold text-foreground">
          Building type (optional)
        </label>
        <Link to="/building-types" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
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
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {(preset || presetId === "custom") && (
        <div className="mt-3 space-y-3">
          {preset && (
            <p className="text-xs text-muted-foreground">
              {preset.description}. {rooms.length} room types, {presetFloorAreaM2(preset).toFixed(0)} m² template floor area. Editable dimensions update the {surface} quantity below.
            </p>
          )}
          <div className="space-y-2">
            {rooms.map((room) => (
              <fieldset key={room.id} className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-4">
                <legend className="sr-only">{room.label} measurements</legend>
                <label className="col-span-2 block text-xs font-medium text-muted-foreground sm:col-span-4">
                  Room type / label
                  <input
                    type="text"
                    className="input-field"
                    value={room.label}
                    onChange={(event) => updateRoom(room.id, { label: event.target.value })}
                    aria-label={`Room type for ${room.label}`}
                    maxLength={80}
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Length ({unitLabel})
                  <input type="number" min={0} step="0.1" className="input-field" value={room.length || ""} onChange={(event) => updateRoom(room.id, { length: Number(event.target.value) })} />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Width ({unitLabel})
                  <input type="number" min={0} step="0.1" className="input-field" value={room.width || ""} onChange={(event) => updateRoom(room.id, { width: Number(event.target.value) })} />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Height ({unitLabel})
                  <input type="number" min={0} step="0.1" className="input-field" value={room.height || ""} onChange={(event) => updateRoom(room.id, { height: Number(event.target.value) })} />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Identical rooms
                  <input type="number" min={1} step={1} className="input-field" value={room.quantity} onChange={(event) => updateRoom(room.id, { quantity: Math.max(1, Math.round(Number(event.target.value) || 1)) })} />
                </label>
                {surface === "wall" && (
                  <>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Doors per room
                      <input type="number" min={0} step={1} className="input-field" value={room.doors} onChange={(event) => updateRoom(room.id, { doors: Math.max(0, Math.round(Number(event.target.value) || 0)) })} />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Windows per room
                      <input type="number" min={0} step={1} className="input-field" value={room.windows} onChange={(event) => updateRoom(room.id, { windows: Math.max(0, Math.round(Number(event.target.value) || 0)) })} />
                    </label>
                  </>
                )}
                <div className="col-span-2 flex items-end sm:col-span-2">
                  <button type="button" className="text-xs font-medium text-destructive underline-offset-2 hover:underline" onClick={() => removeRoom(room.id)}>
                    Remove room
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={addRoom}>
              + Add custom room
            </button>
            <p className="text-sm font-semibold text-foreground" aria-live="polite">
              {total.toFixed(2)} m² {surface === "wall" ? "net wall area" : "floor area"}
            </p>
          </div>
          {surface === "wall" && (
            <p className="text-xs text-muted-foreground">
              Door and window counts use assumed standard sizes (door 0.9 × 2.1 m; window 1.2 × 1.5 m) and are deducted per room. Confirm actual opening dimensions on site; openings that cannot fit on a room wall are not deducted.
            </p>
          )}
          {preset && (
            <p className="text-xs text-muted-foreground">
              Template dimensions are starting assumptions, not verified plans. Confirm every room measurement before ordering materials.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default BuildingTemplatePanel;
