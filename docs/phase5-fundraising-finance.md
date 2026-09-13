# PTI Phase 5 — Fundraising & Finance Ledger

Phase 5 adds a scoped finance domain without coupling financial authority to normal membership or volunteer registration.

## Financial integrity model

- `fundraising_campaigns` holds scoped campaigns and target/status metadata.
- `donations` is the immutable base ledger. App users cannot edit or delete a recorded donation.
- `donation_adjustments` appends corrections, refunds, chargebacks and full reversals. The effective amount is the base donation plus adjustments.
- `donation_verification_events` and `donation_reconciliation_events` are append-only state histories.
- Any adjustment forces verification back to `pending` and reconciliation back to `pending`/`exception`.
- `donation_receipts` is versioned. Reissuing creates a new immutable snapshot; old receipt versions remain in history.
- Every mutation writes a non-PII action record into `audit_events`.

## Finance roles

Finance authority is independent from membership/volunteer status:

- **Finance Admin** — scoped campaign/ledger management and finance-role administration.
- **Finance Officer** — campaign management, donation recording, verification, reconciliation, adjustments and receipts.
- **Collector** — donation recording and verified-receipt issuance.
- **Finance Auditor** — read-only scoped visibility.

Existing `super_admin` and `national_finance_admin` organization roles retain finance management authority. `central_leadership` and organization `auditor` receive read-only finance visibility. Legacy app admins are retained as finance admins for migration continuity.

## RLS and API boundary

Authenticated users receive SELECT only on finance tables, filtered by organization subtree. INSERT/UPDATE/DELETE remains revoked, so browser clients cannot directly mutate ledger rows.

The exposed `public` finance API uses **SECURITY INVOKER wrappers** with `search_path = ''`. Those wrappers delegate to matching `app_private.*_impl` functions that are **SECURITY DEFINER**, also with an empty search path, and contain the scope/role/ownership checks plus audit writes. `app_private` is not an exposed PostgREST API schema. This keeps privileged implementation details outside the exposed API while avoiding new public SECURITY DEFINER RPC findings in Supabase Security Advisor.

RLS directly calls only `app_private.can_view_finance` and `app_private.can_admin_finance`; authenticated users receive EXECUTE on those helpers because PostgreSQL evaluates policy helpers as the querying role. Anonymous access is revoked. Finance RLS policies use `(select auth.uid())` where identity is required to avoid per-row auth re-evaluation warnings.

## Receipt policy

A receipt can only be issued when the latest verification state is `verified` and the effective donation amount is positive. A later adjustment does not modify old receipts; a new verified receipt version can be issued after review.

## Campaign lifecycle

New campaigns start as `draft` or `active`. Draft campaigns may be activated or cancelled; active campaigns may be paused, completed or cancelled; paused campaigns may resume or close. Completed/cancelled campaigns are terminal. Campaign organization scope cannot be moved after creation, and campaign currency cannot change after donations exist.

## Donation recording and privacy

Donation inputs are validated server-side. Campaign-linked donations must match the campaign currency and organization subtree, and campaigns must be active. Bank/card/wallet/cheque records require a payment reference. Anonymous donations clear donor name/mobile/email before insertion. Audit events never include donor phone or email.

## Verification, reconciliation and adjustments

Verification and reconciliation are separate append-only workflows. Adjustments never rewrite the original donation. `correction`, `refund`, `chargeback` and `reversal` entries affect the effective donation amount and require fresh review. A full reversal must bring the effective amount to exactly zero.

## Currency model

Each campaign has one three-letter currency code. Donations linked to a campaign must use the campaign currency, avoiding unsafe cross-currency aggregation without an explicit FX ledger. General donations may use any valid three-letter currency code; the workbench does not merge unlike currencies into a single financial total unless the selected dataset shares a currency.
