# Credential Verification Privacy & Legal Review (Phase 2)

Status: **APPROVED** — reviewed and signed off by Chibuike Iwu (owner) on
2026-10-25. Production uploads were enabled by migration 20261025130000
(`pro_settings.credential_uploads_enabled = true`); the client hides the
upload affordance whenever this flag is off, and workers can still submit a
credential without a document.

## What the system collects

| Field                                                                   | Example                            | Sensitivity            |
| ----------------------------------------------------------------------- | ---------------------------------- | ---------------------- |
| `professional_body`, `credential_type`, `credential_class`              | COREN, license, trade_registration | Low                    |
| `registration_number`                                                   | QSR-12345                          | High (identity-linked) |
| `country_code`, `subnational_scope`                                     | NG, Lagos                          | Low                    |
| `issued_at`, `expires_at`                                               | 2024-01-01, 2026-12-31             | Low                    |
| `document_path` (bucket `pro-verification`)                             | uploads/…pdf                       | High (document)        |
| `insurance_provider`, `insurance_policy_number`                         | Leadway, LAG-99                    | High                   |
| `verification_method`, `verification_result`, `verification_checked_at` | registry_lookup, match             | Low                    |

## Who can see what

| Audience               | Access                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous public       | `pro_credentials_public` view ONLY: verified rows (not expired), jurisdiction, class, method, label. No registration numbers, no documents, no contact data, no notes. |
| Credential owner       | Full own rows + own append-only event trail. Cannot alter verification outcomes (DB trigger).                                                                          |
| Reviewer / admin       | Full rows, event trail, decision recording. Attributed by `auth.uid()`.                                                                                                |
| Others (authenticated) | Nothing (RLS-verified by `supabase/tests/rls_credentials_test.sql`, 16/16 live checks passing 2026-10-25).                                                             |

## Storage

- Documents go to the **private** `pro-verification` bucket (no public
  policies). Access requires authenticated storage policies.
- No document bytes are stored in the database, only paths.

## Retention & deletion

- Credentials are removed with the worker's profile (FK cascade).
- Event trail is append-only: history survives tampering but is deleted with
  the credential row. Appeals and corrections are preserved as events.

## Automated decisions

- Daily 03:15 UTC expiry pass (`fre-credential-expiry` cron) flips stale
  credentials to `expired` as the **system** actor — never attributed to a
  human, logged as an `expiry` event.
- The public view independently refuses expired credentials regardless of cron
  timing.

## Sign-off checklist (owner)

- [x] Collection set above is minimal and justified.
- [x] Public exposure set (view columns) is acceptable.
- [x] Retention via profile deletion is acceptable.
- [x] Nigeria (and each rollout market) legal basis for verifying professional
      credentials confirmed.
- [x] Reviewer attribution policy acceptable.
- [x] Uploads may be enabled in production.

Signed by: **Chibuike Iwu** (owner) Date: **2026-10-25**
