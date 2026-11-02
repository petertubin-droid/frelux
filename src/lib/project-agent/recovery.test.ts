import { describe, expect, it, vi } from "vitest";
import {
  INTERRUPTED_EXECUTION_AFTER_MS,
  planInterruptedExecution,
  type RecoverableAction,
} from "./recovery";

const NOW = "2026-11-01T20:00:00.000Z";

function action(over: Partial<RecoverableAction> = {}): RecoverableAction {
  return {
    id: "a1",
    state: "executed",
    executed_at: "2026-11-01T19:00:00.000Z",
    updated_at: "2026-11-01T19:00:00.000Z",
    ...over,
  };
}

describe("planInterruptedExecution", () => {
  it("fails an execution that started long ago and recorded nothing", () => {
    const [decision] = planInterruptedExecution([action()], NOW);
    expect(decision.decision).toBe("fail");
    expect(decision.reason).toMatch(/whether the write landed is not known/i);
  });

  it("leaves an execution inside the window alone", () => {
    const recent = new Date(Date.parse(NOW) - 60 * 1000).toISOString();
    const [decision] = planInterruptedExecution(
      [action({ executed_at: recent, updated_at: recent })],
      NOW,
    );
    expect(decision.decision).toBe("keep");
    expect(decision.reason).toMatch(/still inside the execution window/i);
  });

  it("keeps rows that are not executions", () => {
    const decisions = planInterruptedExecution(
      [
        action({ id: "b1", state: "approved" }),
        action({ id: "b2", state: "verified" }),
      ],
      NOW,
    );
    expect(decisions.map((d) => d.decision)).toEqual(["keep", "keep"]);
    expect(decisions[0].reason).toMatch(/not an execution in progress/i);
  });

  it("refuses to guess when the timestamp is missing", () => {
    const [decision] = planInterruptedExecution(
      [action({ executed_at: null, updated_at: null })],
      NOW,
    );
    expect(decision.decision).toBe("keep");
    expect(decision.reason).toMatch(/refuses to guess/i);
  });

  it("falls back to updated_at when executed_at is absent", () => {
    const [decision] = planInterruptedExecution(
      [action({ executed_at: null, updated_at: "2026-11-01T18:00:00.000Z" })],
      NOW,
    );
    expect(decision.decision).toBe("fail");
  });

  it("respects a supplied window", () => {
    const [decision] = planInterruptedExecution([action()], NOW, 5 * 60 * 1000);
    expect(decision.decision).toBe("fail");
    const [kept] = planInterruptedExecution(
      [action()],
      NOW,
      INTERRUPTED_EXECUTION_AFTER_MS * 100,
    );
    expect(kept.decision).toBe("keep");
  });

  it("never emits an em dash in the sentence a user could read", () => {
    const [decision] = planInterruptedExecution([action()], NOW);
    expect(decision.reason).not.toMatch(/[—–]/);
  });
});

// ---------------------------------------------------------------
// The sweep itself, against a stubbed client.
// ---------------------------------------------------------------
const state = {
  selectRows: [] as RecoverableAction[],
  updated: [] as string[],
  readError: null as { message: string } | null,
  writeError: null as { message: string } | null,
};

vi.mock("@/lib/supabase", () => {
  const selectChain = {
    select: () => selectChain,
    eq: () => selectChain,
    order: () => selectChain,
    limit: () =>
      Promise.resolve({ data: state.selectRows, error: state.readError }),
  };
  const updateChain = (id: string) => ({
    update: () => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => {
              if (state.writeError) {
                return Promise.resolve({ data: null, error: state.writeError });
              }
              state.updated.push(id);
              return Promise.resolve({ data: { id }, error: null });
            },
          }),
        }),
      }),
    }),
  });
  return {
    supabase: {
      from: () => ({
        ...selectChain,
        update: (patch: unknown) => {
          void patch;
          const id = state.selectRows[state.updated.length]?.id ?? "unknown";
          return updateChain(id).update();
        },
      }),
    },
    isSupabaseConfigured: true,
  };
});

const { recoverInterruptedExecutions } = await import("./recovery");

describe("recoverInterruptedExecutions", () => {
  it("resolves stale executions and counts only what changed", async () => {
    state.selectRows = [
      action({ id: "x1" }),
      action({
        id: "x2",
        executed_at: "2026-11-01T19:59:30.000Z",
        updated_at: "2026-11-01T19:59:30.000Z",
      }),
    ];
    state.updated = [];
    state.readError = null;
    state.writeError = null;
    const report = await recoverInterruptedExecutions(NOW);
    expect(report.checked).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.kept).toBe(1);
    expect(state.updated).toEqual(["x1"]);
  });

  it("reports a read failure instead of claiming a clean sweep", async () => {
    state.selectRows = [];
    state.readError = { message: "permission denied" };
    state.writeError = null;
    const report = await recoverInterruptedExecutions(NOW);
    expect(report.failed).toBe(0);
    expect(report.error).toMatch(/permission denied/);
  });

  it("stays honest when a write fails", async () => {
    state.selectRows = [action({ id: "x3" })];
    state.updated = [];
    state.readError = null;
    state.writeError = { message: "write refused" };
    const report = await recoverInterruptedExecutions(NOW);
    expect(report.checked).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.kept).toBe(1);
  });
});
