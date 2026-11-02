# FRELUX MASTER MANDATE — COMPLETE 20-MARKET INTERNATIONALIZATION

Owner directive issued 2026-10-14. This document is the authoritative, verbatim
statement of the mandate. TODO-AGENT-HANDOFF.md tracks execution against it.
Any agent continuing cold: read this file first, then the handoff's
WHERE TO START, then verify state with the handoff's section 6 commands.

---

## 1. MISSION

Internationalize every existing FRELUX construction calculator, estimator,
engineering engine, measurement engine, AI-assisted calculation pipeline,
material engine, pricing engine, reporting engine, project engine, and other
relevant construction-intelligence feature for all 20 supported markets:
NG US GB CA AU DE IN GH KE ZA JP FR BR SA AE CN ID MX KR IT.

Do not assume engines must be created from scratch. Many exist. First
responsibility: discover what is implemented, understand it, preserve working
functionality, research its international requirements, and make the changes
needed for genuine market compatibility.

This is a real production application. No demonstrations, prototypes, mock
implementations, documentation-only exercises, or disconnected modules.

**Core principle:** no engine is internationally complete merely because its
interface was translated, its currency symbol changed, or its units converted.
Its calculation logic, construction assumptions, material data, technical
requirements, regional pricing, database connections, and outputs must be
appropriate for the selected market.

## 2. WORKING RULES

Work within the existing repository and architecture. Verify the present state
directly; never assume the code matches an earlier audit.

1. Preserve existing working functionality and correct calculations.
2. Do not rebuild an existing engine just because rewriting seems easier.
3. No duplicate engines, registries, market configurations, or pipelines
   without proving they are necessary.
4. No competing systems that disagree about markets, units, material data,
   prices, or engine availability.
5. No placeholder calculations, fake data, hardcoded demonstration results,
   invented material properties, or fabricated prices.
6. No silent Nigerian substitution when another market's data is missing.
7. No engine marked complete without implementation and meaningful verification.
8. Do not remove working functionality merely because a market is unverified.
9. Never expose secrets, credentials, or API keys in source, logs, or reports.
10. No destructive database migrations without understanding impact and having
    authorization and safeguards in place.
11. No subagents. Work directly, one architecture, one authoritative record.
12. Do not stop at an audit report. Implement and test, subject to access limits.

If a required repository, database, website, or external source cannot be
accessed, state the precise limitation. Never pretend to have accessed or
modified something unreachable.

## 3. THE 20 MARKETS

NG US GB CA AU DE IN GH KE ZA JP FR BR SA AE CN ID MX KR IT (canonical
identifiers from the repo). Each market needs an explicit implementation and
verification status for every discovered engine. A country is not necessarily
one uniform construction system: research states, provinces, municipalities,
climatic zones, seismic zones, and other jurisdictional distinctions where they
materially affect calculations. Do not claim universal national coverage when
only one jurisdiction is verified.

## 4. PHASE ONE — COMPLETE REPOSITORY AND ENGINE DISCOVERY

Inspect the entire relevant source tree: calculators, estimators, takeoff and
measurement systems, material consumption engines, building and roof geometry,
foundation and structural calculations, electrical and plumbing estimators,
finishing and renovation engines, cost/labour/pricing/quotation engines, solar
and sustainability engines, image/plan analysis, AI pipelines, shared libraries
and conversions, reports/BOQ/PDF exports, project planning engines,
construction dictionaries, frontend pages, backend services, database tables,
functions, triggers, migrations, admin configuration, tests, and audit docs.

Search for alternate names and hidden calculation paths. An engine does not
cease to exist because it is absent from the canonical registry or has a
different filename. Inspect actual call sites and runtime connections.

Discovery outputs (canonical inventory): engine id and name, source files,
purpose and operations, frontend entry points, backend and database
dependencies, shared services consumed, formulas and rules, material/price
data dependencies, tests and coverage gaps, current market support, bugs and
duplicated logic and hardcoded assumptions, and whether the engine is active,
partially integrated, obsolete, or unreachable. Reconcile with existing
registries and public calculator pages. Do not use a fixed expected engine
count as a limit.

## 5. PHASE TWO — MANDATORY INTERNET RESEARCH FOR EVERY MARKET

