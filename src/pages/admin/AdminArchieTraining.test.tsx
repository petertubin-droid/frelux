import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- in-memory supabase mock (learning-suite fidelity) ---
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  frelux_archie_domains: [
    {
      key: "architecture",
      label: "Architecture",
      is_core: true,
      risk_class: "STANDARD",
      active: true,
    },
    {
      key: "construction",
      label: "Construction",
      is_core: false,
      risk_class: "STANDARD",
      active: true,
    },
    {
      key: "structural",
      label: "Structural",
      is_core: false,
      risk_class: "DETERMINISTIC",
      active: true,
    },
  ],
  frelux_archie_contributors: [],
  frelux_archie_ingestions: [],
  profiles: [{ id: "admin-1", role: "admin", full_name: "Admin" }],
};

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: "admin-1", email: "admin@frelux.app" } },
    })),
  },
  from: (table: string) => {
    const rows = () => tables[table] ?? (tables[table] = []);
    const c: Record<string, unknown> = {};
    const eqs: Array<[string, unknown]> = [];
    let orderField: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;
    let single = false;
    const matching = () =>
      rows().filter((r) => eqs.every(([col, val]) => r[col] === val));
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
        then: (
          resolve: (v: unknown) => unknown,
          reject: (e: unknown) => unknown,
        ) =>
          Promise.resolve({ data: apply(matching()), error: null }).then(
            resolve,
            reject,
          ),
      };
      return req;
    };
    c.insert = (data: Row | Row[]) => {
      const list = Array.isArray(data) ? data : [data];
      return {
        select: (_c?: string) => ({
          single: () => {
            for (const r of list)
              rows().push({ id: `row-${rows().length}`, ...r });
            single = true;
            return Promise.resolve({
              data: rows()[rows().length - 1],
              error: null,
            });
          },
        }),
      };
    };
    return c;
  },
  functions: {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        extraction: {
          summary: "Notes",
          facts: [
            {
              topic: "Screed layer thickness",
              content: { statement: "Apply screed in 5mm layers" },
              knowledge_type: "METHOD",
              confidence: 0.85,
              evidence: ["Apply screed in 5mm layers."],
            },
          ],
          warnings: [],
        },
      },
      error: null,
    })),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
  getFunctionErrorMessage: (e: unknown) => String(e),
}));

// profiles lookup: caller is an admin
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.app" },
    loading: false,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  tables.frelux_archie_contributors = [];
  tables.frelux_archie_ingestions = [];
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminArchieTraining")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("AdminArchieTraining", () => {
  it("renders the training console with all modality tabs", async () => {
    await renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("archie-title")).toBeTruthy(),
    );
    for (const t of [
      "archie-tab-TEXT",
      "archie-tab-IMAGE",
      "archie-tab-PDF_DOCUMENT",
      "archie-tab-AUDIO_VOICE",
      "archie-tab-VIDEO_DEMONSTRATION",
      "archie-tab-SOURCE_CODE",
      "archie-tab-WEB_INTELLIGENCE",
    ]) {
      expect(screen.getByTestId(t)).toBeTruthy();
    }
  });

  it("loads domains from the registry (architecture first)", async () => {
    await renderPage();
    const domainSelect = await screen.findByTestId("archie-domain");
    await waitFor(() =>
      expect((domainSelect as HTMLSelectElement).value).toBe("architecture"),
    );
  });

  it("submits text training and shows the candidate preview awaiting approval", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    void fireEvent;
    void userEvent;
    const rtl = await import("@testing-library/react");
    await renderPage();
    const title = await screen.findByTestId("archie-title");
    const textEl = screen.getByTestId("archie-text") as HTMLTextAreaElement;
    await rtl.fireEvent.change(title, { target: { value: "Screeding notes" } });
    await rtl.fireEvent.change(textEl, {
      target: { value: "Apply screed in 5mm layers." },
    });
    await rtl.fireEvent.click(
      screen.getByRole("button", { name: /extract knowledge/i }),
    );
    const heading = await screen.findByText(/Extraction preview/i);
    expect(heading).toBeTruthy();
    const body = document.body.textContent ?? "";
    expect(body).toContain("AWAITING");
    // candidate shown with evidence state + provenance
    expect(body).toContain("USER_PROVIDED");
    expect(body).toContain("Screed layer thickness");
    expect(body).toContain("Provenance");
  });

  it("blocks approval of high-risk candidates without engineering review", async () => {
    const rtl = await import("@testing-library/react");
    await renderPage();
    const title = await screen.findByTestId("archie-title");
    await rtl.fireEvent.change(title, { target: { value: "Beam detail" } });
    await rtl.fireEvent.change(screen.getByTestId("archie-domain"), {
      target: { value: "structural" },
    });
    const textEl = screen.getByTestId("archie-text") as HTMLTextAreaElement;
    await rtl.fireEvent.change(textEl, {
      target: { value: "Minimum beam depth 225mm." },
    });
    await rtl.fireEvent.click(
      screen.getByRole("button", { name: /extract knowledge/i }),
    );
    await screen.findByText(/Extraction preview/i);
    await rtl.fireEvent.click(
      screen.getByRole("button", { name: /approve selected/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/engineering-review confirmation/i)).toBeTruthy(),
    );
  });
});
