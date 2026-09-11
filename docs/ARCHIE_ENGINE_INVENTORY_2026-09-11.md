# ARCHIE Engine Ecosystem Inventory (2026-09-11)

Owner directive: complete native engine ecosystem expansion —
inspect first, no duplicate engines, strengthen what exists,
complete what is partial, implement what is genuinely missing,
one coherent cognitive architecture.

This is the **inspection baseline**. Status codes:

- **FULL** — real implementation, runtime-integrated, tested, observable
- **PARTIAL** — real but incomplete; gap named under "Remaining"
- **GAP** — genuinely missing as an engine (may have a data table or probe only)

Runtime reachability: edge engines live in
`supabase/functions/_shared/archie-ai/**` and are invoked by the
`archie-*` edge functions; client engines live in `src/lib/archie/**`
and run in the PWA / admin surfaces. One kernel
(`cognitive/kernel.ts`, 15 phases) binds every loop phase to a real
anatomical subsystem (`ORGAN_PHASE_BINDINGS`); specialized engines are
callable from `native-engine/engine.ts` (the Native Intelligence
Engine core). 103 ARCHIE test files, 1,605 ARCHIE tests as of
2026-09-11.

## Inventory (30 required engines)

| #   | Engine              | Module(s)                                                                                    | Status  | Tests (examples)                               | Remaining limitations                                                                                         |
| --- | ------------------- | -------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Native Intelligence | `native-engine/engine.ts` (3.1k lines), `runtime.ts`                                         | FULL    | `core-integration`, `native-engine-benchmark`  | Model-runtime inference is an explicit boundary (`archie-model-runtime` reports `operational:false` honestly) |
| 2   | Conversation        | `cognitive/kernel.ts` (15-phase loop), `orchestrator.ts`, `composer.ts`                      | FULL    | `anaphora-followup`, `cognitive-engine`        | Turn-level context; no multi-party conversation sessions                                                      |
| 3   | Language / NLU      | `native-engine/nlu.ts` (1.4k lines)                                                          | FULL    | `nlu-*` suites, benchmark lu-1..4 (1.0)        | English-primary                                                                                               |
| 4   | Perception          | `cognitive/perception.ts` (secret redaction, input shaping)                                  | FULL    | `cognitive-engine`, kernel trace honesty       | Text/audio-JSON perception; no live sensor stream                                                             |
| 5   | Memory              | `memory.ts` (ContextMemory), `persistence.ts` (Supabase/Counter/Episodic)                    | FULL    | `cross-session-memory`, `episodic-persistence` | Working-memory window bounded; long-term = fact store                                                         |
| 6   | Knowledge           | `knowledge.ts` (FactStore), `seed-corpus.ts`, `frelux_knowledge_items`                       | FULL    | `derived-store`, `fact-id-concurrency`         | Knowledge acquisition is research-driven (no bulk ingest)                                                     |
| 7   | Learning            | `learning.ts` (OutcomeLearner), `lessons.ts` (RecordedLesson)                                | FULL    | `archie-p3/p5`, benchmark learning (1.0)       | Outcome-based; no unsupervised clustering                                                                     |
| 8   | Research            | `webresearch.ts`, `web-sources.ts`, `page-fetch.ts`, `wikipedia-search.ts`                   | FULL    | `archie-web-source-registry`, research suites  | Source registry governs fetches; some sites need adapters                                                     |
| 9   | World Model         | `cognitive/world-model.ts` (425 lines)                                                       | FULL    | `forensic-worldmodel-authority`                | Owner-data-centric entities; no physics simulation                                                            |
| 10  | Reasoning           | `reasoning.ts` + `reasoning-loop.ts`                                                         | FULL    | benchmark logic/causal/multi-step (all 1.0)    | Deterministic rule chains, not open-ended theory building                                                     |
| 11  | Planning            | `planning.ts` (Planner, DEFAULT/PLANNING operators)                                          | FULL    | benchmark planning (1.0)                       | Operator-library planning; no long-horizon replan loop                                                        |
| 12  | Tool                | `tools.ts` (ToolOrchestrator + manifest), `cognitive/tool-intelligence.ts`                   | FULL    | `tool-intelligence`, benchmark tool-selection  | Tools are registered natives; no dynamic tool discovery                                                       |
| 13  | Execution           | `execution/engine.ts` (548 lines, ROLLED_BACK compensation), `archie-execute`                | FULL    | `execution-engine`                             | Registry-gated targets only; every run audited                                                                |
| 14  | Coding              | `coding.ts` (analyzeSource, generateUnitTestScaffold)                                        | PARTIAL | `code-intelligence`                            | Static analysis + unit scaffolds; no multi-file synthesis — strengthen next                                   |
| 15  | Validation          | `cognitive/verification.ts` (VerificationEngine)                                             | FULL    | kernel VERIFY phase, `cognitive-engine`        | Verifies verdicts/plans; no property-based proof search                                                       |
| 16  | Self Evaluation     | `selfeval.ts` (SelfEvaluator), `cognitive/metacognition.ts`                                  | FULL    | `archie-p5`, metacognition suites              | Self-scores recorded in `archie_self_evaluations`                                                             |
| 17  | Evolution           | `src/lib/archie/evolution/**` (authority, change-request, lifecycle)                         | FULL    | `evolution-*` suites                           | Owner-approved changes only; §9 lifecycle enforced                                                            |
| 18  | Recovery            | Execution ROLLED_BACK states, `archie_migration_history`, crypto `passphrase-recovery.ts`    | PARTIAL | `execution-engine`                             | Recovery is a state, not an engine — no failure classification/compensation registry — implement next         |
| 19  | Security            | `security/verdict.ts`, `security-integrity.ts`, `security/life-safety.ts` (protected)        | FULL    | `life-safety-gate`, security suites            | Verdict gate + integrity + life-safety hard gate live                                                         |
| 20  | Owner Authority     | `evolution/authority.ts` (PROTECTED_SURFACES, mayApprove), `archie-owner-auth`               | FULL    | `evolution-authority`, `kernel-trace-honesty`  | ARCHIE approval is code-impossible                                                                            |
| 21  | Voice / Audio       | `ears.ts` + `archie-ears` (intake, voiceprint), `mobile/voice.ts` (PWA TTS)                  | PARTIAL | `ears`                                         | STT intake + client TTS; no edge-native audio synthesis — strengthen                                          |
| 22  | Vision              | `cognitive/vision.ts` (analyzeImage, 683 lines)                                              | FULL    | vision suites                                  | Deterministic image analysis; camera ingest via ears/PWA                                                      |
| 23  | Communication       | `whatsapp/protocol.ts` (442), `archie-whatsapp`, `archie-social-connect`, push notifications | FULL    | whatsapp/protocol suites, moderation           | WhatsApp-first; social-connect surface per-channel adapters                                                   |
| 24  | Integration / API   | `connections.ts` (569 lines, pairing/permission/maintenance gate), `docs/API.md`             | FULL    | `connections`                                  | Owner-scoped connection registry                                                                              |
| 25  | Device              | `connections.ts` (connective-tissue state machine) + `src/lib/archie/mobile/**` (BT/USB)     | FULL    | `connections`, mobile suites                   | PWA transports for Web Bluetooth / WebUSB; edge holds policy                                                  |
| 26  | Infrastructure      | `frelux_infrastructure_costs` + anatomy "legs" probe                                         | GAP     | (probe only)                                   | Cost records exist; no engine module — deploy health, cost projection, dependency checks — implement next     |
| 27  | Blockchain          | `crypto/blockchain.ts` (472), `hd-crypto.ts`, `bip39.ts`                                     | FULL    | `blockchain`, `hd-crypto`                      | Deterministic derivation; signing gated by owner authority                                                    |
| 28  | Market Intelligence | `crypto/market-data.ts` (1.3k), `market-analysis.ts`, `probability.ts`                       | FULL    | `crypto-intelligence`                          | Live market data sources registered in web-source registry                                                    |
| 29  | Trading             | `crypto/trade-gate.ts` (evaluateTradeGate, renderGateDecision)                               | PARTIAL | trade-gate suites                              | Gate evaluates/renders decisions; no order lifecycle (open/monitor/close) — strengthen next                   |
| 30  | Domain Intelligence | `domains/registry.ts` + `domains/construction.ts` (+ data) — audit pass 4 domain capture     | FULL    | `domain-capture`, `domain-intelligence`        | Construction domain live; registry extensible per domain                                                      |

