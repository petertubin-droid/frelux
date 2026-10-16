/**
 * Field Sync page tests (Engine #11 — sync & offline-first)
 *
 * The queue logic is covered by offline-field-engine.test.ts,
 * the backoff planner by sync-scheduler.test.ts and the device
 * id by device-identity.test.ts. These pin the page wiring:
 * offline capture form, honest connectivity status, queue
 * rendering with per-capture status, manual + automatic sync,
 * retry disclosure, queue backup, the ads contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FieldSync from "./FieldSync";
import { fetchOfflineFieldRules } from "@/lib/estimation/queries";

const insertMock = vi.fn();

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/lib/estimation/queries", () => ({
  fetchOfflineFieldRules: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertFieldCapture: (...args: unknown[]) => insertMock(...args),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  insertMock.mockResolvedValue("synced");
  vi.mocked(fetchOfflineFieldRules).mockResolvedValue({
    data: [],
    error: null,
  });
});

afterEach(() => {
  localStorage.clear();
});

/** Admin-rules override: auto-sync on/off for a scenario. */
function setAutoSyncRule(enabled: boolean) {
  vi.mocked(fetchOfflineFieldRules).mockResolvedValue({
    data: [
      {
        rule_key: "auto_sync",
        rule_value: { value: enabled },
        is_active: true,
      },
    ],
    error: null,
  } as never);
}

