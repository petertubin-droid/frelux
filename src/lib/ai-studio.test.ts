import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Comprehensive supabase mock ──

const mockInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
  getFunctionErrorMessage: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : "Supabase error",
  ),
}));

vi.mock("@/lib/errorMonitor", () => ({
  captureAiError: vi.fn(),
}));

// Chainable query builder helper
function chain(overrides: Record<string, unknown> = {}) {
  const defaultReturn = { data: null, error: null, ...overrides };
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
  const c: Record<string, ReturnType<typeof vi.fn>> = {};

  // Create all chainable functions first (so they can reference each other)
  for (const m of methods) {
    c[m] = vi.fn(() => {
      const ret: Record<string, unknown> = { ...defaultReturn };
      for (const mm of methods) ret[mm] = c[mm];
      return ret;
    });
  }

  // single is terminal — returns plain result, not chainable
  c.single = vi.fn(() => defaultReturn);

  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(chain());
});

const {
  invokeStudioAi,
  StudioAiError,
  createSession,
  fetchSessions,
  deleteSession,
  fetchChatHistory,
  fetchArtifacts,
  createArtifact,
  updateArtifact,
  deleteArtifact,
  fetchVersions,
  createVersion,
  fetchPrompts,
  createPrompt,
  deletePrompt,
  fetchPlugins,
  updatePluginStatus,
  fetchIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  fetchFeatures,
  updateFeature,
  fetchMetrics,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
} = await import("./ai-studio");

// ── StudioAiError ──

describe("StudioAiError", () => {
  it("is an Error subclass", () => {
    const err = new StudioAiError("msg", "CODE", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("msg");
    expect(err.code).toBe("CODE");
    expect(err.status).toBe(500);
    expect(err.name).toBe("StudioAiError");
  });
});

// ── invokeStudioAi ──

describe("invokeStudioAi", () => {
  it("returns response string on success", async () => {
    mockInvoke.mockResolvedValue({
      data: { response: "AI output", tool: "chat" },
      error: null,
    });

    const result = await invokeStudioAi({ tool: "chat", prompt: "hi" });
    expect(result).toBe("AI output");
  });

  it("throws StudioAiError on invocation error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "function error" },
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow();
  });

  it("throws when data is null", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("No response from AI service.");
  });

  it("throws with NO_API_KEY message when code is NO_API_KEY", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "missing key", code: "NO_API_KEY" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("not configured");
  });

  it("throws with UNAUTHORIZED message for 401", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "no auth", code: "UNAUTHORIZED" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("signed in as an admin");
  });

  it("throws with FORBIDDEN message for 403", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "no access", code: "FORBIDDEN" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("Admin access is required");
  });

  it("throws generic error for unknown codes", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "weird error", code: "UNKNOWN" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("weird error");
  });

  it("throws when response field is missing", async () => {
    mockInvoke.mockResolvedValue({
      data: { something: "else" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("incomplete");
  });

  it("throws when response is empty string", async () => {
    mockInvoke.mockResolvedValue({
      data: { response: "", tool: "chat" },
      error: null,
    });

    await expect(
      invokeStudioAi({ tool: "chat", prompt: "hi" }),
    ).rejects.toThrow("incomplete");
  });
});

// ── Sessions ──

describe("createSession", () => {
  it("inserts and returns the session", async () => {
    const mockSession = { id: "s1", tool_type: "chat", title: "Test" };
    const ch = chain({ data: mockSession, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await createSession("chat", "Test");
    expect(mockFrom).toHaveBeenCalledWith("ai_studio_sessions");
    expect(ch.insert).toHaveBeenCalledWith({
      tool_type: "chat",
      title: "Test",
    });
    expect(result).toEqual(mockSession);
  });

  it("throws on error", async () => {
    const ch = chain({ data: null, error: { message: "insert failed" } });
    mockFrom.mockReturnValue(ch);

    await expect(createSession("chat", "Test")).rejects.toThrow(
      "insert failed",
    );
  });
});

describe("fetchSessions", () => {
  it("fetches without filter", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchSessions();
    expect(ch.eq).not.toHaveBeenCalled();
  });

  it("fetches with tool type filter", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchSessions("chat" as never);
    expect(ch.eq).toHaveBeenCalledWith("tool_type", "chat");
  });

  it("returns data array", async () => {
    const sessions = [{ id: "s1" }, { id: "s2" }];
    const ch = chain({ data: sessions, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await fetchSessions();
    expect(result).toEqual(sessions);
  });
});

describe("deleteSession", () => {
  it("deletes by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await deleteSession("s1");
    expect(ch.delete).toHaveBeenCalled();
    expect(ch.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("throws on error", async () => {
    const ch = chain({ error: { message: "delete failed" } });
    mockFrom.mockReturnValue(ch);

    await expect(deleteSession("s1")).rejects.toThrow("delete failed");
  });
});

// ── Chat ──

describe("fetchChatHistory", () => {
  it("fetches messages ordered by created_at ascending", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchChatHistory("session-1");
    expect(mockFrom).toHaveBeenCalledWith("ai_studio_chat");
    expect(ch.eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(ch.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });
});

// ── Artifacts ──

describe("fetchArtifacts", () => {
  it("fetches all when no session_id", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchArtifacts();
    expect(ch.eq).not.toHaveBeenCalled();
  });

  it("filters by session_id when provided", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchArtifacts("sess-1");
    expect(ch.eq).toHaveBeenCalledWith("session_id", "sess-1");
  });
});

describe("createArtifact", () => {
  it("inserts with defaults and returns the created artifact", async () => {
    const mockArtifact = { id: "a1", title: "Test" };
    const ch = chain({ data: mockArtifact, error: null });
    mockFrom.mockReturnValue(ch);

    const result = await createArtifact({
      artifact_type: "page_builder",
      title: "Test",
      content: "<html></html>",
    });

    expect(ch.insert).toHaveBeenCalledWith({
      session_id: null,
      artifact_type: "page_builder",
      title: "Test",
      description: null,
      content: "<html></html>",
      language: "typescript",
      tags: [],
    });
    expect(result).toEqual(mockArtifact);
  });

  it("passes through optional fields", async () => {
    const ch = chain({ data: {}, error: null });
    mockFrom.mockReturnValue(ch);

    await createArtifact({
      session_id: "s1",
      artifact_type: "code",
      title: "T",
      description: "D",
      content: "C",
      language: "python",
      tags: ["x", "y"],
    });

    expect(ch.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "s1",
        description: "D",
        language: "python",
        tags: ["x", "y"],
      }),
    );
  });
});

describe("updateArtifact", () => {
  it("updates by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updateArtifact("a1", { title: "New" });
    expect(ch.update).toHaveBeenCalledWith({ title: "New" });
    expect(ch.eq).toHaveBeenCalledWith("id", "a1");
  });
});

describe("deleteArtifact", () => {
  it("deletes by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await deleteArtifact("a1");
    expect(ch.delete).toHaveBeenCalled();
    expect(ch.eq).toHaveBeenCalledWith("id", "a1");
  });
});

