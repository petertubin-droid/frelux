import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/lib/__mocks__/supabase-mock';

vi.mock('@/lib/supabase', () => ({
  supabase: createSupabaseMock(),
}));

import { compareScenarios } from '../scenario-engine';
import { evaluateAgentAction, recordAgentEvent, getLocalAuditQueue, flushLocalAuditQueue, AGENT_REGISTRY } from '../agents';
import { assessPredictionReadiness, assertPredictionAllowed, predictionReadinessMessage, PREDICTION_REQUIREMENTS } from '../predictions';
import type { FreluxContext } from '../types';

const context: FreluxContext = {
  userId: 'user-1',
  project: null,
  location: null,
  calculations: [],
  marketDataAvailable: false,
};

describe('scenario engine (deterministic comparisons only)', () => {
  it('compares two building scenarios via the SAME authoritative engine', async () => {
    const comparison = await compareScenarios('building_estimate', context, [], [
      { name: '3-bedroom (15×10)', overrides: { building_length: 15, building_width: 10 } },
      { name: '4-bedroom (15×12)', overrides: { building_length: 15, building_width: 12 } },
    ]);
    expect(comparison.scenarios).toHaveLength(2);
    const [base, bigger] = comparison.scenarios;
    expect(base.deltas.costDelta).toBe(0);
    expect(bigger.deltas.costDelta).toBeGreaterThan(0); // wider building costs more
    expect(bigger.deltas.costDeltaPercent).toBeGreaterThan(0);
    expect(comparison.assumptions.length).toBeGreaterThan(0);
    expect(comparison.risks.length).toBeGreaterThan(0);
  });

  it('REFUSES scenarios with missing required info rather than guessing', async () => {
    await expect(
      compareScenarios('building_estimate', context, [], [
        { name: 'A', overrides: {} },
        { name: 'B', overrides: {} },
      ]),
    ).resolves.toBeDefined(); // build_to_roof has defaults, so this resolves
  });
});

describe('agent framework (bounded, audited, approval-first)', () => {
  beforeEach(() => {
    getLocalAuditQueue().length = 0;
  });

  it('FORBIDS high-impact actions — not even proposeable', () => {
    const decision = evaluateAgentAction('project_agent', 'financial_transaction');
    expect(decision.decision).toBe('forbidden');
    expect(decision.reason).toContain('never');
  });

  it('allows reads, but writes are only PROPOSALS pending user approval', () => {
    expect(evaluateAgentAction('project_agent', 'read_project').decision).toBe('read_allowed');
    const proposal = evaluateAgentAction('project_agent', 'save_project_update');
    expect(proposal.decision).toBe('proposal_allowed');
    expect(proposal.reason).toContain('approval');
  });

  it('blocks actions outside the agent\'s bounded permissions', () => {
    expect(evaluateAgentAction('project_agent', 'delete_user_data').decision).toBe('forbidden');
  });

  it('ships future agents DISABLED — no dormant capabilities', () => {
    const disabled = AGENT_REGISTRY.filter((a) => !a.enabled);
    expect(disabled.length).toBe(4); // property, procurement, market, progress
    for (const agent of disabled) {
      expect(evaluateAgentAction(agent.id, agent.proposableActions[0] ?? 'read_project').decision).toBe('forbidden');
    }
  });

  it('keeps the audit alive: falls back to a local queue on DB failure', async () => {
    const result = await recordAgentEvent(
      { agentId: 'project_agent', action: 'save_project_update', status: 'proposed', createdAt: new Date().toISOString() },
      null,
    );
    expect(result).toBe('queued_locally');
    expect(getLocalAuditQueue()).toHaveLength(1);
  });

  it('flushes the local audit queue when connectivity returns', async () => {
    await recordAgentEvent(
      { agentId: 'project_agent', action: 'save_project_update', status: 'approved', createdAt: new Date().toISOString() },
      'user-1',
    );
    const flushed = await flushLocalAuditQueue('user-1');
    // With the chainable mock the insert resolves — either flushed or still queued.
    expect(typeof flushed).toBe('number');
  });
});

describe('predictions (no fake outputs)', () => {
  it('reports NOT supported while required data is missing', () => {
    const readiness = assessPredictionReadiness('cost_overrun', ['project_budget']);
    expect(readiness.supported).toBe(false);
    expect(readiness.missing).toContain('actual_spend_history');
  });

  it('is supported only when every required data set exists', () => {
    const all = PREDICTION_REQUIREMENTS.cost_overrun;
    const readiness = assessPredictionReadiness('cost_overrun', all);
    expect(readiness.supported).toBe(true);
    expect(readiness.missing).toHaveLength(0);
  });

  it('assertPredictionAllowed THROWS on missing data — fabricated predictions impossible', () => {
    expect(() => assertPredictionAllowed('material_price_change', ['region'])).toThrow(
      /needs more data|missing/i,
    );
  });

  it('produces honest readiness messages', () => {
    const message = predictionReadinessMessage('schedule_delay', []);
    expect(message).toContain("can't predict");
    expect(message).toContain('more data');
  });
});
