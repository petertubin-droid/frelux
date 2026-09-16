// =========================================================
// ARCHIE WALLET RECOVERY SCREEN TESTS (batch 21, fix 71)
// The screen must warn loudly, show caps, and report a
// negative result as scoped to the queried chains/paths.
// =========================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchRecoveryMeta = vi.fn();
const fetchRecoveryJobs = vi.fn();
const runRecovery = vi.fn();

vi.mock("@/lib/archie/wallet-recovery-client", () => ({
  fetchRecoveryMeta: (...a: unknown[]) => fetchRecoveryMeta(...a),
  fetchRecoveryJobs: (...a: unknown[]) => fetchRecoveryJobs(...a),
  runRecovery: (...a: unknown[]) => runRecovery(...a),
}));

import ArchieWalletRecovery from "@/pages/archie/ArchieWalletRecovery";

const META = {
  caps: { maxCandidates: 64, maxPassphrases: 8, maxPaths: 10 },
  chains: [{ id: "ethereum", name: "Ethereum" }],
  contract: ["Keys are derived ephemerally in memory."],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieWalletRecovery />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchRecoveryMeta.mockResolvedValue(META);
  fetchRecoveryJobs.mockResolvedValue({ jobs: [] });
});

describe("ArchieWalletRecovery", () => {
  it("renders the owner-only header and trust warning", async () => {
    renderPage();
    expect(
      await screen.findByText("Wallet Passphrase Recovery"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run recovery only from a device you trust/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never holds or exports private keys/i),
    ).toBeInTheDocument();
  });

  it("shows the engine caps from the server meta", async () => {
    renderPage();
    expect(await screen.findByText(/64 candidates/i)).toBeInTheDocument();
    expect(screen.getByText(/8 passphrases/i)).toBeInTheDocument();
  });

  it("shows the template input with ? as the blank marker", async () => {
    renderPage();
    const input = await screen.findByPlaceholderText(/word1 \? word3/i);
    expect(input).toBeInTheDocument();
  });

  it("renders ledger rows without secrets", async () => {
    fetchRecoveryJobs.mockResolvedValue({
      jobs: [
        {
          id: "j1",
          slots: 12,
          blanks: 1,
          candidate_pool: 4,
          passphrase_count: 1,
          accounts: 2,
          addresses_per_account: 5,
          chains: ["ethereum"],
          attempts: { addressesDerived: 40 },
          found: false,
          matched_addresses: [],
          note: "not found",
          opened_at: "2026-09-15T10:00:00Z",
          completed_at: "2026-09-15T10:01:00Z",
        },
      ],
    });
    renderPage();
    const ledgerTab = await screen.findByText("Job ledger");
    ledgerTab.click();
    await screen.findByText(/No recovery jobs recorded|not found/i);
    expect(document.body.textContent).not.toMatch(/mnemonic:/i);
    expect(document.body.textContent).not.toMatch(/mnemonic:/i);
  });

  it("reports a negative result as scoped to the queried chains/paths", async () => {
    runRecovery.mockResolvedValue({
      result: {
        specSummary: {
          slots: 12,
          blanks: 1,
          candidatePool: 4,
          passphrases: 1,
          pathsPerCandidate: 10,
          chains: ["ethereum"],
        },
        attempts: {
          mnemonicsEnumerated: 4,
          checksumValid: 4,
          candidatePassphrasePairs: 4,
          addressesDerived: 40,
          chainQueries: 40,
        },
        results: [],
        found: false,
        completedAt: "2026-09-15T10:01:00Z",
        note: "No candidate derived an address with on-chain activity.",
      },
      report: "Recovery job completed (not found).",
      ledger_warning: null,
    });
    renderPage();
    const btn = await screen.findByText("Run recovery job");
    btn.click();
    expect(
      await screen.findByText(/NOT FOUND \(queried chains\/paths only\)/i),
    ).toBeInTheDocument();
    expect(runRecovery).toHaveBeenCalled();
  });
});
