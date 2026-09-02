import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock supabase ──

const mockInvoke = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  },
  getFunctionErrorMessage: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : "Supabase error",
  ),
}));

const {
  buildErrorContext,
  analyzeErrorWithAI,
  generateErrorFix,
  fetchFixHistory,
  fetchFixHistoryForError,
  approveFix,
  updateFixStatus,
  fetchRecentErrorsForStudio,
} = await import("@/lib/error-analysis");

// ── Helpers ──

function chainable(overrides: Record<string, unknown> = {}) {
  const defaultReturn = { data: null, error: null, count: null, ...overrides };
  const methods = [
    "select",
    "eq",
    "order",
    "limit",
    "insert",
    "update",
    "delete",
    "single",
  ];
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  for (const m of methods) {
    chain[m] = vi.fn(() => {
      const ret: Record<string, unknown> = { ...defaultReturn };
      for (const mm of methods) ret[mm] = chain[mm];
      return ret;
    });
  }

  chain.single = vi.fn(() => defaultReturn);

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(chainable());
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

// ── buildErrorContext ──

describe("buildErrorContext", () => {
  const mockError = {
    id: "err-1",
    message: "Something broke",
    error_type: "TypeError",
    severity: "high",
    stack_trace: "at line 42",
    route: "/admin",
    feature: "AI Studio",
    calculator: null,
    http_status: 500,
    service: null,
    browser: "Chrome",
    operating_system: "macOS",
    device_type: "desktop",
    app_version: "1.0",
    occurrence_count: 3,
    first_seen: "2024-01-01T00:00:00Z",
    last_seen: "2024-01-02T00:00:00Z",
    metadata: { extra: "info" },
  };

  it("returns errorId and errorData", () => {
    const result = buildErrorContext(mockError);
    expect(result.errorId).toBe("err-1");
    expect(result.errorData.message).toBe("Something broke");
    expect(result.errorData.severity).toBe("high");
  });

  it("includes stack trace and route", () => {
    const result = buildErrorContext(mockError);
    expect(result.errorData.stack_trace).toBe("at line 42");
    expect(result.errorData.route).toBe("/admin");
  });

  it("sanitizes sensitive metadata", () => {
    const result = buildErrorContext({
      ...mockError,
      metadata: {
        password: "secret123",
        api_key: "sk_live_abcdef",
        token: "Bearer abc",
        normal: "kept",
      },
    });
    expect(result.errorData.metadata.password).toBe("[REDACTED]");
    expect(result.errorData.metadata.api_key).toBe("[REDACTED]");
    expect(result.errorData.metadata.token).toBe("[REDACTED]");
    expect(result.errorData.metadata.normal).toBe("kept");
  });

  it("redacts JWT-like strings in metadata values", () => {
    const result = buildErrorContext({
      ...mockError,
      metadata: { auth: "eyJhb.abc123.def" },
    });
    expect(result.errorData.metadata.auth).toBe("[REDACTED_JWT]");
  });

  it("handles null metadata gracefully", () => {
    const result = buildErrorContext({ ...mockError, metadata: {} } as never);
    expect(result.errorData.metadata).toEqual({});
  });
});

// ── analyzeErrorWithAI ──

describe("analyzeErrorWithAI", () => {
  const mockError = {
    id: "err-1",
    message: "Failed to fetch",
    error_type: "NetworkError",
    severity: "medium",
    stack_trace: null,
    route: "/test",
    feature: null,
    calculator: null,
    http_status: null,
    service: null,
    browser: null,
    operating_system: null,
    device_type: null,
    app_version: null,
    occurrence_count: 1,
    first_seen: "2024-01-01T00:00:00Z",
    last_seen: "2024-01-02T00:00:00Z",
    metadata: {},
  };

  it("returns parsed diagnosis from JSON response", async () => {
    const diagnosis = {
      what_failed: "Network failure",
      where_failed: "API call",
      root_cause: "DNS",
      affected_file: "src/api.ts",
      category: "network",
      proposed_solution: "Add retry logic",
      risk_level: "low",
      protected_functionality_affected: false,
      recommended_action: "Add retry",
    };
    mockInvoke.mockResolvedValue({
      data: { response: JSON.stringify(diagnosis), tool: "error_analysis" },
      error: null,
    });

    const result = await analyzeErrorWithAI(mockError);
    expect(result.diagnosis.what_failed).toBe("Network failure");
    expect(result.diagnosis.affected_file).toBe("src/api.ts");
  });

  it("extracts JSON from markdown-wrapped response", async () => {
    const diagnosis = {
      what_failed: "Parse error",
      where_failed: "Parser",
      root_cause: "Syntax",
      affected_file: "parser.ts",
      category: "bug",
      proposed_solution: "Fix syntax",
      risk_level: "medium",
      protected_functionality_affected: false,
      recommended_action: "Fix",
    };
    mockInvoke.mockResolvedValue({
      data: {
        response: `Here is the analysis:\n\`\`\`json\n${JSON.stringify(diagnosis)}\n\`\`\``,
      },
      error: null,
    });

    const result = await analyzeErrorWithAI(mockError);
    expect(result.diagnosis.what_failed).toBe("Parse error");
  });

  it("falls back to text-based diagnosis when JSON parse fails", async () => {
    mockInvoke.mockResolvedValue({
      data: { response: "The error is caused by a missing import" },
      error: null,
    });

    const result = await analyzeErrorWithAI(mockError);
    expect(result.diagnosis.what_failed).toContain("The error is caused");
    expect(result.diagnosis.category).toBe("unknown");
    expect(result.diagnosis.risk_level).toBe("medium");
  });

  it("throws when invoke returns an error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Function error" },
    });

    await expect(analyzeErrorWithAI(mockError)).rejects.toThrow();
  });

  it("throws when response contains error field", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "No API key", code: "NO_API_KEY" },
      error: null,
    });

    await expect(analyzeErrorWithAI(mockError)).rejects.toThrow("No API key");
  });

  it("throws when response is empty", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    await expect(analyzeErrorWithAI(mockError)).rejects.toThrow(
      "No response from AI service.",
    );
  });

  it("throws when response field is missing", async () => {
    mockInvoke.mockResolvedValue({ data: { something: "else" }, error: null });
    await expect(analyzeErrorWithAI(mockError)).rejects.toThrow("incomplete");
  });
});

