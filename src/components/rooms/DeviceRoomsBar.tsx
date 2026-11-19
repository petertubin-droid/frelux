import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, FolderDown, Trash2 } from "lucide-react";
import { tx } from "@/lib/i18n";
import type { HouseRoomRow, Unit } from "@/types";
import {
  deleteDeviceRoom,
  deviceRoomsToRows,
  listDeviceRooms,
  saveDeviceRooms,
  type DeviceRoom,
} from "@/lib/rooms/room-store";

interface DeviceRoomsBarProps {
  /** The room rows the current calculator is working with. */
  rooms: HouseRoomRow[];
  /** Appends rooms chosen from the library to the current calculator. */
  onImport: (rows: HouseRoomRow[]) => void;
  /** The calculator's working unit; saved rooms are shown in it. */
  unit: Unit;
  /** The visitor's market, recorded so a room remembers where it was measured. */
  market?: string | null;
  className?: string;
}

/**
 * Rooms saved on this device, offered to whichever trade is open.
 *
 * The point is that a room is measured once. A visitor who measured a bedroom
 * in the paint calculator should not retype it in the tile calculator, and a
 * visitor who never signs in should still not lose the dimensions.
 */
export default function DeviceRoomsBar({
  rooms,
  onImport,
  unit,
  market,
  className,
}: DeviceRoomsBarProps) {
  const [saved, setSaved] = useState<DeviceRoom[]>([]);
  const [available, setAvailable] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const read = listDeviceRooms();
    setSaved(read.rooms);
    setAvailable(read.available);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleSave() {
    const result = saveDeviceRooms(rooms, {
      unit,
      market: market ?? null,
      labelFallback: tx("Room"),
    });
    setNotice(result.notice);
    refresh();
  }

  function handleDelete(id: string) {
    const read = deleteDeviceRoom(id);
    setSaved(read.rooms);
    setAvailable(read.available);
    setNotice(null);
  }

  if (!available) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        {tx(
          "This device is not keeping data, so rooms cannot be saved here. Sign in to keep rooms across devices.",
        )}
      </p>
    );
  }

  const rows = deviceRoomsToRows(saved, unit);

  return (
    <div
      className={`rounded-xl border border-border bg-muted/40 p-3 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tx("Rooms on this device")} · {saved.length}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={rooms.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <BookmarkPlus aria-hidden="true" className="h-3.5 w-3.5" />
          {tx("Save these rooms")}
        </button>
      </div>

      {saved.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {tx(
            "Save a room once and every other trade can use it, on this device.",
          )}
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {saved.map((room, index) => {
            const row = rows[index];
            return (
              <li key={room.id}>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onImport([row])}
                    className="inline-flex items-center gap-1"
                    title={tx("Add this room to the calculator")}
                  >
                    <FolderDown aria-hidden="true" className="h-3 w-3" />
                    {room.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(room.id)}
                    aria-label={`${tx("Delete")} ${room.label}`}
                    className="text-muted-foreground"
                  >
                    <Trash2 aria-hidden="true" className="h-3 w-3" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