## One architecture, not thirty brains

Pipeline (kernel `cognitive/kernel.ts`): PERCEIVE → UNDERSTAND →
RETRIEVE → REASON → PLAN → MODEL → CREATE → VERIFY → ACT → OBSERVE →
EVALUATE → LEARN → REMEMBER → IMPROVE → REPEAT. Every phase binds to
a real anatomical subsystem; `archie-chat` runs the life-safety gate
and security verdict BEFORE the loop, and VERIFY/ACT re-classify
ARCHIE's own outgoing response (defense in depth). Specialized
engines (blockchain, market, vision, research…) are invoked BY the
native engine / kernel — never as parallel brains. No engine may
bypass the authority, security or life-safety layers.

## Learning vs execution authority

Learning authority (research, knowledge, lessons) is free by
constitution. Execution authority (production code, deployment,
destructive/consequential ops, funds) is owner-gated server-side and
code-enforced — `mayApprove("ARCHIE")` is constant-false and tested.

## Work queue (strengthen/complete, in protocol order)

1. **Recovery Engine (18)** — real module: failure classification,
   compensation registry, resume/retry policy, wired into execution
   engine + anatomy "healing".
2. **Infrastructure Engine (26)** — real module: deployment/dependency
   health, cost tracking + projection, wired into anatomy "legs".
3. **Coding Engine (14)** — deepen: multi-file project analysis,
   dependency-aware scaffolds (native, deterministic — no fake AI).
4. **Trading Engine (29)** — order lifecycle state machine behind the
   existing gate (still owner-gated for consequential fills).
5. **Voice Engine (21)** — close the loop: TTS back into ears
   transcripts (audit) + prosody shaping via composer.

Each item follows DESIGN → IMPLEMENT → TEST → INTEGRATE → RUNTIME
VERIFY → ACCEPT/REJECT, with full ARCHIE suites green and per-engine
tests added. Existing engines hold their baselines
(`docs/archie-performance-ledger.md`).
