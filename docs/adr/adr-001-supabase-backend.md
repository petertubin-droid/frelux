# ADR-001: Supabase as Backend & Database

**Status:** Accepted  
**Date:** 2026-08-01

## Context

Frelux needed a backend with PostgreSQL, authentication, row-level security, edge functions, and real-time capabilities. The team had limited DevOps capacity and needed something managed that could scale from MVP to commercial release without infrastructure rewrites.

## Decision

Use **Supabase** as the sole backend provider — PostgreSQL database, GoTrue auth, Edge Functions for serverless logic, and Storage for file uploads.

## Consequences

- **Positive:** Zero infrastructure management, built-in RLS for multi-tenant isolation, edge functions handle Paystack webhooks and ad postbacks without a separate server, generous free tier for development.
- **Negative:** Vendor lock-in for auth and storage layers. Edge functions have cold-start latency. No direct DB connection pooling from the client — all access goes through PostgREST.
- **Mitigation:** Database schema is standard PostgreSQL and can be migrated to a self-hosted Postgres if needed. Auth and storage are the only lock-in points.

## Alternatives Considered

- **Firebase:** NoSQL (Firestore) would require rethinking the relational data model. Realtime DB is less queryable than Postgres.
- **Self-hosted Postgres + Express:** More control but requires DevOps overhead, CI/CD for migrations, and manual auth implementation.
- **PlanetScale (MySQL):** Good serverless MySQL but no built-in auth or edge functions.
