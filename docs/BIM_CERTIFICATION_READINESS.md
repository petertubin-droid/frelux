# BIM / IFC Certification Readiness

Status: **NOT CERTIFIED.** This document records what the loader can and cannot
claim today, and what independent certification would require. Nothing here is a
certification claim, and nothing here should be quoted as one.

Evidence levels used in this repo: `verified live` (checked against a running
system), `CI green only`, `staged/partial` (code and tests exist, not yet
exercised in production).

## 1. What FRELUX can claim today (code-verified)

The IFC loader (`src/lib/bim/ifc-model-loader.ts`) is a client-side parser built
on web-ifc 0.0.78. Verified by unit tests against real wasm:

- Reads IFC2x3 and IFC4 SPF files.
- Extracts placed triangulated geometry per element (positions, normals,
  indices, 4x4 placement matrix, RGBA colour).
- Extracts declared quantities only: `IfcQuantityLength`, `IfcQuantityArea`,
  `IfcQuantityVolume`, `IfcQuantityCount`, `IfcQuantityWeight` reached through
  `IfcRelDefinesByProperties` -> `IfcElementQuantity`. Undeclared quantities are
  reported as absent, never invented.
- Extracts spatial context: element -> `IfcBuildingStorey` name via
  `IfcRelContainedInSpatialStructure`.
- Extracts type objects: element -> `IfcWallType` / `IfcTypeObject` name via
  `IfcRelDefinesByType`.
- Extracts materials: element -> `IfcMaterial` name via
  `IfcRelAssociatesMaterial`.
- Reads declared project units (`IfcUnitAssignment` -> `IfcSIUnit`) and reports
  them verbatim. **No unit conversion is performed.** A file with no unit
  assignment is reported as `undeclared`, never assumed to be metres.
- Reports a coverage summary: mapped classes with counts, plus every geometry
  class present in the file that the loader does not map (`unmappedClasses`).
  Unmapped classes are reported, not silently dropped.

Coverage manifest: `IFC_COVERAGE` in `ifc-model-loader.ts`. It is the single
source of truth for the supported class list and is asserted by
`src/lib/bim/__tests__/ifc-coverage.test.ts` so the manifest cannot drift from
the implementation.

## 2. What FRELUX must NOT claim

- It is not "IFC certified", "buildingSMART certified" or "IFC4 compliant".
- It does not support the full IFC schema. IFC4 defines several hundred entity
  types; FRELUX maps a construction-quantity subset (structural, envelope,
  openings, MEP terminals, reinforcement) and reports the rest as unmapped.
- It does not perform geometric comparison between revisions. Revision diffs
  compare GlobalIds and geometry part counts only, and say so in the result.
- It does not convert units, currencies or code conventions.

## 3. What independent certification actually requires

Certification is issued by a third party. It cannot be produced by an agent, by
this repo, or by any self-run test suite. The recognised route is the
buildingSMART International IFC Validation Service:

1. **Conformance corpus.** The validation service runs the importer against
   official test files per schema (IFC2x3, IFC4, IFC4.3), covering geometry
   representation types, property sets, quantities, units and spatial structure.
2. **Result submission.** The vendor submits importer results for the corpus and
   a documented scope of supported schema features.
3. **Third-party verification.** buildingSMART verifies results and publishes the
   certification with a defined scope. Partial scope is possible and is stated on
   the certificate.
4. **Recertification.** Each schema edition (e.g. IFC4.3) and major importer
   change requires revalidation.

Cost, timeline and acceptance are decided by buildingSMART, not by FRELUX.

## 4. Readiness checklist (what is done, what remains)

- [x] Client-side parser with no server upload (privacy claim is structural).
- [x] Declared-quantity extraction with honest absence reporting.
- [x] Spatial structure, type object and material context.
- [x] Declared-unit reporting without silent conversion.
- [x] Coverage manifest with unmapped-class reporting, guarded by tests.
- [x] Real-wasm tests against IFC4 geometry and quantity fixtures.
- [ ] Official buildingSMART test corpus run, with results recorded per file.
- [ ] IFC4.3 support (IFC4 and IFC2x3 only today).
- [x] Property-set coverage beyond quantities (2026-11-19): single-value,
      enumerated, bounded (lower/upper/set point), list (all values kept) and
      complex properties (nested entries as dotted names) are all read.
      IfcPropertyTableValue is counted as skipped, because a table's rows would
      need meaning the file does not state.
- [~] Quantities when nothing is declared: extrusion-derived volume, profile
  area and depth are computed exactly and marked derived (2026-11-19). Not yet
  covered: boolean results, swept disks and advanced-brep volumes, which are
  reported as unavailable rather than approximated.
- [ ] Submission to the IFC Validation Service and third-party verification.

## 5. Next concrete steps

1. Download the official IFC validation test files for IFC2x3 and IFC4.
2. Build a harness that runs `parseIfcModel` over the corpus and records, per
   file: parse success, element count, quantity coverage, unmapped classes.
3. Publish the harness output as `docs/ifc-conformance-report.md`, regenerated on
   demand. This is evidence, not certification.
4. Only then approach buildingSMART with a defined scope.

Until steps 1-3 exist, any statement about IFC conformance beyond the list in
section 1 is unsupported.