// ── Versions ──

describe("fetchVersions", () => {
  it("fetches versions for artifact ordered desc", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchVersions("art-1");
    expect(ch.eq).toHaveBeenCalledWith("artifact_id", "art-1");
    expect(ch.order).toHaveBeenCalledWith("version_number", {
      ascending: false,
    });
  });
});

describe("createVersion", () => {
  it("inserts version record", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await createVersion("art-1", 3, "content", "Updated");
    expect(ch.insert).toHaveBeenCalledWith({
      artifact_id: "art-1",
      version_number: 3,
      content: "content",
      change_summary: "Updated",
    });
  });

  it("uses null change_summary when not provided", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await createVersion("art-1", 1, "content");
    expect(ch.insert).toHaveBeenCalledWith({
      artifact_id: "art-1",
      version_number: 1,
      content: "content",
      change_summary: null,
    });
  });
});

// ── Prompts ──

describe("fetchPrompts", () => {
  it("fetches all prompts without category filter", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchPrompts();
    expect(ch.eq).not.toHaveBeenCalled();
  });

  it("filters by category when provided", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchPrompts("page_builder");
    expect(ch.eq).toHaveBeenCalledWith("category", "page_builder");
  });
});

describe("createPrompt", () => {
  it("inserts with is_builtin false", async () => {
    const ch = chain({ data: {}, error: null });
    mockFrom.mockReturnValue(ch);

    await createPrompt({
      title: "New Prompt",
      category: "test",
      system_prompt: "sys",
      user_prompt_template: "tmpl",
    });

    expect(ch.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Prompt",
        is_builtin: false,
      }),
    );
  });
});