// ── generateErrorFix ──

describe("generateErrorFix", () => {
  const mockError = {
    id: "err-1",
    message: "Null pointer",
    error_type: "TypeError",
    severity: "high",
    stack_trace: null,
    route: null,
    feature: null,
    calculator: null,
    http_status: null,
    service: null,
    browser: null,
    operating_system: null,
    device_type: null,
    app_version: null,
    occurrence_count: 1,
    first_seen: "2024-01-01T00:00:00Z",
    last_seen: "2024-01-02T00:00:00Z",
    metadata: {},
  };

  it("returns parsed fix from JSON response", async () => {
    const fix = {
      file: "src/app.ts",
      existing_code: "const x = null;",
      proposed_code: "const x = {};",
      explanation: "Initialize object",
      risk_level: "low",
      expected_effect: "No more null pointer",
      protected_functionality_affected: false,
    };
    mockInvoke.mockResolvedValue({
      data: { response: JSON.stringify(fix), tool: "error_fix" },
      error: null,
    });

    const result = await generateErrorFix(mockError);
    expect(result.fix.file).toBe("src/app.ts");
    expect(result.fix.proposed_code).toBe("const x = {};");
  });

  it("includes diagnosis in prompt when provided", async () => {
    const diagnosis = {
      what_failed: "test",
      where_failed: "test",
      root_cause: "test",
      affected_file: "test.ts",
      category: "bug",
      proposed_solution: "fix",
      risk_level: "low",
      protected_functionality_affected: false,
      recommended_action: "fix it",
    };
    mockInvoke.mockResolvedValue({
      data: {
        response: JSON.stringify({
          file: "test.ts",
          existing_code: "",
          proposed_code: "fixed",
          explanation: "fixed",
          risk_level: "low",
          expected_effect: "works",
          protected_functionality_affected: false,
        }),
        tool: "error_fix",
      },
      error: null,
    });

    await generateErrorFix(mockError, diagnosis);
    expect(mockInvoke).toHaveBeenCalled();
    const body = mockInvoke.mock.calls[0][1].body;
    expect(body.prompt).toContain("diagnosis");
  });

  it("falls back when JSON parse fails", async () => {
    mockInvoke.mockResolvedValue({
      data: { response: "Try fixing the null check" },
      error: null,
    });

    const result = await generateErrorFix(mockError);
    expect(result.fix.explanation).toBe("Try fixing the null check");
    expect(result.fix.file).toBe("unknown");
  });
});

