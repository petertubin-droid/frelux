import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import {
  BS8666_SHAPES,
  type Bs8666ShapeCode,
} from "@/lib/estimation/reinforcement-engine";
import {
  BBS_CSV_COLUMNS,
  DEFAULT_BBS_DRAFT,
  bbsScheduleToCsvRows,
  buildScheduleFromDraft,
  type BbsDraftRow,
} from "@/lib/estimation/bbs-panel-model";
import { downloadCsv } from "@/lib/export-utils";

const SHAPE_CODES: Bs8666ShapeCode[] = ["00", "11", "21", "51"];

const emptyRow = (index: number): BbsDraftRow => ({
  mark: `B${index + 1}`,
  typeGrade: "B500B (T)",
  diameter: "12",
  members: "1",
  barsPerMember: "1",
  shapeCode: "00",
  dimA: "",
  dimB: "",
  dimC: "",
});

/**
 * Bar bending schedule for the reinforcement estimate.
 * Rows are the schedule exactly as a steel fixer reads it: marks, counts,
 * BS 8666 shape and dimensions. Cut lengths come from the engine, so a row
 * that cannot be computed shows no length rather than a guess.
 */
export function BarBendingSchedulePanel() {
  const [draft, setDraft] = useState<BbsDraftRow[]>(DEFAULT_BBS_DRAFT);

  const { schedule, issues } = useMemo(
    () => buildScheduleFromDraft(draft),
    [draft],
  );

  const update = (index: number, patch: Partial<BbsDraftRow>) => {
    setDraft((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const remove = (index: number) => {
    setDraft((rows) => rows.filter((_, i) => i !== index));
  };

  const exportCsv = () => {
    if (schedule.rows.length === 0) return;
    downloadCsv(
      "bar-bending-schedule",
      bbsScheduleToCsvRows(schedule),
      BBS_CSV_COLUMNS,
    );
  };

  return (
    <div className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Bar bending schedule (BS 8666)</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cutting lengths are neutral-axis lengths for BS 8666 shape codes,
            with mandrel diameters of 4d up to 16 mm and 7d above, and 135° link
            hooks of max(10d, 75 mm). Laps are not included: add lap lengths
            before ordering.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary inline-flex items-center gap-2"
            onClick={() => setDraft((rows) => [...rows, emptyRow(rows.length)])}
          >
            <Plus className="h-4 w-4" /> Add bar mark
          </button>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={exportCsv}
            disabled={schedule.rows.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {draft.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:items-end"
          >
            <label className="grid gap-1 text-sm font-medium">
              Bar mark
              <input
                aria-label={`Bar mark row ${index + 1}`}
                className="input-field"
                value={row.mark}
                onChange={(e) => update(index, { mark: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Type/grade
              <input
                aria-label={`Type or grade row ${index + 1}`}
                className="input-field"
                value={row.typeGrade}
                onChange={(e) => update(index, { typeGrade: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Size (mm)
              <input
                aria-label={`Bar size row ${index + 1}`}
                className="input-field"
                type="number"
                min="0"
                step="any"
                value={row.diameter}
                onChange={(e) => update(index, { diameter: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Members
              <input
                aria-label={`Members row ${index + 1}`}
                className="input-field"
                type="number"
                min="1"
                step="1"
                value={row.members}
                onChange={(e) => update(index, { members: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Bars in each
              <input
                aria-label={`Bars in each row ${index + 1}`}
                className="input-field"
                type="number"
                min="1"
                step="1"
                value={row.barsPerMember}
                onChange={(e) =>
                  update(index, { barsPerMember: e.target.value })
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Shape code
              <select
                aria-label={`Shape code row ${index + 1}`}
                className="input-field"
                value={row.shapeCode}
                onChange={(e) =>
                  update(index, {
                    shapeCode: e.target.value as Bs8666ShapeCode,
                  })
                }
              >
                {SHAPE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {BS8666_SHAPES[code].name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="grid gap-1 text-sm font-medium">
                A
                <input
                  aria-label={`Dimension A row ${index + 1}`}
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={row.dimA}
                  onChange={(e) => update(index, { dimA: e.target.value })}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                B
                <input
                  aria-label={`Dimension B row ${index + 1}`}
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={row.dimB}
                  onChange={(e) => update(index, { dimB: e.target.value })}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                C
                <input
                  aria-label={`Dimension C row ${index + 1}`}
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={row.dimC}
                  onChange={(e) => update(index, { dimC: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-1 text-sm"
              onClick={() => remove(index)}
              aria-label={`Remove bar mark row ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        ))}
      </div>

      {schedule.rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Mark</th>
                <th className="py-2 pr-3">Type/grade</th>
                <th className="py-2 pr-3">Size</th>
                <th className="py-2 pr-3">Members</th>
                <th className="py-2 pr-3">Bars each</th>
                <th className="py-2 pr-3">Total bars</th>
                <th className="py-2 pr-3">Length each</th>
                <th className="py-2 pr-3">Total length</th>
                <th className="py-2 pr-3">Shape</th>
                <th className="py-2 pr-3">A / B / C</th>
                <th className="py-2 pr-3">Weight</th>
              </tr>
            </thead>
            <tbody>
              {schedule.rows.map((row) => (
                <tr key={row.barMark} className="border-b">
                  <td className="py-2 pr-3 font-medium">{row.barMark}</td>
                  <td className="py-2 pr-3">{row.typeGrade}</td>
                  <td className="py-2 pr-3">{row.sizeMm} mm</td>
                  <td className="py-2 pr-3">{row.members}</td>
                  <td className="py-2 pr-3">{row.barsPerMember}</td>
                  <td className="py-2 pr-3">{row.totalBars}</td>
                  <td className="py-2 pr-3">
                    {row.lengthEachMm === null ? "—" : `${row.lengthEachMm} mm`}
                  </td>
                  <td className="py-2 pr-3">
                    {row.totalLengthM === null ? "—" : `${row.totalLengthM} m`}
                  </td>
                  <td className="py-2 pr-3">{row.shapeCode}</td>
                  <td className="py-2 pr-3">
                    {[row.dims.a, row.dims.b, row.dims.c]
                      .filter((v) => v !== undefined)
                      .join(" / ")}
                  </td>
                  <td className="py-2 pr-3">
                    {row.weightKg === null ? "—" : `${row.weightKg} kg`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 pr-3" colSpan={5}>
                  Total ({schedule.totals.barMarks} marks)
                </td>
                <td className="py-2 pr-3">{schedule.totals.totalBars}</td>
                <td className="py-2 pr-3">—</td>
                <td className="py-2 pr-3">{schedule.totals.totalLengthM} m</td>
                <td className="py-2 pr-3" colSpan={2} />
                <td className="py-2 pr-3">
                  {schedule.totals.totalWeightKg} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-amber-600 dark:text-amber-500">
          {issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BarBendingSchedulePanel;