Internet research is compulsory before implementing market-specific logic. Do
not rely exclusively on model knowledge, old comments, search snippets, or
assumptions from neighbouring countries.

**A. Building types and methods:** residential, apartments, commercial,
industrial; RC frames, structural steel, timber framing, masonry bearing walls,
concrete blocks, cavity walls, light-gauge steel, drywall partitions, precast
and modular, locally important traditional systems. Where a calculation
depends on building type, require the user to select or supply the assembly.

**B. Wall construction and finishing:** wall dimensions and conventions;
brick, block, stone, concrete, timber, framed walls; plastering, rendering,
screeding, putty and surface preparation, emulsion and paint systems, mineral
stone, stucco, Tyrolene and local equivalents, gypsum plaster and board,
tiles, flooring, waterproofing, ceiling systems. Determine actual product
specification, packaging, application thickness, coverage, substrate
suitability, and preparation requirements from reliable evidence. Products
with similar names may differ in composition, application, and coverage.

**C. Roofing systems:** timber and steel framing, RC roof slabs, pitched and
flat roofs, metal sheets, tiles, shingles, membranes; underlays, insulation,
ventilation, gutters, drainage; climate requirements for rainfall, wind,
snow, heat, corrosion. Account for horizontal plan area versus actual roof
surface area. No generic waste percentage or spacing assumption without a
configurable, documented basis.

**D. Foundations and ground conditions:** strip and pad footings, rafts,
piles, ground beams, slab-on-ground, locally prevalent practices. Foundation
choice depends on site, soil, loading, groundwater, structural design, and
applicable standards, not on what is common in a country. Disclose limitations
and request missing design information rather than fabricating.

**E. Structural systems:** RC, steel, timber, masonry, composite and precast;
reinforcement quantities; wind, seismic, snow, thermal loads; connections.
Distinguish quantity estimation from structural engineering design. A quantity
estimator must not fabricate member sizes, reinforcement arrangements, or load
capacities. Unsupported design calculations must not be presented as
code-compliant engineering advice.

**F. Electrical systems:** nominal supply voltage and frequency (do not apply
generic 230 V everywhere; the US differs), wiring methods and cable types,
conductor sizing conventions, protective devices, earthing and bonding,
circuit types, applicable installation standards. No conductor size or
protective device from an arbitrary hardcoded rule: identify the standard,
required inputs, installation conditions, and limits of the calculation.

**G. Plumbing, water, drainage:** local pipe materials and standards, metric
and nominal sizing conventions, supply arrangements, drainage and wastewater,
sizing, gradient, venting, hot water systems, fitting conventions, applicable
codes. Do not assume the same diameter, slope, vent, or material applies
everywhere.

**H. Materials, labour, prices:** local specifications, product names,
suppliers, package sizes, labour practices, pricing sources. Distinguish
manufacturer specs, retail prices, wholesale, labour rates, regional surveys,
taxes/delivery, currency conversion, historical versus current. A converted
foreign price is not a verified local market price. A price record identifies
market, region, currency, unit, source, observation date, and product spec.

**I. Environmental and regional conditions:** climate zones, rainfall, heat,
wind, snow and freeze-thaw, coastal corrosion, seismicity, soil conditions,
insulation and energy requirements, fire performance and local regulations.
Use only where relevant and evidenced.

## 6. SOURCE QUALITY, EVIDENCE, CONFLICT RESOLUTION

Evidence hierarchy:
1. Official government building regulators and legislation.
2. National standards bodies and official building codes.
3. State/provincial/municipal authorities.
4. Recognized engineering and construction institutions.
5. Manufacturer technical datasheets and installation documentation.
6. Established cost databases and documented market surveys.
7. Peer-reviewed research and reputable technical publications.

Commercial supplier pages support availability and prices but do not
independently establish building-code compliance.

Every important researched decision must be traceable: country and
jurisdiction, topic and affected engine, source title and organization, exact
URL, relevant standard/document, publication date, date researched, the
specific technical fact supported, source type (official, manufacturer,
research, commercial), and limitations or conflicting evidence. Store this in
project documentation and, where suitable, a database-backed source registry.
No invented citations, inaccessible links, or sources that do not support the
recorded claim. When sources conflict, investigate whether the difference is
jurisdiction, edition, building category, material, or installation
condition; record the resolution and justification. When reliable evidence is
unavailable, record the gap. Do not manufacture certainty.

