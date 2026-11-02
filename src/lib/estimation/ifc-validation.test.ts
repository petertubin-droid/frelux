// ============================================================
// IFC validation pipeline tests — engine-1B BIM milestone.
// Fixtures are hand-verified minimal IFC snippets. The gate is
// additive: 'invalid' only for files the takeoff parser itself
// would refuse (no STEP/IFC markers, or over the entity cap).
// ============================================================

import { describe, it, expect } from "vitest";
import { validateIfcFile } from "./ifc-validation";

const VALID_IFC = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('1pZtO4Lfv3o92EA8Q92tJc',$,'Test Project',$,$,$,$,$);
#8=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#11=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,$,$);
#14=IFCWALLSTANDARDCASE('3qAC6iKGvB1wQZt0pEg1',$,'Test Wall',$,$,$,$,$);
#16=IFCQUANTITYLENGTH('Height',$,$,3.,$,$,$);
#17=IFCQUANTITYAREA('NetSideArea',$,$,10.4,$,$,$);
ENDSEC;
END-ISO-10303-21;`;

describe("validateIfcFile", () => {
  it("passes a complete IFC file with schema captured", () => {
    const r = validateIfcFile({ file_text: VALID_IFC, file_name: "villa.ifc" });
    expect(r.verdict).toBe("valid");
    expect(r.schema).toBe("IFC4");
    expect(r.entity_count).toBe(6);
    expect(r.element_count).toBe(1);
    expect(r.quantity_count).toBe(2);
    expect(r.checks.every((c) => c.status === "pass")).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("refuses (invalid) a file with no IFC/STEP markers at all", () => {
    const r = validateIfcFile({ file_text: "just some text", file_name: "x.ifc" });
    expect(r.verdict).toBe("invalid");
    expect(r.checks.find((c) => c.id === "step_header")?.status).toBe("fail");
    expect(r.checks.find((c) => c.id === "file_schema")?.status).toBe("fail");
    expect(r.warnings[0]).toMatch(/refused rather than guessed at/i);
  });

  it("treats an empty-but-real IFC export as valid with warnings (additive gate)", () => {
    const r = validateIfcFile({
      file_text: "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;",
      file_name: "empty.ifc",
    });
    expect(r.verdict).toBe("valid_with_warnings");
    expect(r.checks.find((c) => c.id === "entity_coverage")?.status).toBe("warn");
    expect(r.checks.find((c) => c.id === "elements")?.status).toBe("warn");
  });

  it("refuses above the configured entity cap (mirrors the parser cap)", () => {
    const line = "#1=IFCWALL('x',$,'w',$,$,$,$,$);\n";
    const text = `ISO-10303-21;\nFILE_SCHEMA(('IFC2X3'));\nDATA;\n${line.repeat(10)}`;
    const r = validateIfcFile({ file_text: text, max_entities: 5 });
    expect(r.verdict).toBe("invalid");
    expect(r.checks.find((c) => c.id === "entity_cap")?.status).toBe("fail");
  });

  it("warns honestly about missing units without failing the file", () => {
    const noUnits = VALID_IFC.replace(/#8=IFCSIUNIT.*\n/, "");
    const r = validateIfcFile({ file_text: noUnits });
    expect(r.verdict).toBe("valid_with_warnings");
    expect(r.checks.find((c) => c.id === "units")?.status).toBe("warn");
    expect(r.warnings.join(" ")).toMatch(/no supported unit declarations/i);
  });

  it("counts unparsed entity-shaped lines and keeps them as warnings only", () => {
    // #16 keeps its #<n>= shape but loses the open paren, so it is an
    // entity-shaped candidate the tokenizer cannot consume.
    const messy = VALID_IFC.replace(
      "#16=IFCQUANTITYLENGTH('Height',$,$,3.,$,$,$);",
      "#16=IFCQUANTITYLENGTH;",
    );
    const r = validateIfcFile({ file_text: messy });
    expect(r.verdict).not.toBe("invalid");
    expect(r.unparsed_lines).toBe(1);
    expect(r.checks.find((c) => c.id === "entity_coverage")?.status).toBe(
      "warn",
    );
    expect(r.warnings.join(" ")).toMatch(/could not be tokenized/i);
  });
});
