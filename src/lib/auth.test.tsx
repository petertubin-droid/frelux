import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAuth, AuthProvider, type AccountType } from "@/lib/auth";

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(),
}));

function TestChild() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="configured">{String(ctx.configured)}</span>
      <span data-testid="isPaid">{String(ctx.isPaid)}</span>
      <span data-testid="isAdmin">{String(ctx.isAdmin)}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  it("provides initial auth state", () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>,
    );
    // When supabase is not configured, loading is eventually false
    // Initial render should show loading=true
    expect(getByTestId("configured").textContent).toBe("false");
    expect(getByTestId("isPaid").textContent).toBe("false");
    expect(getByTestId("isAdmin").textContent).toBe("false");
  });

  it("useAuth throws outside provider", () => {
    expect(() => {
      function Bad() {
        useAuth();
        return null;
      }
      render(<Bad />);
    }).toThrow("useAuth must be used within AuthProvider");
  });
});

describe("AccountType", () => {
  it("accepts client and pro_worker", () => {
    const a: AccountType = "client";
    const b: AccountType = "pro_worker";
    expect(a).toBe("client");
    expect(b).toBe("pro_worker");
  });
});
