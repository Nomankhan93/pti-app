# PTI Final Gap Closure & Release Candidate Hardening

This release-candidate patch closes security, privacy, authorization and operational gaps found after the Phase 1–8 project audit. It intentionally preserves the existing platform architecture rather than introducing a new functional phase.

## Membership integrity

The human-readable PTI member number remains visible on cards, but it is no longer the public QR lookup key. Every membership receives a high-entropy `public_verify_token`; digital cards and verification links use that token.

The database now treats issuance and authority fields as server-managed. A normal member cannot set or change `member_no`, issuance state, active state, designation, designation level/area, organization scope, verification token or declaration audit fields. Self-registration forcibly clears designation fields before issuance.

Member photo paths are ownership-bound. New self-registration requires the photo object path to begin with the registering user's UUID folder. Member-side photo changes are accepted only when the new path stays in that folder. The public verifier independently checks ownership before creating a signed photo URL.

## Public verification privacy

Public verification now:

- looks up a random verification token rather than an enumerable member number;
- makes inactive and unknown references indistinguishable;
- exposes only the intended public membership payload;
- signs a photo only after storage-path ownership validation; and
- consumes a service-role-only database request budget with per-reference throttling plus a project-wide circuit breaker.

Previously printed QR codes that contain `/verify/<member-no>` should be regenerated after this migration. The member number itself remains unchanged.

## Admin authority

Legacy `user_roles.admin` and an active organization `super_admin` now share the canonical `app_private.can_manage_membership_admin()` authority helper. Membership rows, related admin reads and member-photo storage policies use the same rule.

Frontend admin routes and server actions use the same combined authority model, preventing a `super_admin` from passing the shell guard but failing deeper member-management checks.

## Authentication

Release-candidate authentication is email/password only until an SMS provider is configured and tested. Password policy is aligned to the Supabase baseline: minimum 8 characters with at least one letter and one digit.

The login route now supports forgot-password and password-recovery completion through Supabase Auth.

Hosted Auth controls such as leaked-password protection, privileged-user MFA, SMTP, CAPTCHA/bot protection and provider alerts remain deployment settings and must be verified separately.

## Finance maker/checker

The immutable ledger remains unchanged. The final gap migration adds segregation of duties:

- the donation recorder cannot verify that donation;
- the recorder cannot reconcile that donation; and
- the user who verifies a donation cannot also perform its successful reconciliation.

This creates a database-enforced multi-user path for funds reaching reconciled status.

## Member exports

Bulk member exports move to a server-side RPC that is:

- membership-admin only;
- authenticated;
- rate-limited;
- audited in both `production_export_audit` and `audit_events`;
- masked by default; and
- full-PII only when the admin supplies an audit reason.

CSV cells beginning with spreadsheet formula characters are neutralized before browser download.

## Geography editing

Admin member location editing now selects the canonical tehsil/taluka geography record and writes `geography_id`. The existing database geography trigger remains responsible for synchronizing district, tehsil/taluka and organization scope.

## Browser privacy and i18n

Registration drafts use `sessionStorage`, so CNIC/address and related draft data are removed when the browser tab/session ends rather than persisting indefinitely in `localStorage`.

The runtime language set is English + Urdu only. Obsolete Sindhi branches were removed, and the document direction now has one source of truth.

## PWA and deployment headers

`public/manifest.json` is the single manifest. The legacy `site.webmanifest` is removed. The service worker uses a release-candidate cache version and can display push payloads (`push` / `notificationclick`). A push subscription/delivery worker remains an external integration and is not implied by this patch.

`vercel.json` defines baseline HSTS, CSP, anti-framing, referrer, MIME-sniffing and permissions headers. Non-Vercel deployments must reproduce equivalent headers at their edge/proxy.

## Release gates

Run:

```bash
npm run release:check
npx supabase migration list
npx supabase db push
```

Then run the database QA set using `npm run qa:release` with a direct database URL, or run `supabase/qa/final-gap-closure-release-candidate.sql` in Supabase SQL Editor.

Before go-live, regenerate existing member QR cards, test the email recovery link on the production domain, verify masked/full member export audit records, and exercise finance recording/verification/reconciliation using separate test accounts.
