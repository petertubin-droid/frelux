import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ──────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/lib/ai-credit-gate', () => ({
  checkAndSpendCredits: vi.fn().mockResolvedValue({ allowed: false, reason: 'anon' }),
}));

vi.mock('@/lib/contractor', () => ({
  fetchContractorProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/project-intelligence', () => ({
  saveCalculationToProject: vi.fn(),
}));

import CopilotWidget from './CopilotWidget';

function renderWidget() {
  return render(
    <MemoryRouter>
      <CopilotWidget />
    </MemoryRouter>,
  );
}

describe('CopilotWidget — end-to-end smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the floating entry without breaking the site', () => {
    renderWidget();
    expect(screen.getByRole('button', { name: /open frelux ai copilot/i })).toBeDefined();
  });

  it('interprets a flagship request, shows facts with provenance, runs the authoritative engine', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole('button', { name: /open frelux ai copilot/i }));

    // Deterministic parse — no AI credits spent for anon users.
    const input = screen.getByLabelText(/describe your estimation request/i);
    await user.type(input, 'Estimate a 4-bedroom bungalow, 15m by 12m');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    // Review panel: task + extracted facts with badges.
    await waitFor(() => {
      expect(screen.getByText(/whole-building materials & cost estimate/i)).toBeDefined();
    });
    expect(screen.getAllByText(/stated in your request/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/bedrooms:/i)).toBeDefined();
    expect(screen.getAllByText(/stated in your request/i).length).toBeGreaterThanOrEqual(2);
    // User-stated dims → no missing-info form for building estimates.
    expect(screen.queryByText(/still needed/i)).toBeNull();

    // Run the engine → result with ₦ total and provenance.
    await user.click(screen.getByRole('button', { name: /run frelux engine/i }));
    await waitFor(() => {
      expect(screen.getByText(/estimated total/i)).toBeDefined();
    });
    expect(screen.getByText(/authoritative frelux build-to-roof engine/i)).toBeDefined();
    expect(screen.getByText(/open full estimator breakdown/i)).toBeDefined();
  });

  it('asks for missing info instead of guessing (painting example)', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: /open frelux ai copilot/i }));

    await user.type(screen.getByLabelText(/describe your estimation request/i), 'how much paint for my room');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => {
      expect(screen.getByText(/still needed/i)).toBeDefined();
    });
    // Length/width/height are genuinely missing → the form asks for them.
    expect(screen.getByText(/room length/i)).toBeDefined();
    expect(screen.getByText(/room width/i)).toBeDefined();
    expect(screen.getByText(/wall height/i)).toBeDefined();
  });
});
