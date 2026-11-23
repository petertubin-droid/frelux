import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import RequireSession from "@/components/auth/RequireSession";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

/** Renders whatever address the gate navigated to, so the redirect is visible. */
function LoginProbe() {
  const location = useLocation();
  return (
    <div data-testid="login-probe">{location.pathname + location.search}</div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/project-workspace/:id"
          element={
            <RequireSession>
              <div data-testid="protected">Project</div>
            </RequireSession>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const mockedUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  mockedUseAuth.mockReset();
});

describe("RequireSession", () => {
  it("renders the page for a signed-in user", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "u1" },
      loading: false,
    } as never);
    renderAt("/project-workspace/abc");
    expect(screen.getByTestId("protected")).toBeTruthy();
  });

  it("sends a signed-out visitor to the login page, keeping the address", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as never);
    renderAt("/project-workspace/abc");
    expect(screen.queryByTestId("protected")).toBeNull();
    // The return address is carried, so the visitor lands back where they aimed.
    expect(screen.getByTestId("login-probe").textContent).toContain(
      "/login?redirect=%2Fproject-workspace%2Fabc",
    );
  });

  it("waits rather than flashing the login page while the session loads", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true } as never);
    renderAt("/project-workspace/abc");
    expect(screen.getByRole("status").textContent).toContain(
      "Checking your session",
    );
    expect(screen.queryByTestId("login-probe")).toBeNull();
  });

  it("keeps a query string in the return address", () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false } as never);
    renderAt("/project-workspace/abc?tab=boq");
    expect(screen.getByTestId("login-probe").textContent).toContain(
      "tab%3Dboq",
    );
  });
});
