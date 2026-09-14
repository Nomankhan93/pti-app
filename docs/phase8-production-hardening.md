# PTI Phase 8 — Production Hardening

Phase 8 is the release-safety layer for the PTI Digital Operations Platform. It does not replace application-domain authorization from earlier phases; it verifies, limits, monitors and operationalizes that foundation.

## Security and RLS release gates

The phase adds read-only SQL release checks for sensitive-table RLS, direct client write privileges, SECURITY INVOKER/DEFINER boundaries, Phase 7 migration correctness and production-function ACLs. Existing legacy public `SECURITY DEFINER` RPCs from older modules remain an explicit monitored compatibility debt rather than being silently rewritten during the release phase.

The Production Readiness screen reports the current count of those legacy definer RPCs as a warning. New Phase 5–8 APIs use the preferred public `SECURITY INVOKER` → `app_private SECURITY DEFINER` wrapper architecture.

## Financial audit integrity

`supabase/qa/finance-ledger-integrity.sql` validates the live ledger without changing rows:

- effective donation values never become negative;
- reconciled current state requires current verification and a positive effective amount;
- receipt snapshots match the historical effective amount at issuance time;
- receipt versions are contiguous;
- campaign-linked donations retain campaign currency and organization scope;
- append-only finance triggers remain installed;
- donations, adjustments and receipts have matching non-PII audit events.

These tests are intended to fail a release if financial history is inconsistent.

## Rate limiting

Authenticated high-impact mutation RPCs are rate-limited in the database. Buckets are keyed by authenticated user, action and fixed time window. Limits protect finance writes, finance role changes, notification publishing/cancellation, reminder sweeps and production exports.

Rate limiting is defense in depth. Edge/CDN/WAF limits and Supabase Auth rate controls should also remain enabled in production.

## Monitoring

`/admin/production` provides an aggregate database health view:

- sensitive tables missing RLS;
- direct privileged-table write exposures;
- negative finance ledger values;
- stale pending finance records;
- active members without canonical organization mapping;
- unread critical operational alerts;
- retained legacy public definer RPC count;
- recent audited exports;
- recently active rate-limit buckets.

The health response contains counts only and does not expose member, volunteer or donor PII.

## Audited exports

Phase 8 adds two server-side export RPCs:

- production audit-event export;
- PII-minimized finance-ledger export.

Every export is rate-limited and appended to `production_export_audit`, and a corresponding event is written to `audit_events`. The finance export deliberately excludes donor name, email and mobile. CSV generation neutralizes spreadsheet formula prefixes (`=`, `+`, `-`, `@`).

## Release commands

```bash
npm run release:check
npm run test:e2e:release
```

With a direct Postgres connection available:

```bash
DATABASE_URL='postgresql://...' npm run qa:release
SUPABASE_DB_URL='postgresql://...' npm run db:backup
```

Never run a restore drill against production. The restore script requires explicit confirmation and defaults to local/disposable targets.

## Hosted settings that still require operator verification

SQL migrations cannot guarantee every hosted control. Before launch, verify in the Supabase/dashboard/provider configuration:

- leaked-password protection;
- production SMTP and email confirmation policy;
- CAPTCHA/bot protection if public signup abuse warrants it;
- hosted backup/PITR retention appropriate to the deployment;
- database/network access restrictions appropriate to operations;
- alerting for database, auth and deployment failures;
- secrets present only in approved deployment secret stores.
