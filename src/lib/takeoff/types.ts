/**
 * Takeoff model.
 *
 * Every quantity in FRELUX is computed, never guessed: a line always carries
 * the formula that produced it, the inputs it consumed and the uncertainty it
 * inherited. A drawing parser or a model may propose labels, but only these
 * deterministic functions produce numbers.
 */

export type LengthUnit = "m" | "mm" | "ft" | "in";

export interface Opening {
  /** Stable id so a review screen can point at one opening. */
  id: string;
  label?: string;
  /**
   * What the opening is. A door or a full height opening interrupts skirting;
   * a window sits above it and does not. When kind is absent the opening is
   * treated as a door only if it reaches 2.0 m, which every standard door does
   * and no window does.
   */
  kind?: "door" | "window" | "opening";
  width: number;
  height: number;
  unit?: LengthUnit;
  /** Openings below this area are ignored, per the standard measurement rule. */
  deductAbove?: number;
}

export interface WallInput {
  id: string;
  label?: string;
  /** Clear length between structural faces. */
  length: number;
  /** Floor to underside of slab. */
  height: number;
  unit?: LengthUnit;
  thicknessMm?: number;
  openings?: Opening[];
  /** Set when the value came from an assumption rather than a drawing. */
  assumed?: boolean;
}

export interface FloorInput {
  id: string;
  label?: string;
  length: number;
  width: number;
  unit?: LengthUnit;
  /** Openings in the floor, such as a stair void. */
  deductions?: { id: string; area: number; unit?: "m2" | "ft2" }[];
  assumed?: boolean;
}

export interface RoomInput {
  id: string;
  label?: string;
  walls?: WallInput[];
  floor?: FloorInput;
}

export interface ScheduleInput {
  id: string;
  label?: string;
  rooms: RoomInput[];
  /**
   * Standard openings that were too wide or too large for any wall in their room.
   * They are reported by the template totals and never silently deducted.
   */
  unplacedOpenings?: Opening[];
  /** Applies when an element does not state its own thickness. */
  defaultWallThicknessMm?: number;
  defaultOpeningDeductAbove?: number;
}

export type TakeoffScope =
  | "blockwork"
  | "render"
  | "paint"
  | "ceiling"
  | "floor_tiles"
  | "screed"
  | "skirting";

export type QuantityUnit = "m2" | "m3" | "m" | "nr" | "kg" | "L" | "packs";

export interface Derivation {
  /** Human readable formula, e.g. "perimeter x height - openings". */
  formula: string;
  /** Named inputs with the exact values used. */
  inputs: Record<string, number>;
  /** Intermediate values worth showing in a review panel. */
  steps?: { label: string; value: number; unit?: string }[];
}

export interface TakeoffLine {
  id: string;
  scope: string;
  description: string;
  quantity: number;
  unit: QuantityUnit;
  /** Quantity before waste, kept so a reviewer can see the raw measure. */
  netQuantity: number;
  wastePct: number;
  /** Whole units or packs when the material is sold that way. */
  purchaseQuantity?: number;
  purchaseUnit?: string;
  /** Rooms or walls this line came from. */
  sources: string[];
  derivation: Derivation;
  /** True when any input behind the line was assumed, not measured. */
  assumed: boolean;
  notes?: string[];
}

export interface TakeoffResult {
  lines: TakeoffLine[];
  /** Sum of quantities per unit, for a quick sanity read. */
  totals: { unit: QuantityUnit; quantity: number }[];
  assumedLineCount: number;
  warnings: string[];
}
