# Credential Verification Privacy & Legal Review (Phase 2)

Status: **PENDING OWNER SIGN-OFF** — uploads must stay disabled in production
until this review is completed by the owner.

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

- [ ] Collection set above is minimal and justified.
- [ ] Public exposure set (view columns) is acceptable.
- [ ] Retention via profile deletion is acceptable.
- [ ] Nigeria (and each rollout market) legal basis for verifying professional
      credentials confirmed.
- [ ] Reviewer attribution policy acceptable.
- [ ] Uploads may be enabled in production.

Signed by: ________________ Date: ________
