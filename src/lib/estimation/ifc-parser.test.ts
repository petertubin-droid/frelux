/**
 * BIM/IFC Interop engine tests (Future Engine 15)
 *
 * Every expectation below was computed by hand from the fixture
 * file before being written down. The honesty rules under test:
 *  - quantities come ONLY from what the file declares
 *  - no quantities → counts only + an explicit warning
 *  - non-IFC files are refused, not guessed at
 *  - oversized files are refused with an honest error
 *  - unparsable lines are reported, never hidden
 */

import { describe, it, expect } from "vitest";
import { parseIfcTakeoff } from "./ifc-parser";

const RULES = [
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
  { rule_key: "max_entities_per_file", rule_value: { value: 250000 } },
];

/** A small but structurally valid IFC2x3-style fixture. */
const FIXTURE = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('villa.ifc','2026-10-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
/* owner history */
#1=IFCOWNERHISTORY($,$,$,.NOCHANGE.,$,$,$,1);
/* two walls with authored quantities */
#10=IFCWALLSTANDARDCASE('2aPqTXV3L9KxBhCPZJ3j0m',#1,'Wall-A',$,$,$,$,$,.STANDARD.);
#11=IFCQUANTITYAREA('GrossSideArea',$,$,12.5,$);
#12=IFCQUANTITYAREA('NetSideArea',$,$,11.2,$);
#13=IFCQUANTITYVOLUME('GrossVolume',$,$,3.1,$);
#14=IFCELEMENTQUANTITY('qset1',#1,'BaseQuantities',$,'',(#11,#12,#13));
#15=IFCRELDEFINESBYPROPERTIES('rel1',#1,$,$,(#10),#14);
#20=IFCWALLSTANDARDCASE('2aPqTXV3L9KxBhCPZJ3j0n',#1,'Wall-B',$,$,$,$,$,.STANDARD.);
#21=IFCQUANTITYAREA('GrossSideArea',$,$,7.5,$);
#22=IFCQUANTITYVOLUME('GrossVolume',$,$,1.9,$);
#23=IFCELEMENTQUANTITY('qset2',#1,'BaseQuantities',$,'',(#21,#22));
#24=IFCRELDEFINESBYPROPERTIES('rel2',#1,$,$,(#20),#23);
/* a slab with NO quantities - counts only, honestly */
#30=IFCSLAB('2aPqTXV3L9KxBhCPZJ3j0o',#1,'Slab-Ground',$,$,$,$,$,$);
/* a door and a window */
#40=IFCDOOR('2aPqTXV3L9KxBhCPZJ3j0p',#1,'Door-Front',$,$,$,$,$,$,$);
#50=IFCWINDOW('2aPqTXV3L9KxBhCPZJ3j0q',#1,'Window-Bed',$,$,$,$,$,$,$);
/* a non-target entity that must NOT appear in the takeoff */
#60=IFCFURNISHINGELEMENT('xyz',#1,'Sofa',$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

describe("parseIfcTakeoff", () => {
  it("counts elements per type from the file (hand-verified)", () => {
    const r = parseIfcTakeoff({
      file_text: FIXTURE,
      file_name: "villa.ifc",
      rules: RULES,
    });
    expect(r.ok).toBe(true);
    const types = Object.fromEntries(r.elements.map((e) => [e.type, e.count]));
    // hand count: 2 walls, 1 slab, 1 door, 1 window
    expect(types).toEqual({
      IFCWALLSTANDARDCASE: 2,
      IFCSLAB: 1,
      IFCDOOR: 1,
      IFCWINDOW: 1,
    });
    expect(r.entity_count).toBe(16); // hand count of # entities in the fixture
  });

  it("sums ONLY the quantities the file declares (hand-verified)", () => {
    const r = parseIfcTakeoff({ file_text: FIXTURE, rules: RULES });
    const walls = r.elements.find((e) => e.type === "IFCWALLSTANDARDCASE")!;
    // Wall-A GrossSideArea 12.5 + Wall-B GrossSideArea 7.5 = 20.0
    expect(walls.quantity_totals["GrossSideArea"]).toEqual({
      unit: "m²",
      total: 20,
      elements: 2,
    });
    // NetSideArea exists only on Wall-A: 11.2
    expect(walls.quantity_totals["NetSideArea"]).toEqual({
      unit: "m²",
      total: 11.2,
      elements: 1,
    });
    // GrossVolume 3.1 + 1.9 = 5.0
    expect(walls.quantity_totals["GrossVolume"]).toEqual({
      unit: "m³",
      total: 5,
      elements: 2,
    });
    expect(r.has_quantities).toBe(true);
  });

  it("reports the slab with counts only: no invented area", () => {
    const r = parseIfcTakeoff({ file_text: FIXTURE, rules: RULES });
    const slab = r.elements.find((e) => e.type === "IFCSLAB")!;
    expect(slab.count).toBe(1);
    expect(slab.quantity_totals).toEqual({});
    // and it never claims quantities exist for it
    expect(Object.keys(slab.quantity_totals)).toHaveLength(0);
  });

  it("never reports non-target entities (the sofa)", () => {
    const r = parseIfcTakeoff({ file_text: FIXTURE, rules: RULES });
    expect(r.elements.some((e) => e.type === "IFCFURNISHINGELEMENT")).toBe(
      false,
    );
  });

  it("handles quoted strings containing commas without corrupting args", () => {
    const tricky = `ISO-10303-21;
HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCWALL('guid',$,'Wall, with, commas',#2,$,$,$);
#2=IFCQUANTITYAREA('Area (net, gross)',$,$,4.5,$);
#3=IFCELEMENTQUANTITY('q',$,$,'',(#2));
#4=IFCRELDEFINESBYPROPERTIES('r',$,$,$,(#1),#3);
ENDSEC;END-ISO-10303-21;`;
    const r = parseIfcTakeoff({ file_text: tricky, rules: RULES });
    const walls = r.elements.find((e) => e.type === "IFCWALL")!;
    expect(walls.count).toBe(1);
    expect(walls.quantity_totals["Area (net, gross)"]).toEqual({
      unit: "m²",
      total: 4.5,
      elements: 1,
    });
  });

  it("refuses a non-IFC file honestly instead of guessing", () => {
    const r = parseIfcTakeoff({
      file_text: "hello world, this is a PDF or a DXF",
      file_name: "drawing.pdf",
      rules: RULES,
    });
    expect(r.ok).toBe(false);
    expect(r.elements).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/not a valid IFC\/STEP file/i);
    expect(r.warnings[0]).toContain("drawing.pdf");
  });

  it("refuses a file above the configured entity cap", () => {
    const bigRules = [
      { rule_key: "rounding_decimals", rule_value: { value: 2 } },
      { rule_key: "max_entities_per_file", rule_value: { value: 5 } },
    ];
    const r = parseIfcTakeoff({ file_text: FIXTURE, rules: bigRules });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/above the configured cap of 5/i);
    expect(r.entity_count).toBe(16);
  });

  it("warns honestly when a file has elements but NO quantities at all", () => {
    const noQty = `ISO-10303-21;
HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCWALL('g1',$,'W1',$,$,$,$,$);
#2=IFCWALL('g2',$,'W2',$,$,$,$,$);
#3=IFCDOOR('g3',$,'D1',$,$,$,$,$);
ENDSEC;END-ISO-10303-21;`;
    const r = parseIfcTakeoff({ file_text: noQty, rules: RULES });
    expect(r.ok).toBe(true);
    expect(r.has_quantities).toBe(false);
    expect(r.warnings.some((w) => /no quantities are declared/i.test(w))).toBe(
      true,
    );
    const walls = r.elements.find((e) => e.type === "IFCWALL")!;
    expect(walls.count).toBe(2);
    expect(walls.quantity_totals).toEqual({});
  });

  it("reports a file with no construction elements honestly", () => {
    const empty = `ISO-10303-21;
HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCPERSON($,'Architect',$,$,$,$,$,$);
ENDSEC;END-ISO-10303-21;`;
    const r = parseIfcTakeoff({ file_text: empty, rules: RULES });
    expect(r.ok).toBe(false);
    expect(r.elements).toHaveLength(0);
    expect(r.warnings.some((w) => /no construction elements/i.test(w))).toBe(
      true,
    );
  });

  it("reports unparsable entity lines instead of hiding them", () => {
    const glitchy = `ISO-10303-21;
HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCWALL('g1',$,'W1',$,$,$,$,$);
#2=IFCWALL(this line is broken and unterminated
ENDSEC;END-ISO-10303-21;`;
    const r = parseIfcTakeoff({ file_text: glitchy, rules: RULES });
    // the broken line starts like an entity but cannot be parsed
    expect(r.unparsed_lines).toBeGreaterThanOrEqual(1);
    expect(r.warnings.some((w) => /could not be parsed/i.test(w))).toBe(true);
    // the good wall still counts
    expect(r.elements.find((e) => e.type === "IFCWALL")!.count).toBe(1);
  });

  it("rounds totals to the configured decimals", () => {
    const precise = `ISO-10303-21;
HEADER;FILE_SCHEMA(('IFC4'));ENDSEC;
DATA;
#1=IFCWALL('g1',$,'W1',$,$,$,$,$);
#2=IFCQUANTITYAREA('NetArea',$,$,10.123456,$);
#3=IFCELEMENTQUANTITY('q',$,$,'',(#2));
#4=IFCRELDEFINESBYPROPERTIES('r',$,$,$,(#1),#3);
ENDSEC;END-ISO-10303-21;`;
    const r = parseIfcTakeoff({ file_text: precise, rules: RULES });
    expect(r.elements[0].quantity_totals["NetArea"].total).toBe(10.12);
  });
});