## 7. PHASE THREE — SHARED INTERNATIONALIZATION FOUNDATION

Reuse existing working services wherever possible.

**A. Canonical market context:** one authoritative service providing the
selected market and configuration (identifiers, currency and precision, units
and conventions, local catalogues, assemblies and building types, verified
rules, standards and versions, prices and labour data, waste/rounding/
packaging rules, provenance and verification status, feature availability,
required inputs and validation) to all calculation pathways. No calculator
invents its own country selection, currency rules, or material defaults.

**B. Unit conversion:** audit all dimensional, area, volume, mass,
temperature, and electrical conversions. Explicit, tested functions with
documented units and precision. Converting mm to inches does not make an
assembly suitable for another market. Never silently interpret an ambiguous
input with an unverified default.

**C. Material catalogue:** database-backed, with canonical identity, local
names and aliases, market and region, category and application, manufacturer
and product reference, packaging quantity and unit, coverage rate and
conditions, application thickness and preparation, density and physical
properties, price and observation date, source evidence, verification status
and effective dates. Never assume identical bag weight, bucket volume, tile
dimensions, block size, formulation, or packaging across markets.

**D. Rules, formulas, provenance:** authoritative calculations deterministic
and auditable, each rule with source, version, unit, input and output
contracts, and documented assumptions. Market/jurisdiction differences get
explicit, testable variations, not deeply embedded country conditions. Do not
centralize genuinely different engineering rules into one oversimplified
formula.

**E. Database and admin:** inspect schema, migrations, functions, access
policies, and admin interface before changing. Safe repeatable idempotent
migrations; preserve user data; enforce constraints and relationships; apply
row-level security; prevent unauthorized modification of verified technical
data; keep changes auditable; avoid duplicated or conflicting records; all 20
markets have appropriate configuration records; distinguish configured
markets from genuinely verified engine support. Admin must clearly
distinguish market configuration, source evidence, material catalogues,
pricing, standards, engine availability, and verification status. A save must
actually persist; a local UI state change or success toast is not proof. No
API keys or service-role credentials in frontend code.

## 8. PHASE FOUR — INTERNATIONALIZE EVERY DISCOVERED ENGINE

Build a complete matrix of every discovered engine against all 20 markets
(not restricted to the canonical registry). For every engine assess each
market for: construction system compatibility, correct materials and specs,
correct formulas and assumptions, unit handling, relevant standards, regional
pricing and labour data, database integration, admin configuration, frontend
integration, reporting and exports, automated test coverage, research
evidence and unresolved limitations.

Engine families to include (discovery guide, not a limit):

- **Measurement and geometry:** area/space/room/wall/floor/ceiling
  measurement, roof geometry and surface measurement, plan and drawing
  scanning, doors and windows, fence measurement, material and quantity
  calculations, project measurement pipelines.
- **Construction and finishing:** paint, putty and preparation, screeding
  and wall finishing, mineral stone, stucco, Tyrolene, flooring and tiling,
  POP and ceiling systems, waterproofing, other finishing engines.
- **Building and engineering:** Build-to-Roof, bill of quantities,
  foundation, structural calculations, reinforcement, electrical estimation,
  plumbing estimation, solar PV, roof material estimation, other building
  systems.
- **Cost and project estimation:** regional construction cost, labour and
  crew estimation, price scanning and forecasting, estimate refresh, margin
  calculations, cash flow, quotation and report generation, timeline and
  sequence planning, maintenance and warranty, contractor credit features.
- **AI-assisted intelligence:** photo estimation, count vision, plan
  scanning, conversational estimation, confidence and uncertainty assessment,
  smart AI reports, roof and building extraction, shared estimation
  pipelines, defect diagnosis, other AI-related engines.
- **Environmental and lifecycle:** embodied carbon, heat comfort, circular
  reuse, maintenance prediction, other relevant features.

Market-specific implementation must be verified by research, not hardcoded
country stereotypes. Preserve working Nigerian functionality;
internationalization extends the architecture, it does not break the
original market.

## 9. HIGH-RISK ENGINES — SPECIAL REQUIREMENTS

