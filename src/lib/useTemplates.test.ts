import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock templates module
const mockGetUserTemplates = vi.fn();
const mockCreateUserTemplate = vi.fn();
const mockUpdateUserTemplate = vi.fn();
const mockDeleteUserTemplate = vi.fn();
const mockDuplicateUserTemplate = vi.fn();

vi.mock("@/lib/templates", () => ({
  getUserTemplates: (...args: any[]) => mockGetUserTemplates(...args),
  createUserTemplate: (...args: any[]) => mockCreateUserTemplate(...args),
  updateUserTemplate: (...args: any[]) => mockUpdateUserTemplate(...args),
  deleteUserTemplate: (...args: any[]) => mockDeleteUserTemplate(...args),
  duplicateUserTemplate: (...args: any[]) => mockDuplicateUserTemplate(...args),
}));

// Mock auth
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useUserTemplates } from "@/lib/useTemplates";

const mockTemplate = {
  id: "tpl-1",
  name: "My Template",
  calculator_type: "paint",
  data: { area: 50 },
  is_favorite: false,
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: "user-1",
};

describe("useUserTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
    mockGetUserTemplates.mockResolvedValue([mockTemplate]);
  });

  it("loads templates on mount", async () => {
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetUserTemplates).toHaveBeenCalledWith("user-1", {
      calculatorType: undefined,
    });
    expect(result.current.templates).toEqual([mockTemplate]);
    expect(result.current.error).toBeNull();
  });

  it("returns empty array when no user", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates).toEqual([]);
    expect(mockGetUserTemplates).not.toHaveBeenCalled();
  });

  it("passes calculatorType filter", async () => {
    const { result } = renderHook(() => useUserTemplates("paint"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetUserTemplates).toHaveBeenCalledWith("user-1", {
      calculatorType: "paint",
    });
  });

  it("create() calls createUserTemplate and refreshes", async () => {
    const newTemplate = { ...mockTemplate, id: "tpl-2", name: "New" };
    mockCreateUserTemplate.mockResolvedValue(newTemplate);
    mockGetUserTemplates.mockResolvedValue([mockTemplate, newTemplate]);

    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const input = {
      name: "New",
      calculator_type: "paint",
      data: { area: 50 },
    } as any;
    let created: any;
    await act(async () => {
      created = await result.current.create(input);
    });
    expect(mockCreateUserTemplate).toHaveBeenCalledWith("user-1", input);
    expect(created).toEqual(newTemplate);
  });

  it("create() returns null when no user", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: any;
    await act(async () => {
      created = await result.current.create({} as any);
    });
    expect(created).toBeNull();
  });

  it("update() calls updateUserTemplate", async () => {
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update("tpl-1", { name: "Updated" } as any);
    });
    expect(mockUpdateUserTemplate).toHaveBeenCalledWith("tpl-1", "user-1", {
      name: "Updated",
    });
  });

  it("remove() calls deleteUserTemplate", async () => {
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("tpl-1");
    });
    expect(mockDeleteUserTemplate).toHaveBeenCalledWith("tpl-1", "user-1");
  });

  it("duplicate() calls duplicateUserTemplate", async () => {
    const dup = { ...mockTemplate, id: "tpl-3", name: "Copy" };
    mockDuplicateUserTemplate.mockResolvedValue(dup);

    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let result_dup: any;
    await act(async () => {
      result_dup = await result.current.duplicate("tpl-1", "Copy");
    });
    expect(mockDuplicateUserTemplate).toHaveBeenCalledWith(
      "tpl-1",
      "user-1",
      "Copy",
    );
    expect(result_dup).toEqual(dup);
  });

  it("toggleFavorite() updates local state optimistically", async () => {
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleFavorite("tpl-1", false);
    });
    expect(mockUpdateUserTemplate).toHaveBeenCalledWith("tpl-1", "user-1", {
      is_favorite: true,
    });
    expect(result.current.templates[0].is_favorite).toBe(true);
  });

  it("handles load error gracefully", async () => {
    mockGetUserTemplates.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
    expect(result.current.templates).toEqual([]);
  });

  it("refresh() reloads templates", async () => {
    const { result } = renderHook(() => useUserTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetUserTemplates.mockResolvedValue([
      mockTemplate,
      { ...mockTemplate, id: "tpl-2" },
    ]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.templates.length).toBe(2);
  });
});
