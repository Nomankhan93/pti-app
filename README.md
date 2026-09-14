# PTI Digital Operations Platform

Pakistan Tehreek-e-Insaf (PTI) digital platform built with TanStack Start, React, TypeScript, Tailwind CSS, and Supabase.

## Current Scope

The platform currently includes:

- Free self-issued PTI membership
- Digital membership card + public QR verification
- Pakistan-wide organization hierarchy and scoped RBAC
- Volunteer registration and coordinator workbench
- Operations, teams, shifts and duties
- Attendance, QR check-in and participation history
- Admin organization, roles and audit views
- Fundraising/finance ledger with verification, reconciliation and receipts
- Leadership monitoring and hierarchy drill-down analytics
- Notifications and operational command center
- Production readiness, audited exports, rate limits and release gates

Membership remains free and self-issued. There is no membership payment workflow or admin approval/rejection gate.

## Product Architecture

Operational authority is separate from ordinary membership. Any eligible user can register as a member/volunteer, while coordinator and leadership roles are explicitly assigned and scoped to PTI organization units.

Geographic hierarchy:

```txt
Central → Province / Territory → Division → District → Tehsil / Taluka
```

## Tech Stack

- TanStack Start / TanStack Router
- React 19 + TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage and RLS
- `html-to-image` for card export
- `qrcode` for QR generation

## Environment Variables

Copy `.env.example` to `.env.local`, replace placeholders locally, and keep `.env.local` out of Git/ZIP exports. Browser-safe and server-only variables are intentionally separate.

```bash
cp .env.example .env.local
```

Required values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-placeholder

VITE_PUBLIC_SITE_URL=https://your-production-domain.example
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed through a `VITE_*` variable. Phone login is intentionally hidden in the release-candidate UI until an SMS provider is configured and production-tested.

## Local Development

```bash
nvm use
npm ci
npm run dev
```

## Quality Checks

```bash
npm run check
npm test
npm run build
npm audit
```

## Latest Migration Sequence

```txt
20260913193000  Free Membership / Self-Issuance
20260913210000  Organization / RBAC / Audit
20260913223000  Volunteer Registry
20260913233000  Operations / Teams / Duties
20260914000000  Attendance / Participation
20260914010000  Database Security / Performance Stabilization
20260914020000  Fundraising / Finance Ledger
20260914030000  Leadership Monitoring
20260914040000  Notifications / Operational Command Center
20260914050000  Production Hardening
20260914060000  Final Gap Closure / Release Candidate Hardening
```

## Key Routes

```txt
/                         Public home
/signup                   Account registration
/login                    Login
/register                 Membership registration
/dashboard                Member dashboard
/card                     Digital membership card
/volunteer                Volunteer profile and participation
/operations/volunteers    Volunteer coordinator workbench
/operations/workbench     Operations, teams and duties
/operations/attendance    Attendance coordinator workbench
/admin                    Admin console
/admin/organization       Organization hierarchy
/admin/roles              Scoped roles
/admin/audit              Audit log
/admin/production         Production readiness, monitoring and audited exports
/finance/workbench        Fundraising and finance ledger
/leadership               Leadership monitoring and drill-down analytics
/notifications            Personal notification inbox
/command-center           Operational command center
/verify/$memberNo         Public membership verification (route param carries a random verification token, not the member number)
```


## Release Candidate Security Notes

- Official designation, issuance state, verification token and organization scope are server-managed membership fields.
- Membership QR codes use a high-entropy public verification token; the human-readable member number is not used as the public lookup key.
- Member photos are accepted only from the member's own storage folder, and public verification signs a photo only after ownership validation.
- Legacy `admin` and organization `super_admin` share one canonical membership-administration authorization rule.
- Member exports are server-side, audited and rate-limited. Masked export is the default; full-PII export requires a reason that is written to the audit trail.
- Finance uses maker/checker separation: the recorder cannot verify/reconcile the same donation, and the verifier cannot also reconcile it.
- Registration drafts use tab-scoped `sessionStorage`, not persistent `localStorage`.
- Authentication is email/password in the release candidate, with password recovery. Passwords require at least 8 characters including a letter and a digit.
- Vercel security headers are committed in `vercel.json`. If another host is used, reproduce the same headers there.
- The service worker can display Web Push payloads, but a push subscription/delivery backend is still an external operational integration rather than a database-only feature.

Before a production release, also verify hosted Supabase settings that cannot be guaranteed by repository migrations alone: leaked-password protection, MFA policy for privileged accounts, SMTP, CAPTCHA/bot controls, backups/PITR and alerting.