**A. Build-to-Roof:** audit the entire workflow (input extraction, typology
selection, geometry, foundation/wall/structural/roof quantities, materials,
labour, costs, reports, persistence). A Nigerian masonry building is not the
universal model. Support verified assemblies per market (masonry, RC, timber
framing, other local systems). Distinguish user-provided dimensions,
drawing-extracted values, calculated values, and assumptions. Identify
missing structural or site information explicitly.

**B. Electrical and plumbing:** audit actual formulas and their standards,
not merely UI units. Confirm supply characteristics, sizing conventions,
materials, code requirements, jurisdictional assumptions. Require the
inputs needed for a meaningful calculation. No unsupported code-compliance
claims.

**C. Foundation and structural:** never invent soil bearing capacity, loads,
reinforcement, member dimensions, or design assumptions. Document limits
where estimates can safely use user-provided dimensions; disclose where
professional design, geotechnical information, or local code verification is
required.

**D. Finishing and material consumption:** verify manufacturer-specific
coverage, substrate, thickness, preparation, coat count, packaging, waste
rules. Support market-specific product variants without corrupting Nigerian
formulas. Same-category products may have different coverage.

**E. Price and cost engines:** inspect actual data sources and write paths.
A crawler that extracts prices but never persists or integrates them is not
a completed engine. Never use stale, unavailable, or unverified prices
without clearly identifying their status.

## 10. PHASE FIVE — AI WORKS THROUGH VERIFIED ENGINES

AI may assist with: reading drawings, extracting dimensions, identifying
possible materials, interpreting descriptions, detecting building types,
mapping natural language to calculators, explaining deterministic results,
highlighting missing information, communicating uncertainty.

AI must not independently invent coverage rates, local prices, waste
percentages, formulas, engineering specifications, or structural
requirements.

Required workflow: interpret/extract input → validate dimensions, units,
confidence → ask for missing critical info → resolve market and assembly →
retrieve verified configuration and material data → execute the
deterministic engine → validate outputs, ranges, units, assumptions → return
results with traceable inputs and explanations → save only through the
authorized pathway. Expose extraction uncertainty and allow correction
before calculation. Never silently subtract a generic door/window area
unless openings were provided, extracted and confirmed, or the user was
clearly informed. Conversational or vision pipelines must not bypass market
context or call an outdated formula.

## 11. PHASE SIX — FRONTEND, ADMIN, REPORT INTEGRATION

Internationalization is incomplete if the backend is correct but the UI uses
wrong defaults. Audit calculator forms, estimator forms, tools, Learn Hub
calculators, project dashboards, admin pages, material selectors, market
selectors, reports, quotations, PDF exports, AI workflows, saved estimates
and histories. The selected market must reach the actual engine and stay
consistent through the workflow. Users must be able to see: selected market
and jurisdiction, building type/assembly, units, material specs, price
currency and freshness, affecting assumptions, unverified data, and whether
a feature is fully supported, partial, or unavailable. Maintain the design
system and responsive behaviour; extend, do not duplicate. Reports and
exports must retain market, units, assumptions, data references, and
calculation details.

## 12. PHASE SEVEN — TESTING AND VERIFICATION

Testing proves calculation and integration work, not merely that a page
renders.

**A. Unit tests:** formulas, unit conversions, rounding and packaging, input
validation, market-specific rules, material coverage, waste handling,
missing data, invalid dimensions, zero and negative values, decimal and
locale-formatted inputs, boundary conditions, precision and overflow,
unsupported combinations.

**B. Market-specific regression tests:** representative cases per engine and
market, based on verified assemblies and documented calculation examples,
independently cross-checked where appropriate. Never fabricate expected
results to make tests pass.

**C. Integration tests:** market selection reaches the correct engine; correct
material records retrieved; database values used in calculations; admin
changes persist; missing records do not trigger hidden fallbacks; saved
estimates preserve market context; reports match calculation outputs; AI
workflows call the correct deterministic engine; price updates persist and
reach downstream calculations; access controls protect configuration.

**D. End-to-end tests:** representative workflows through UI, database, and
report generation, including market switching, invalid inputs, unavailable
data, saved projects, and exports.

