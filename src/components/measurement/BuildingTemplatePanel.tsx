import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  defaultPresetUnit,
  displayDimension,
  findBuildingPreset,
  getBuildingPresets,
  presetWallHeight,
  type BuildingPreset,
  type RoomDraft,
} from "@/lib/measurement/building-presets";
import { LENGTH_TO_M } from "@/lib/convert/units";
import {
  groupBuildingPresets,
  presetFloorAreaM2,
} from "@/lib/measurement/building-type-catalogue";

const M_TO_FT = 1 / LENGTH_TO_M.ft;

function toMetres(value: number, unit: "feet" | "meters"): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "feet" ? value / M_TO_FT : value;
}

/**
 * Load a building type into an area-based finish calculator.
 *
 * Picks a market building type, then lets every room's length, width, height
 * and count be edited before the area is handed to the calculator. The panel
 * only produces area: quantities, consumption and pricing stay in the
 * deterministic engine the calculator already uses.
 */
export function BuildingTemplatePanel({
  marketCode,
  surface,
  onChange,
}: {
  marketCode: string;
  /** Which face of the rooms the calculator finishes. */
  surface: "wall" | "floor";
  /** Called with the template area in square metres after every edit. */
  onChange: (areaM2: number) => void;
}) {
  const unit = defaultPresetUnit(marketCode) as "feet" | "meters";
  const presets = useMemo(() => getBuildingPresets(marketCode), [marketCode]);
  const groups = useMemo(() => groupBuildingPresets(presets), [presets]);
  const [presetId, setPresetId] = useState("");
  const [rooms, setRooms] = useState<RoomDraft[]>([]);
  const [editing, setEditing] = useState(false);

  function areaOf(drafts: RoomDraft[]): number {
    return drafts.reduce((total, room) => {
      const length = toMetres(room.length, unit);
      const width = toMetres(room.width, unit);
      const height = toMetres(room.height, unit);
      const perRoom =
        surface === "floor" ? length * width : 2 * (length + width) * height;
      return total + perRoom * Math.max(1, room.quantity || 1);
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

  const total = areaOf(rooms);
  const preset: BuildingPreset | undefined = presetId
    ? findBuildingPreset(marketCode, presetId)
    : undefined;
  const unitLabel = unit === "feet" ? "ft" : "m";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
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

      {preset && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {preset.description}. {rooms.length} room types,{" "}
            {presetFloorAreaM2(preset).toFixed(0)} m² floor. This template gives{" "}
            {total.toFixed(1)} m² of {surface === "wall" ? "wall" : "floor"} to
            finish.
          </p>
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Hide room sizes" : "Edit room sizes"}
          </button>
          {editing && (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-5"
                >
                  <p className="col-span-2 text-xs font-medium text-foreground sm:col-span-1">
                    {room.label}
                  </p>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Length
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
                    Width
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      className="input-field"
                      value={room.width || ""}
                      onChange={(event) =>
                        updateRoom(room.id, {
                          width: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Height
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
                    Identical
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
                            Number(event.target.value) || 1,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Rooms with {presetWallHeight(preset, unit).toFixed(1)}{" "}
                {unitLabel} walls by default. Change any measurement and the
                area above follows.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BuildingTemplatePanel;