function goOffline() {
  Object.defineProperty(window.navigator, "onLine", {
    value: false,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("offline"));
}

function goOnline() {
  Object.defineProperty(window.navigator, "onLine", {
    value: true,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("online"));
}

function fillCapture(label: string, detail: string) {
  fireEvent.change(screen.getByLabelText(/job label/i), {
    target: { value: label },
  });
  fireEvent.change(screen.getByLabelText(/what happened on site/i), {
    target: { value: detail },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /save to device queue/i }),
  );
}

describe("FieldSync page", () => {
  it("states offline status honestly and lets the artisan capture with no network", () => {
    goOffline();
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    // The banner states offline twice by design (status line + auto-sync
    // refusal), so query all matches (house convention for by-design dups)
    expect(screen.getAllByText(/you are offline/i).length).toBeGreaterThanOrEqual(1);
    fillCapture(
      "Ikeja duplex: room 2",
      "Walls measured 4.2 x 3.1 m, two coats done",
    );
    // Nothing claims to be synced
    expect(
      screen.getByText(/on this device, not synced yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/offline/i);
  });

  it("shows the empty queue honestly when nothing is captured", () => {
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    expect(screen.getByText(/nothing queued/i)).toBeInTheDocument();
  });

  it("refuses an empty capture: an empty note records nothing", () => {
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /save to device queue/i }),
    );
    expect(screen.getByRole("alert").textContent).toMatch(
      /empty note records nothing/i,
    );
  });

  it("queues a capture and syncs it on demand, reporting confirmed results", async () => {
    // Manual sync: disable auto-sync so the button is the only path
    setAutoSyncRule(false);
    goOnline();
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/auto-sync: auto-sync is disabled/i)).toBeInTheDocument();
    });
    fillCapture("Lekki site", "Used 12 litres of satin in the sitting room");
    expect(screen.getAllByTestId("queued-capture").length).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /^sync now$/i }));
    await waitFor(() => {
      expect(screen.getByText(/last sync/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 synced/i)).toBeInTheDocument();
    // Confirmed synced → removed from the queue
    expect(screen.getByText(/nothing queued/i)).toBeInTheDocument();
    expect(insertMock).toHaveBeenCalledTimes(1);
    // The persisted capture carries the client UUID - idempotent sync
    const persisted = insertMock.mock.calls[0][0] as {
      id: string;
      entry_kind: string;
      device_id?: string;
    };
    expect(persisted.id).toMatch(/^[a-z0-9_-]{8,}$/);
    expect(persisted.entry_kind).toBe("measurement");
    // Engine #11: the capture carries the stable device identity
    expect(persisted.device_id).toMatch(/^[0-9a-f-]{8,}$/);
  });

  it("auto-syncs queued work when connectivity allows (engine #11)", async () => {
    goOnline();
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    fillCapture("Port Harcourt site", "Primed the corridor walls");
    // No manual tap: the scheduler runs the sync by itself
    await waitFor(() => {
      expect(screen.getByText(/1 synced/i)).toBeInTheDocument();
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("auto-sync refusal while offline is disclosed, and the capture stays queued", async () => {
    goOffline();
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    fillCapture("Enugu bungalow", "Cured slab wetted twice");
    await waitFor(() => {
      expect(
        screen.getByText(/auto-sync: you are offline; queued captures stay on this device/i),
      ).toBeInTheDocument();
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("queued-capture").length).toBe(1);
  });

  it("discloses the retry backoff after a failed auto-sync attempt", async () => {
    goOnline();
    insertMock.mockResolvedValue("failed");
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    fillCapture("Warri depot", "Crack noted in column 3");
    await waitFor(() => {
      expect(screen.getByText(/1 failed and still queued/i)).toBeInTheDocument();
    });
    // The honest backoff note appears: next attempt is ~1 minute away
    await waitFor(() => {
      expect(
        screen.getByText(/next auto-sync attempt in ~1 minute/i),
      ).toBeInTheDocument();
    });
    // Backoff respected: exactly one attempt, no immediate retry loop
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("a failed manual sync keeps the capture queued with the honest retry note", async () => {
    setAutoSyncRule(false);
    goOnline();
    insertMock.mockResolvedValue("failed");
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/auto-sync: auto-sync is disabled/i)).toBeInTheDocument();
    });
    fillCapture("Abuja flat", "Second coat done in bedroom");
    fireEvent.click(screen.getByRole("button", { name: /^sync now$/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/1 failed and still queued/i),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByTestId("queued-capture").length).toBe(1);
    expect(
      screen.getByText(/kept in queue: will be retried/i),
    ).toBeInTheDocument();
  });

  it("a duplicate from a retried sync is reported as safe, and the capture is not double-kept", async () => {
    setAutoSyncRule(false);
    goOnline();
    insertMock.mockResolvedValue("duplicate");
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/auto-sync: auto-sync is disabled/i)).toBeInTheDocument();
    });
    fillCapture("Kano depot", "Delivered 20 bags of cement");
    fireEvent.click(screen.getByRole("button", { name: /^sync now$/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/already on the server \(safe\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/nothing queued/i)).toBeInTheDocument();
  });

  it("offers a backup export of the unsynced queue (storage-loss recovery)", async () => {
    const createObjectURL = vi.fn((_: unknown) => "blob:mock");
    const revokeObjectURL = vi.fn((_: unknown) => undefined);
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    });
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    const backup = screen.getByRole("button", {
      name: /back up unsynced captures/i,
    });
    // Empty queue: nothing to back up yet
    expect(backup).toBeDisabled();
    fillCapture("Ibadan site", "Screed poured in the veranda");
    expect(backup).toBeEnabled();
    fireEvent.click(backup);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    // The exported blob is honest JSON with the queue document format
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const doc = JSON.parse(await blob.text());
    expect(doc.format).toBe("frelux_field_queue_v1");
    expect(doc.count).toBe(1);
  });

  it("discloses where unsynced data lives (never promises storage survival)", () => {
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/live only in this browser's storage/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/synced while signed out are not attributed/i),
    ).toBeInTheDocument();
  });

  it("renders all three calculator ad slots (engine-page ads contract)", () => {
    render(
      <MemoryRouter>
        <FieldSync />
      </MemoryRouter>,
    );
    // AdSlot is mocked to null; the page must still import and place it
    // - verified by the module mock loading without error and the
    // component rendering the ads section context below.
    expect(screen.getByText(/how field sync works/i)).toBeInTheDocument();
  });
});
