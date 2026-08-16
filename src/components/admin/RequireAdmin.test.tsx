import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from '@/components/admin/RequireAdmin';

// ─────────────────────────────────────────────────────────
// Mock the auth context
// ─────────────────────────────────────────────────────────
const mockSignOut = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAdmin: false,
    loading: false,
    signOut: mockSignOut,
  })),
}));

// Mock Navigate to avoid routing issues in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: () => null,
  };
});

import { useAuth } from '@/lib/auth';

// Mock AdminLogin to keep it simple
vi.mock('@/pages/admin/AdminLogin', () => ({
  default: () => <div data-testid="admin-login">Admin Login Page</div>,
}));

function renderWithRouter(initialRoute = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/admin/*" element={<RequireAdmin><div data-testid="admin-content">Admin Content</div></RequireAdmin>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
      signOut: mockSignOut,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithRouter();
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('shows AdminLogin when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      signOut: mockSignOut,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithRouter();
    expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('shows not authorized when user is authenticated but not admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'user@test.com' } as unknown as ReturnType<typeof useAuth>['user'],
      isAdmin: false,
      loading: false,
      signOut: mockSignOut,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithRouter();
    expect(screen.getByText(/Not authorized/i)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('renders admin content when user is admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'admin@test.com' } as unknown as ReturnType<typeof useAuth>['user'],
      isAdmin: true,
      loading: false,
      signOut: mockSignOut,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithRouter();
    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('calls signOut when sign out button is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'user@test.com' } as unknown as ReturnType<typeof useAuth>['user'],
      isAdmin: false,
      loading: false,
      signOut: mockSignOut,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithRouter();
    const signOutButton = screen.getByText('Sign out');
    await userEvent.click(signOutButton);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
