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
#6=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#7=IFCUNITASSIGNMENT((#6));
#8=IFCPROJECT('p',$,'Project',$,$,$,$,$,$,#7);
ENDSEC;
END-ISO-10303-21;`;

function makeFile(name: string, text: string): File {
  return new File([text], name, { type: "application/octet-stream" });
}

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const FAKE_MODEL_ELEMENTS = [
  {
    expressID: 2,
    globalId: "COL-1",
    ifcClass: "IFCCOLUMN",
    name: "Col-A",
    quantities: [
      { name: "NetVolume", kind: "volume", value: 2.4 },
      { name: "GrossSideArea", kind: "area", value: 8.2 },
    ],
    geometry: [],
  },
  {
    expressID: 9,
    globalId: "ROOF-1",
    ifcClass: "IFCROOF",
    name: "Roof",
    quantities: [{ name: "GrossArea", kind: "area", value: 20 }],
    geometry: [],
  },
];

vi.mock("@/lib/bim/ifc-model-loader", () => ({
  parseIfcModel: vi.fn(async () => ({
    ok: true,
    schema: "IFC4",
    elements: FAKE_MODEL_ELEMENTS,
    elementsWithGeometry: 0,
    elementsWithQuantities: 3,
    warnings: [],
  })),
}));

vi.mock("@/components/bim/IfcModelViewer", () => ({
  default: ({
    selectedGlobalId,
    onSelect,
    elements,
  }: {
    selectedGlobalId: string | null;
    onSelect: (id: string | null) => void;
    elements: unknown[];
  }) => (
    <div>
      <div
        data-testid="ifc-viewer-mock"
        data-selected={selectedGlobalId ?? ""}
        data-count={elements.length}
      />
      <button type="button" onClick={() => onSelect("COL-1")}>
        simulate-element-pick
      </button>
      <button type="button" onClick={() => onSelect(null)}>
        simulate-empty-pick
      </button>
    </div>
  ),
}));
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
      await screen.findByText(/only \.ifc and \.ifczip files are supported/i),
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
    expect(
      screen.getByRole("button", { name: /export review record/i }),
    ).toBeInTheDocument();
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

describe("BimIfcImport 5D linking (model <-> Bill of Quantities)", () => {
  it("renders the linked Bill of Quantities with declared and indicative lines", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(makeFile("villa.ifc", GOOD_IFC));

    expect(await screen.findByTestId("bim-5d-section")).toBeInTheDocument();
    // Column: concrete and formwork declared, rebar indicative (2.4 m3 x 100).
    expect(screen.getByText("Concrete - IFCCOLUMN Col-A")).toBeInTheDocument();
    expect(screen.getByText("Formwork - IFCCOLUMN Col-A")).toBeInTheDocument();
    expect(screen.getByText("Rebar - IFCCOLUMN Col-A")).toBeInTheDocument();
    const rows = screen.getAllByTestId("boq-line");
    const rebarRow = rows.find((r) =>
      r.textContent?.includes("Rebar - IFCCOLUMN Col-A"),
    );
    expect(rebarRow?.textContent).toContain("240 kg");
    expect(rebarRow?.textContent).toContain("indicative");
    // Roof facet: sheets and screws derived from the declared 20 m2.
    const sheetsRow = rows.find((r) =>
      r.textContent?.includes("Roof sheets - IFCROOF Roof"),
    );
    expect(sheetsRow?.textContent).toContain("45 sheets");
  });

  it("clicking a BoQ line highlights its source element in the 3D model", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(makeFile("villa.ifc", GOOD_IFC));
    await screen.findByTestId("bim-5d-section");

    const rows = screen.getAllByTestId("boq-line");
    fireEvent.click(
      rows.find((r) => r.textContent?.includes("Rebar - IFCCOLUMN Col-A"))!,
    );
    // The viewer receives the rebar line's source element.
    await waitFor(() => {
      expect(screen.getByTestId("ifc-viewer-mock").dataset.selected).toBe(
        "COL-1",
      );
    });
    expect(screen.getByTestId("bim-selected-element").textContent).toContain(
      "IFCCOLUMN",
    );
    expect(screen.getByTestId("bim-selected-element").textContent).toContain(
      "GlobalId COL-1",
    );
  });

  it("clicking an element in the 3D model highlights all its BoQ lines", async () => {
    render(
      <MemoryRouter>
        <BimIfcImport />
      </MemoryRouter>,
    );
    upload(makeFile("villa.ifc", GOOD_IFC));
    await screen.findByTestId("bim-5d-section");

    fireEvent.click(screen.getByText("simulate-element-pick"));
    await waitFor(() => {
      expect(screen.getByTestId("bim-selected-element")).toBeInTheDocument();
    });
    const rows = screen.getAllByTestId("boq-line");
    const colRows = rows.filter((r) => r.textContent?.includes("Col-A"));
    expect(colRows.length).toBe(3); // concrete + rebar + formwork highlighted
    for (const row of colRows) {
      expect(row.className).toContain("bg-blue");
    }
    // Roof lines are not highlighted.
    const roofRows = rows.filter((r) =>
      r.textContent?.includes("IFCROOF Roof"),
    );
    for (const row of roofRows) {
      expect(row.className).not.toContain("bg-blue");
    }
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
