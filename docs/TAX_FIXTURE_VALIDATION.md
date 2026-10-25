# Tax Fixture Validation by Accountable Local Reviewers

FRELUX Phase 1 requires per-jurisdiction fixture validation by an **accountable
local reviewer**. This document is the reviewer-facing process.

## What exists already (machine-checked)

- Every market with authoritative tax data has a fixture at
  `src/lib/tax/fixtures/markets/<CC>.ts` snapshotting the seeded rows (the
  jurisdiction rule and/or catalog rows, with their official citations).
- `src/lib/tax/__tests__/jurisdiction-fixtures.test.ts` re-runs the
  deterministic engine against each fixture and asserts the exact outputs
  (percentage, component lines, bases, amounts, totals, citation, effective
  date). Engine drift cannot pass silently.
- What the machine check **cannot** do: confirm the data matches local
  reality. That is the reviewer's job.

## What a local reviewer validates

For the market's fixture, check against local knowledge and current law:

1. **Rate**: the percentage (and each component, e.g. VAT + levies) is correct.
2. **Taxable base**: the base definition matches local practice.
3. **Exemptions**: exemption handling matches local treatment.
4. **Rounding**: rounding method matches local practice.
5. **Citation**: the cited source is official or authoritative, and the URL is live.
6. **Effective dates**: the rule's effective period is current.
7. **Component structure**: components and compounding are structured as
   local law prescribes.

## Recording a verdict

A verdict is a row in `tax_rule_validations` (migration
`20261024220001_tax_rule_validations.sql`). The database refuses a `validated`
verdict without an accountable reviewer (name, role, location) and a complete
checklist. Example:

```sql
INSERT INTO tax_rule_validations (
  market_code, rule_ref, verdict,
  reviewer_name, reviewer_role, reviewer_location, review_date,
  checklist, evidence_url, notes
) VALUES (
  'NG', 'NG-VAT-FED', 'validated',
  '<Full Name>', '<Chartered Accountant / QS / ...>', '<City, NG>', '2026-11-01',
  '{"rate":true,"taxable_base":true,"exemptions":true,"rounding":true,
    "citation":true,"effective_dates":true,"component_structure":true}',
  'https://...', 'Optional notes'
);
```

Verdicts: `validated`, `rejected` (data is wrong; fix the seed), or
`needs_changes`. Quotes store the validation state they used at generation time
(`project_quotations.tax_validation_state`, `tax_validated_by`,
`tax_validated_at`).

## Current state

| Market | Source            | Rule / tax           | Rate                        | Citation                          | Local validation |
| ------ | ----------------- | -------------------- | --------------------------- | --------------------------------- | ---------------- |
| AE     | catalog           | VAT                  | 5%                          | UAE Federal Tax Authority         | **Pending**      |
| AU     | catalog           | GST                  | 10%                         | Australian Taxation Office        | **Pending**      |
| BR     | catalog           | ISS                  | not determined              | PwC Worldwide Tax Summaries       | **Pending**      |
| CA     | catalog           | GST                  | 5%                          | Canada Revenue Agency             | **Pending**      |
| CN     | catalog           | VAT                  | 13% materials / 9% services | DLA Piper                         | **Pending**      |
| DE     | catalog           | Umsatzsteuer         | 19%                         | VATupdate                         | **Pending**      |
| FR     | catalog           | TVA                  | 20%                         | VATupdate / DGFiP                 | **Pending**      |
| GB     | catalog           | VAT                  | 20%                         | HM Revenue & Customs              | **Pending**      |
| GH     | catalog           | VAT + NHIL + GETFund | 15% + 5%                    | Ghana Revenue Authority           | **Pending**      |
| ID     | catalog           | PPN                  | 11%                         | Business Times / Bloomberg        | **Pending**      |
| IN     | catalog           | GST                  | 18%                         | IndiaFilings (GST Council rates)  | **Pending**      |
| IT     | catalog           | IVA                  | 22%                         | VATupdate / Agenzia delle Entrate | **Pending**      |
| JP     | catalog           | Consumption Tax      | 10%                         | VATupdate / National Tax Agency   | **Pending**      |
| KE     | catalog           | VAT                  | 16%                         | Kenya Revenue Authority           | **Pending**      |
| KR     | catalog           | VAT                  | 10%                         | VATupdate / NTS                   | **Pending**      |
| MX     | catalog           | IVA                  | 16%                         | VATupdate / SAT                   | **Pending**      |
| NG     | jurisdiction rule | VAT (NG-VAT-FED)     | 7.5%                        | Federal Inland Revenue Service    | **Pending**      |
| SA     | catalog           | VAT                  | 15%                         | Zakat, Tax and Customs Authority  | **Pending**      |
| US     | catalog           | Sales and Use Tax    | not determined              | Federation of Tax Administrators  | **Pending**      |
| ZA     | catalog           | VAT                  | 15%                         | South African Revenue Service     | **Pending**      |

All 20 markets are pending until reviewers are named and verdicts recorded.
The 12 registry markets without tax data remain honestly "tax not determined"
in quotes; they need fixture files only when authoritative data is added.
