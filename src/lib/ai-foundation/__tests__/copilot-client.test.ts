import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn().mockResolvedValue({ data: null, error: new Error('FunctionsRelay error') });

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

vi.mock('@/lib/errorMonitor', () => ({
  captureAiError: vi.fn(),
}));

import { interpretWithAi } from '../copilot-client';

describe('copilot client, resilience', () => {
  beforeEach(() => {
    invokeMock.mockClear();
    invokeMock.mockResolvedValue({ data: null, error: new Error('FunctionsRelay error') });
  });

  it('degrades gracefully to the deterministic parser when the edge function fails', async () => {
    const result = await interpretWithAi('Estimate a 4-bedroom house');
    expect(result.interpretedBy).toBe('deterministic');
    expect(result.taskType).toBe('building_estimate');
    expect(result.facts.find((f) => f.key === 'bedrooms')?.value).toBe(4);
  });

  it('uses AI-assisted interpretation when the edge function responds', async () => {
    invokeMock.mockResolvedValue({
      data: {
        interpretation: {
          taskType: 'building_estimate',
          facts: [{ key: 'bedrooms', label: 'Bedrooms', value: 3, unit: 'count' }],
        },
      },
      error: null,
    });
    const result = await interpretWithAi('Estimate my 3-bedroom home');
    expect(result.interpretedBy).toBe('ai_assisted');
    const fact = result.facts[0];
    expect(fact.origin).toBe('ai_interpretation');
    expect(fact.trust).toBe('needs_confirmation'); // AI facts never auto-trusted
  });

  it('dedupes identical concurrent requests into one edge call', async () => {
    invokeMock.mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ data: { interpretation: { taskType: 'building_estimate', facts: [] } }, error: null }), 20),
      ),
    );
    const [a, b] = await Promise.all([
      interpretWithAi('same request', 'ctx'),
      interpretWithAi('same request', 'ctx'),
    ]);
    expect(a.interpretedBy).toBe('ai_assisted');
    expect(b.interpretedBy).toBe('ai_assisted');
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});