// ── fetchFixHistory ──

describe("fetchFixHistory", () => {
  it("calls supabase with correct table and ordering", async () => {
    const ch = chainable({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchFixHistory(25);
    expect(mockFrom).toHaveBeenCalledWith("error_fix_history");
    expect(ch.select).toHaveBeenCalledWith("*");
    expect(ch.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(ch.limit).toHaveBeenCalledWith(25);
  });

  it("returns data array on success", async () => {
    const mockData = [{ id: "1", status: "approved" }];
    const ch = chainable({ data: mockData, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await fetchFixHistory();
    expect(result).toEqual(mockData);
  });

  it("throws on supabase error", async () => {
    const ch = chainable({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(ch);

    await expect(fetchFixHistory()).rejects.toThrow("DB error");
  });

  it("returns empty array when data is null", async () => {
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await fetchFixHistory();
    expect(result).toEqual([]);
  });
});

// ── fetchFixHistoryForError ──

describe("fetchFixHistoryForError", () => {
  it("filters by error_id", async () => {
    const ch = chainable({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchFixHistoryForError("err-123");
    expect(ch.eq).toHaveBeenCalledWith("error_id", "err-123");
  });
});

// ── approveFix ──

describe("approveFix", () => {
  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(approveFix("fix-1")).rejects.toThrow("Not authenticated");
  });

  it("updates fix status to approved", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    await approveFix("fix-1");
    expect(ch.update).toHaveBeenCalled();
    expect(ch.eq).toHaveBeenCalledWith("id", "fix-1");
  });

  it("throws on supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const ch = chainable({ data: null, error: { message: "Update failed" } });
    mockFrom.mockReturnValue(ch);

    await expect(approveFix("fix-1")).rejects.toThrow("Update failed");
  });
});

// ── updateFixStatus ──

describe("updateFixStatus", () => {
  it("updates status and updated_at", async () => {
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    await updateFixStatus("fix-1", "deployed");
    expect(ch.update).toHaveBeenCalled();
    const updateArg = ch.update.mock.calls[0][0];
    expect(updateArg.status).toBe("deployed");
    expect(updateArg.deployed_at).toBeDefined();
  });

  it("sets verified_at when status is verified", async () => {
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    await updateFixStatus("fix-1", "verified");
    const updateArg = ch.update.mock.calls[0][0];
    expect(updateArg.verified_at).toBeDefined();
  });

  it("merges extra fields", async () => {
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    await updateFixStatus("fix-1", "failed", {
      validation_result: { error: "test" },
    });
    const updateArg = ch.update.mock.calls[0][0];
    expect(updateArg.validation_result).toEqual({ error: "test" });
  });
});

// ── fetchRecentErrorsForStudio ──

describe("fetchRecentErrorsForStudio", () => {
  it("fetches unresolved errors ordered by last_seen", async () => {
    const ch = chainable({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchRecentErrorsForStudio(10);
    expect(mockFrom).toHaveBeenCalledWith("application_errors");
    expect(ch.select).toHaveBeenCalled();
    expect(ch.eq).toHaveBeenCalledWith("resolved", false);
    expect(ch.order).toHaveBeenCalledWith("last_seen", { ascending: false });
    expect(ch.limit).toHaveBeenCalledWith(10);
  });

  it("returns data on success", async () => {
    const mockData = [{ id: "1", message: "err", severity: "low" }];
    const ch = chainable({ data: mockData, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await fetchRecentErrorsForStudio();
    expect(result).toEqual(mockData);
  });

  it("throws on error", async () => {
    const ch = chainable({ data: null, error: { message: "DB fail" } });
    mockFrom.mockReturnValue(ch);

    await expect(fetchRecentErrorsForStudio()).rejects.toThrow("DB fail");
  });

  it("returns empty array when data is null", async () => {
    const ch = chainable({ data: null, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await fetchRecentErrorsForStudio();
    expect(result).toEqual([]);
  });
});
