import { useState } from 'react';
import { Brain, TrendingDown, HelpCircle, BookOpen, Loader2, Send } from 'lucide-react';
import { aiProjectReview, aiProjectOptimize, aiProjectExplain, aiProjectQa, type ProjectDataForAi } from '@/lib/ai-project';

interface AiProjectPanelProps {
  projectData: ProjectDataForAi;
}

type AiAction = 'review' | 'optimize' | 'explain' | 'qa';

export function AiProjectPanel({ projectData }: AiProjectPanelProps) {
  const [activeAction, setActiveAction] = useState<AiAction>('review');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [optimizeTarget, setOptimizeTarget] = useState('Reduce this estimate by 10%');

  async function runAi() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (activeAction === 'review') {
        const r = await aiProjectReview(projectData);
        setResult(JSON.stringify(r, null, 2));
      } else if (activeAction === 'optimize') {
        const r = await aiProjectOptimize(projectData, optimizeTarget);
        setResult(JSON.stringify(r, null, 2));
      } else if (activeAction === 'explain') {
        const r = await aiProjectExplain(projectData);
        setResult(JSON.stringify(r, null, 2));
      } else if (activeAction === 'qa' && question.trim()) {
        const r = await aiProjectQa(projectData, question.trim());
        setResult(JSON.stringify(r, null, 2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  }

  const actions: { key: AiAction; label: string; icon: typeof Brain; desc: string }[] = [
    { key: 'review', label: 'Review', icon: Brain, desc: 'Full project analysis, mistake detection, missing materials' },
    { key: 'optimize', label: 'Cost Optimizer', icon: TrendingDown, desc: 'Reduce costs, create premium/economy/luxury versions' },
    { key: 'explain', label: 'Explain', icon: BookOpen, desc: 'Step-by-step breakdown of every calculation' },
    { key: 'qa', label: 'Ask AI', icon: HelpCircle, desc: 'Technical construction questions and guidance' },
  ];

  const optimizePresets = [
    'Reduce this estimate by 10%',
    'Create a premium version',
    'Create a luxury version',
    'Create an economy version',
    'Recommend the most durable option',
    'Recommend the fastest installation option',
    'Recommend a budget-friendly alternative',
  ];

  function renderResult() {
    if (!result) return null;
    try {
      const parsed = JSON.parse(result);
      return (
        <div className="mt-4 space-y-4">
          {parsed.summary && (
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-sm text-foreground">{parsed.summary}</p>
            </div>
          )}
          {parsed.strengths && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Strengths</h4>
              <ul className="space-y-1">
                {parsed.strengths.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">✓ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.weaknesses && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Areas for Improvement</h4>
              <ul className="space-y-1">
                {parsed.weaknesses.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">⚠ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.missingMaterials && parsed.missingMaterials.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Missing Materials</h4>
              <ul className="space-y-1">
                {parsed.missingMaterials.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-destructive">• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.recommendations && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Recommendations</h4>
              <ul className="space-y-1">
                {parsed.recommendations.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">→ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.costAnalysis && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-1 text-sm font-semibold text-foreground">Cost Analysis</h4>
              <p className="text-sm text-muted-foreground">{parsed.costAnalysis}</p>
            </div>
          )}
          {parsed.changes && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Suggested Changes</h4>
              <div className="space-y-2">
                {parsed.changes.map((c: { area: string; current: string; recommended: string; impact: string }, i: number) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">{c.area}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Current: {c.current}</p>
                    <p className="text-xs text-muted-foreground">Recommended: {c.recommended}</p>
                    <p className="mt-1 text-xs font-medium text-brand-purple">{c.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {parsed.savings && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{parsed.savings}</p>
              {parsed.newEstimate && <p className="mt-1 text-sm text-muted-foreground">{parsed.newEstimate}</p>}
            </div>
          )}
          {parsed.tradeOffs && parsed.tradeOffs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Trade-offs</h4>
              <ul className="space-y-1">
                {parsed.tradeOffs.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">⚖ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.warnings && parsed.warnings.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Warnings</h4>
              <ul className="space-y-1">
                {parsed.warnings.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-amber-600 dark:text-amber-400">⚠ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.roomBreakdowns && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Room Calculations</h4>
              {parsed.roomBreakdowns.map((room: { roomName: string; calculations: string[] }, i: number) => (
                <div key={i} className="mb-3 rounded-lg border p-3">
                  <p className="text-sm font-medium text-foreground">{room.roomName}</p>
                  <ul className="mt-2 space-y-1">
                    {room.calculations.map((c: string, j: number) => (
                      <li key={j} className="text-xs text-muted-foreground">{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {parsed.answer && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-foreground">{parsed.answer}</p>
              {parsed.details && <p className="mt-2 text-sm text-muted-foreground">{parsed.details}</p>}
            </div>
          )}
          {parsed.bestPractices && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Best Practices</h4>
              <ul className="space-y-1">
                {parsed.bestPractices.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.industryStandards && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Industry Standards</h4>
              <ul className="space-y-1">
                {parsed.industryStandards.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">◆ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.proTips && parsed.proTips.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Pro Tips</h4>
              <ul className="space-y-1">
                {parsed.proTips.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">💡 {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.recommendations && activeAction === 'qa' && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Recommendations</h4>
              <ul className="space-y-1">
                {parsed.recommendations.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">→ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.references && parsed.references.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">References</h4>
              <ul className="space-y-1">
                {parsed.references.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">📖 {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.applicationTips && parsed.applicationTips.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Application Tips</h4>
              <ul className="space-y-1">
                {parsed.applicationTips.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">🎨 {s}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.previewDescription && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-foreground">{parsed.previewDescription}</p>
            </div>
          )}
          {parsed.colorSuggestions && parsed.colorSuggestions.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.colorSuggestions.map((c: { hex: string; name: string; reasoning: string; coverageArea: string }, i: number) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: c.hex }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.coverageArea}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{c.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } catch {
      return <pre className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{result}</pre>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Brain className="h-5 w-5 text-brand-purple" />
          AI Project Assistant
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get intelligent insights, cost optimizations, and expert guidance powered by AI.
        </p>
      </div>

      {/* Action tabs */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => { setActiveAction(action.key); setResult(null); setError(null); }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeAction === action.key
                ? 'bg-primary text-primary-foreground'
                : 'border text-foreground hover:bg-accent'
            }`}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {actions.find((a) => a.key === activeAction)?.desc}
      </p>

      {/* Conditional inputs */}
      {activeAction === 'optimize' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Optimization Goal</label>
          <div className="flex flex-wrap gap-2">
            {optimizePresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setOptimizeTarget(preset)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  optimizeTarget === preset
                    ? 'bg-primary text-primary-foreground'
                    : 'border text-foreground hover:bg-accent'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={optimizeTarget}
            onChange={(e) => setOptimizeTarget(e.target.value)}
            placeholder="Or type your own optimization goal..."
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm text-foreground"
          />
        </div>
      )}

      {activeAction === 'qa' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your Question</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && question.trim()) runAi(); }}
              placeholder="Ask about materials, techniques, costs, best practices..."
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm text-foreground"
            />
            <button
              onClick={runAi}
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {(activeAction === 'review' || activeAction === 'explain') && (
        <button
          onClick={runAi}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {activeAction === 'review' ? 'Run AI Review' : 'Explain Calculations'}
        </button>
      )}

      {activeAction === 'optimize' && (
        <button
          onClick={runAi}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
          Optimize Estimate
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-brand-purple" />
            <p className="mt-3 text-sm text-muted-foreground">Analyzing your project...</p>
          </div>
        </div>
      )}

      {/* Result */}
      {renderResult()}
    </div>
  );
}
