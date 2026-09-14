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

Create `.env.local` locally and keep it out of Git/ZIP exports.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

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
/verify/$memberNo         Public membership verification
```
