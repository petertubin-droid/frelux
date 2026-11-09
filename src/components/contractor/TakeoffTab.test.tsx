/**
 * Takeoff studio contract.
 *
 * Locks the behaviour a contractor relies on: typing a dimension changes the
 * bill, nothing is invented for an empty schedule, assumptions are visible, and
 * saving carries the schedule rather than only the totals.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { TakeoffTab } from "./TakeoffTab";

const fetchProjectTakeoffs = vi.fn(
  async (_projectId: string) => [] as unknown[],
);
const saveProjectTakeoff = vi.fn(async (input: unknown) => ({
  id: "tk-1",
  ...(input as object),
}));
const deleteProjectTakeoff = vi.fn(async (_id: string) => undefined);

const extractScheduleFromPdf = vi.fn(async (_file: File) => ({
  candidates: [] as unknown[],
  openings: [] as unknown[],
  scaleNotes: [] as string[],
  pagesRead: 1,
  scanned: false,
}));

vi.mock("@/lib/takeoff/pdf-schedule", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/takeoff/pdf-schedule")>();
  return {
    ...actual,
    extractScheduleFromPdf: (file: File) => extractScheduleFromPdf(file),
  };
});

vi.mock("@/lib/takeoff/persistence", () => ({
  fetchProjectTakeoffs: (projectId: string) => fetchProjectTakeoffs(projectId),
  saveProjectTakeoff: (input: never) => saveProjectTakeoff(input),
  deleteProjectTakeoff: (id: string) => deleteProjectTakeoff(id),
}));

beforeEach(() => {
  fetchProjectTakeoffs.mockClear();
  saveProjectTakeoff.mockClear();
});

const renderTab = () =>
  render(<TakeoffTab projectId="proj-1" projectName="Lekki duplex" />);

describe("Takeoff studio", () => {
  it("starts with an honest empty state", async () => {
    renderTab();
    expect(screen.getByText(/Nothing is estimated for you/i)).toBeTruthy();
    await waitFor(() =>
      expect(fetchProjectTakeoffs).toHaveBeenCalledWith("proj-1"),
    );
  });

  it("derives the bill as soon as a wall and floor are measured", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    fireEvent.change(screen.getByLabelText("Floor length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Floor width"), {
      target: { value: "3.5" },
    });

    const bill = screen.getByRole("table", { name: /Bill of quantities/i });
    expect(within(bill).getByText("Blockwork")).toBeTruthy();
    expect(within(bill).getByText("Blockwork measured area")).toBeTruthy();
    // 4 x 2.7 = 10.8 m2 of wall, shown in the line and in the totals
    expect(within(bill).getAllByText("10.8").length).toBeGreaterThan(0);
  });

  it("keeps a scope out of the bill when it is switched off", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Blockwork" }));
    const bill = screen.getByRole("table", { name: /Bill of quantities/i });
    expect(within(bill).queryByText("Blockwork measured area")).toBeNull();
  });

  it("deducts a door added to a wall", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Add door or window/i }),
    );
    fireEvent.change(screen.getByLabelText("Opening 1 width"), {
      target: { value: "0.9" },
    });
    fireEvent.change(screen.getByLabelText("Opening 1 height"), {
      target: { value: "2.1" },
    });

    // 10.8 - 1.89 = 8.91 m2
    const bill = screen.getByRole("table", { name: /Bill of quantities/i });
    expect(within(bill).getAllByText("8.91").length).toBeGreaterThan(0);
  });

  it("shows the working behind a line", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    const summaries = screen.getAllByText("Show working");
    fireEvent.click(summaries[0]);
    expect(
      screen.getAllByText(/wall length x height - deducted openings/i).length,
    ).toBeGreaterThan(0);
  });

  it("warns rather than inventing work for a missing floor", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    expect(screen.getByText(/Floor tiling: nothing measured/i)).toBeTruthy();
  });

  it("saves the schedule and the bill, not just the totals", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    fireEvent.change(screen.getByLabelText("Floor length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Floor width"), {
      target: { value: "3.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save takeoff/i }));

    await waitFor(() => expect(saveProjectTakeoff).toHaveBeenCalledTimes(1));
    const payload = saveProjectTakeoff.mock.calls[0][0] as {
      projectId: string;
      name: string;
      scopes: string[];
      schedule: { rooms: { walls: { length: number }[] }[] };
      result: { lines: unknown[]; totals: unknown[] };
    };
    expect(payload.projectId).toBe("proj-1");
    expect(payload.name).toContain("Lekki duplex");
    expect(payload.schedule.rooms[0].walls[0].length).toBe(4);
    expect(payload.result.lines.length).toBeGreaterThan(0);
    await screen.findByText("Takeoff saved.");
  });

  it("reports a save failure instead of claiming success", async () => {
    saveProjectTakeoff.mockRejectedValueOnce(new Error("permission denied"));
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2.7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save takeoff/i }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.length).toBeGreaterThan(0);
    expect(alert.textContent).not.toMatch(/saved/i);
    expect(screen.queryByText("Takeoff saved.")).toBeNull();
  });

  it("adds a room without touching the first", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Add room/i }));
    expect(screen.getAllByLabelText(/Room name/i)).toHaveLength(2);
  });

  it("accepts millimetre input and reports the same area", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Wall 1 length"), {
      target: { value: "4000" },
    });
    fireEvent.change(screen.getByLabelText("Wall 1 height"), {
      target: { value: "2700" },
    });
    const unitSelects = screen.getAllByLabelText("Unit");
    fireEvent.change(unitSelects[0], { target: { value: "mm" } });
    const bill = screen.getByRole("table", { name: /Bill of quantities/i });
    expect(within(bill).getAllByText("10.8").length).toBeGreaterThan(0);
  });
});

describe("plan import", () => {
  const candidate = {
    id: "cand-1",
    label: "BEDROOM 1",
    length: 3.6,
    width: 4.2,
    unit: "m",
    raw: "3600 x 4200",
    page: 1,
    evidence: "BEDROOM 1 3600 x 4200",
    confidence: "high",
    notes: [],
  };

  const upload = (container: HTMLElement) => {
    const input = container.querySelector("#takeoff-pdf") as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "plan.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });
    return file;
  };

  it("shows the rooms it read, with the evidence behind each", async () => {
    extractScheduleFromPdf.mockResolvedValueOnce({
      candidates: [candidate],
      openings: [{ raw: "900 x 2100", label: "DOOR D1", page: 1 }],
      scaleNotes: ["1:100"],
      pagesRead: 2,
      scanned: false,
    });
    const { container } = renderTab();
    const file = upload(container);

    await screen.findByText("BEDROOM 1");
    expect(extractScheduleFromPdf).toHaveBeenCalledWith(file);
    expect(screen.getByText(/Read from: BEDROOM 1 3600 x 4200/)).toBeTruthy();
    expect(screen.getByText(/1 opening dimension/)).toBeTruthy();
    expect(screen.getByText(/1:100 was read but not applied/)).toBeTruthy();
  });

  it("adds the selected rooms to the schedule with their wall height", async () => {
    extractScheduleFromPdf.mockResolvedValueOnce({
      candidates: [candidate],
      openings: [],
      scaleNotes: [],
      pagesRead: 1,
      scanned: false,
    });
    const { container } = renderTab();
    upload(container);
    await screen.findByText("BEDROOM 1");

    fireEvent.change(screen.getByLabelText(/^Wall height/), {
      target: { value: "2.7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Add selected rooms/i }),
    );

    const bill = await screen.findByRole("table", {
      name: /Bill of quantities/i,
    });
    // Four walls: 3.6 + 3.6 + 4.2 + 4.2 at 2.7 is 42.12 m2.
    expect(within(bill).getAllByText("42.12").length).toBeGreaterThan(0);
  });

  it("says plainly when the PDF is a scan with no text", async () => {
    extractScheduleFromPdf.mockResolvedValueOnce({
      candidates: [],
      openings: [],
      scaleNotes: [],
      pagesRead: 3,
      scanned: true,
    });
    const { container } = renderTab();
    upload(container);
    await screen.findByText(/no readable text, so it is a scan/i);
  });

  it("reports a read failure without adding rooms", async () => {
    extractScheduleFromPdf.mockRejectedValueOnce(new Error("worker failed"));
    const { container } = renderTab();
    upload(container);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.length).toBeGreaterThan(0);
  });
});
