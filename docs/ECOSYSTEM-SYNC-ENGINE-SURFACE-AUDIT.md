# Engine and feature surface audit, 2026-11-02

## Method

The registered engines were listed from the AI foundation registry at runtime,
not from documentation: 20 engines, more than the 17 the earlier phase counted,
because three register later in the chain (`foundation`, `reinforcement`,
`doors_windows`).

Reachability was traced twice and the first two answers were wrong, which is
worth recording. Grepping for an engine id in pages reported nine engines with
no UI. Tracing imports two hops reported a different, larger set, because shared
registries make every admin page look like a surface. Both methods are
inference, and inference is what produced the drift in the first place.

So the manifest is authored: `src/config/engine-surfaces.ts` states, per engine,
which page runs it, which page covers the same question with its own code, or
that nothing does. A test fails when a registered engine has no entry, so the
question has to be answered whenever an engine is added.

## Findings

| State                          | Count |
| ------------------------------ | ----- |
| Wired to a page                | 11    |
| Page exists, engine not called | 6     |
| No UI at all                   | 3     |

The six duplicated engines are the real coordination problem, not the three
empty ones. The paint calculator, screeding calculator, tyrolene estimator, roof
framing calculator and margin calculator each compute their own version of a
calculation the registry also holds. Two implementations of the same quantity is
how a screen can say "verified" while the engine says something else.

The three with no entry point at all are `tyrolene_system`, `sequence_planner`
and `timeline_estimator`. The timeline case is the interesting one: a project
timeline page exists, so the feature is not missing from the product, but its
maths is its own and the engine is never executed.

## What now exists

`/admin/engine-studio`, linked in the admin sidebar as Engine Studio.

- Every registered engine, with its state and the sentence explaining it.
- The page that runs it, where one exists, linked.
- A runner for engines that declare an input contract: the fields come from
  `TASK_REQUIREMENTS`, the execution is the real `executeEngine`, and the output
  is whatever the engine returns, refusals included.
- For engines with no declared input contract, an explicit statement that it
  cannot be run without inventing its inputs. That is the honest state, and it
  is visible rather than silent.

This does not merge the six duplicated implementations into their engines. That
is a calculation change, it touches live estimates, and it needs its own phase
with the price and quantity regressions watched.

## Analytics

The dashboard the request expected does exist: `/admin/analytics`, linked in the
sidebar as Analytics Dashboard, with GA4 configuration and summary wiring. What
it cannot show today is live Google-side numbers, because `ga4-report` needs its
two Supabase function secrets. Traffic figures are stored in the same
`integration_settings` row that holds the measurement ID, so without those
secrets the panel can show configuration but not visits.

## Advertising inside articles

Eight campaigns were live and every one targeted `calculator_results`, so
article placements had nothing to serve. Six article campaigns were added,
targeting `article_30`, `article_65`, `article_end` and `article_sidebar`, each
pointing at the calculator that answers the article's own category. Alongside
them, `ArticleToolPromo` promotes the same calculators from the tool registry
regardless of campaign inventory, so the slot is never the only source of a
recommendation.
