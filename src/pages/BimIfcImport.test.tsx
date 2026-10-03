/**
 * BIM/IFC Import page tests (Future Engine 15)
 *
 * The deterministic parsing is covered by ifc-parser.test.ts
 * (11 hand-verified tests). These pin the page wiring: file
 * gating, honest error display, takeoff rendering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BimIfcImport from "./BimIfcImport";

const GOOD_IFC = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALLSTANDARDCASE('g1',$,'Wall-A',$,$,$,$,$);
#2=IFCQUANTITYAREA('GrossSideArea',$,$,20.4,$);
#3=IFCELEMENTQUANTITY('q',$,'BaseQuantities',$,'',(#2));
#4=IFCRELDEFINESBYPROPERTIES('r',$,$,$,(#1),#3);
#5=IFCDOOR('g2',$,'Front-Door',$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`;

function makeFile(name: string, text: string): File {
  return new File([text], name, { type: "application/octet-stream" });
}

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

function upload(file: File) {
  const input = screen.getByLabelText(/IFC file/i) as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

describe("BimIfcImport page", () => {
  it("refuses non-IFC files with an honest message and nothing guessed", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(makeFile("drawing.pdf", "PDF content"));
    expect(
      await screen.findByText(/only \.ifc files are supported/i),
    ).toBeInTheDocument();
    // no takeoff was produced
    expect(screen.queryByText("Material takeoff")).not.toBeInTheDocument();
  });

  it("renders the hand-verified takeoff for a valid IFC upload", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(makeFile("villa.ifc", GOOD_IFC));

    expect(await screen.findByText("Material takeoff")).toBeInTheDocument();
    // one wall with a declared area, one door
    expect(screen.getByText("IFCWALLSTANDARDCASE")).toBeInTheDocument();
    expect(screen.getByText("IFCDOOR")).toBeInTheDocument();
    expect(screen.getByText(/GrossSideArea:/)).toBeInTheDocument();
    expect(screen.getByText(/20\.4 m²/)).toBeInTheDocument();
    // declared quantities flag
    expect(screen.getByText("Declared by the file")).toBeInTheDocument();
  });

  it("reports an IFC file with no construction elements honestly", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(
      makeFile(
        "empty.ifc",
        "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;",
      ),
    );
    await waitFor(() => {
      expect(screen.getByText(/no construction elements/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Material takeoff")).not.toBeInTheDocument();
  });
});

describe("engine route registration (regression)", () => {
  it("registers /bim-ifc-import in App.tsx", async () => {
    const fs = await import("fs");
    const app = fs.readFileSync("src/App.tsx", "utf-8");
    expect(app).toContain('"/bim-ifc-import"');
    expect(app).toContain("BimIfcImport");
  });
});
