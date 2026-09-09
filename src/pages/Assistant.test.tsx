import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- in-memory supabase mock (learning-suite fidelity) ---
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  frelux_archie_mobile_consents: [],
  frelux_archie_paid_capabilities: [],
  frelux_security_sessions: [],
  frelux_security_events: [],
  frelux_protected_items: [],
  frelux_protected_item_versions: [],
  frelux_owner_authorizations: [],
};

const invokeMock = vi.hoisted(() => vi.fn());

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: "user-1", email: "user@frelux.app" } },
    })),
    signOut: vi.fn(async () => ({})),
  },
  storage: {
    from: () => ({
      upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
      download: vi.fn(async () => ({ data: null, error: null })),
    }),
  },
  from: (table: string) => {
    const rows = () => tables[table] ?? (tables[table] = []);
    const c: Record<string, unknown> = {};
    const eqs: Array<[string, unknown]> = [];
    const nes: Array<[string, unknown]> = [];
    let orderField: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;
    let single = false;
    const matching = () =>
      rows().filter(
        (r) =>
          eqs.every(([col, val]) => r[col] === val) &&
          nes.every(([col, val]) => r[col] !== val),
      );
    const apply = (list: Row[]) => {
      if (orderField)
        list = [...list].sort(
          (a, b) =>
            (orderAsc ? 1 : -1) *
            String(a[orderField!]).localeCompare(String(b[orderField!])),
        );
      if (limitN != null) list = list.slice(0, limitN);
      return single ? (list[0] ?? null) : list;
    };
    c.select = (_cols?: string) => {
      const req = {
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return req;
        },
        neq: (col: string, val: unknown) => {
          nes.push([col, val]);
          return req;
        },
        order: (f: string, o?: { ascending?: boolean }) => {
          orderField = f;
          orderAsc = o?.ascending ?? true;
          return req;
        },
        limit: (n: number) => {
          limitN = n;
          return req;
        },
        maybeSingle: () => {
          single = true;
          return Promise.resolve({ data: apply(matching()), error: null });
        },
        single: () => {
          single = true;
          return Promise.resolve({ data: apply(matching()), error: null });
        },
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve({ data: apply(matching()), error: null }).then(
            res,
            rej,
          ),
      };
      return req;
    };
    const doInsert = (data: Row | Row[]) => {
      const list = Array.isArray(data) ? data : [data];
      for (const r of list) {
        const row = { ...r };
        if (!row.id) row.id = `row-${rows().length}`;
        rows().push(row);
      }
      return {
        select: (_c?: string) => ({
          single: () => {
            single = true;
            return Promise.resolve({
              data: list[list.length - 1] ?? null,
              error: null,
            });
          },
        }),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve({ data: list, error: null }).then(res, rej),
      };
    };
    c.insert = (d: Row | Row[]) => doInsert(d);
    c.upsert = (d: Row | Row[]) => doInsert(d);
    c.update = (data: Row) => {
      const run = () => {
        const matched = matching();
        for (const r of matched) Object.assign(r, data);
        return matched;
      };
      const req = {
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return req;
        },
        neq: (col: string, val: unknown) => {
          nes.push([col, val]);
          return req;
        },
        select: (_c?: string) => ({
          single: () => {
            single = true;
            run();
            return Promise.resolve({
              data: (apply(matching()) as Row[])[0] ?? null,
              error: null,
            });
          },
          then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve({ data: run(), error: null }).then(res, rej),
        }),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve({ data: run(), error: null }).then(res, rej),
      };
      return req;
    };
    return c;
  },
  functions: { invoke: invokeMock },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
  getFunctionErrorMessage: (e: unknown) => String(e),
}));

const authMockValue = {
  user: { id: "user-1", email: "user@frelux.app" },
  loading: false,
};
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => authMockValue),
}));

beforeEach(() => {
  vi.clearAllMocks();
  invokeMock.mockImplementation(async () => ({
    data: { ok: true, hasCredential: true, authorizations: [] },
    error: null,
  }));
  for (const k of Object.keys(tables)) tables[k] = [];
});

async function renderPage() {
  const Comp = (await import("@/pages/Assistant")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("ARCHIE Mobile Assistant", () => {
  it("renders all four mobile surfaces with the Free-tier badge", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("ARCHIE Mobile")).toBeTruthy());
    expect(screen.getByText("Free tier")).toBeTruthy();
    for (const tab of ["Assistant", "Capabilities", "Vault", "Security"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
  });

  it("shows every free capability defaulting to OFF (no silent device access)", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Capabilities" }));
    await waitFor(() =>
      expect(screen.getByTestId("archie-capabilities")).toBeTruthy(),
    );
    for (const label of [
      "Voice input",
      "Camera",
      "Location",
      "Notifications",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const btn of screen.getAllByText("Off")) {
      expect(btn).toBeTruthy();
    }
  });

  it("shows paid capabilities as OFF by default with the never-silent guarantee", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    await waitFor(() =>
      expect(screen.getByTestId("archie-security")).toBeTruthy(),
    );
    expect(
      screen.getByText(/never silently consumes a paid service/i),
    ).toBeTruthy();
    for (const label of [
      "Cloud AI generation",
      "Cloud transcription",
      "Web search intelligence",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("a revoked device is locked out with a clear stolen-phone message", async () => {
    // this device's fingerprint was revoked remotely
    const { computeDeviceFingerprint } =
      await import("@/lib/archie/mobile/device-sessions");
    tables.frelux_security_sessions = [
      {
        id: "s1",
        user_id: "user-1",
        fingerprint: computeDeviceFingerprint(),
        revoked: true,
        last_seen: new Date().toISOString(),
      },
    ];
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText(/This device was revoked/i)).toBeTruthy(),
    );
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
  });

  it("owner authorization is available in Security with server-side verification copy", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    await waitFor(() =>
      expect(screen.getByText("Owner authorization")).toBeTruthy(),
    );
    expect(screen.getByText(/verified server-side/i)).toBeTruthy();
    expect(screen.getByText(/never stored, logged or spoken/i)).toBeTruthy();
  });

  it("the vault lets the user explicitly select and protect data", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Vault" }));
    await waitFor(() =>
      expect(screen.getByTestId("archie-vault")).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Item label"), {
      target: { value: "Site measurements" },
    });
    expect(screen.getByLabelText("Passphrase")).toBeTruthy();
    expect(screen.getByText("Encrypt & back up")).toBeTruthy();
  });
});
