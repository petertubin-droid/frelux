import { describe, expect, it } from "vitest";
import { buildConsoleElevation, type ConsoleLayoutInput } from "../elevation";
import { TV_CONSOLE_TEMPLATES } from "../templates";

const base: ConsoleLayoutInput = {
  widthMm: 1800,
  heightMm: 400,
  thicknessMm: 18,
  shelves: 2,
  dividers: 0,
  drawers: 0,
  drawerFrontHeightMm: 180,
  doors: 0,
  revealMm: 2,
};

const templateLayout = (template: (typeof TV_CONSOLE_TEMPLATES)[number]) =>
  ({
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    thicknessMm: template.layout.thicknessMm,
    shelves: template.layout.shelves,
    dividers: template.layout.dividers,
    drawers: template.layout.drawers,
    drawerFrontHeightMm: template.layout.drawerFrontHeightMm,
    doors: template.layout.doors,
    revealMm: template.layout.revealMm,
  }) satisfies ConsoleLayoutInput;

const kinds = (plan: ReturnType<typeof buildConsoleElevation>, kind: string) =>
  plan.parts.filter((part) => part.kind === kind);

describe("console elevation geometry", () => {
  it("draws the four carcass panels at the entered thickness", () => {
    const plan = buildConsoleElevation(base);
    const carcass = kinds(plan, "carcass");
    expect(carcass).toHaveLength(4);
    expect(carcass[0]).toMatchObject({ xMm: 0, yMm: 0, widthMm: 1800 });
    expect(carcass[0].heightMm).toBe(18);
    expect(carcass[3]).toMatchObject({ xMm: 1782, yMm: 0, heightMm: 400 });
  });

  it("splits the interior into equal bays around the dividers", () => {
    const plan = buildConsoleElevation({ ...base, dividers: 2, shelves: 0 });
    expect(plan.bays).toBe(3);
    // (1800 - 36 - 2 * 18) / 3
    expect(plan.bayWidthMm).toBeCloseTo(576, 6);
    const dividers = kinds(plan, "divider");
    expect(dividers).toHaveLength(2);
    expect(dividers[0].xMm).toBeCloseTo(18 + 576, 6);
    expect(dividers[1].xMm).toBeCloseTo(18 + 576 * 2 + 18, 6);
  });

  it("stacks drawer fronts up from the base and caps them at what fits", () => {
    const plan = buildConsoleElevation({
      ...base,
      heightMm: 400,
      drawers: 3,
      drawerFrontHeightMm: 100,
      shelves: 0,
    });
    expect(plan.drawerCount).toBe(3);
    const drawers = kinds(plan, "drawer");
    expect(drawers).toHaveLength(3);
    // Lowest front sits on the inner base; each one above it steps up a front.
    expect(drawers[0].yMm).toBeCloseTo(400 - 18 - 100, 6);
    expect(drawers[2].yMm).toBeCloseTo(400 - 18 - 300, 6);

    const tooMany = buildConsoleElevation({
      ...base,
      drawers: 20,
      drawerFrontHeightMm: 180,
      shelves: 0,
    });
    // Interior is 364 mm and a front is 180 mm, so two fit and no more.
    expect(tooMany.drawerCount).toBe(2);
  });

  it("moves shelves out of the drawer bank's bay", () => {
    const plan = buildConsoleElevation({
      ...base,
      heightMm: 500,
      dividers: 1,
      drawers: 1,
      drawerFrontHeightMm: 120,
      shelves: 2,
    });
    const shelves = kinds(plan, "shelf");
    expect(shelves).toHaveLength(2);
    // Both shelves sit in the second bay, right of the drawer column.
    for (const shelf of shelves) {
      expect(shelf.xMm).toBeGreaterThan(plan.bayWidthMm);
    }
    for (const shelf of shelves) {
      expect(shelf.yMm).toBeGreaterThan(0);
      expect(shelf.yMm).toBeLessThan(500);
    }
  });

  it("gives each door one bay, taken from the right", () => {
    const plan = buildConsoleElevation({
      ...base,
      dividers: 2,
      doors: 2,
      shelves: 0,
    });
    const doors = kinds(plan, "door");
    expect(plan.doorCount).toBe(2);
    expect(doors).toHaveLength(2);
    // The right hand door starts after the middle bay.
    expect(doors[0].xMm).toBeGreaterThan(18 + plan.bayWidthMm * 2);
    expect(doors[0].widthMm).toBeCloseTo(plan.bayWidthMm - 2, 6);
  });

  it("never asks for more doors than there are bays", () => {
    const plan = buildConsoleElevation({ ...base, dividers: 0, doors: 5 });
    expect(plan.doorCount).toBe(1);
  });

  it("stays inside the body and finite for degenerate input", () => {
    const degenerate = buildConsoleElevation({
      widthMm: 0,
      heightMm: -20,
      thicknessMm: 500,
      shelves: 99,
      dividers: 99,
      drawers: 99,
      drawerFrontHeightMm: 0,
      doors: 99,
      revealMm: 500,
    });
    expect(degenerate.widthMm).toBeGreaterThan(0);
    expect(degenerate.heightMm).toBeGreaterThan(0);
    for (const part of degenerate.parts) {
      expect(Number.isFinite(part.xMm), part.kind).toBe(true);
      expect(Number.isFinite(part.widthMm), part.kind).toBe(true);
      expect(part.xMm).toBeGreaterThanOrEqual(0);
      expect(part.yMm).toBeGreaterThanOrEqual(-1e-9);
      expect(part.xMm + part.widthMm).toBeLessThanOrEqual(
        degenerate.widthMm + 1e-9,
      );
      expect(part.yMm + part.heightMm).toBeLessThanOrEqual(
        degenerate.heightMm + 1e-9,
      );
    }
  });
});

describe("preset drawings", () => {
  it("renders every preset to scale inside its own body", () => {
    for (const template of TV_CONSOLE_TEMPLATES) {
      const plan = buildConsoleElevation(templateLayout(template));
      expect(plan.widthMm, template.id).toBe(template.widthMm);
      expect(plan.heightMm, template.id).toBe(template.heightMm);
      for (const part of plan.parts) {
        expect(part.xMm + part.widthMm, template.id).toBeLessThanOrEqual(
          template.widthMm + 1e-9,
        );
        expect(part.yMm + part.heightMm, template.id).toBeLessThanOrEqual(
          template.heightMm + 1e-9,
        );
      }
    }
  });

  it("gives every preset a distinct drawing", () => {
    const signatures = TV_CONSOLE_TEMPLATES.map((template) => {
      const plan = buildConsoleElevation(templateLayout(template));
      return plan.parts
        .map(
          (part) =>
            `${part.kind}:${Math.round(part.xMm)}:${Math.round(part.yMm)}:${Math.round(part.widthMm)}:${Math.round(part.heightMm)}`,
        )
        .join("|");
    });
    expect(new Set(signatures).size).toBe(TV_CONSOLE_TEMPLATES.length);
  });

  it("keeps the presets free of third party photography", () => {
    for (const template of TV_CONSOLE_TEMPLATES) {
      expect(template).not.toHaveProperty("imageUrl");
      expect(template).not.toHaveProperty("imageCredit");
      expect(JSON.stringify(template)).not.toMatch(/unsplash|http/i);
    }
  });
});
