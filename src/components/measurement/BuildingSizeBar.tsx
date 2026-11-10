/**
 * The building size control, present on every tool page.
 *
 * The owner's requirement is that any of the tools can measure one building the
 * user has already sized, rather than each tool asking again. So the editor is
 * mounted once in the layout and the numbers are shared, while each engine still
 * does its own arithmetic from the schedule it is given.
 */

import { useState } from "react";
import { Ruler } from "lucide-react";
import { BuildingSchedulePanel } from "./BuildingSchedulePanel";
import { useBuildingSize } from "@/lib/measurement/building-size-context";
import { useMarket } from "@/lib/international/market-context";

const squareMetres = (value: number) =>
  `${Math.round(value * 100) / 100} m²`;

export function BuildingSizeBar() {
  const { building, setBuilding, clear } = useBuildingSize();
  const { market } = useMarket();
  const [editing, setEditing] = useState(false);

  return (
    <section
      aria-label="Building size"
      className="border-b border-border bg-muted/30"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
        <Ruler className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {building ? (
          <p className="min-w-0 flex-1">
            <span className="font-medium">{building.label}</span>
            <span className="text-muted-foreground">
              {" · "}
              {building.schedule.rooms.length} room
              {building.schedule.rooms.length === 1 ? "" : "s"}
              {" · walls "}
              {squareMetres(building.totals.netWallAreaM2)}
              {" · floors "}
              {squareMetres(building.totals.floorAreaM2)}
            </span>
          </p>
        ) : (
          <p className="min-w-0 flex-1 text-muted-foreground">
            Size a whole building once and every tool will measure it, or keep
            entering dimensions per tool.
          </p>
        )}
        <button
          type="button"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          aria-expanded={editing}
          onClick={() => setEditing((open) => !open)}
        >
          {editing
            ? "Close building size"
            : building
              ? "Edit building size"
              : "Set building size"}
        </button>
        {building && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              clear();
              setEditing(false);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {editing && (
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <BuildingSchedulePanel
            marketCode={market?.marketCode ?? "NG"}
            initialDrafts={building?.drafts}
            initialLabel={building?.label}
            onChange={(applied) => setBuilding(applied)}
            onClear={clear}
          />
        </div>
      )}
    </section>
  );
}

export default BuildingSizeBar;