describe("deletePrompt", () => {
  it("deletes by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await deletePrompt("p1");
    expect(ch.eq).toHaveBeenCalledWith("id", "p1");
  });
});

// ── Plugins ──

describe("fetchPlugins", () => {
  it("fetches plugins ordered by name", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchPlugins();
    expect(mockFrom).toHaveBeenCalledWith("ai_studio_plugins");
    expect(ch.order).toHaveBeenCalledWith("name", { ascending: true });
  });
});

describe("updatePluginStatus", () => {
  it("sets installed_at when status is installed", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updatePluginStatus("p1", "installed");
    const updateArg = ch.update.mock.calls[0][0];
    expect(updateArg.status).toBe("installed");
    expect(updateArg.installed_at).toBeDefined();
  });

  it("sets installed_at when status is enabled", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updatePluginStatus("p1", "enabled");
    expect(ch.update.mock.calls[0][0].installed_at).toBeDefined();
  });

  it("does not set installed_at for disabled status", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updatePluginStatus("p1", "disabled");
    expect(ch.update.mock.calls[0][0].installed_at).toBeUndefined();
  });
});

// ── Integrations ──

describe("fetchIntegrations", () => {
  it("fetches ordered by name", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchIntegrations();
    expect(ch.order).toHaveBeenCalledWith("name", { ascending: true });
  });
});

describe("createIntegration", () => {
  it("inserts with default empty config", async () => {
    const ch = chain({ data: {}, error: null });
    mockFrom.mockReturnValue(ch);

    await createIntegration({ name: "New Int", service_type: "stripe" });
    expect(ch.insert).toHaveBeenCalledWith({
      name: "New Int",
      service_type: "stripe",
      config: {},
    });
  });
});

describe("updateIntegration", () => {
  it("updates with last_checked_at timestamp", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updateIntegration("i1", { status: "connected" });
    const updateArg = ch.update.mock.calls[0][0];
    expect(updateArg.status).toBe("connected");
    expect(updateArg.last_checked_at).toBeDefined();
  });
});

describe("deleteIntegration", () => {
  it("deletes by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await deleteIntegration("i1");
    expect(ch.eq).toHaveBeenCalledWith("id", "i1");
  });
});

// ── Features ──

describe("fetchFeatures", () => {
  it("fetches ordered by category then label", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchFeatures();
    expect(ch.order).toHaveBeenCalledWith("category", { ascending: true });
    expect(ch.order).toHaveBeenCalledWith("label", { ascending: true });
  });
});

describe("updateFeature", () => {
  it("updates feature fields", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await updateFeature("f1", { is_enabled: true, rollout_percentage: 50 });
    expect(ch.update).toHaveBeenCalledWith({
      is_enabled: true,
      rollout_percentage: 50,
    });
    expect(ch.eq).toHaveBeenCalledWith("id", "f1");
  });
});

// ── Metrics ──

describe("fetchMetrics", () => {
  it("fetches without category filter", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchMetrics();
    expect(ch.eq).not.toHaveBeenCalled();
    expect(ch.limit).toHaveBeenCalledWith(100);
  });

  it("filters by category when provided", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchMetrics("performance");
    expect(ch.eq).toHaveBeenCalledWith("category", "performance");
  });

  it("respects custom limit", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchMetrics(undefined, 25);
    expect(ch.limit).toHaveBeenCalledWith(25);
  });
});

// ── Roles ──

describe("fetchRoles", () => {
  it("fetches ordered by role_name", async () => {
    const ch = chain({ data: [], error: null });
    mockFrom.mockReturnValue(ch);

    await fetchRoles();
    expect(ch.order).toHaveBeenCalledWith("role_name", { ascending: true });
  });
});

describe("createRole", () => {
  it("inserts role with permissions", async () => {
    const ch = chain({ data: {}, error: null });
    mockFrom.mockReturnValue(ch);

    await createRole({
      role_name: "editor",
      permissions: ["read", "write"],
    });

    expect(ch.insert).toHaveBeenCalledWith({
      role_name: "editor",
      permissions: ["read", "write"],
    });
  });
});

describe("deleteRole", () => {
  it("deletes by id", async () => {
    const ch = chain({ error: null });
    mockFrom.mockReturnValue(ch);

    await deleteRole("r1");
    expect(ch.eq).toHaveBeenCalledWith("id", "r1");
  });
});
