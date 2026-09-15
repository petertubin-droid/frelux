// =========================================================
// ARCHIE WALLET RECOVERY SCREEN (batch 21, fix 71, 2026-09-15)
//
// Owner-only surface for the abandoned-wallet passphrase
// recovery engine. The spec (mnemonic template + candidates
// + passphrase candidates) comes ONLY from the owner. Keys
// are derived ephemerally server-side; only public
// addresses and on-chain facts come back. Mnemonics and
// passphrases are NEVER persisted — the durable ledger
// stores accounting only.
//
// Honesty rules:
//   * Loud warnings: run only on a trusted device; ARCHIE
//     never holds or exports private keys; found = import
//     YOUR OWN mnemonic/passphrase into YOUR OWN wallet.
//   * A negative result is definitive only for the queried
//     chains/paths — the UI says so verbatim.
//   * Engine caps (maxCandidates 64 / maxPassphrases 8 /
//     maxPaths 10) are shown before the owner runs a job.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  fetchRecoveryJobs,
  fetchRecoveryMeta,
  runRecovery,
  type RecoveryJobLedgerRow,
  type RecoveryJobResultView,
  type RecoveryMeta,
} from "@/lib/archie/wallet-recovery-client";

type Tab = "run" | "ledger";

export default function ArchieWalletRecovery() {
  const [tab, setTab] = useState<Tab>("run");
  const [meta, setMeta] = useState<RecoveryMeta | null>(null);
  const [jobs, setJobs] = useState<RecoveryJobLedgerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spec form
  const [templateWords, setTemplateWords] = useState("");
  const [blanks, setBlanks] = useState("");
  const [candidates, setCandidates] = useState("");
  const [passphrases, setPassphrases] = useState("");
  const [hints, setHints] = useState("");

  const [result, setResult] = useState<RecoveryJobResultView | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      setMeta(await fetchRecoveryMeta());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetchRecoveryJobs();
      setJobs(r.jobs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (tab === "ledger") loadJobs();
  }, [tab, loadJobs]);

  const onRun = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setReport(null);
    try {
      // Template: words separated by spaces; "?" marks a blank.
      const tokens = templateWords.trim().split(/\s+/).filter(Boolean);
      const blankCount = Number(blanks);
      const slots: Array<string | null> = tokens.map((t) =>
        t === "?" || t.toLowerCase() === "blank" ? null : t.toLowerCase(),
      );
      // Validate blank count honestly.
      if (
        Number.isFinite(blankCount) &&
        blankCount > 0 &&
        slots.filter((s) => s === null).length !== blankCount
      ) {
        setError(
          `Blank-count mismatch: template marks ${slots.filter((s) => s === null).length} blank slot(s), but you entered ${blankCount}. Use "?" for each blank.`,
        );
        setBusy(false);
        return;
      }
      const spec = {
        template: {
          slots,
          candidates: candidates
            .split(/[\n,]/)
            .map((c) => c.trim().toLowerCase())
            .filter(Boolean),
        },
        passphrases: passphrases
          ? passphrases
              .split("\n")
              .filter((p) => p.length >= 0 && p !== undefined)
          : [""],
        accounts: 2,
        addressesPerAccount: 5,
        knownAddressHints: hints
          .split(/[\n,]/)
          .map((h) => h.trim())
          .filter(Boolean),
      };
      const res = await runRecovery(spec);
      setResult(res.result);
      setReport(res.report);
      if (res.ledger_warning) setError(res.ledger_warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Wallet Passphrase Recovery</h1>
        <p className="text-sm text-muted-foreground">
          Controlled abandoned-wallet recovery — your spec, your wallet,
          ephemeral keys. Keys are never persisted or exported; only public
          addresses and on-chain facts are returned.
        </p>
      </header>

      {/* Trust warnings */}
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
        <p>
          <strong>Read this first.</strong> Run recovery only from a device you
          trust. Never enter your mnemonic template on an untrusted device or
          share it with anyone. ARCHIE never holds or exports private keys —
          found means you import YOUR OWN mnemonic/passphrase into YOUR OWN
          wallet software to take custody.
        </p>
        {meta && (
          <p className="mt-2">
            Engine caps: {meta.caps.maxCandidates} candidates ·{" "}
            {meta.caps.maxPassphrases} passphrases · {meta.caps.maxPaths}{" "}
            derivation paths per job — jobs are finite by design.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <nav className="flex gap-2">
        {(["run", "ledger"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {t === "run" ? "Run a job" : "Job ledger"}
          </button>
        ))}
      </nav>

      {/* Run */}
      {tab === "run" && (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-md border p-4">
            <label className="text-sm">
              Mnemonic template (use <code>?</code> for each blank word)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1 font-mono"
                placeholder="word1 ? word3 word4 ? ..."
                value={templateWords}
                onChange={(e) => setTemplateWords(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Number of blank words (cross-check)
              <input
                className="mt-1 w-full rounded-md border px-2 py-1"
                inputMode="numeric"
                placeholder="e.g. 2"
                value={blanks}
                onChange={(e) => setBlanks(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Candidate words for the blanks (comma or newline separated)
              <textarea
                className="mt-1 h-20 w-full rounded-md border px-2 py-1 font-mono"
                placeholder="word-a, word-b, word-c"
                value={candidates}
                onChange={(e) => setCandidates(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Passphrase candidates (one per line; leave empty for no
              passphrase)
              <textarea
                className="mt-1 h-20 w-full rounded-md border px-2 py-1 font-mono"
                placeholder="(empty = no passphrase)"
                value={passphrases}
                onChange={(e) => setPassphrases(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Known address hints (optional — instant match shortcut)
              <textarea
                className="mt-1 h-16 w-full rounded-md border px-2 py-1 font-mono"
                placeholder="0x..."
                value={hints}
                onChange={(e) => setHints(e.target.value)}
              />
            </label>
          </section>
          <section>
            <button
              disabled={busy}
              onClick={onRun}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Running recovery job…" : "Run recovery job"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Chains checked by default:{" "}
              {meta?.chains.map((c) => c.id).join(", ") ?? "loading…"}. A
              negative result is definitive only for the queried chains and
              paths.
            </p>
          </section>

          {result && (
            <section className="rounded-md border p-4">
              <h2 className="mb-2 font-semibold">
                Result —{" "}
                <span
                  className={
                    result.found ? "text-emerald-700" : "text-amber-700"
                  }
                >
                  {result.found
                    ? "FOUND"
                    : "NOT FOUND (queried chains/paths only)"}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">{result.note}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <li>
                  Mnemonic candidates enumerated:{" "}
                  {result.attempts.mnemonicsEnumerated}
                </li>
                <li>
                  Checksum-valid candidates: {result.attempts.checksumValid}
                </li>
                <li>
                  Candidate/passphrase pairs tried:{" "}
                  {result.attempts.candidatePassphrasePairs}
                </li>
                <li>Addresses derived: {result.attempts.addressesDerived}</li>
                <li>Chain queries: {result.attempts.chainQueries}</li>
                <li>Completed: {result.completedAt}</li>
              </ul>
              {result.found && (
                <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
                  <p className="font-medium text-emerald-800">
                    Matching candidates (your own data — shown once):
                  </p>
                  <ul className="mt-1 space-y-2">
                    {result.results
                      .filter((r) => r.found)
                      .map((r, i) => (
                        <li key={i} className="font-mono text-xs">
                          mnemonic: {r.mnemonic}
                          <br />
                          passphrase:{" "}
                          {r.passphrase === "" ? "(none)" : r.passphrase}
                          <br />
                          active address(es):{" "}
                          {r.addresses
                            .filter((a) => a.hasActivity)
                            .map((a) => a.address)
                            .join(", ")}
                        </li>
                      ))}
                  </ul>
                  <p className="mt-2 text-xs text-emerald-800">
                    Import YOUR mnemonic and passphrase into YOUR wallet
                    software to take custody. ARCHIE never exports private keys.
                  </p>
                </div>
              )}
              {report && (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {report}
                </pre>
              )}
            </section>
          )}
        </div>
      )}

      {/* Ledger */}
      {tab === "ledger" && (
        <section className="rounded-md border p-4">
          <h2 className="mb-2 font-semibold">
            Job ledger (audit — no secrets)
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Durable accounting only: job shape, attempt counts, found flag and
            matched public addresses. Mnemonics, passphrases and keys are never
            stored.
          </p>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recovery jobs recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => (
                <li key={j.id} className="rounded-md border p-2 text-sm">
                  <span
                    className={j.found ? "text-emerald-700" : "text-amber-700"}
                  >
                    {j.found ? "FOUND" : "not found"}
                  </span>{" "}
                  · {j.slots} slots ({j.blanks} blanks) · {j.candidate_pool}{" "}
                  candidates · {j.passphrase_count} passphrase(s) ·{" "}
                  {j.attempts.addressesDerived ?? "?"} addresses derived ·
                  opened {new Date(j.opened_at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
