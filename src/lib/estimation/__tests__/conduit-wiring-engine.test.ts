import { describe, expect, it } from "vitest";
import {
  calculateConduitWiring,
  DEFAULT_CONDUIT_WIRING_RULES,
  parseConduitWiringRules,
} from "../conduit-wiring-engine";

const prices = {
  "elec-conduit": 4200,
  "elec-cable-lighting": 48000,
  "elec-cable-socket": 72000,
  "elec-junction-box": 900,
  "elec-switch-plate": 2500,
  "elec-socket-outlet": 3200,
};

describe("conduit and wiring takeoff", () => {
  it("sizes conduit from floor area and rounds up to whole lengths", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    const conduit = r.lines.find((l) => l.key === "conduit");
    expect(conduit?.quantity).toBe(75); // 216 m / 2.9 m
    expect(conduit?.detail).toContain("216 m");
  });

  it("buys cable in whole 100 m coils while showing the metres needed", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    const lighting = r.lines.find((l) => l.key === "lighting_cable");
    const socket = r.lines.find((l) => l.key === "socket_cable");
    expect(lighting?.quantity).toBe(2); // 168 m
    expect(lighting?.detail).toContain("168 m");
    expect(socket?.quantity).toBe(2); // 180 m
    expect(socket?.detail).toContain("180 m");
  });

  it("applies the junction box allowance to all points", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.lines.find((l) => l.key === "junction_boxes")?.quantity).toBe(28); // 24 x 1.15
  });

  it("counts one switch plate and one outlet per point the user entered", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.lines.find((l) => l.key === "switch_plates")?.quantity).toBe(14);
    expect(
      r.lines.find((l) => l.key === "switch_plates")?.quantity_source,
    ).toBe("user_provided");
    expect(r.lines.find((l) => l.key === "socket_outlets")?.quantity).toBe(10);
  });

  it("totals priced lines and never invents the rest", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.material_subtotal).not.toBeNull();
    const unpriced = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      { "elec-conduit": 4200 },
    );
    expect(unpriced.material_subtotal).toBeNull();
    expect(unpriced.priced_subtotal).toBe(75 * 4200);
  });

  it("says the takeoff is not a circuit design", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 120, lighting_points: 14, socket_points: 10 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.warnings.join(" ")).toContain("licensed electrician");
    expect(r.tax_status).toBe("tax_not_determined");
  });

  it("warns when no points were entered", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 80, lighting_points: 0, socket_points: 0 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toContain("No points were entered");
  });

  it("rejects fractional point counts and empty areas", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 0, lighting_points: 2.5, socket_points: -1 },
      DEFAULT_CONDUIT_WIRING_RULES,
      prices,
    );
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(3);
  });

  it("takes rule overrides from the admin table", () => {
    const rules = parseConduitWiringRules([
      { rule_key: "conduit_per_m2", rule_value: { value: 2.2 } },
    ]);
    expect(rules.conduit_per_m2).toBe(2.2);
    expect(rules.conduit_length_m).toBe(
      DEFAULT_CONDUIT_WIRING_RULES.conduit_length_m,
    );
  });
});