**E. Full regression:** run existing suites, preserve passing behaviour.
Never weaken, delete, skip, or rewrite tests to obtain green. Changed
expectations must be justified by verified requirements. Report test
counts, failures, skips, and untested combinations honestly.

## 13. ENGINE COMPLETION GATES

Controlled phases: shared foundations first, then engines in documented
priority order. For every engine: discover → research all relevant markets →
document required changes and data gaps → implement market-specific logic and
configuration → integrate with shared services and database → connect
frontend and reporting → add and execute meaningful tests → review
regressions and calculation correctness → update the canonical registry and
completion matrix → mark complete only when criteria are satisfied.

Explicit statuses (an engine may differ per market):
- **Verified and complete** — researched, implemented, integrated, tested.
- **Implemented, verification pending** — code exists; evidence or tests insufficient.
- **Partially supported** — some systems or jurisdictions supported.
- **Blocked by data** — reliable required data unavailable.
- **Blocked by access** — depends on inaccessible systems or permissions.
- **Unsupported** — no verified implementation for the combination.

Do not describe an engine as globally complete if any required market is
incomplete.

## 14. REQUIRED MARKET COVERAGE MATRIX

Machine-readable matrix in the repository plus an understandable admin
summary. Every discovered engine against every one of the 20 markets,
recording: engine id, market id, applicable jurisdiction, construction types,
research status, source evidence, supported materials and assemblies, formula
and unit validation status, pricing data status, database integration status,
frontend integration status, test results, known limitations, outstanding
work, last verification date, completion status. No market marked supported
just because a database row exists. If one market has materially different
building systems, document the supported systems explicitly. The matrix must
be generated or reconciled against the canonical inventory so newly
discovered engines cannot be silently excluded.

## 15. REQUIRED FINAL DELIVERABLES

1. Complete engine inventory with verified source paths and runtime dependencies.
2. 20-market research registry with traceable sources and jurisdictional limits.
3. Engine-by-market coverage matrix.
4. Shared internationalization foundation integrated into the real application.
5. Updated engines using verified market-specific rules and data.
6. Database migrations and records with correct constraints, persistence,
   access controls.
7. Admin configuration integration for markets, data, sources, support status.
8. Automated tests and documented representative calculation checks.
9. Regression and integration test results with honest counts and failures.
10. Outstanding gaps report: unsupported markets, missing sources, blocked
    work, required decisions.
11. Deployment readiness report: migrations, environment requirements,
    rollback considerations, required owner actions.
12. Completion summary separating verified implementation from partial or
    unverified work.

Documentation must reflect actual implementation. No reports claiming
features that were not implemented or tests that were not executed.

## 16. EXECUTION MANAGEMENT

Work directly, no subagents. Inspect current state; never overwrite
uncommitted user changes. Maintain a durable progress record: completed
tasks, affected files, research sources, test commands, actual results,
outstanding issues, next precise step. Prioritize shared foundations and
high-value paths, but prioritization must not permanently omit lower-priority
engines or any of the 20 markets.

At any limit: save completed work safely, record the exact stopping point,
list remaining engines and markets, record unfinished migrations and tests,
identify unresolved source verification, state the next action required, and
do not claim completion. Resume from the progress record without repeating
completed work. Never deploy unfinished or destructive changes merely to
demonstrate progress.

## 17. FINAL ACCEPTANCE CRITERIA

- Every relevant engine discovered and reconciled with the canonical registry.
- All 20 markets appear in the coverage matrix.
- Country and jurisdiction research backed by accessible, traceable evidence.
- Every claimed supported engine-market combination has verified, appropriate
  construction logic and data.
- Shared market, unit, material, price, and rules infrastructure integrated
  with the actual application.
- Database and admin changes persist correctly and respect access controls.
- Frontend workflows use the selected market consistently.
- AI-assisted calculations invoke the appropriate deterministic engines.
- No unsupported Nigerian fallback or fabricated technical value remains in a
  claimed supported pathway.
- Meaningful automated and representative calculation tests pass, with
  failures and limitations disclosed.
- Existing correct functionality is preserved.
- Remaining unsupported combinations are clearly identified, not
  misrepresented as complete.
- Documentation and final reports accurately describe the code that was
  actually implemented and tested.

The goal is a genuinely international FRELUX construction intelligence
platform, not a website that merely displays 20 country options.
