import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Any Supabase query chain resolves to an empty, error-free result.
// Explicit type: the proxy references itself, which would otherwise
// be circular (TS7022).
const queryChain: unknown = new Proxy(() => queryChain, {
  get: (_t, prop) => {
    if (prop === "then")
      return (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null, count: null }).then(resolve);
    if (prop === "catch") return () => Promise.resolve({ data: null });
    return queryChain;
  },
  apply: () => queryChain,
});

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: async () => ({
    from: () => queryChain,
  }),
}));

const fetchMigrationHistory = vi.fn();
const recordMigration = vi.fn();
const authorizeOwnerChange = vi.fn();

vi.mock("@/lib/archie/migration/history", () => ({
  fetchMigrationHistory: (...a: unknown[]) => fetchMigrationHistory(...a),
  recordMigration: (...a: unknown[]) => recordMigration(...a),
}));

vi.mock("@/lib/archie/migration/identity", () => ({
  getOrCreateInstallation: async () => ({
    installationId: "inst-1",
    environmentLabel: "FRELUX production",
  }),
  getInstallation: async () => null,
}));

vi.mock("@/lib/archie/migration/package-builder", () => ({
  ARCHIE_VERSION: "test-archie",
  MIGRATION_COMPATIBILITY_VERSION: 1,
  buildMigrationPackage: vi.fn(),
  exportCapability: vi.fn(),
  exportPackage: vi.fn(),
}));

vi.mock("@/lib/archie/migration/verify", () => ({
  SUPPORTED_COMPATIBILITY_VERSION: 1,
  unzipPackage: vi.fn(),
  verifyPackage: vi.fn(),
}));

vi.mock("@/lib/archie/migration/restore", () => ({
  buildRestorePlan: vi.fn(),
  executeRestore: vi.fn(),
}));

vi.mock("@/lib/archie/mobile/owner-authorization", () => ({
  authorizeOwnerChange: (...a: unknown[]) => authorizeOwnerChange(...a),
}));

import ArchieMigration from "@/pages/archie/ArchieMigration";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMigrationHistory.mockResolvedValue([]);
  authorizeOwnerChange.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieMigration />);
}

describe("ArchieMigration", () => {
  it("renders the migration console overview", () => {
    renderPage();
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("History")).toBeTruthy();
    expect(screen.getByText("Compatibility")).toBeTruthy();
  });

  it("shows the migration history table on the History panel", () => {
    renderPage();
    fireEvent.click(screen.getByText("History"));
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Package")).toBeTruthy();
    expect(screen.getByText("Destination")).toBeTruthy();
  });

  it("mounts without crashing while history is unresolved", () => {
    fetchMigrationHistory.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
