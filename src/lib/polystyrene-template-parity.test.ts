// The served template pages compute their board take-off in
// scripts/lib/polystyrene-template.mjs, a plain module the prerenderer can
// import. The calculator computes it in polystyrene-ceiling.ts. These are two
// implementations of one formula, which is exactly the situation that drifts,
// so this test runs both across every branch and compares the numbers the pages
// actually print.
import { describe, expect, it } from "vitest";
import { polystyreneTakeoff as takeoffRaw } from "../../scripts/lib/polystyrene-template.mjs";
import { TEMPLATE_CATALOG as catalogRaw } from "../../scripts/lib/template-catalog.mjs";

interface PageTakeoff {
  surfaceM2: number;
  reinforcedSeamM: number;
  boardsRequired: number;
  adhesiveCans: number;
  tapeRolls: number;
  puttyBags: number;
  sandpaperSheets: number;
  corniceLengths: number;
  frameLengths: number;
  screws: number;
  nails: number;
  hangers: number;
  paintCans: number;
}

interface CatalogInputs {
  system?: string;
  unit?: string;
  length: number;
  width: number;
  includeDrops?: boolean;
  dropHeight?: number;
  dropRun?: number;
  boardSize: PsBoardSize;
  thickness: PsThickness;
  installation: PsInstallation;
  design: PsDesign;
  includeCornice?: boolean;
  includePaint?: boolean;
}

const polystyreneTakeoff = takeoffRaw as unknown as (
  inputs: Record<string, unknown>,
) => PageTakeoff;
const TEMPLATE_CATALOG = catalogRaw as unknown as {
  slug: string;
  inputs: CatalogInputs;
}[];
import {
  calculatePolystyreneCeiling,
  type PsBoardSize,
  type PsDesign,
  type PsInstallation,
  type PsThickness,
} from "./polystyrene-ceiling";

const FEET_PER_METRE = 3.28084;

const boards: PsBoardSize[] = ["1200x2400", "1200x3000"];
const designs: PsDesign[] = ["flat", "stepped", "coffered", "curved"];
const installations: PsInstallation[] = ["bonded", "timber", "metal", "wire"];
const thicknesses: PsThickness[] = [20, 25, 30];

const line = (
  lines: ReturnType<typeof calculatePolystyreneCeiling>["lines"],
  key: string,
) => lines.find((l) => l.key === key);

describe("the served board take-off matches the calculator", () => {
  for (const boardSize of boards)
    for (const design of designs)
      for (const installation of installations)
        for (const thickness of thicknesses)
          for (const extras of [false, true]) {
            const label = `${boardSize} ${design} ${installation} ${thickness}mm extras:${extras}`;
            it(label, () => {
              const length = 5.5;
              const width = 4.25;
              const inputs = {
                system: "polystyrene",
                unit: "meters",
                length,
                width,
                includeDrops: design !== "flat",
                dropHeight: 0.2,
                dropRun: 0,
                boardSize,
                thickness,
                installation,
                design,
                includeCornice: extras,
                includePaint: extras,
              };
              const page = polystyreneTakeoff(inputs);
              const calc = calculatePolystyreneCeiling({
                lengthM: length,
                widthM: width,
                includeDrops: inputs.includeDrops,
                dropHeightM: 0.2,
                dropPerimeterM: 0,
                boardSize,
                thickness,
                installation,
                design,
                includeCornice: extras,
                includePaint: extras,
              });

              expect(page.surfaceM2).toBeCloseTo(calc.surfaceM2, 3);
              expect(page.boardsRequired).toBe(calc.boardsRequired);
              expect(page.reinforcedSeamM).toBeCloseTo(calc.reinforcedSeamM, 3);
              expect(page.adhesiveCans).toBe(
                line(calc.lines, "adhesive")!.packs,
              );
              expect(page.tapeRolls).toBe(line(calc.lines, "tape")!.packs);
              expect(page.puttyBags).toBe(line(calc.lines, "putty")!.packs);
              expect(page.sandpaperSheets).toBe(
                line(calc.lines, "sandpaper")!.packs,
              );
              expect(page.corniceLengths).toBe(
                line(calc.lines, "cornice")?.packs ?? 0,
              );
              expect(page.frameLengths).toBe(
                line(calc.lines, "frame")?.packs ?? 0,
              );
              expect(page.screws).toBe(line(calc.lines, "screws")?.packs ?? 0);
              expect(page.nails).toBe(line(calc.lines, "nails")?.packs ?? 0);
              expect(page.hangers).toBe(
                line(calc.lines, "hangers")?.packs ?? 0,
              );
              expect(page.paintCans).toBe(
                line(calc.lines, "paint")?.packs ?? 0,
              );
            });
          }

  it("converts a template stored in feet before taking off", () => {
    const inputs = {
      system: "polystyrene",
      unit: "feet",
      length: 13,
      width: 11,
      includeDrops: false,
      boardSize: "1200x2400",
      thickness: 25,
      installation: "bonded",
      design: "flat",
    };
    const page = polystyreneTakeoff(inputs);
    const calc = calculatePolystyreneCeiling({
      lengthM: 13 / FEET_PER_METRE,
      widthM: 11 / FEET_PER_METRE,
      includeDrops: false,
      dropHeightM: 0,
      dropPerimeterM: 0,
      boardSize: "1200x2400",
      thickness: 25,
      installation: "bonded",
      design: "flat",
      includeCornice: false,
      includePaint: false,
    });
    expect(page.surfaceM2).toBeCloseTo(calc.surfaceM2, 2);
    expect(page.boardsRequired).toBe(calc.boardsRequired);
  });

  it("agrees on every board template in the catalog", () => {
    const psTemplates = TEMPLATE_CATALOG.filter(
      (t) => t.inputs?.system === "polystyrene",
    );
    expect(psTemplates.length).toBeGreaterThanOrEqual(4);
    for (const t of psTemplates) {
      const i = t.inputs;
      const page = polystyreneTakeoff({ ...i });
      const calc = calculatePolystyreneCeiling({
        lengthM: i.length,
        widthM: i.width,
        includeDrops: Boolean(i.includeDrops),
        dropHeightM: i.dropHeight ?? 0,
        dropPerimeterM: i.dropRun ?? 0,
        boardSize: i.boardSize,
        thickness: i.thickness,
        installation: i.installation,
        design: i.design,
        includeCornice: Boolean(i.includeCornice),
        includePaint: Boolean(i.includePaint),
      });
      expect(page.boardsRequired, t.slug).toBe(calc.boardsRequired);
      expect(page.tapeRolls, t.slug).toBe(line(calc.lines, "tape")!.packs);
      expect(page.adhesiveCans, t.slug).toBe(
        line(calc.lines, "adhesive")!.packs,
      );
      expect(page.surfaceM2, t.slug).toBeCloseTo(calc.surfaceM2, 3);
    }
  });
});
