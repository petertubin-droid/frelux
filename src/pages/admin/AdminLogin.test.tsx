import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLogin from "./AdminLogin";

const { signInMock, signInWithGoogleMock, authState } = vi.hoisted(() => {
  const authState = {
    user: null as any,
    isAdmin: false,
    configured: true,
  };

  return {
    authState,
    signInMock: vi.fn(),
    signInWithGoogleMock: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: authState.user,
    isAdmin: authState.isAdmin,
    configured: authState.configured,
    signIn: signInMock,
    signInWithGoogle: signInWithGoogleMock,
  })),
}));

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
}));

vi.mock("@/components/brand/Logo", () => ({
  default: () => <div data-testid="brand-logo">FRELUX</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  authState.user = null;
  authState.isAdmin = false;
  authState.configured = true;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminLogin />
    </MemoryRouter>,
  );
}

describe("AdminLogin", () => {
  it("renders login form with email and password inputs", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /Admin sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("admin@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("--------")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  it("submits sign in with entered credentials", async () => {
    signInMock.mockResolvedValue({ error: null, isAdmin: true });
    renderPage();

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const passInput = screen.getByPlaceholderText("--------");
    const submitBtn = screen.getByRole("button", { name: /^Sign in$/i });

    fireEvent.change(emailInput, { target: { value: "admin@frelux.com" } });
    fireEvent.change(passInput, { target: { value: "secret123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("admin@frelux.com", "secret123");
    });
  });

  it("displays error when account does not have admin access", async () => {
    signInMock.mockResolvedValue({ error: null, isAdmin: false });
    renderPage();

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const passInput = screen.getByPlaceholderText("--------");
    const submitBtn = screen.getByRole("button", { name: /^Sign in$/i });

    fireEvent.change(emailInput, { target: { value: "regular@frelux.com" } });
    fireEvent.change(passInput, { target: { value: "pass12345" } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Your account doesn't have admin access/i),
    ).toBeInTheDocument();
  });

  it("switches to create account mode", () => {
    renderPage();

    const switchBtn = screen.getByRole("button", {
      name: /Need an account\? Sign up/i,
    });
    fireEvent.click(switchBtn);

    expect(
      screen.getByRole("heading", { level: 1, name: /Create admin account/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create account/i }),
    ).toBeInTheDocument();
  });

  it("triggers Google sign-in when button is clicked", async () => {
    signInWithGoogleMock.mockResolvedValue({ error: null });
    renderPage();

    const googleBtn = screen.getByRole("button", {
      name: /Continue with Google/i,
    });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(signInWithGoogleMock).toHaveBeenCalled();
    });
  });
});
